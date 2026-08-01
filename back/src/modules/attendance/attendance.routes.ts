import { Router } from 'express';
import { AttendanceRepository } from './attendance.repository';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';

const attendanceRepository = new AttendanceRepository();
const attendanceService = new AttendanceService(attendanceRepository);
const attendanceController = new AttendanceController(attendanceService);

export const attendanceRouter = Router();

attendanceRouter.use(authMiddleware, tenantMiddleware);

attendanceRouter.get('/', authorizeRoles('SCHOOL_ADMIN', 'TEACHER'), attendanceController.getByDate);
attendanceRouter.get('/enrollment/:enrollmentId', authorizeRoles('SCHOOL_ADMIN', 'TEACHER'), attendanceController.getByEnrollment);
attendanceRouter.post('/', authorizeRoles('TEACHER', 'SCHOOL_ADMIN'), attendanceController.register);
attendanceRouter.post('/bulk', authorizeRoles('TEACHER', 'SCHOOL_ADMIN'), attendanceController.registerBulk);
