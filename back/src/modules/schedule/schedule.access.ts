import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';

export interface Viewer {
  userId: string;
  role: string;
  schoolId: string;
  studentId?: string | null;
}

export const STAFF_ROLES = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'] as const;
export const isStaff = (v: Viewer) => (STAFF_ROLES as readonly string[]).includes(v.role);

export async function activeYear(schoolId: string) {
  return prisma.academicYear.findFirst({
    where: { schoolId, isActive: true },
    orderBy: { year: 'desc' },
    select: { id: true, year: true, startDate: true, endDate: true },
  });
}

/** Verifica que quien consulta pueda ver los datos de este alumno (el propio alumno, su apoderado o el personal). */
export async function assertStudentAccess(viewer: Viewer, studentId: string) {
  if (viewer.role === 'STUDENT') {
    if (viewer.studentId !== studentId) throw new AppError('Solo puedes ver tu propio horario.', 403);
    return;
  }
  if (viewer.role === 'PARENT') {
    const rel = await prisma.familyRelationship.findFirst({ where: { userId: viewer.userId, studentId }, select: { id: true } });
    if (!rel) throw new AppError('Solo puedes ver el horario de tus hijos.', 403);
    return;
  }
  if (!isStaff(viewer)) throw new AppError('Sin acceso.', 403);
  const s = await prisma.student.findFirst({ where: { id: studentId, schoolId: viewer.schoolId }, select: { id: true } });
  if (!s) throw new AppError('Alumno no encontrado.', 404);
}

/** Matrícula vigente del alumno (año activo) con su aula. */
export async function currentEnrollment(schoolId: string, studentId: string) {
  const year = await activeYear(schoolId);
  if (!year) return null;
  return prisma.enrollment.findFirst({
    where: { schoolId, studentId, academicYearId: year.id, isActive: true },
    select: {
      id: true,
      classroomId: true,
      academicYearId: true,
      classroom: { select: { id: true, grade: true, section: true, educationLevel: true } },
    },
  });
}

/** Alumnos que la persona puede consultar: sus hijos (apoderado) o él mismo (alumno). */
export async function viewerStudentIds(viewer: Viewer): Promise<string[]> {
  if (viewer.role === 'STUDENT' && viewer.studentId) return [viewer.studentId];
  if (viewer.role === 'PARENT') {
    const rels = await prisma.familyRelationship.findMany({ where: { userId: viewer.userId }, select: { studentId: true } });
    return rels.map((r) => r.studentId);
  }
  return [];
}
