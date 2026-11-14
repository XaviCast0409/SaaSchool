import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';
import { recordAudit } from '../../utils/audit.util';
import { requireFinance } from './finance-access';
import { feeScheduleService } from './fee-schedule.service';

/**
 * Tarifario por año académico (montado en /api/payments/fee-schedules).
 * Verlo: tesorería, contabilidad y Dirección. Editarlo: tesorero o Dirección.
 */
const uuid = z.string().uuid();
const money = z.number().min(0, 'El monto no puede ser negativo').max(100_000);
const month = z.number().int().min(1).max(12);

const feeScheduleSchema = z.object({
  academicYearId: uuid,
  educationLevel: z.enum(['INITIAL', 'PRIMARY', 'SECONDARY']),
  grade: z.number().int().min(0).max(6).nullable().optional(),
  enrollmentFee: money,
  admissionFee: money,
  monthlyFee: money,
  firstMonth: month,
  lastMonth: month,
  dueDay: z.number().int().min(1).max(31),
});

export const feeScheduleRouter = Router();
feeScheduleRouter.use(authMiddleware, tenantMiddleware);

feeScheduleRouter.get('/', requireFinance('view'), async (req: Request, res: Response) => {
  const { academicYearId } = z.object({ academicYearId: uuid.optional() }).parse(req.query);
  res.status(200).json({ status: 'success', data: await feeScheduleService.list(req.user!.schoolId, academicYearId) });
});

feeScheduleRouter.post('/', requireFinance('manage'), async (req: Request, res: Response) => {
  const dto = feeScheduleSchema.parse(req.body);
  const row = await feeScheduleService.create(req.user!.schoolId, dto);
  recordAudit(req, { action: 'FEE_SCHEDULE_CREATED', entity: 'FeeSchedule', entityId: row.id, after: row });
  res.status(201).json({ status: 'success', data: row });
});

feeScheduleRouter.post('/copy', requireFinance('manage'), async (req: Request, res: Response) => {
  const { fromAcademicYearId, toAcademicYearId } = z
    .object({ fromAcademicYearId: uuid, toAcademicYearId: uuid })
    .refine((d) => d.fromAcademicYearId !== d.toAcademicYearId, { message: 'Elige años distintos.' })
    .parse(req.body);
  const result = await feeScheduleService.copyYear(req.user!.schoolId, fromAcademicYearId, toAcademicYearId);
  recordAudit(req, { action: 'FEE_SCHEDULE_COPIED', entity: 'FeeSchedule', entityId: toAcademicYearId, after: { desde: fromAcademicYearId, ...result } });
  res.status(200).json({ status: 'success', data: result });
});

// Completar cuotas faltantes de las matrículas de un año (con dryRun primero para confirmar)
feeScheduleRouter.post('/generate-missing', requireFinance('manage'), async (req: Request, res: Response) => {
  const input = z
    .object({ academicYearId: uuid, classroomId: uuid.optional(), dryRun: z.boolean().default(true) })
    .parse(req.body);
  const result = await feeScheduleService.generateMissing(req.user!.schoolId, req.user!.userId, input);
  if (!input.dryRun) {
    recordAudit(req, { action: 'FEE_SCHEDULE_MISSING_GENERATED', entity: 'AcademicYear', entityId: input.academicYearId, after: result });
  }
  res.status(200).json({ status: 'success', data: result });
});

feeScheduleRouter.put('/:id', requireFinance('manage'), async (req: Request, res: Response) => {
  const id = uuid.parse(req.params.id);
  const dto = feeScheduleSchema.parse(req.body);
  const { before, after } = await feeScheduleService.update(req.user!.schoolId, id, dto);
  recordAudit(req, { action: 'FEE_SCHEDULE_UPDATED', entity: 'FeeSchedule', entityId: id, before, after });
  res.status(200).json({ status: 'success', data: after });
});

feeScheduleRouter.delete('/:id', requireFinance('manage'), async (req: Request, res: Response) => {
  const id = uuid.parse(req.params.id);
  const row = await feeScheduleService.remove(req.user!.schoolId, id);
  recordAudit(req, { action: 'FEE_SCHEDULE_DELETED', entity: 'FeeSchedule', entityId: id, before: row });
  res.status(200).json({ status: 'success', data: row });
});
