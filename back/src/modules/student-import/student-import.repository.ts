import type { EducationLevel, Prisma, Shift } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { classroomYearService } from '../classrooms/classroom-year.service';

/** Única capa de la carga masiva que toca la base de datos. Todo va filtrado por colegio. */

export const EXISTING_STUDENT_SELECT = {
  id: true, studentCode: true, documentType: true, documentId: true, firstNames: true, lastNamePaternal: true,
  lastNameMaternal: true, gender: true, birthDate: true, address: true, residenceUbigeo: true, birthCountry: true,
  birthUbigeo: true, birthDepartment: true, birthProvince: true, birthDistrict: true, motherTongue: true,
  hasDisability: true, disabilityType: true,
  familyRelations: { select: { userId: true, isLegalGuardian: true, isFinancialResponsible: true } },
} satisfies Prisma.StudentSelect;

export type ExistingStudent = Prisma.StudentGetPayload<{ select: typeof EXISTING_STUDENT_SELECT }>;

export interface OpenClassroom {
  id: string;
  educationLevel: EducationLevel;
  grade: number;
  section: string;
  shift: Shift;
}

export class StudentImportRepository {
  async findSchool(schoolId: string): Promise<{ name: string; plan: string } | null> {
    return prisma.school.findUnique({ where: { id: schoolId }, select: { name: true, plan: true } });
  }

  async countStudents(schoolId: string): Promise<number> {
    return prisma.student.count({ where: { schoolId } });
  }

  /** Aulas en las que se puede matricular ese año (todas, si el año aún no definió sus secciones). */
  async findOpenClassrooms(schoolId: string, academicYearId: string): Promise<OpenClassroom[]> {
    const [classrooms, sections] = await Promise.all([
      prisma.classroom.findMany({
        where: { schoolId },
        select: { id: true, educationLevel: true, grade: true, section: true, shift: true },
        orderBy: [{ educationLevel: 'asc' }, { grade: 'asc' }, { section: 'asc' }, { shift: 'asc' }],
      }),
      classroomYearService.sectionsOf(schoolId, academicYearId),
    ]);
    if (sections.length === 0) return classrooms;
    const open = new Set(sections.map((section) => section.classroomId));
    return classrooms.filter((classroom) => open.has(classroom.id));
  }

  async findStudentsByIdentity(schoolId: string, documentIds: string[], studentCodes: string[]): Promise<ExistingStudent[]> {
    return prisma.student.findMany({
      where: { schoolId, OR: [{ documentId: { in: documentIds } }, { studentCode: { in: studentCodes } }] },
      select: EXISTING_STUDENT_SELECT,
    });
  }

  /** El código SIAGIE es único en toda la plataforma: detecta los que ya usa otro colegio. */
  async findStudentCodesInOtherSchools(schoolId: string, studentCodes: string[]): Promise<string[]> {
    if (studentCodes.length === 0) return [];
    const rows = await prisma.student.findMany({
      where: { schoolId: { not: schoolId }, studentCode: { in: studentCodes } },
      select: { studentCode: true },
    });
    return rows.map((row) => row.studentCode).filter((code): code is string => !!code);
  }

  async findEnrollmentsOfYear(schoolId: string, academicYearId: string, studentIds: string[]) {
    return prisma.enrollment.findMany({
      where: { schoolId, academicYearId, studentId: { in: studentIds } },
      select: { studentId: true, classroomId: true },
    });
  }

  async findUsersByDocument(schoolId: string, documentIds: string[]) {
    return prisma.user.findMany({
      where: { schoolId, documentId: { in: documentIds } },
      select: { id: true, documentId: true, role: true, cellphone: true, firstName: true, lastNamePaternal: true },
    });
  }

  /** El correo es único en toda la plataforma, por eso esta consulta no se limita al colegio. */
  async findTakenEmails(emails: string[]): Promise<Array<{ email: string; schoolId: string; documentId: string | null }>> {
    if (emails.length === 0) return [];
    const rows = await prisma.user.findMany({
      where: { email: { in: emails, mode: 'insensitive' } },
      select: { email: true, schoolId: true, documentId: true },
    });
    return rows.map((row) => ({ email: (row.email ?? '').toLowerCase(), schoolId: row.schoolId, documentId: row.documentId }));
  }

  async createGuardian(schoolId: string, data: Omit<Prisma.UserUncheckedCreateInput, 'schoolId' | 'role'>): Promise<string> {
    const user = await prisma.user.create({ data: { ...data, schoolId, role: 'PARENT' }, select: { id: true } });
    return user.id;
  }

  async fillGuardianCellphone(schoolId: string, userId: string, cellphone: string): Promise<void> {
    await prisma.user.updateMany({ where: { id: userId, schoolId, cellphone: null }, data: { cellphone } });
  }

  async runInTransaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(work, { timeout: 60_000, maxWait: 15_000 });
  }
}
