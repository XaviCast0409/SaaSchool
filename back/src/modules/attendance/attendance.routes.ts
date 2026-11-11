import { Router } from 'express';
import { AttendanceRepository } from './attendance.repository';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';
import { scanRateLimiter } from '../../core/middlewares/rate-limiter.middleware';

const attendanceRepository = new AttendanceRepository();
const attendanceService = new AttendanceService(attendanceRepository);
const attendanceController = new AttendanceController(attendanceService);

export const attendanceRouter = Router();

attendanceRouter.use(authMiddleware, tenantMiddleware);

// Feriados escolares y días no laborables
attendanceRouter.get(
  '/holidays',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'),
  attendanceController.getHolidays,
);
attendanceRouter.post(
  '/holidays',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'),
  attendanceController.createHoliday,
);
attendanceRouter.delete(
  '/holidays/:holidayId',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'),
  attendanceController.deleteHoliday,
);

// Reporte / Resumen mensual de asistencia
attendanceRouter.get(
  '/summary',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'),
  attendanceController.getSummary,
);

// Exportar Acta Mensual de Asistencia
attendanceRouter.get(
  '/export',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'),
  attendanceController.getExport,
);

// Matriz sábana mensual interactiva por días (1..31)
attendanceRouter.get(
  '/matrix',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'ADMINISTRATIVE'),
  attendanceController.getMatrix,
);

// Hoja unificada de pase de lista diario por aula y fecha
attendanceRouter.get(
  '/sheet',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'ADMINISTRATIVE'),
  attendanceController.getSheet,
);

// Guardado o actualización atómica de la hoja de asistencia
attendanceRouter.put(
  '/sheet',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'ADMINISTRATIVE'),
  attendanceController.saveSheet,
);

// Expediente individual del estudiante por matrícula
attendanceRouter.get(
  '/student/:enrollmentId/summary',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'PARENT', 'ADMINISTRATIVE', 'STUDENT'),
  attendanceController.getStudentDetail,
);

// Consulta paginada por fecha y/o aula
attendanceRouter.get(
  '/',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'ADMINISTRATIVE'),
  attendanceController.getAll,
);

// Asistencia por matrícula (histórico de un estudiante)
attendanceRouter.get(
  '/enrollment/:enrollmentId',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'PARENT', 'ADMINISTRATIVE', 'STUDENT'),
  attendanceController.getByEnrollment,
);

// Registro individual
attendanceRouter.post(
  '/',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'ADMINISTRATIVE'),
  attendanceController.register,
);

// Registro masivo por sección (bulk)
attendanceRouter.post(
  '/bulk',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'ADMINISTRATIVE'),
  attendanceController.registerBulk,
);

// Justificaciones en línea
attendanceRouter.get(
  '/justifications',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER', 'PARENT'),
  attendanceController.listJustifications,
);
attendanceRouter.post(
  '/justifications',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER', 'PARENT'),
  attendanceController.createJustification,
);
attendanceRouter.patch(
  '/justifications/:justificationId/review',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'),
  attendanceController.reviewJustification,
);

// Alertas tempranas de ausentismo y deserción
attendanceRouter.get(
  '/alerts',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'),
  attendanceController.listAlerts,
);
attendanceRouter.post(
  '/alerts/evaluate',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'),
  attendanceController.evaluateAlertsNow,
);
attendanceRouter.patch(
  '/alerts/:alertId/attend',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'),
  attendanceController.attendAlert,
);
attendanceRouter.post(
  '/alerts/:alertId/cite',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'),
  attendanceController.citeFamilyFromAlert,
);

// Corregir asistencia ya registrada
attendanceRouter.patch(
  '/:id',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'ADMINISTRATIVE'),
  attendanceController.update,
);

// Escaneo rápido en puerta o kiosco (QR / Código de barras)
attendanceRouter.post(
  '/scan',
  scanRateLimiter,
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'ADMINISTRATIVE'),
  attendanceController.scan,
);

// Sincronización de escaneos por lotes (cola offline)
attendanceRouter.post(
  '/scan/batch',
  scanRateLimiter,
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'ADMINISTRATIVE'),
  attendanceController.scanBatch,
);

// Padrón escolar para escaneo y reconocimiento sin conexión
attendanceRouter.get(
  '/scan-roster',
  scanRateLimiter,
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'ADMINISTRATIVE'),
  attendanceController.getScanRoster,
);

// Consultar configuración de horarios de asistencia
attendanceRouter.get(
  '/config',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'),
  attendanceController.getScheduleConfigs,
);

// Guardar o actualizar horarios de asistencia (Director / Admin)
attendanceRouter.put(
  '/config',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'),
  attendanceController.upsertScheduleConfig,
);

// Cierre de asistencia (Asigna Falta Injustificada a los no registrados de un aula o general)
attendanceRouter.post(
  '/close',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'ADMINISTRATIVE'),
  attendanceController.closeAttendance,
);

