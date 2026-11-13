import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';
import { recordAudit } from '../../utils/audit.util';
import { CashService, type CashActor } from './cash.service';
import { requireFinance, resolveFinanceLevel } from './finance-access';
import {
  cashSessionFilterSchema,
  closeCashSessionSchema,
  createCashExpenseSchema,
  openCashSessionSchema,
  reasonSchema,
  reviewCashSessionSchema,
} from './payment.schema';

/**
 * Caja diaria (montado en /api/payments/cash):
 * apertura con fondo, egresos de caja chica, cierre con arqueo, revisión y reapertura.
 */
const cashService = new CashService();
const uuid = z.string().uuid();
const dateRange = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

async function actorOf(req: Request): Promise<CashActor> {
  return { userId: req.user!.userId, role: req.user!.role, level: await resolveFinanceLevel(req) };
}

export const cashRouter = Router();

// También se monta dentro de /payments (que ya autentica); se repite por defensa en profundidad.
cashRouter.use(authMiddleware, tenantMiddleware);

// Mi caja: la caja abierta de quien consulta (o la última que tuvo)
cashRouter.get('/current', requireFinance('collect'), async (req: Request, res: Response) => {
  const data = await cashService.getCurrent(req.user!.schoolId, await actorOf(req));
  res.status(200).json({ status: 'success', data });
});

cashRouter.post('/open', requireFinance('collect'), async (req: Request, res: Response) => {
  const dto = openCashSessionSchema.parse(req.body);
  const session = await cashService.open(req.user!.schoolId, await actorOf(req), dto);
  recordAudit(req, { action: 'CASH_SESSION_OPENED', entity: 'CashSession', entityId: session.id, after: { fondo: dto.openingAmount, nota: dto.openingNote ?? null } });
  res.status(201).json({ status: 'success', data: session });
});

cashRouter.get('/sessions', requireFinance('collect', 'view'), async (req: Request, res: Response) => {
  const filters = cashSessionFilterSchema.parse(req.query);
  const data = await cashService.list(req.user!.schoolId, await actorOf(req), filters);
  res.status(200).json({ status: 'success', data });
});

cashRouter.get('/cashiers', requireFinance('view'), async (req: Request, res: Response) => {
  const data = await cashService.cashiers(req.user!.schoolId);
  res.status(200).json({ status: 'success', data });
});

cashRouter.get('/sessions/:id', requireFinance('collect', 'view'), async (req: Request, res: Response) => {
  const id = uuid.parse(req.params.id);
  const data = await cashService.detail(req.user!.schoolId, id, await actorOf(req));
  res.status(200).json({ status: 'success', data });
});

cashRouter.post('/sessions/:id/close', requireFinance('collect'), async (req: Request, res: Response) => {
  const id = uuid.parse(req.params.id);
  const dto = closeCashSessionSchema.parse(req.body);
  const session = await cashService.close(req.user!.schoolId, id, await actorOf(req), dto);
  recordAudit(req, {
    action: 'CASH_SESSION_CLOSED',
    entity: 'CashSession',
    entityId: id,
    after: { esperado: session.expectedCash, contado: session.countedCash, diferencia: session.difference, nota: session.closingNote },
  });
  res.status(200).json({ status: 'success', data: session });
});

cashRouter.post('/sessions/:id/review', requireFinance('manage'), async (req: Request, res: Response) => {
  const id = uuid.parse(req.params.id);
  const { reviewNote } = reviewCashSessionSchema.parse(req.body);
  const session = await cashService.review(req.user!.schoolId, id, await actorOf(req), reviewNote);
  recordAudit(req, { action: 'CASH_SESSION_REVIEWED', entity: 'CashSession', entityId: id, after: { diferencia: session.difference, observacion: session.reviewNote } });
  res.status(200).json({ status: 'success', data: session });
});

cashRouter.post('/sessions/:id/reopen', requireFinance('manage'), async (req: Request, res: Response) => {
  const id = uuid.parse(req.params.id);
  const { reason } = reasonSchema.parse(req.body);
  const { before, after } = await cashService.reopen(req.user!.schoolId, id);
  recordAudit(req, {
    action: 'CASH_SESSION_REOPENED',
    entity: 'CashSession',
    entityId: id,
    before: { esperado: before.expectedCash, contado: before.countedCash, diferencia: before.difference, cerradaEl: before.closedAt },
    after: { estado: after.status, motivo: reason },
  });
  res.status(200).json({ status: 'success', data: after });
});

// Egresos de caja chica
cashRouter.get('/expenses', requireFinance('view'), async (req: Request, res: Response) => {
  const filters = dateRange.parse(req.query);
  const data = await cashService.listExpenses(req.user!.schoolId, filters);
  res.status(200).json({ status: 'success', data });
});

cashRouter.post('/expenses', requireFinance('collect'), async (req: Request, res: Response) => {
  const dto = createCashExpenseSchema.parse(req.body);
  const expense = await cashService.createExpense(req.user!.schoolId, await actorOf(req), dto);
  recordAudit(req, {
    action: 'CASH_EXPENSE_CREATED',
    entity: 'CashExpense',
    entityId: expense.id,
    after: { numero: expense.expenseNumber, categoria: dto.category, monto: dto.amount, descripcion: dto.description },
  });
  res.status(201).json({ status: 'success', data: expense });
});

cashRouter.post('/expenses/:id/void', requireFinance('manage'), async (req: Request, res: Response) => {
  const id = uuid.parse(req.params.id);
  const { reason } = reasonSchema.parse(req.body);
  const { before, after } = await cashService.voidExpense(req.user!.schoolId, id, await actorOf(req), reason);
  recordAudit(req, {
    action: 'CASH_EXPENSE_VOIDED',
    entity: 'CashExpense',
    entityId: id,
    before: { numero: before.expenseNumber, monto: before.amount, estado: before.status },
    after: { estado: after.status, motivo: reason },
  });
  res.status(200).json({ status: 'success', data: after });
});
