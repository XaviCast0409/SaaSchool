import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';
import { recordAudit } from '../../utils/audit.util';
import { getSchoolNow } from '../../utils/timezone.util';
import { requireFinance } from './finance-access';
import { PAYMENT_METHODS } from './finance.rules';
import { ReportService } from './report.service';

/** Estados de cuenta y reportes financieros (montado en /api/payments). */
const service = new ReportService();
const uuid = z.string().uuid();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const emptyToUndefined = z.literal('').transform(() => undefined);

export const reportRouter = Router();
reportRouter.use(authMiddleware, tenantMiddleware);

// ── Estados de cuenta ─────────────────────────────────────────────
// El apoderado ve el estado de cuenta de su familia (sin lo anulado)
reportRouter.get('/statements/mine', authorizeRoles('PARENT'), async (req: Request, res: Response) => {
  const data = await service.familyStatement(req.user!.schoolId, req.user!.userId);
  res.status(200).json({ status: 'success', data });
});

reportRouter.get('/statements/guardians', requireFinance('collect', 'view'), async (req: Request, res: Response) => {
  const { search } = z.object({ search: z.string().max(80).default('') }).parse(req.query);
  res.status(200).json({ status: 'success', data: await service.searchGuardians(req.user!.schoolId, search) });
});

reportRouter.get('/statements/student/:studentId', requireFinance('collect', 'view'), async (req: Request, res: Response) => {
  const studentId = uuid.parse(req.params.studentId);
  const { academicYearId } = z.object({ academicYearId: uuid.optional().or(emptyToUndefined) }).parse(req.query);
  const data = await service.studentStatement(req.user!.schoolId, studentId, { academicYearId, includeVoided: true });
  recordAudit(req, { action: 'STATEMENT_VIEWED', entity: 'Student', entityId: studentId });
  res.status(200).json({ status: 'success', data });
});

reportRouter.get('/statements/family/:userId', requireFinance('collect', 'view'), async (req: Request, res: Response) => {
  const userId = uuid.parse(req.params.userId);
  const data = await service.familyStatement(req.user!.schoolId, userId, { includeVoided: true });
  recordAudit(req, { action: 'STATEMENT_VIEWED', entity: 'User', entityId: userId });
  res.status(200).json({ status: 'success', data });
});

// ── Reportes ──────────────────────────────────────────────────────
reportRouter.get('/reports/collections', requireFinance('view'), async (req: Request, res: Response) => {
  const f = z
    .object({
      startDate: isoDate.optional().or(emptyToUndefined),
      endDate: isoDate.optional().or(emptyToUndefined),
      cashierId: uuid.optional().or(emptyToUndefined),
      method: z.enum(PAYMENT_METHODS).optional().or(emptyToUndefined),
      concept: z.string().max(40).optional().or(emptyToUndefined),
    })
    .parse(req.query);
  res.status(200).json({ status: 'success', data: await service.collections(req.user!.schoolId, f) });
});

reportRouter.get('/reports/aging', requireFinance('view'), async (req: Request, res: Response) => {
  const f = z.object({ classroomId: uuid.optional().or(emptyToUndefined) }).parse(req.query);
  res.status(200).json({ status: 'success', data: await service.aging(req.user!.schoolId, f) });
});

reportRouter.get('/reports/monthly', requireFinance('view'), async (req: Request, res: Response) => {
  const { year } = z
    .object({ year: z.coerce.number().int().min(2000).max(2100).default(Number(getSchoolNow().dateStr.slice(0, 4))) })
    .parse(req.query);
  res.status(200).json({ status: 'success', data: await service.monthly(req.user!.schoolId, year) });
});
