import type { Role } from '@prisma/client';
import { AppError } from '../../core/errors/app-error';

export function assertTeacherAnnouncementAllowed(
  authorRole: string,
  teacherClassroomIds: string[],
  classroomId?: string | null,
  targetRoles?: Role[],
): void {
  if (authorRole === 'TEACHER') {
    if (!classroomId || !teacherClassroomIds.includes(classroomId)) {
      throw new AppError('Solo puedes publicar comunicados para tus aulas.', 403);
    }
    const forbiddenRoles: Role[] = ['ADMINISTRATIVE', 'SCHOOL_ADMIN', 'SUPER_ADMIN'];
    if (targetRoles && targetRoles.some((r) => forbiddenRoles.includes(r))) {
      throw new AppError('Solo puedes publicar comunicados para tus aulas.', 403);
    }
  }
}

