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

// Reporte / Resumen mensual de asistencia (Exclusivo para Admins)
attendanceRouter.get(
  '/summary',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'),
  attendanceController.getSummary,
);

// Exportar Acta Mensual de Asistencia
attendanceRouter.get(
  '/export',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'),
  attendanceController.getExport,
);

// Matriz sábana mensual interactiva por días (1..31)
attendanceRouter.get(
  '/matrix',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'),
  attendanceController.getMatrix,
);

// Expediente individual del estudiante por matrícula
attendanceRouter.get(
  '/student/:enrollmentId/summary',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'),
  attendanceController.getStudentDetail,
);

// Consulta paginada por fecha y/o aula
attendanceRouter.get(
  '/',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'),
  attendanceController.getAll,
);

// Asistencia por matrícula (histórico de un estudiante)
attendanceRouter.get(
  '/enrollment/:enrollmentId',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'),
  attendanceController.getByEnrollment,
);

// Registro individual
attendanceRouter.post(
  '/',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'),
  attendanceController.register,
);

// Registro masivo por sección (bulk)
attendanceRouter.post(
  '/bulk',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'),
  attendanceController.registerBulk,
);

// Corregir asistencia ya registrada
attendanceRouter.patch(
  '/:id',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'),
  attendanceController.update,
);
