import { prisma } from '../../config/prisma';
import { AppError } from '../errors/app-error';
import type { AuthenticatedUser } from '../interfaces/global.interfaces';

export async function assertEnrollmentAccess(
  user: AuthenticatedUser,
  enrollmentId: string,
): Promise<{ studentId: string; classroomId: string; academicYearId: string }> {
  if (user.role === 'SUPER_ADMIN') {
    const enr = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      select: { studentId: true, classroomId: true, academicYearId: true },
    });
    if (!enr) throw new AppError('Matrícula no encontrada.', 404);
    return enr;
  }

  const enrollment = await prisma.enrollment.findFirst({
    where: { id: enrollmentId, schoolId: user.schoolId },
    select: {
      id: true,
      studentId: true,
      classroomId: true,
      academicYearId: true,
      student: {
        select: {
          id: true,
          familyRelations: { select: { userId: true } },
        },
      },
      classroom: {
        select: {
          id: true,
          tutorTeacherId: true,
          years: {
            select: { tutorTeacherId: true, academicYearId: true },
          },
          assignments: {
            where: { deletedAt: null },
            select: { teacherId: true, academicYearId: true },
          },
        },
      },
    },
  });

  if (!enrollment) {
    throw new AppError('Matrícula no encontrada.', 404);
  }

  if (user.role === 'SCHOOL_ADMIN' || user.role === 'ADMINISTRATIVE') {
    return {
      studentId: enrollment.studentId,
      classroomId: enrollment.classroomId,
      academicYearId: enrollment.academicYearId,
    };
  }

  if (user.role === 'STUDENT') {
    const myStudentId = user.studentId || user.userId;
    if (enrollment.studentId !== myStudentId) {
      throw new AppError('No tienes permisos sobre este estudiante.', 403);
    }
    return {
      studentId: enrollment.studentId,
      classroomId: enrollment.classroomId,
      academicYearId: enrollment.academicYearId,
    };
  }

  if (user.role === 'PARENT') {
    const isGuardian = enrollment.student.familyRelations.some((r: { userId: string }) => r.userId === user.userId);
    if (!isGuardian) {
      throw new AppError('No tienes permisos sobre este estudiante.', 403);
    }
    return {
      studentId: enrollment.studentId,
      classroomId: enrollment.classroomId,
      academicYearId: enrollment.academicYearId,
    };
  }

  if (user.role === 'TEACHER') {
    const isTutor =
      enrollment.classroom?.tutorTeacherId === user.userId ||
      (enrollment.classroom?.years?.some(
        (cy: { tutorTeacherId: string | null; academicYearId: string }) =>
          cy.tutorTeacherId === user.userId && cy.academicYearId === enrollment.academicYearId,
      ) ?? false);
    const hasCourse =
      enrollment.classroom?.assignments?.some(
        (ca: { teacherId: string; academicYearId: string }) =>
          ca.teacherId === user.userId && ca.academicYearId === enrollment.academicYearId,
      ) ?? false;

    if (!isTutor && !hasCourse) {
      throw new AppError('No tienes permisos sobre este estudiante.', 403);
    }
    return {
      studentId: enrollment.studentId,
      classroomId: enrollment.classroomId,
      academicYearId: enrollment.academicYearId,
    };
  }

  throw new AppError('No tienes permisos sobre este estudiante.', 403);
}

export async function assertStudentAccess(
  user: AuthenticatedUser,
  studentId: string,
): Promise<void> {
  if (user.role === 'SUPER_ADMIN') {
    const s = await prisma.student.findUnique({ where: { id: studentId }, select: { id: true } });
    if (!s) throw new AppError('Estudiante no encontrado.', 404);
    return;
  }

  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId: user.schoolId },
    select: {
      id: true,
      familyRelations: { select: { userId: true } },
      enrollments: {
        where: { isActive: true },
        select: {
          academicYearId: true,
          classroomId: true,
          classroom: {
            select: {
              tutorTeacherId: true,
              years: { select: { tutorTeacherId: true, academicYearId: true } },
              assignments: { where: { deletedAt: null }, select: { teacherId: true, academicYearId: true } },
            },
          },
        },
      },
    },
  });

  if (!student) {
    throw new AppError('Estudiante no encontrado.', 404);
  }

  if (user.role === 'SCHOOL_ADMIN' || user.role === 'ADMINISTRATIVE') {
    return;
  }

  if (user.role === 'STUDENT') {
    const myStudentId = user.studentId || user.userId;
    if (student.id !== myStudentId) {
      throw new AppError('No tienes permisos sobre este estudiante.', 403);
    }
    return;
  }

  if (user.role === 'PARENT') {
    const isGuardian = student.familyRelations.some((r: { userId: string }) => r.userId === user.userId);
    if (!isGuardian) {
      throw new AppError('No tienes permisos sobre este estudiante.', 403);
    }
    return;
  }

  if (user.role === 'TEACHER') {
    const teachesInAnyClass = student.enrollments.some((enr: any) => {
      const isTutor =
        enr.classroom.tutorTeacherId === user.userId ||
        enr.classroom.years.some(
          (cy: any) => cy.tutorTeacherId === user.userId && cy.academicYearId === enr.academicYearId,
        );
      const hasCourse = enr.classroom.assignments.some(
        (ca: any) => ca.teacherId === user.userId && ca.academicYearId === enr.academicYearId,
      );
      return isTutor || hasCourse;
    });

    if (!teachesInAnyClass) {
      throw new AppError('No tienes permisos sobre este estudiante.', 403);
    }
    return;
  }

  throw new AppError('No tienes permisos sobre este estudiante.', 403);
}
