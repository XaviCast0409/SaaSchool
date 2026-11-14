import { Router } from 'express';
import { EnrollmentRepository } from './enrollment.repository';
import { EnrollmentService } from './enrollment.service';
import { EnrollmentController } from './enrollment.controller';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';
import { z } from 'zod';
import { recordAudit } from '../../utils/audit.util';
import { RolloverService } from './rollover.service';

const enrollmentRepository = new EnrollmentRepository();
const enrollmentService = new EnrollmentService(enrollmentRepository);
const enrollmentController = new EnrollmentController(enrollmentService);

const rolloverService = new RolloverService(enrollmentService);
const STAFF = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'] as const;
const CONDITIONS = ['INGRESANTE', 'CONTINUO', 'TRASLADO', 'REENTRANTE'] as const;

export const enrollmentRouter = Router();

enrollmentRouter.use(authMiddleware, tenantMiddleware);

enrollmentRouter.get('/', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'), enrollmentController.getAll);
// Re-matrícula: pasar alumnos del año de origen al año destino (antes de /:id)
enrollmentRouter.get('/rollover/candidates', authorizeRoles(...STAFF), async (req, res) => {
  const input = z
    .object({
      fromAcademicYearId: z.string().uuid(),
      toAcademicYearId: z.string().uuid(),
      classroomId: z.string().uuid().optional().or(z.literal('').transform(() => undefined)),
    })
    .parse(req.query);
  res.status(200).json({ status: 'success', data: await rolloverService.candidates(req.user!.schoolId, input) });
});

enrollmentRouter.post('/rollover', authorizeRoles(...STAFF), async (req, res) => {
  const input = z
    .object({
      toAcademicYearId: z.string().uuid(),
      items: z
        .array(
          z.object({
            studentId: z.string().uuid(),
            classroomId: z.string().uuid(),
            condition: z.enum(CONDITIONS).default('CONTINUO'),
            repeatingGrade: z.boolean().default(false),
          }),
        )
        .min(1, 'Elige al menos un estudiante.')
        .max(300, 'Máximo 300 estudiantes por vez.'),
    })
    .parse(req.body);
  const result = await rolloverService.enroll(req.user!.schoolId, req.user!.userId, input);
  recordAudit(req, {
    action: 'ENROLLMENT_ROLLOVER',
    entity: 'AcademicYear',
    entityId: input.toAcademicYearId,
    after: { anio: result.year, matriculados: result.enrolled, fallidos: result.failed, cuotas: result.cuotas },
  });
  res.status(200).json({ status: 'success', data: result });
});

enrollmentRouter.get('/schedule-preview', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'), enrollmentController.previewSchedule);
enrollmentRouter.post('/', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'), enrollmentController.create);
enrollmentRouter.get('/:id', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'), enrollmentController.getById);
enrollmentRouter.patch('/:id', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'), enrollmentController.update);
