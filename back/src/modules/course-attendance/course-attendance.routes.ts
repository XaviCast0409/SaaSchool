import { Router } from 'express';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';
import { courseAttendanceController } from './course-attendance.controller';

export const courseAttendanceRouter = Router();

courseAttendanceRouter.use(authMiddleware, tenantMiddleware);

courseAttendanceRouter.get(
  '/session',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'),
  courseAttendanceController.getSession,
);

courseAttendanceRouter.put(
  '/session',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'),
  courseAttendanceController.saveSession,
);

courseAttendanceRouter.get(
  '/summary',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'),
  courseAttendanceController.getSummary,
);
