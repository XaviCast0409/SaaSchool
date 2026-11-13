import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';
import { recordAudit } from '../../utils/audit.util';
import { AdjustmentService } from './adjustment.service';
import { ADJUSTMENT_TYPES } from './adjustment.rules';
import { requireFinance } from './finance-access';
import { MIN_REASON_LENGTH } from './finance.rules';
import { PAYMENT_CONCEPTS } from './payment.schema';

/**
 * Descuentos, becas, moras y notas de crédito (montado en /api/payments).
 * Crear o anular ajustes requiere permiso de gestión (tesorero o Dirección).
 */
const service = new AdjustmentService();
const uuid = z.string().uuid();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (AAAA-MM-DD)');
const reason = z.string().trim().min(MIN_REASON_LENGTH, `Escribe el motivo (mínimo ${MIN_REASON_LENGTH} caracteres).`).max(300);
const emptyToUndefined = z.literal('').transform(() => undefined);

export const adjustmentRouter = Router();
adjustmentRouter.use(authMiddleware, tenantMiddleware);

const actor = (req: Request) => ({ userId: req.user!.userId });

// ── Ajustes a cuotas ──────────────────────────────────────────────
adjustmentRouter.get('/adjustments', requireFinance('view'), async (req: Request, res: Response) => {
  const filters = z
    .object({
      startDate: isoDate.optional().or(emptyToUndefined),
      endDate: isoDate.optional().or(emptyToUndefined),
      type: z.enum(ADJUSTMENT_TYPES).optional().or(emptyToUndefined),
    })
    .parse(req.query);
  res.status(200).json({ status: 'success', data: await service.list(req.user!.schoolId, filters) });
});

adjustmentRouter.post('/adjustments', requireFinance('manage'), async (req: Request, res: Response) => {
  const dto = z
    .object({
      obligationId: uuid,
      type: z.enum(['DISCOUNT', 'LATE_FEE', 'CREDIT_NOTE']),
      amount: z.number().positive('El monto debe ser mayor a cero').max(100_000),
      reason,
    })
    .parse(req.body);
  const adj = await service.create(req.user!.schoolId, actor(req), dto);
  recordAudit(req, {
    action: 'PAYMENT_ADJUSTMENT_CREATED',
    entity: 'ObligationAdjustment',
    entityId: adj.id,
    after: { numero: adj.number, tipo: dto.type, monto: dto.amount, motivo: dto.reason, cuota: dto.obligationId },
  });
  res.status(201).json({ status: 'success', data: adj });
});

adjustmentRouter.post('/adjustments/:id/void', requireFinance('manage'), async (req: Request, res: Response) => {
  const id = uuid.parse(req.params.id);
  const { reason: why } = z.object({ reason }).parse(req.body);
  const { before, after } = await service.void(req.user!.schoolId, actor(req), id, why);
  recordAudit(req, {
    action: 'PAYMENT_ADJUSTMENT_VOIDED',
    entity: 'ObligationAdjustment',
    entityId: id,
    before: { numero: before.number, tipo: before.type, monto: before.amount, estado: before.status },
    after: { estado: after.status, motivo: why },
  });
  res.status(200).json({ status: 'success', data: after });
});

// ── Becas ─────────────────────────────────────────────────────────
adjustmentRouter.get('/scholarships', requireFinance('collect', 'view'), async (req: Request, res: Response) => {
  const q = z
    .object({ enrollmentId: uuid.optional().or(emptyToUndefined), activeOnly: z.enum(['true', 'false']).optional() })
    .parse(req.query);
  const data = await service.listScholarships(req.user!.schoolId, { enrollmentId: q.enrollmentId, activeOnly: q.activeOnly === 'true' });
  res.status(200).json({ status: 'success', data });
});

adjustmentRouter.post('/scholarships', requireFinance('manage'), async (req: Request, res: Response) => {
  const dto = z
    .object({
      enrollmentId: uuid.optional(),
      studentId: uuid.optional(),
      name: z.string().trim().min(3, 'Escribe el nombre de la beca').max(100),
      kind: z.enum(['PERCENT', 'FIXED']),
      value: z.number().positive('El valor debe ser mayor a cero').max(100_000),
      concepts: z.array(z.enum(PAYMENT_CONCEPTS)).min(1).default(['PENSION']),
      validFrom: isoDate,
      validTo: isoDate.optional().nullable().or(emptyToUndefined),
      reason,
      applyNow: z.boolean().default(true),
    })
    .refine((d) => Boolean(d.enrollmentId || d.studentId), { message: 'Elige un estudiante' })
    .parse(req.body);
  const result = await service.createScholarship(req.user!.schoolId, actor(req), dto);
  recordAudit(req, {
    action: 'SCHOLARSHIP_CREATED',
    entity: 'Scholarship',
    entityId: result.scholarship.id,
    after: { nombre: dto.name, tipo: dto.kind, valor: dto.value, desde: dto.validFrom, hasta: dto.validTo ?? null, motivo: dto.reason, cuotasAplicadas: result.applied },
  });
  res.status(201).json({ status: 'success', data: result });
});

adjustmentRouter.post('/scholarships/:id/apply', requireFinance('manage'), async (req: Request, res: Response) => {
  const id = uuid.parse(req.params.id);
  const result = await service.applyScholarship(req.user!.schoolId, actor(req), id);
  recordAudit(req, { action: 'SCHOLARSHIP_APPLIED', entity: 'Scholarship', entityId: id, after: result });
  res.status(200).json({ status: 'success', data: result });
});

adjustmentRouter.post('/scholarships/:id/deactivate', requireFinance('manage'), async (req: Request, res: Response) => {
  const id = uuid.parse(req.params.id);
  const dto = z.object({ reason, revertPending: z.boolean().default(false) }).parse(req.body);
  const result = await service.deactivateScholarship(req.user!.schoolId, actor(req), id, dto.reason, dto.revertPending);
  recordAudit(req, { action: 'SCHOLARSHIP_DEACTIVATED', entity: 'Scholarship', entityId: id, after: { motivo: dto.reason, ...result } });
  res.status(200).json({ status: 'success', data: result });
});

// ── Moras ─────────────────────────────────────────────────────────
adjustmentRouter.get('/finance-settings', requireFinance('collect', 'view'), async (req: Request, res: Response) => {
  res.status(200).json({ status: 'success', data: await service.getSettings(req.user!.schoolId) });
});

adjustmentRouter.put('/finance-settings', requireFinance('manage'), async (req: Request, res: Response) => {
  const dto = z
    .object({
      lateFeeAnnualRate: z.number().min(0).max(100).nullable(),
      lateFeeGraceDays: z.number().int().min(0).max(120),
    })
    .parse(req.body);
  const before = await service.getSettings(req.user!.schoolId);
  const data = await service.updateSettings(req.user!.schoolId, dto);
  recordAudit(req, { action: 'FINANCE_SETTINGS_UPDATED', entity: 'School', entityId: req.user!.schoolId, before, after: data });
  res.status(200).json({ status: 'success', data });
});

adjustmentRouter.get('/late-fees/preview', requireFinance('manage', 'view'), async (req: Request, res: Response) => {
  res.status(200).json({ status: 'success', data: await service.previewLateFees(req.user!.schoolId) });
});

adjustmentRouter.post('/late-fees/apply', requireFinance('manage'), async (req: Request, res: Response) => {
  const { obligationIds } = z.object({ obligationIds: z.array(uuid).min(1).max(2000) }).parse(req.body);
  const result = await service.applyLateFees(req.user!.schoolId, actor(req), obligationIds);
  recordAudit(req, { action: 'LATE_FEES_APPLIED', entity: 'ObligationAdjustment', after: result });
  res.status(200).json({ status: 'success', data: result });
});
