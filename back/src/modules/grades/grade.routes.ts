import { Router } from 'express';
import { GradeRepository } from './grade.repository';
import { GradeService } from './grade.service';
import { GradeController } from './grade.controller';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';
import { requirePlan } from '../../core/middlewares/plan.middleware';

const gradeRepository = new GradeRepository();
const gradeService = new GradeService(gradeRepository);
const gradeController = new GradeController(gradeService);

export const gradeRouter = Router();

gradeRouter.use(authMiddleware, tenantMiddleware, requirePlan('PRO', 'ENTERPRISE'));

// ==========================================
// Criterios / Rubros Evaluativos (Admin)
// ==========================================
gradeRouter.get(
  '/criteria',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'),
  gradeController.getCriteria,
);

gradeRouter.post(
  '/criteria',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'),
  gradeController.createCriterion,
);

gradeRouter.put(
  '/criteria/:id',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'),
  gradeController.updateCriterion,
);

gradeRouter.delete(
  '/criteria/:id',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'),
  gradeController.deleteCriterion,
);

// ==========================================
// Matriz de Calificaciones (Cubicol / Excel)
// ==========================================
gradeRouter.get(
  '/matrix',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'),
  gradeController.getMatrixData,
);

gradeRouter.post(
  '/matrix/batch',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'),
  gradeController.saveBatchGrades,
);

// ==========================================
// Conclusiones Descriptivas por Competencia
// ==========================================
gradeRouter.get(
  '/conclusions',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'),
  gradeController.getConclusions,
);

gradeRouter.post(
  '/conclusions/batch',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'),
  gradeController.saveBatchConclusions,
);

// ==========================================
// Libreta de Notas / Report Card
// ==========================================
gradeRouter.get(
  '/report-card/:enrollmentId',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER', 'PARENT'),
  gradeController.getReportCard,
);

// ==========================================
// Consolidado SIAGIE (Dirección / Secretaría)
// ==========================================
gradeRouter.get(
  '/siagie/summary',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'),
  gradeController.getSiagieSummary,
);

// ==========================================
// Cierre y Bloqueo de Periodos / Actas (Dirección)
// ==========================================
gradeRouter.get(
  '/period-lock',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'),
  gradeController.getPeriodLock,
);

gradeRouter.post(
  '/period-lock/toggle',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'),
  gradeController.togglePeriodLock,
);

// ==========================================
// Rutas Legacy (Compatibilidad)
// ==========================================
gradeRouter.get(
  '/enrollment/:enrollmentId',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'PARENT'),
  gradeController.getByEnrollment,
);

gradeRouter.post(
  '/entries',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'),
  gradeController.createEntry,
);

gradeRouter.post(
  '/',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'),
  gradeController.createGrade,
);
