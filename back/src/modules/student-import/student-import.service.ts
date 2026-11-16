import { classroomYearService } from '../classrooms/classroom-year.service';
import { prisma } from '../../config/prisma';
import { randomBytes } from 'crypto';
import type { Prisma, RelationshipType } from '@prisma/client';
import { AppError } from '../../core/errors/app-error';
import { hashPassword } from '../../utils/hash.util';
import { resolveYear } from '../academic/academic.context';
import { gradeLabel } from '../academic/cneb.catalog';
import { feeScheduleService } from '../payments/fee-schedule.service';
import { studentQuotaFor } from '../schools/plan.rules';
import type { RawRow } from './student-import.columns';
import { classroomMatchKey, parseImportRow, type ImportGuardian, type ImportStudent, type ParsedImportRow } from './student-import.rules';
import { buildImportWorkbook, readImportWorkbook } from './student-import.workbook';
import type { ExistingStudent, OpenClassroom, StudentImportRepository } from './student-import.repository';

export type StudentAction = 'CREATE' | 'UPDATE' | 'NONE' | 'ERROR' | 'DUPLICATE';
export type EnrollmentAction = 'CREATE' | 'NONE' | 'SKIP';
export type GuardianAction = 'CREATE' | 'LINK' | 'NONE' | 'SKIP';

export interface ImportPlanRow {
  rowNumber: number;
  fullName: string;
  documentId: string;
  classroomLabel: string;
  guardianName: string;
  studentAction: StudentAction;
  enrollmentAction: EnrollmentAction;
  guardianAction: GuardianAction;
  changes: string[];
  issues: string[];
  warnings: string[];
}

export interface ImportPlan {
  school: { name: string };
  academicYear: { id: string; year: number; isActive: boolean };
  rows: ImportPlanRow[];
  summary: {
    total: number;
    createStudents: number;
    updateStudents: number;
    unchanged: number;
    errors: number;
    duplicates: number;
    createEnrollments: number;
    createGuardians: number;
  };
  notes: string[];
  blocking: string[];
}

export interface ImportResult {
  createdStudents: number;
  updatedStudents: number;
  createdEnrollments: number;
  createdGuardians: number;
  linkedGuardians: number;
  createdFees: number;
  enrollmentsWithoutFeeSchedule: number;
  skipped: number;
}

interface Decision {
  parsed: ParsedImportRow;
  plan: ImportPlanRow;
  existing: ExistingStudent | null;
  classroomId: string | null;
  hasEnrollment: boolean;
}

interface GuardianDecision {
  data: ImportGuardian;
  existingUserId: string | null;
  /** Correo con el que se crea (null si no trae o si ya lo usa otro usuario). */
  email: string | null;
}

interface PlanContext {
  plan: ImportPlan;
  decisions: Decision[];
  guardians: Map<string, GuardianDecision>;
  rejected: Array<{ raw: RawRow; reason: string }>;
}

const CHUNK_SIZE = 40;
const SHIFT_LABEL: Record<string, string> = { MORNING: 'Mañana', AFTERNOON: 'Tarde', NIGHT: 'Noche' };
const dayOf = (date: Date): string => date.toISOString().slice(0, 10);
const sameText = (a: string | null | undefined, b: string | null | undefined): boolean =>
  (a ?? '').trim().toLocaleUpperCase('es') === (b ?? '').trim().toLocaleUpperCase('es');

/** Datos del alumno que se comparan y actualizan; un valor vacío en el Excel nunca borra lo guardado. */
const STUDENT_FIELDS: Array<[keyof ImportStudent, string]> = [
  ['firstNames', 'Nombres'], ['lastNamePaternal', 'Apellido paterno'], ['lastNameMaternal', 'Apellido materno'],
  ['documentType', 'Tipo de documento'], ['gender', 'Sexo'], ['birthDate', 'Fecha de nacimiento'], ['studentCode', 'Código SIAGIE'],
  ['address', 'Dirección'], ['residenceUbigeo', 'Ubigeo de residencia'], ['birthCountry', 'País de nacimiento'],
  ['birthUbigeo', 'Ubigeo de nacimiento'], ['birthDepartment', 'Departamento de nacimiento'], ['birthProvince', 'Provincia de nacimiento'],
  ['birthDistrict', 'Distrito de nacimiento'], ['motherTongue', 'Lengua materna'], ['hasDisability', 'Discapacidad'], ['disabilityType', 'Tipo de discapacidad'],
];

const display = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '—';
  if (value instanceof Date) return dayOf(value);
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (value === 'MALE') return 'Hombre';
  if (value === 'FEMALE') return 'Mujer';
  return String(value);
};

function studentChanges(existing: ExistingStudent, incoming: ImportStudent): { changes: string[]; data: Prisma.StudentUncheckedUpdateInput } {
  const changes: string[] = [];
  const data: Record<string, unknown> = {};
  for (const [field, label] of STUDENT_FIELDS) {
    const next = incoming[field];
    if (next === null || next === undefined) continue;
    const current = existing[field as keyof ExistingStudent] as unknown;
    const equal = next instanceof Date
      ? current instanceof Date && dayOf(current) === dayOf(next)
      : typeof next === 'string' ? sameText(current as string | null, next) : current === next;
    if (equal) continue;
    changes.push(`${label}: ${display(current)} → ${display(next)}`);
    data[field] = next;
  }
  return { changes, data: data as Prisma.StudentUncheckedUpdateInput };
}

export function classroomLabels(classrooms: OpenClassroom[]): Map<string, string> {
  const base = (classroom: OpenClassroom): string => `${gradeLabel(classroom.educationLevel, classroom.grade)} "${classroom.section}"`;
  const repeated = new Map<string, number>();
  classrooms.forEach((classroom) => repeated.set(base(classroom), (repeated.get(base(classroom)) ?? 0) + 1));
  // El turno solo se escribe cuando hay dos aulas con el mismo grado y sección
  return new Map(classrooms.map((classroom) => [
    classroom.id,
    (repeated.get(base(classroom)) ?? 0) > 1 ? `${base(classroom)} - ${SHIFT_LABEL[classroom.shift]}` : base(classroom),
  ]));
}

const fullNameOf = (person: { lastNamePaternal: string; lastNameMaternal?: string | null; firstNames?: string; firstName?: string }): string =>
  `${`${person.lastNamePaternal} ${person.lastNameMaternal ?? ''}`.replace(/\s+/g, ' ').trim()}, ${person.firstNames ?? person.firstName ?? ''}`;

export class StudentImportService {
  constructor(private readonly repository: StudentImportRepository) {}

  async buildTemplate(schoolId: string, academicYearId?: string): Promise<{ buffer: Buffer; fileName: string }> {
    const [school, year] = await Promise.all([this.repository.findSchool(schoolId), resolveYear(schoolId, academicYearId)]);
    const classrooms = await this.repository.findOpenClassrooms(schoolId, year.id);
    if (classrooms.length === 0) {
      throw new AppError(`El colegio aún no tiene aulas abiertas en ${year.year}. Créalas en Aulas antes de descargar la plantilla.`, 409);
    }
    const buffer = await buildImportWorkbook({
      schoolName: school?.name ?? 'Colegio',
      year: year.year,
      classroomLabels: [...classroomLabels(classrooms).values()],
    });
    return { buffer, fileName: `plantilla-alumnos-${year.year}.xlsx` };
  }

  async preview(schoolId: string, academicYearId: string | undefined, file: Buffer): Promise<ImportPlan> {
    return (await this.buildPlan(schoolId, academicYearId, file)).plan;
  }

  /** Excel con las filas que no se pueden cargar y su motivo, listo para corregir y volver a subir. */
  async buildRejectedWorkbook(schoolId: string, academicYearId: string | undefined, file: Buffer): Promise<{ buffer: Buffer; fileName: string; rows: number }> {
    const context = await this.buildPlan(schoolId, academicYearId, file);
    if (context.rejected.length === 0) throw new AppError('El archivo no tiene filas rechazadas.', 400);
    const classrooms = await this.repository.findOpenClassrooms(schoolId, context.plan.academicYear.id);
    const buffer = await buildImportWorkbook({
      schoolName: context.plan.school.name,
      year: context.plan.academicYear.year,
      classroomLabels: [...classroomLabels(classrooms).values()],
      rejected: context.rejected,
    });
    return { buffer, fileName: `alumnos-por-corregir-${context.plan.academicYear.year}.xlsx`, rows: context.rejected.length };
  }

  private async buildPlan(schoolId: string, academicYearId: string | undefined, file: Buffer): Promise<PlanContext> {
    const [school, year] = await Promise.all([this.repository.findSchool(schoolId), resolveYear(schoolId, academicYearId)]);
    let read: Awaited<ReturnType<typeof readImportWorkbook>>;
    try {
      read = await readImportWorkbook(file);
    } catch (error) {
      throw new AppError((error as Error).message || 'No se pudo leer el archivo.', 400);
    }
    if (read.rows.length === 0) throw new AppError('El archivo no tiene alumnos. Llena la hoja "Alumnos" a partir de la fila 3.', 400);

    const parsedRows = read.rows.map((row) => parseImportRow(row.raw, row.rowNumber));
    const valid = parsedRows.filter((row) => row.student);
    const documentIds = valid.map((row) => row.student!.documentId);
    const studentCodes = valid.map((row) => row.student!.studentCode).filter((code): code is string => !!code);
    const incomingGuardians = valid.flatMap((row) => [row.guardian, row.secondGuardian]).filter((guardian): guardian is ImportGuardian => !!guardian);
    const guardianEmails = [...new Set(incomingGuardians.map((guardian) => guardian.email).filter((email): email is string => !!email))];

    const [classrooms, existingStudents, users, takenEmails, currentStudents] = await Promise.all([
      this.repository.findOpenClassrooms(schoolId, year.id),
      this.repository.findStudentsByIdentity(schoolId, documentIds, studentCodes),
      this.repository.findUsersByDocument(schoolId, [...new Set(incomingGuardians.map((guardian) => guardian.documentId))]),
      this.repository.findTakenEmails(schoolId, guardianEmails),
      this.repository.countStudents(schoolId),
    ]);
    const enrollments = await this.repository.findEnrollmentsOfYear(schoolId, year.id, existingStudents.map((student) => student.id));

    const labels = classroomLabels(classrooms);
    const classroomByKey = new Map(classrooms.map((classroom) => [classroomMatchKey(labels.get(classroom.id)!), classroom.id]));
    const studentByDocument = new Map(existingStudents.map((student) => [student.documentId, student]));
    const studentByCode = new Map(existingStudents.filter((student) => student.studentCode).map((student) => [student.studentCode!, student]));
    const enrollmentByStudent = new Map(enrollments.map((enrollment) => [enrollment.studentId, enrollment]));
    const userByDocument = new Map(users.filter((user) => user.documentId).map((user) => [user.documentId!, user]));
    const emailOwner = new Map(takenEmails.map((taken) => [taken.email, taken]));

    const guardians = new Map<string, GuardianDecision>();
    const emailsInFile = new Map<string, string>(); // correo → documento del apoderado que lo usará
    const seenDocuments = new Set<string>();
    const seenCodes = new Set<string>();
    const decisions: Decision[] = [];

    /** Registra al apoderado (una sola vez por documento) y devuelve si se crea o ya existe. */
    const planGuardian = (guardian: ImportGuardian, warnings: string[]): GuardianDecision => {
      const known = guardians.get(guardian.documentId);
      if (known) return known;
      const existingUser = userByDocument.get(guardian.documentId) ?? null;
      let email = existingUser ? null : guardian.email;
      if (email) {
        const owner = emailOwner.get(email);
        const usedInFile = emailsInFile.get(email);
        if (owner || (usedInFile && usedInFile !== guardian.documentId)) {
          warnings.push(`El correo ${email} ya lo usa otra persona: ${fullNameOf(guardian)} se registra sin correo e ingresa con su documento.`);
          email = null;
        } else {
          emailsInFile.set(email, guardian.documentId);
        }
      }
      if (existingUser && existingUser.role !== 'PARENT') {
        warnings.push(`El documento ${guardian.documentId} pertenece a un usuario del personal del colegio (${existingUser.firstName} ${existingUser.lastNamePaternal}): se vincula como familiar, pero conserva su acceso de personal.`);
      }
      const decision: GuardianDecision = { data: guardian, existingUserId: existingUser?.id ?? null, email };
      guardians.set(guardian.documentId, decision);
      return decision;
    };

    for (const parsed of parsedRows) {
      const raw = parsed.raw;
      const issues = [...parsed.issues];
      const warnings = [...parsed.warnings];
      const base: ImportPlanRow = {
        rowNumber: parsed.rowNumber,
        fullName: fullNameOf({ lastNamePaternal: raw.lastNamePaternal, lastNameMaternal: raw.lastNameMaternal, firstNames: raw.firstNames }).toLocaleUpperCase('es'),
        documentId: parsed.student?.documentId ?? raw.documentId,
        classroomLabel: parsed.enrollment.classroomText || '—',
        guardianName: parsed.guardian ? fullNameOf(parsed.guardian) : '—',
        studentAction: 'ERROR', enrollmentAction: 'SKIP', guardianAction: 'SKIP',
        changes: [], issues, warnings,
      };
      const reject = (action: StudentAction = 'ERROR'): void => {
        decisions.push({ parsed, plan: { ...base, studentAction: action }, existing: null, classroomId: null, hasEnrollment: false });
      };

      const classroomId = classroomByKey.get(classroomMatchKey(parsed.enrollment.classroomText)) ?? null;
      if (parsed.enrollment.classroomText && !classroomId) {
        issues.push(`El aula "${parsed.enrollment.classroomText}" no existe o no está abierta en ${year.year}. Elígela de la lista de la plantilla.`);
      }
      const student = parsed.student;
      if (!student || !parsed.guardian || !classroomId) { reject(); continue; }
      base.classroomLabel = labels.get(classroomId) ?? base.classroomLabel;

      if (seenDocuments.has(student.documentId)) {
        warnings.push('Este documento aparece más de una vez en el archivo: se toma la primera fila.');
        reject('DUPLICATE');
        continue;
      }
      seenDocuments.add(student.documentId);

      const existing = studentByDocument.get(student.documentId) ?? null;
      if (student.studentCode) {
        const codeOwner = studentByCode.get(student.studentCode);
        if (codeOwner && codeOwner.id !== existing?.id) {
          issues.push(`El código SIAGIE ${student.studentCode} ya pertenece a ${fullNameOf(codeOwner)} (documento ${codeOwner.documentId}).`);
        } else if (seenCodes.has(student.studentCode)) {
          issues.push(`El código SIAGIE ${student.studentCode} está repetido en otra fila del archivo.`);
        }
        seenCodes.add(student.studentCode);
      }
      if (issues.length) { reject(); continue; }

      const changes = existing ? studentChanges(existing, student).changes : [];
      const enrollment = existing ? enrollmentByStudent.get(existing.id) : undefined;
      if (enrollment && enrollment.classroomId !== classroomId) {
        const currentRoom = labels.get(enrollment.classroomId) ?? 'otra aula';
        warnings.push(`Ya está matriculado en ${currentRoom} este año: no se cambia de aula desde la carga masiva.`);
      }

      const principal = planGuardian(parsed.guardian, warnings);
      if (parsed.secondGuardian) planGuardian(parsed.secondGuardian, warnings);
      const alreadyLinked = !!existing && !!principal.existingUserId && existing.familyRelations.some((relation) => relation.userId === principal.existingUserId);

      decisions.push({
        parsed,
        existing,
        classroomId,
        hasEnrollment: !!enrollment,
        plan: {
          ...base,
          studentAction: !existing ? 'CREATE' : changes.length ? 'UPDATE' : 'NONE',
          enrollmentAction: enrollment ? 'NONE' : 'CREATE',
          guardianAction: !principal.existingUserId ? 'CREATE' : alreadyLinked ? 'NONE' : 'LINK',
          changes,
        },
      });
    }

    const rows = decisions.map((decision) => decision.plan);
    const actionable = rows.filter((row) => row.studentAction !== 'ERROR' && row.studentAction !== 'DUPLICATE');
    const createStudents = rows.filter((row) => row.studentAction === 'CREATE').length;
    const blocking: string[] = [];
    const quota = studentQuotaFor(school?.plan ?? 'BASIC');
    if (currentStudents + createStudents > quota) {
      blocking.push(`El plan del colegio permite ${quota} alumnos: ya tiene ${currentStudents} y el archivo agrega ${createStudents}. Sube el plan o carga menos alumnos.`);
    }
    // Vacantes: matrículas nuevas por sección frente a sus vacantes libres
    const newByClassroom = new Map<string, number>();
    for (const decision of decisions) {
      if (decision.plan.enrollmentAction === 'CREATE' && decision.classroomId) {
        newByClassroom.set(decision.classroomId, (newByClassroom.get(decision.classroomId) ?? 0) + 1);
      }
    }
    for (const [classroomId, adding] of newByClassroom) {
      const v = await classroomYearService.vacancyOf(prisma, schoolId, classroomId, year.id);
      if (v.capacity > 0 && v.enrolled + adding > v.capacity) {
        blocking.push(`${v.label}: tiene ${v.free} vacante(s) libre(s) y el archivo agrega ${adding} alumno(s). Aumenta las vacantes en Aulas o reparte a los alumnos en otra sección.`);
      }
    }
    const notes: string[] = [];
    if (read.missingOptionalColumns.length) notes.push(`El archivo no trae estas columnas opcionales (se cargan vacías): ${read.missingOptionalColumns.join(', ')}.`);
    if (!year.isActive) notes.push(`Estás cargando en ${year.year}, que no es el año vigente: las matrículas quedan registradas para ese año.`);

    const plan: ImportPlan = {
      school: { name: school?.name ?? 'Colegio' },
      academicYear: { id: year.id, year: year.year, isActive: year.isActive },
      rows,
      summary: {
        total: rows.length,
        createStudents,
        updateStudents: rows.filter((row) => row.studentAction === 'UPDATE').length,
        unchanged: actionable.filter((row) => row.studentAction === 'NONE' && row.enrollmentAction === 'NONE' && row.guardianAction === 'NONE').length,
        errors: rows.filter((row) => row.studentAction === 'ERROR').length,
        duplicates: rows.filter((row) => row.studentAction === 'DUPLICATE').length,
        createEnrollments: rows.filter((row) => row.enrollmentAction === 'CREATE').length,
        createGuardians: [...guardians.values()].filter((guardian) => !guardian.existingUserId).length,
      },
      notes,
      blocking,
    };
    const rejected = decisions
      .filter((decision) => decision.plan.studentAction === 'ERROR' || decision.plan.studentAction === 'DUPLICATE')
      .map((decision) => ({
        raw: decision.parsed.raw,
        reason: decision.plan.studentAction === 'DUPLICATE'
          ? 'Documento repetido en el archivo: ya se cargó la primera fila con este número.'
          : decision.plan.issues.join(' '),
      }));
    return { plan, decisions, guardians, rejected };
  }

  async commit(schoolId: string, academicYearId: string | undefined, file: Buffer, options: { generateFees: boolean }): Promise<ImportResult> {
    const context = await this.buildPlan(schoolId, academicYearId, file);
    if (context.plan.blocking.length) throw new AppError(context.plan.blocking.join(' '), 403);
    const year = context.plan.academicYear;
    const actionable = context.decisions.filter((decision) => decision.plan.studentAction !== 'ERROR' && decision.plan.studentAction !== 'DUPLICATE');
    const result: ImportResult = {
      createdStudents: 0, updatedStudents: 0, createdEnrollments: 0, createdGuardians: 0, linkedGuardians: 0,
      createdFees: 0, enrollmentsWithoutFeeSchedule: 0, skipped: context.decisions.length - actionable.length,
    };

    // 1. Apoderados nuevos. Nacen con una contraseña que nadie conoce: el acceso se entrega después
    //    con "Credenciales de acceso", que les genera la contraseña temporal por aula.
    const unusablePasswordHash = await hashPassword(randomBytes(32).toString('base64'));
    const guardianUserId = new Map<string, string>();
    for (const [documentId, guardian] of context.guardians) {
      if (guardian.existingUserId) {
        guardianUserId.set(documentId, guardian.existingUserId);
        if (guardian.data.cellphone) await this.repository.fillGuardianCellphone(schoolId, guardian.existingUserId, guardian.data.cellphone);
        continue;
      }
      const userId = await this.repository.createGuardian(schoolId, {
        email: guardian.email,
        passwordHash: unusablePasswordHash,
        mustChangePassword: true,
        firstName: guardian.data.firstName,
        lastNamePaternal: guardian.data.lastNamePaternal,
        lastNameMaternal: guardian.data.lastNameMaternal,
        documentType: guardian.data.documentType,
        documentId,
        cellphone: guardian.data.cellphone,
        educationLevel: guardian.data.educationLevel,
      });
      guardianUserId.set(documentId, userId);
      result.createdGuardians += 1;
    }

    // 2. Alumnos, matrículas y vínculos familiares, en lotes transaccionales
    for (let start = 0; start < actionable.length; start += CHUNK_SIZE) {
      const chunk = actionable.slice(start, start + CHUNK_SIZE);
      await this.repository.runInTransaction(async (tx) => {
        for (const decision of chunk) {
          const student = decision.parsed.student!;
          let studentId = decision.existing?.id ?? null;
          if (!decision.existing) {
            const created = await tx.student.create({
              data: {
                schoolId,
                firstNames: student.firstNames,
                lastNamePaternal: student.lastNamePaternal,
                lastNameMaternal: student.lastNameMaternal,
                documentType: student.documentType,
                documentId: student.documentId,
                gender: student.gender,
                birthDate: student.birthDate,
                studentCode: student.studentCode,
                address: student.address,
                residenceUbigeo: student.residenceUbigeo,
                birthCountry: student.birthCountry ?? 'PERÚ',
                birthUbigeo: student.birthUbigeo,
                birthDepartment: student.birthDepartment,
                birthProvince: student.birthProvince,
                birthDistrict: student.birthDistrict,
                motherTongue: student.motherTongue ?? 'CASTELLANO',
                hasDisability: student.hasDisability ?? false,
                disabilityType: student.disabilityType,
              },
              select: { id: true },
            });
            studentId = created.id;
            result.createdStudents += 1;
          } else if (decision.plan.studentAction === 'UPDATE') {
            await tx.student.update({ where: { id: decision.existing.id }, data: studentChanges(decision.existing, student).data });
            result.updatedStudents += 1;
          }
          if (!studentId) continue;

          if (!decision.hasEnrollment) {
            const enrollment = await tx.enrollment.create({
              data: {
                schoolId,
                studentId,
                academicYearId: year.id,
                classroomId: decision.classroomId!,
                isActive: year.isActive,
                condition: decision.parsed.enrollment.condition,
                repeatingGrade: decision.parsed.enrollment.repeatingGrade,
                previousSchoolModularCode: decision.parsed.enrollment.previousSchoolModularCode,
              },
              select: { id: true },
            });
            result.createdEnrollments += 1;
            if (options.generateFees) {
              const schedule = await feeScheduleService.generateForEnrollmentInTx(tx, schoolId, enrollment.id);
              result.createdFees += schedule.created;
              if (!schedule.feeScheduleFound) result.enrollmentsWithoutFeeSchedule += 1;
            }
          }

          // El principal es apoderado legal y responsable de pago, salvo que el alumno ya tenga uno
          const relations = decision.existing?.familyRelations ?? [];
          const linked = new Set(relations.map((relation) => relation.userId));
          const family: Array<{ guardian: ImportGuardian; principal: boolean }> = [{ guardian: decision.parsed.guardian!, principal: true }];
          if (decision.parsed.secondGuardian) family.push({ guardian: decision.parsed.secondGuardian, principal: false });
          for (const { guardian, principal } of family) {
            const userId = guardianUserId.get(guardian.documentId);
            if (!userId) continue;
            const relationshipType: RelationshipType = guardian.relationshipType;
            await tx.familyRelationship.upsert({
              where: { studentId_userId: { studentId, userId } },
              update: { relationshipType, livesWithStudent: guardian.livesWithStudent },
              create: {
                studentId,
                userId,
                relationshipType,
                livesWithStudent: guardian.livesWithStudent,
                isLegalGuardian: principal && !relations.some((relation) => relation.isLegalGuardian),
                isFinancialResponsible: principal && !relations.some((relation) => relation.isFinancialResponsible),
              },
            });
            if (!linked.has(userId)) result.linkedGuardians += 1;
          }
        }
      });
    }
    return result;
  }
}
