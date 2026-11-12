import type { EducationLevel, EnrollmentState, Prisma, Shift } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { getActiveYear } from '../academic/academic.context';
import { gradeLabel, isValidGrade } from '../academic/cneb.catalog';
import { PLAN_STUDENT_QUOTAS } from '../students/student.service';
import { parseNomina, type NominaFile, type NominaRow } from './nomina.parser';

export type StudentAction = 'CREATE' | 'UPDATE' | 'NONE' | 'ERROR' | 'DUPLICATE';
export type EnrollmentAction = 'CREATE' | 'MOVE' | 'STATE' | 'MOVE_STATE' | 'NONE' | 'SKIP';

export interface NominaPlanRow {
  key: string;
  fileName: string;
  rowNumber: number;
  fullName: string;
  studentCode: string | null;
  documentId: string;
  level: EducationLevel | null;
  grade: number | null;
  section: string;
  shift: Shift;
  classroomLabel: string;
  enrollmentState: EnrollmentState;
  studentAction: StudentAction;
  enrollmentAction: EnrollmentAction;
  studentId: string | null;
  changes: string[];
  issues: string[];
  warnings: string[];
}

export interface NominaPlan {
  academicYear: { id: string; year: number };
  files: Array<{ fileName: string; level: EducationLevel | null; modularCode: string | null; year: number | null; rows: number; issues: string[] }>;
  rows: NominaPlanRow[];
  newClassrooms: string[];
  summary: {
    total: number;
    createStudents: number;
    updateStudents: number;
    unchanged: number;
    errors: number;
    duplicates: number;
    createEnrollments: number;
    moveEnrollments: number;
    stateChanges: number;
    newClassrooms: number;
  };
  blocking: string[];
}

const STATE_LABEL: Record<EnrollmentState, string> = { REGISTERED: 'Matriculado', TRANSFERRED: 'Trasladado', WITHDRAWN: 'Retirado' };
const sameText = (a: string | null | undefined, b: string | null | undefined) =>
  (a ?? '').trim().toUpperCase() === (b ?? '').trim().toUpperCase();
const dayOf = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : '');
const classroomKey = (level: EducationLevel, grade: number, section: string, shift: Shift) => `${level}|${grade}|${section}|${shift}`;

type ExistingStudent = {
  id: string; studentCode: string | null; documentType: string; documentId: string; firstNames: string;
  lastNamePaternal: string; lastNameMaternal: string | null; gender: string; birthDate: Date;
};

interface PlanContext {
  plan: NominaPlan;
  parsed: NominaFile[];
  rowData: Map<string, NominaRow>;
  classroomIds: Map<string, string>;
  enrollmentByStudent: Map<string, { id: string; classroomId: string; enrollmentState: EnrollmentState }>;
}

export class NominaService {
  async parseFiles(files: Array<{ buffer: Buffer; originalname: string }>): Promise<NominaFile[]> {
    if (files.length === 0) throw new AppError('Sube al menos un listado de estudiantes del SIAGIE.', 400);
    const parsed: NominaFile[] = [];
    for (const f of files) {
      try {
        parsed.push(await parseNomina(f.buffer, f.originalname));
      } catch (e) {
        throw new AppError((e as Error).message || `No se pudo leer "${f.originalname}".`, 400);
      }
    }
    return parsed;
  }

  private async buildPlan(schoolId: string, parsed: NominaFile[]): Promise<PlanContext> {
    const year = await getActiveYear(schoolId);
    const allRows = parsed.flatMap((f) => f.rows);
    const codes = allRows.map((r) => r.studentCode).filter((c): c is string => !!c);
    const docs = allRows.map((r) => r.documentId).filter(Boolean);

    const [students, foreignCodes, classrooms] = await Promise.all([
      prisma.student.findMany({
        where: { schoolId, OR: [{ studentCode: { in: codes } }, { documentId: { in: docs } }] },
        select: {
          id: true, studentCode: true, documentType: true, documentId: true, firstNames: true,
          lastNamePaternal: true, lastNameMaternal: true, gender: true, birthDate: true,
        },
      }),
      prisma.student.findMany({ where: { schoolId: { not: schoolId }, studentCode: { in: codes } }, select: { studentCode: true } }),
      prisma.classroom.findMany({ where: { schoolId }, select: { id: true, educationLevel: true, grade: true, section: true, shift: true } }),
    ]);
    const byCode = new Map(students.filter((s) => s.studentCode).map((s) => [s.studentCode!, s as ExistingStudent]));
    const byDoc = new Map<string, ExistingStudent>();
    students.forEach((s) => { byDoc.set(`${s.documentType}|${s.documentId}`, s as ExistingStudent); if (!byDoc.has(`*|${s.documentId}`)) byDoc.set(`*|${s.documentId}`, s as ExistingStudent); });
    const foreign = new Set(foreignCodes.map((s) => s.studentCode));
    const classroomIds = new Map(classrooms.map((c) => [classroomKey(c.educationLevel, c.grade, c.section.toUpperCase(), c.shift), c.id]));

    const enrollments = await prisma.enrollment.findMany({
      where: { schoolId, academicYearId: year.id, studentId: { in: students.map((s) => s.id) } },
      select: { id: true, studentId: true, classroomId: true, enrollmentState: true },
    });
    const enrollmentByStudent = new Map(enrollments.map((e) => [e.studentId, e]));

    const rows: NominaPlanRow[] = [];
    const rowData = new Map<string, NominaRow>();
    const newClassrooms = new Map<string, string>();
    const seen = new Set<string>();
    const fileSummaries: NominaPlan['files'] = [];

    for (const file of parsed) {
      const fileIssues = [...file.issues];
      if (file.year && file.year !== year.year) {
        fileIssues.push(`El listado es del año ${file.year} y el año lectivo activo es ${year.year}.`);
      }
      fileSummaries.push({ fileName: file.fileName, level: file.level, modularCode: file.modularCode, year: file.year, rows: file.rows.length, issues: fileIssues });

      for (const r of file.rows) {
        const key = `${file.fileName}#${r.rowNumber}`;
        rowData.set(key, r);
        const fullName = `${r.lastNamePaternal} ${r.lastNameMaternal ?? ''}`.replace(/\s+/g, ' ').trim() + `, ${r.firstNames}`;
        const issues = [...r.issues, ...fileIssues];
        const warnings = [...r.warnings];
        if (file.level && r.grade !== null && !isValidGrade(file.level, r.grade)) issues.push(`Grado ${r.grade} no válido para ${file.levelText ?? 'el nivel'}.`);
        if (r.studentCode && foreign.has(r.studentCode)) issues.push('Este código de estudiante ya está registrado en otro colegio de la plataforma.');

        const identity = r.studentCode ?? `${r.documentType}|${r.documentId}`;
        const base: NominaPlanRow = {
          key, fileName: file.fileName, rowNumber: r.rowNumber, fullName, studentCode: r.studentCode, documentId: r.documentId,
          level: file.level, grade: r.grade, section: r.section, shift: file.shift,
          classroomLabel: file.level && r.grade !== null ? `${gradeLabel(file.level, r.grade)} "${r.section}"` : r.gradeText,
          enrollmentState: r.enrollmentState, studentAction: 'NONE', enrollmentAction: 'NONE', studentId: null,
          changes: [], issues, warnings,
        };
        if (seen.has(identity)) {
          rows.push({ ...base, studentAction: 'DUPLICATE', enrollmentAction: 'SKIP', warnings: [...warnings, 'Aparece repetido en los listados: se toma la primera aparición.'] });
          continue;
        }
        seen.add(identity);
        if (issues.length || !file.level || r.grade === null) {
          rows.push({ ...base, studentAction: 'ERROR', enrollmentAction: 'SKIP' });
          continue;
        }

        const existing = (r.studentCode && byCode.get(r.studentCode))
          || byDoc.get(`${r.documentType}|${r.documentId}`)
          || byDoc.get(`*|${r.documentId}`)
          || null;
        const changes: string[] = [];
        if (existing) {
          if (!sameText(existing.firstNames, r.firstNames)) changes.push(`Nombres: ${existing.firstNames} → ${r.firstNames}`);
          if (!sameText(existing.lastNamePaternal, r.lastNamePaternal)) changes.push(`Apellido paterno: ${existing.lastNamePaternal} → ${r.lastNamePaternal}`);
          if (!sameText(existing.lastNameMaternal, r.lastNameMaternal)) changes.push(`Apellido materno: ${existing.lastNameMaternal ?? '—'} → ${r.lastNameMaternal ?? '—'}`);
          if (r.gender && existing.gender !== r.gender) changes.push(`Sexo: ${existing.gender === 'MALE' ? 'Hombre' : 'Mujer'} → ${r.gender === 'MALE' ? 'Hombre' : 'Mujer'}`);
          if (r.birthDate && dayOf(existing.birthDate) !== dayOf(r.birthDate)) changes.push(`Fecha de nacimiento: ${dayOf(existing.birthDate)} → ${dayOf(r.birthDate)}`);
          if (r.studentCode && existing.studentCode !== r.studentCode) changes.push(`Código SIAGIE: ${existing.studentCode ?? '—'} → ${r.studentCode}`);
          if (existing.documentId !== r.documentId && r.documentType !== 'CODIGO_TEMPORAL') changes.push(`Documento: ${existing.documentId} → ${r.documentId}`);
        }

        const ck = classroomKey(file.level, r.grade, r.section, file.shift);
        if (!classroomIds.has(ck) && !newClassrooms.has(ck)) newClassrooms.set(ck, base.classroomLabel);

        let enrollmentAction: EnrollmentAction = 'CREATE';
        const enr = existing ? enrollmentByStudent.get(existing.id) : undefined;
        if (enr) {
          const moved = enr.classroomId !== classroomIds.get(ck);
          const stateChanged = enr.enrollmentState !== r.enrollmentState;
          enrollmentAction = moved && stateChanged ? 'MOVE_STATE' : moved ? 'MOVE' : stateChanged ? 'STATE' : 'NONE';
          if (stateChanged) changes.push(`Matrícula: ${STATE_LABEL[enr.enrollmentState]} → ${STATE_LABEL[r.enrollmentState]}`);
          if (moved) changes.push(`Cambia de aula a ${base.classroomLabel}`);
        }
        rows.push({
          ...base,
          studentId: existing?.id ?? null,
          studentAction: !existing ? 'CREATE' : changes.some((c) => !c.startsWith('Matrícula') && !c.startsWith('Cambia de aula')) ? 'UPDATE' : 'NONE',
          enrollmentAction,
          changes,
        });
      }
    }

    const createStudents = rows.filter((r) => r.studentAction === 'CREATE').length;
    const blocking: string[] = [];
    const [current, school] = await Promise.all([
      prisma.student.count({ where: { schoolId } }),
      prisma.school.findUnique({ where: { id: schoolId }, select: { plan: true } }),
    ]);
    const quota = PLAN_STUDENT_QUOTAS[school?.plan ?? 'BASIC'] ?? 150;
    if (current + createStudents > quota) {
      blocking.push(`Tu plan permite ${quota} alumnos: ya tienes ${current} y el listado agrega ${createStudents}. Actualiza tu plan o importa menos aulas.`);
    }

    const plan: NominaPlan = {
      academicYear: { id: year.id, year: year.year },
      files: fileSummaries,
      rows,
      newClassrooms: [...newClassrooms.values()],
      summary: {
        total: rows.length,
        createStudents,
        updateStudents: rows.filter((r) => r.studentAction === 'UPDATE').length,
        unchanged: rows.filter((r) => r.studentAction === 'NONE' && r.enrollmentAction === 'NONE').length,
        errors: rows.filter((r) => r.studentAction === 'ERROR').length,
        duplicates: rows.filter((r) => r.studentAction === 'DUPLICATE').length,
        createEnrollments: rows.filter((r) => r.enrollmentAction === 'CREATE').length,
        moveEnrollments: rows.filter((r) => r.enrollmentAction === 'MOVE' || r.enrollmentAction === 'MOVE_STATE').length,
        stateChanges: rows.filter((r) => r.enrollmentAction === 'STATE' || r.enrollmentAction === 'MOVE_STATE').length,
        newClassrooms: newClassrooms.size,
      },
      blocking,
    };
    return { plan, parsed, rowData, classroomIds, enrollmentByStudent };
  }

  async preview(schoolId: string, files: Array<{ buffer: Buffer; originalname: string }>): Promise<NominaPlan> {
    const parsed = await this.parseFiles(files);
    return (await this.buildPlan(schoolId, parsed)).plan;
  }

  async commit(schoolId: string, files: Array<{ buffer: Buffer; originalname: string }>, opts: { updateExisting: boolean }) {
    const parsed = await this.parseFiles(files);
    const ctx = await this.buildPlan(schoolId, parsed);
    if (ctx.plan.blocking.length) throw new AppError(ctx.plan.blocking.join(' '), 403);
    const yearId = ctx.plan.academicYear.id;
    const classroomIds = new Map(ctx.classroomIds);
    const result = { createdStudents: 0, updatedStudents: 0, createdEnrollments: 0, updatedEnrollments: 0, createdClassrooms: 0, skipped: 0 };

    // 1. Aulas nuevas
    const neededClassrooms = new Map<string, { level: EducationLevel; grade: number; section: string; shift: Shift }>();
    for (const row of ctx.plan.rows) {
      if (row.studentAction === 'ERROR' || row.studentAction === 'DUPLICATE' || !row.level || row.grade === null) continue;
      const ck = classroomKey(row.level, row.grade, row.section, row.shift);
      if (!classroomIds.has(ck)) neededClassrooms.set(ck, { level: row.level, grade: row.grade, section: row.section, shift: row.shift });
    }
    for (const [ck, c] of neededClassrooms) {
      const created = await prisma.classroom.upsert({
        where: { schoolId_educationLevel_grade_section_shift: { schoolId, educationLevel: c.level, grade: c.grade, section: c.section, shift: c.shift } },
        update: {},
        create: { schoolId, educationLevel: c.level, grade: c.grade, section: c.section, shift: c.shift },
        select: { id: true },
      });
      classroomIds.set(ck, created.id);
      result.createdClassrooms += 1;
    }

    // 2. Alumnos y matrículas, en lotes transaccionales
    const actionable = ctx.plan.rows.filter((r) => r.studentAction !== 'ERROR' && r.studentAction !== 'DUPLICATE');
    result.skipped = ctx.plan.rows.length - actionable.length;
    const CHUNK = 40;
    for (let i = 0; i < actionable.length; i += CHUNK) {
      const chunk = actionable.slice(i, i + CHUNK);
      await prisma.$transaction(async (tx) => {
        for (const row of chunk) {
          const r = ctx.rowData.get(row.key)!;
          const classroomId = classroomIds.get(classroomKey(row.level!, row.grade!, row.section, row.shift))!;
          let studentId = row.studentId;
          if (row.studentAction === 'CREATE') {
            const created = await tx.student.create({
              data: {
                schoolId,
                studentCode: r.studentCode,
                firstNames: r.firstNames,
                lastNamePaternal: r.lastNamePaternal,
                lastNameMaternal: r.lastNameMaternal,
                documentType: r.documentType,
                documentId: r.documentId,
                gender: r.gender!,
                birthDate: r.birthDate!,
              },
              select: { id: true },
            });
            studentId = created.id;
            result.createdStudents += 1;
          } else if (row.studentAction === 'UPDATE' && opts.updateExisting) {
            const data: Prisma.StudentUpdateInput = {
              firstNames: r.firstNames,
              lastNamePaternal: r.lastNamePaternal,
              lastNameMaternal: r.lastNameMaternal,
            };
            if (r.gender) data.gender = r.gender;
            if (r.birthDate) data.birthDate = r.birthDate;
            if (r.studentCode) data.studentCode = r.studentCode;
            if (r.documentType !== 'CODIGO_TEMPORAL') { data.documentId = r.documentId; data.documentType = r.documentType; }
            await tx.student.update({ where: { id: studentId! }, data });
            result.updatedStudents += 1;
          }
          if (!studentId) continue;

          const enr = ctx.enrollmentByStudent.get(studentId);
          if (!enr) {
            await tx.enrollment.create({
              data: {
                schoolId, studentId, academicYearId: yearId, classroomId,
                enrollmentState: r.enrollmentState, isActive: r.enrollmentState === 'REGISTERED',
              },
            });
            result.createdEnrollments += 1;
          } else if (row.enrollmentAction !== 'NONE') {
            await tx.enrollment.update({
              where: { id: enr.id },
              data: { classroomId, enrollmentState: r.enrollmentState, isActive: r.enrollmentState === 'REGISTERED' },
            });
            result.updatedEnrollments += 1;
          }
        }
      }, { timeout: 60_000 });
    }
    return result;
  }
}
