import { Router } from 'express';
import { AcademicReportRepository } from './academic-report.repository';
import { AcademicReportService } from './academic-report.service';
import { AcademicReportController } from './academic-report.controller';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';
import { requirePlan } from '../../core/middlewares/plan.middleware';

const academicReportRepository = new AcademicReportRepository();
const academicReportService = new AcademicReportService(academicReportRepository);
const academicReportController = new AcademicReportController(academicReportService);

export const academicReportRouter = Router();

// ============================================================================
// SEGURIDAD: Auth + Tenant + Plan PRO + Roles Permitidos
// ============================================================================
academicReportRouter.use(
  authMiddleware,
  tenantMiddleware,
  requirePlan('PRO', 'ENTERPRISE'),
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'),
);

// Catálogo de aulas transversal para filtros
academicReportRouter.get('/catalog/classrooms', academicReportController.getClassrooms);

// 0021: Consolidado de Estudios
academicReportRouter.get('/0021-consolidated-grades', academicReportController.getConsolidatedGrades);

// 0041: Registro Auxiliar Borrador
academicReportRouter.get('/0041-draft-register', academicReportController.getDraftRegister);

// 0048: Orden de Mérito y Tercios por Salón
academicReportRouter.get('/0048-merit-classroom', academicReportController.getMeritClassroom);

// 0049: Orden de Mérito y Tercios/Quintos por Grado
academicReportRouter.get('/0049-merit-grade', academicReportController.getMeritGrade);

// 0030: Listado de Comentarios a la Conducta
academicReportRouter.get('/0030-conduct-comments', academicReportController.getConductComments);

// 0011: Reporte de Alumnos por Salón (Padrón Oficial)
academicReportRouter.get('/0011-classroom-roster', academicReportController.getClassroomRoster);

// 0001: Listado de Familias por Estado
academicReportRouter.get('/0001-families-by-state', academicReportController.getFamiliesByState);

// 0002: Listado de Familias e Hijos
academicReportRouter.get('/0002-families-children', academicReportController.getFamiliesWithChildren);

// 0003: Listado de Familias y Parientes
academicReportRouter.get('/0003-families-relatives', academicReportController.getFamiliesRelatives);

// 0019: Listado de Cumpleaños del Alumno
academicReportRouter.get('/0019-student-birthdays', academicReportController.getStudentBirthdays);
