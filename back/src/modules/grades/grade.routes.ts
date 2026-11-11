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
// Escala de Conversión Configurable (GradingScale)
// ==========================================
gradeRouter.get(
  '/grading-scale',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'),
  gradeController.getGradingScale,
);
gradeRouter.put(
  '/grading-scale',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'),
  gradeController.updateGradingScale,
);

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
// Sincronización de tareas del Aula Virtual
// ==========================================
gradeRouter.post(
  '/matrix/sync-homework',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'),
  gradeController.syncHomeworkToMatrix,
);
