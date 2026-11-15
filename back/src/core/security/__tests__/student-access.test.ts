import { describe, it, expect, vi } from 'vitest';
import { assertEnrollmentAccess, assertStudentAccess } from '../student-access';
import { prisma } from '../../../config/prisma';
import { AppError } from '../../errors/app-error';
import type { AuthenticatedUser } from '../../interfaces/global.interfaces';

vi.mock('../../../config/prisma', () => ({
  prisma: {
    enrollment: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    student: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

describe('C4: Control de acceso a datos de estudiantes (fuga de asistencia / datos)', () => {
  const parentUser: AuthenticatedUser = {
    userId: 'parent-1',
    role: 'PARENT',
    schoolId: 'school-1',
  };

  const myChildEnrollment = {
    id: 'enr-child',
    studentId: 'student-child',
    classroomId: 'classroom-1',
    academicYearId: 'year-1',
    student: {
      id: 'student-child',
      familyRelations: [{ userId: 'parent-1' }],
    },
    classroom: {
      id: 'classroom-1',
      tutorTeacherId: 'teacher-1',
      years: [],
      assignments: [],
    },
  };

  const otherChildEnrollment = {
    id: 'enr-other',
    studentId: 'student-other',
    classroomId: 'classroom-1',
    academicYearId: 'year-1',
    student: {
      id: 'student-other',
      familyRelations: [{ userId: 'other-parent' }],
    },
    classroom: {
      id: 'classroom-1',
      tutorTeacherId: 'teacher-1',
      years: [],
      assignments: [],
    },
  };

  it('Un padre recibe 403 con la matrícula de un niño ajeno', async () => {
    vi.mocked(prisma.enrollment.findFirst).mockResolvedValueOnce(otherChildEnrollment as any);

    await expect(assertEnrollmentAccess(parentUser, 'enr-other')).rejects.toThrow(
      new AppError('No tienes permisos sobre este estudiante.', 403),
    );
  });

  it('Un padre tiene acceso exitoso con la matrícula de su propio hijo', async () => {
    vi.mocked(prisma.enrollment.findFirst).mockResolvedValueOnce(myChildEnrollment as any);

    const res = await assertEnrollmentAccess(parentUser, 'enr-child');
    expect(res.studentId).toBe('student-child');
  });

  it('Un alumno recibe 403 con la matrícula de otro alumno', async () => {
    const studentUser: AuthenticatedUser = {
      userId: 'student-user-1',
      studentId: 'student-child',
      role: 'STUDENT',
      schoolId: 'school-1',
    };
    vi.mocked(prisma.enrollment.findFirst).mockResolvedValueOnce(otherChildEnrollment as any);

    await expect(assertEnrollmentAccess(studentUser, 'enr-other')).rejects.toThrow(
      new AppError('No tienes permisos sobre este estudiante.', 403),
    );
  });

  it('Un docente sin asignación en el aula recibe 403', async () => {
    const teacherUser: AuthenticatedUser = {
      userId: 'teacher-unassigned',
      role: 'TEACHER',
      schoolId: 'school-1',
    };
    vi.mocked(prisma.enrollment.findFirst).mockResolvedValueOnce(myChildEnrollment as any);

    await expect(assertEnrollmentAccess(teacherUser, 'enr-child')).rejects.toThrow(
      new AppError('No tienes permisos sobre este estudiante.', 403),
    );
  });

  it('Un docente tutor del aula accede correctamente', async () => {
    const teacherUser: AuthenticatedUser = {
      userId: 'teacher-1',
      role: 'TEACHER',
      schoolId: 'school-1',
    };
    vi.mocked(prisma.enrollment.findFirst).mockResolvedValueOnce(myChildEnrollment as any);

    const res = await assertEnrollmentAccess(teacherUser, 'enr-child');
    expect(res.studentId).toBe('student-child');
  });
});
