import { z } from 'zod';
import { recordAudit } from '../../utils/audit.util';
import { finalSituationService } from '../enrollments/final-situation.service';
import { Router } from 'express';
import { AcademicYearRepository } from './academic-year.repository';
import { AcademicYearService } from './academic-year.service';
import { AcademicYearController } from './academic-year.controller';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';

const academicYearRepository = new AcademicYearRepository();
const academicYearService = new AcademicYearService(academicYearRepository);
const academicYearController = new AcademicYearController(academicYearService);

export const academicYearRouter = Router();

academicYearRouter.use(authMiddleware, tenantMiddleware);

academicYearRouter.get('/', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'), academicYearController.getAll);
academicYearRouter.post('/', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'), academicYearController.create);
academicYearRouter.get('/:id', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'), academicYearController.getById);
academicYearRouter.get('/:id/activation-impact', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'), academicYearController.activationImpact);
academicYearRouter.patch('/:id/enrollment-open', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'), academicYearController.setEnrollmentOpen);
// Situación final del año (con dryRun primero): se calcula con el consolidado final y se guarda en cada matrícula
academicYearRouter.post('/:id/final-situations', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'), async (req, res) => {
  const academicYearId = z.string().uuid().parse(req.params.id);
  const input = z
    .object({ classroomId: z.string().uuid().optional(), dryRun: z.boolean().default(true), force: z.boolean().default(false) })
    .parse(req.body ?? {});
  const result = await finalSituationService.run(req.user!.schoolId, { academicYearId, ...input });
  if (!input.dryRun) {
    recordAudit(req, { action: 'FINAL_SITUATIONS_SAVED', entity: 'AcademicYear', entityId: academicYearId, after: { anio: result.year, guardadas: result.saved, totales: result.totals, aulasOmitidas: result.skippedClassrooms, forzado: input.force } });
  }
  res.status(200).json({ status: 'success', data: result });
});
academicYearRouter.patch('/:id', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'), academicYearController.update);
academicYearRouter.delete('/:id', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'), academicYearController.delete);
