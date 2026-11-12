import JSZip from 'jszip';
import type { EducationLevel } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { assertPeriod, fullNameOf, getActiveYear, periodCount } from '../academic/academic.context';
import { CNEB_AREAS, CNEB_COMPETENCES, gradeLabel } from '../academic/cneb.catalog';
import { ConsolidationService } from '../academic/consolidation.service';
import { CONCLUSION_MIN_LENGTH, sanitizeConclusion } from '../academic/grade-engine';
import { factoryPhrases, type PhraseLetter } from '../academic/phrase-bank.catalog';
import { parseRegNotas, type ParsedTemplate, type TemplateAreaSheet } from './regnotas.parser';
import { cellRef, normalizeLabel, numToCol } from './xlsx-xml';

type UploadedFile = { buffer: Buffer; originalname: string };
const LETTERS = new Set(['AD', 'A', 'B', 'C']);
const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const areaName = (level: EducationLevel | null, code: string | null, sheet: TemplateAreaSheet) => {
  if (code === 'TRANS') return sheet.fullName;
  return (level && code && CNEB_AREAS[level].find((a) => a.code === code)?.name) || sheet.fullName;
};

interface ClassroomContext {
  year: { id: string; year: number; periodType: string; isActive: boolean };
  classroom: { id: string; educationLevel: EducationLevel; grade: number; section: string; shift: string } | null;
  enrollments: Array<{ id: string; enrollmentState: string; studentCode: string | null; fullName: string }>;
  planCodes: Set<string>;
  issues: string[];
  warnings: string[];
}

/** Relaciona cada fila de la plantilla con una matrícula de la app (por código SIAGIE y, si falta, por nombre). */
function matchStudents(t: ParsedTemplate, enrollments: ClassroomContext['enrollments']) {
  const byCode = new Map(enrollments.filter((e) => e.studentCode).map((e) => [e.studentCode!, e]));
  const byName = new Map(enrollments.map((e) => [normalizeLabel(e.fullName), e]));
  const rows = t.areas[0]?.students ?? [];
  const matched = new Map<string, ClassroomContext['enrollments'][number]>(); // studentCode → enrollment
  const notInApp: string[] = [];
  for (const s of rows) {
    const e = byCode.get(s.studentCode) ?? byName.get(normalizeLabel(s.fullName));
    if (e) matched.set(s.studentCode, e);
    else notInApp.push(s.fullName);
  }
  const inFile = new Set([...matched.values()].map((e) => e.id));
  const notInFile = enrollments.filter((e) => e.enrollmentState === 'REGISTERED' && !inFile.has(e.id)).map((e) => e.fullName);
  const inactive = [...matched.values()].filter((e) => e.enrollmentState !== 'REGISTERED').map((e) => e.fullName);
  return { matched, notInApp, notInFile, inactive, total: rows.length };
}

export class TemplateService {
  private consolidation = new ConsolidationService();

  async parse(files: UploadedFile[]): Promise<ParsedTemplate[]> {
    if (files.length === 0) throw new AppError('Sube al menos una plantilla de registro de notas del SIAGIE.', 400);
    const out: ParsedTemplate[] = [];
    for (const f of files) {
      try {
        out.push(await parseRegNotas(f.buffer, f.originalname));
      } catch (e) {
        throw new AppError((e as Error).message || `No se pudo leer "${f.originalname}".`, 400);
      }
    }
    return out;
  }

  private async context(schoolId: string, t: ParsedTemplate): Promise<ClassroomContext> {
    const year = await getActiveYear(schoolId);
    const issues: string[] = [];
    const warnings: string[] = [...t.warnings];
    if (t.year && t.year !== year.year) issues.push(`La plantilla es del año ${t.year} y el año lectivo activo es ${year.year}.`);
    if (!t.level || t.grade === null || !t.section) issues.push('No se pudo leer el nivel, grado o sección de la plantilla.');
    if (t.periodNumber === null || t.periodNumber > periodCount(year)) issues.push(`Periodo de evaluación no reconocido (${t.periodText || t.periodCode}).`);

    let classroom: ClassroomContext['classroom'] = null;
    let enrollments: ClassroomContext['enrollments'] = [];
    let planCodes = new Set<string>();
    if (t.level && t.grade !== null && t.section) {
      const candidates = await prisma.classroom.findMany({
        where: { schoolId, educationLevel: t.level, grade: t.grade, section: { equals: t.section, mode: 'insensitive' } },
        select: { id: true, educationLevel: true, grade: true, section: true, shift: true },
      });
      if (candidates.length === 0) {
        issues.push(`No existe el aula ${gradeLabel(t.level, t.grade)} "${t.section}" en la app. Importa primero la nómina del SIAGIE.`);
      } else {
        classroom = candidates[0];
        if (candidates.length > 1) warnings.push(`Hay ${candidates.length} aulas ${gradeLabel(t.level, t.grade)} "${t.section}" (distintos turnos): se usa la del turno ${classroom.shift}.`);
        const [enr, plan] = await Promise.all([
          prisma.enrollment.findMany({
            where: { schoolId, classroomId: classroom.id, academicYearId: year.id },
            select: { id: true, enrollmentState: true, student: { select: { studentCode: true, firstNames: true, lastNamePaternal: true, lastNameMaternal: true } } },
          }),
          prisma.studyPlanCourse.findMany({
            where: { academicYearId: year.id, educationLevel: t.level, grade: t.grade, area: { kind: { not: 'WORKSHOP' } } },
            select: { area: { select: { officialAreaCode: true } } },
          }),
        ]);
        enrollments = enr.map((e) => ({ id: e.id, enrollmentState: e.enrollmentState, studentCode: e.student.studentCode, fullName: fullNameOf(e.student) }));
        planCodes = new Set(plan.map((p) => p.area.officialAreaCode).filter((c): c is string => !!c));
      }
    }
    return { year, classroom, enrollments, planCodes, issues, warnings };
  }

  // ───────────────────────── Fase 4: revisar la plantilla
  async inspect(schoolId: string, files: UploadedFile[]) {
    const parsed = await this.parse(files);
    const out = [];
    for (const t of parsed) {
      const ctx = await this.context(schoolId, t);
      const m = matchStudents(t, ctx.enrollments);
      let filledGrades = 0;
      let filledConclusions = 0;
      const areas = t.areas.map((a) => ({
        sheetName: a.sheet.name,
        siagieCode: a.siagieCode,
        siagieName: a.siagieName,
        areaCode: a.areaCode,
        areaName: areaName(t.level, a.areaCode, a),
        inStudyPlan: !!a.areaCode && ctx.planCodes.has(a.areaCode),
        competences: a.competences.map((c) => {
          let g = 0;
          let k = 0;
          for (const s of a.students) {
            if (LETTERS.has((a.cells.get(cellRef(c.nlCol, s.row)) ?? '').trim().toUpperCase())) g += 1;
            if (c.conclusionCol && (a.cells.get(cellRef(c.conclusionCol, s.row)) ?? '').trim().length >= CONCLUSION_MIN_LENGTH) k += 1;
          }
          filledGrades += g;
          filledConclusions += k;
          return {
            column: numToCol(c.nlCol),
            conclusionColumn: c.conclusionCol ? numToCol(c.conclusionCol) : '',
            label: c.label,
            name: c.name,
            cnebNumber: c.cnebNumber,
            filledGrades: g,
            filledConclusions: k,
          };
        }),
      }));
      const warnings = [...ctx.warnings];
      areas.filter((a) => a.areaCode && a.areaCode !== 'TRANS' && !a.inStudyPlan && ctx.classroom)
        .forEach((a) => warnings.push(`«${a.areaName}» está en la plantilla pero no en el plan de estudios: quedará vacía.`));
      out.push({
        fileName: t.fileName,
        level: t.level,
        levelText: t.levelText,
        grade: t.grade,
        gradeText: t.gradeText,
        section: t.section,
        periodCode: t.periodCode,
        periodNumber: t.periodNumber,
        periodText: t.periodText,
        year: t.year,
        classroom: ctx.classroom ? { id: ctx.classroom.id, label: `${gradeLabel(ctx.classroom.educationLevel, ctx.classroom.grade)} "${ctx.classroom.section}"` } : null,
        areas,
        students: { total: m.total, matched: m.matched.size, notInApp: m.notInApp, notInFile: m.notInFile, inactiveInApp: m.inactive },
        filledGrades,
        filledConclusions,
        issues: ctx.issues,
        warnings,
      });
    }
    return out;
  }

  // ───────────────────────── Fase 4b: traer a la app las notas que ya trae la plantilla
  async importGrades(schoolId: string, userId: string, files: UploadedFile[]) {
    const parsed = await this.parse(files);
    const results = [];
    for (const t of parsed) {
      const ctx = await this.context(schoolId, t);
      if (ctx.issues.length || !ctx.classroom || t.periodNumber === null) {
        results.push({ fileName: t.fileName, importedGrades: 0, importedConclusions: 0, skipped: ctx.issues.length ? ctx.issues : ['No se encontró el aula.'] });
        continue;
      }
      assertPeriod(ctx.year, t.periodNumber);
      const m = matchStudents(t, ctx.enrollments);
      const assignments = await prisma.courseAssignment.findMany({
        where: { schoolId, classroomId: ctx.classroom.id, academicYearId: ctx.year.id, deletedAt: null },
        include: { area: { include: { competences: { where: { isActive: true } } } } },
      });
      const skipped: string[] = [];
      let importedGrades = 0;
      let importedConclusions = 0;
      const ops: Array<() => Promise<unknown>> = [];

      for (const a of t.areas) {
        if (!a.areaCode) continue;
        const tributary = assignments.filter((x) => x.area.officialAreaCode === a.areaCode && x.area.kind !== 'WORKSHOP');
        const name = areaName(t.level, a.areaCode, a);
        if (tributary.length === 0) { skipped.push(`«${name}»: no tiene docente asignado en el aula.`); continue; }
        if (tributary.some((x) => x.area.kind === 'SUBCOURSE')) {
          skipped.push(`«${name}» está dividida en cursos: sus notas se registran por curso y no se importan desde el SIAGIE.`);
          continue;
        }
        const assignment = tributary[0];
        for (const c of a.competences) {
          const comp = assignment.area.competences.find((k) => k.cnebNumber === c.cnebNumber);
          if (!comp) continue;
          for (const s of a.students) {
            const enr = m.matched.get(s.studentCode);
            if (!enr || enr.enrollmentState !== 'REGISTERED') continue;
            const letter = (a.cells.get(cellRef(c.nlCol, s.row)) ?? '').trim().toUpperCase();
            const conclusion = c.conclusionCol ? sanitizeConclusion(a.cells.get(cellRef(c.conclusionCol, s.row))) : '';
            const key = { enrollmentId: enr.id, courseAssignmentId: assignment.id, competenceId: comp.id, periodNumber: t.periodNumber };
            if (LETTERS.has(letter)) {
              importedGrades += 1;
              ops.push(() => prisma.competencePeriodResult.upsert({
                where: { enrollmentId_courseAssignmentId_competenceId_periodNumber: key },
                update: { finalLetter: letter, isOverridden: true, overriddenById: userId, overriddenAt: new Date() },
                create: { schoolId, ...key, finalLetter: letter, suggestedLetter: null, isOverridden: true, overriddenById: userId, overriddenAt: new Date() },
              }));
            }
            if (conclusion.length >= CONCLUSION_MIN_LENGTH) {
              importedConclusions += 1;
              ops.push(() => prisma.competenceConclusion.upsert({
                where: { enrollmentId_courseAssignmentId_competenceId_periodNumber: key },
                update: { conclusion },
                create: { schoolId, ...key, conclusion },
              }));
            }
          }
        }
      }
      for (let i = 0; i < ops.length; i += 200) {
        await prisma.$transaction(ops.slice(i, i + 200).map((op) => op() as never));
      }
      if (m.notInApp.length) skipped.push(`${m.notInApp.length} estudiante(s) de la plantilla no están en el aula de la app.`);
      results.push({ fileName: t.fileName, importedGrades, importedConclusions, skipped });
    }
    return results;
  }

  // ───────────────────────── Fase 5: devolver la plantilla llena
  async fill(schoolId: string, files: UploadedFile[], opts: { fillFromBank: boolean; overwrite: boolean }) {
    const parsed = await this.parse(files);
    const outputs: Array<{ name: string; buffer: Buffer }> = [];
    const reports = [];

    // Frases del colegio (para completar conclusiones vacías) y frases de fábrica ocultas.
    const [schoolPhrases, hidden] = await Promise.all([
      prisma.conclusionPhrase.findMany({ where: { schoolId, ownerId: null }, select: { cnebNumber: true, letter: true, educationLevel: true, text: true } }),
      prisma.hiddenConclusionPhrase.findMany({ where: { schoolId }, select: { phraseKey: true } }),
    ]);
    const hiddenKeys = new Set(hidden.map((h) => h.phraseKey));
    const bankCache = new Map<string, string[]>();
    const bankFor = (level: EducationLevel, cneb: number, letter: PhraseLetter): string[] => {
      const k = `${level}|${cneb}|${letter}`;
      if (!bankCache.has(k)) {
        const own = schoolPhrases
          .filter((p) => p.cnebNumber === cneb && (!p.letter || p.letter === letter) && (!p.educationLevel || p.educationLevel === level))
          .map((p) => p.text);
        const factory = factoryPhrases({ cnebNumber: cneb, level, letter }).filter((f) => !hiddenKeys.has(f.key)).map((f) => f.text);
        bankCache.set(k, [...own, ...factory].map((x) => sanitizeConclusion(x)).filter((x) => x.length >= CONCLUSION_MIN_LENGTH));
      }
      return bankCache.get(k)!;
    };

    for (const t of parsed) {
      const ctx = await this.context(schoolId, t);
      const report = {
        fileName: t.fileName,
        outputName: t.fileName,
        classroomLabel: ctx.classroom ? `${gradeLabel(ctx.classroom.educationLevel, ctx.classroom.grade)} "${ctx.classroom.section}"` : null,
        periodText: t.periodText,
        matchedStudents: 0,
        totalStudents: t.areas[0]?.students.length ?? 0,
        writtenGrades: 0,
        writtenConclusions: 0,
        conclusionsFromBank: 0,
        keptFromFile: 0,
        missingGrades: 0,
        missingConclusions: 0,
        issues: [...ctx.issues],
        warnings: [...ctx.warnings],
      };
      if (ctx.issues.length || !ctx.classroom || t.periodNumber === null || !t.level) {
        reports.push(report);
        continue;
      }
      const level = t.level;
      const cons = await this.consolidation.getClassroomConsolidation(schoolId, ctx.classroom.id, t.periodNumber, ctx.year.id);
      const byCode = new Map(cons.matrix.students.filter((s) => s.studentCode).map((s) => [s.studentCode!, s]));
      const byName = new Map(cons.matrix.students.map((s) => [normalizeLabel(s.fullName), s]));
      const matchedNames = new Set<string>();

      for (const a of t.areas) {
        if (!a.areaCode) continue;
        const name = areaName(level, a.areaCode, a);
        const inPlan = ctx.planCodes.has(a.areaCode);
        if (!inPlan) {
          if (a.areaCode !== 'TRANS') report.warnings.push(`«${name}» no está en el plan de estudios: se deja como viene en la plantilla.`);
          else report.warnings.push(`Las competencias transversales no están en el plan de estudios: «${name}» se deja como viene.`);
          continue;
        }
        const updates: Array<{ ref: string; text: string }> = [];
        for (const c of a.competences) {
          if (c.cnebNumber === null) continue;
          const key = `${a.areaCode}_C${c.cnebNumber}`;
          const rotation = new Map<string, number>();
          for (const s of a.students) {
            const student = byCode.get(s.studentCode) ?? byName.get(normalizeLabel(s.fullName));
            if (!student) continue;
            matchedNames.add(s.studentCode);
            if (student.enrollmentState !== 'REGISTERED') continue;
            const value = student.consolidatedGrades[a.areaCode]?.competences[key];

            // 1. Nivel de logro. Regla: lo de la app manda; si la app no tiene nota, se respeta la plantilla.
            const nlRef = cellRef(c.nlCol, s.row);
            const current = (a.cells.get(nlRef) ?? '').trim().toUpperCase();
            let appLetter: string | null = value?.letter ?? null;
            if (appLetter === 'EXO') {
              report.warnings.push(`Hay estudiantes exonerados en «${CNEB_COMPETENCES[c.cnebNumber].shortName}» (${name}): esas celdas quedan vacías.`);
              appLetter = null;
            }
            let letter: string | null = null;
            if (appLetter && (opts.overwrite || !LETTERS.has(current))) {
              if (appLetter !== current) updates.push({ ref: nlRef, text: appLetter });
              report.writtenGrades += 1;
              letter = appLetter;
            } else if (LETTERS.has(current)) {
              report.keptFromFile += 1;
              letter = current;
            } else {
              report.missingGrades += 1;
            }
            if (!c.conclusionCol || !letter) continue;

            // 2. Conclusión descriptiva. La del docente manda; el banco solo llena celdas vacías.
            const cRef = cellRef(c.conclusionCol, s.row);
            const currentText = sanitizeConclusion(a.cells.get(cRef));
            const fileHasText = currentText.length >= CONCLUSION_MIN_LENGTH;
            const appText = sanitizeConclusion(value?.conclusion);
            let text = '';
            if (appText.length >= CONCLUSION_MIN_LENGTH && (opts.overwrite || !fileHasText)) {
              text = appText;
            } else if (fileHasText) {
              report.keptFromFile += 1;
              continue;
            } else if (opts.fillFromBank) {
              const bank = bankFor(level, c.cnebNumber, letter as PhraseLetter);
              if (bank.length) {
                const n = rotation.get(letter) ?? 0;
                rotation.set(letter, n + 1);
                text = bank[n % bank.length];
                report.conclusionsFromBank += 1;
              }
            }
            if (!text) { report.missingConclusions += 1; continue; }
            if (text !== currentText) updates.push({ ref: cRef, text });
            report.writtenConclusions += 1;
          }
        }
        await t.workbook.setCells(a.sheet, updates);
      }
      report.matchedStudents = matchedNames.size;
      const notMatched = report.totalStudents - report.matchedStudents;
      if (notMatched > 0) report.warnings.push(`${notMatched} estudiante(s) de la plantilla no se encontraron en el aula de la app: sus filas quedan como vienen.`);
      if (cons.summary.coursesWithoutTeacher) report.warnings.push(`${cons.summary.coursesWithoutTeacher} curso(s) del plan no tienen docente asignado en esta aula.`);
      // Avisos repetidos (ej. exonerados) se resumen.
      report.warnings = [...new Set(report.warnings)].slice(0, 40);
      outputs.push({ name: t.fileName, buffer: await t.workbook.toBuffer() });
      reports.push(report);
    }

    if (outputs.length === 0) {
      return { fileName: '', contentType: XLSX_TYPE, fileBase64: '', reports };
    }
    if (outputs.length === 1) {
      return { fileName: outputs[0].name, contentType: XLSX_TYPE, fileBase64: outputs[0].buffer.toString('base64'), reports };
    }
    const zip = new JSZip();
    const used = new Set<string>();
    for (const o of outputs) {
      let name = o.name;
      for (let i = 2; used.has(name.toLowerCase()); i += 1) name = o.name.replace(/\.xlsx$/i, ` (${i}).xlsx`);
      used.add(name.toLowerCase());
      zip.file(name, o.buffer);
    }
    const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    return { fileName: `Registros_SIAGIE_llenos_${new Date().toISOString().slice(0, 10)}.zip`, contentType: 'application/zip', fileBase64: buffer.toString('base64'), reports };
  }
}
