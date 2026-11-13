import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';
import { recordAudit } from '../../utils/audit.util';
import { getSchoolNow, parseSchoolDate } from '../../utils/timezone.util';
import { deliver } from '../automations/delivery';
import { studentShortName } from '../automations/recipients';
import { PaymentRepository } from '../payments/payment.repository';
import { PaymentService } from '../payments/payment.service';
import { requireFinance } from '../payments/finance-access';
import { remainingBalance } from '../payments/payment.rules';
import {
  METHOD_LABEL,
  REPORT_METHODS,
  isValidOperationNumber,
  normalizeOperationNumber,
  validatePaidOn,
  validateReportedAmount,
  type ReportMethod,
} from './payment-report.rules';

/**
 * Pago reportado con voucher: la familia paga por Yape/Plin/transferencia al colegio, reporta el
 * pago con su número de operación y captura, y tesorería lo valida. No es una pasarela de pago:
 * el dinero no pasa por la plataforma.
 */
export const paymentReportRouter = Router();
paymentReportRouter.use(authMiddleware, tenantMiddleware);

const paymentService = new PaymentService(new PaymentRepository());
const uuid = z.string().uuid();
const money = (n: number) => `S/ ${n.toFixed(2)}`;

async function schoolName(schoolId: string) {
  return (await prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } }))?.name ?? '';
}

// ------------------------------------------------------------ Datos de cobro del colegio

paymentReportRouter.get('/instructions', async (req: Request, res: Response) => {
  const s = await prisma.school.findUnique({ where: { id: req.user!.schoolId }, select: { paymentQrFileUrl: true, paymentInstructions: true } });
  res.status(200).json({ status: 'success', data: s });
});

paymentReportRouter.put('/instructions', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'), async (req: Request, res: Response) => {
  const dto = z
    .object({
      paymentQrFileUrl: z.string().regex(/^\/api\/files\/[0-9a-f-]{36}$/).nullable().optional(),
      paymentInstructions: z.string().trim().max(2000).nullable().optional(),
    })
    .parse(req.body);
  const updated = await prisma.school.update({
    where: { id: req.user!.schoolId },
    data: { paymentQrFileUrl: dto.paymentQrFileUrl ?? null, paymentInstructions: dto.paymentInstructions || null },
    select: { paymentQrFileUrl: true, paymentInstructions: true },
  });
  recordAudit(req, { action: 'PAYMENT_INSTRUCTIONS_UPDATED', entity: 'School', entityId: req.user!.schoolId });
  res.status(200).json({ status: 'success', data: updated });
});

// ------------------------------------------------------------ Familia

const reportSchema = z.object({
  obligationId: uuid,
  amount: z.number().positive().max(100000),
  method: z.enum(REPORT_METHODS),
  operationNumber: z.string().trim().min(4).max(40),
  paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  voucherFileUrl: z.string().regex(/^\/api\/files\/[0-9a-f-]{36}$/, 'Adjunta la captura del voucher.'),
  note: z.string().trim().max(300).optional(),
});

/** Ya existe este número de operación (en otro reporte vigente o en un pago registrado)? */
async function operationExists(schoolId: string, normalized: string, excludeReportId?: string) {
  const [reports, transactions] = await Promise.all([
    prisma.paymentReport.findMany({
      where: { schoolId, status: { not: 'REJECTED' }, ...(excludeReportId ? { id: { not: excludeReportId } } : {}) },
      select: { operationNumber: true },
    }),
    prisma.paymentTransaction.findMany({ where: { schoolId, status: 'ACTIVE', operationNumber: { not: null } }, select: { operationNumber: true } }),
  ]);
  return [...reports, ...transactions].some((r) => r.operationNumber && normalizeOperationNumber(r.operationNumber) === normalized);
}

paymentReportRouter.post('/', authorizeRoles('PARENT'), async (req: Request, res: Response) => {
  const dto = reportSchema.parse(req.body);
  const schoolId = req.user!.schoolId;
  const parentId = req.user!.userId;

  const obligation = await prisma.paymentObligation.findFirst({
    where: { id: dto.obligationId, schoolId },
    select: {
      id: true,
      title: true,
      status: true,
      amountDue: true,
      transactions: { where: { status: 'ACTIVE' }, select: { amountPaid: true } },
      paymentReports: { where: { status: 'PENDING' }, select: { amount: true } },
      enrollment: { select: { student: { select: { id: true, firstNames: true, lastNamePaternal: true, familyRelations: { select: { userId: true } } } } } },
    },
  });
  if (!obligation) throw new AppError('Cuota no encontrada.', 404);
  const student = obligation.enrollment.student;
  if (!student.familyRelations.some((r) => r.userId === parentId)) throw new AppError('Solo puedes reportar pagos de tus hijos.', 403);
  if (obligation.status === 'PAID' || obligation.status === 'CANCELLED') throw new AppError('Esta cuota ya no tiene saldo pendiente.', 400);

  const balance = remainingBalance(obligation.amountDue, obligation.transactions);
  const pendingReported = obligation.paymentReports.reduce((s, r) => s + Number(r.amount), 0);
  const amountError = validateReportedAmount(balance, pendingReported, dto.amount);
  if (amountError) throw new AppError(amountError, 400);
  const dateError = validatePaidOn(dto.paidOn, getSchoolNow().dateStr);
  if (dateError) throw new AppError(dateError, 400);
  if (!isValidOperationNumber(dto.operationNumber)) throw new AppError('El número de operación no es válido.', 400);
  const normalized = normalizeOperationNumber(dto.operationNumber);
  if (await operationExists(schoolId, normalized)) throw new AppError('Ese número de operación ya fue reportado o registrado.', 409);

  const file = await prisma.storedFile.findFirst({ where: { id: dto.voucherFileUrl.split('/').pop()!, schoolId }, select: { id: true } });
  if (!file) throw new AppError('No encontramos la captura del voucher; vuelve a subirla.', 400);

  const report = await prisma.paymentReport.create({
    data: {
      schoolId,
      obligationId: obligation.id,
      reportedById: parentId,
      amount: dto.amount,
      method: dto.method,
      operationNumber: normalized,
      paidOn: parseSchoolDate(dto.paidOn),
      voucherFileUrl: dto.voucherFileUrl,
      note: dto.note || null,
    },
  });

  // Avisar a tesorería (app + push)
  const treasury = await prisma.user.findMany({ where: { schoolId, isActive: true, role: { in: ['SCHOOL_ADMIN', 'ADMINISTRATIVE'] } }, select: { id: true } });
  void deliver(
    schoolId,
    treasury.map((t) => ({ userId: t.id })),
    {
      title: 'Pago reportado por validar',
      message: `${studentShortName(student)} · ${obligation.title} · ${money(dto.amount)} por ${METHOD_LABEL[dto.method as ReportMethod]}`,
      type: 'PAYMENT',
      link: '/payments?tab=reports',
    },
    { schoolName: await schoolName(schoolId) },
  ).catch((e) => console.error('[Pagos reportados] aviso a tesorería:', e));

  recordAudit(req, { action: 'PAYMENT_REPORTED', entity: 'PaymentReport', entityId: report.id, after: { cuota: obligation.title, monto: dto.amount, medio: dto.method } });
  res.status(201).json({ status: 'success', data: report });
});

paymentReportRouter.get('/mine', authorizeRoles('PARENT'), async (req: Request, res: Response) => {
  const reports = await prisma.paymentReport.findMany({
    where: { schoolId: req.user!.schoolId, reportedById: req.user!.userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      obligationId: true,
      amount: true,
      method: true,
      operationNumber: true,
      paidOn: true,
      status: true,
      rejectionReason: true,
      createdAt: true,
      reviewedAt: true,
      obligation: { select: { title: true } },
      transaction: { select: { id: true, receiptNumber: true } },
    },
  });
  res.status(200).json({ status: 'success', data: reports });
});

// ------------------------------------------------------------ Tesorería

paymentReportRouter.get('/pending-count', requireFinance('manage', 'view'), async (req: Request, res: Response) => {
  const count = await prisma.paymentReport.count({ where: { schoolId: req.user!.schoolId, status: 'PENDING' } });
  res.status(200).json({ status: 'success', data: { count } });
});

paymentReportRouter.get('/', requireFinance('manage', 'view'), async (req: Request, res: Response) => {
  const { status } = z.object({ status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).default('PENDING') }).parse(req.query);
  const reports = await prisma.paymentReport.findMany({
    where: { schoolId: req.user!.schoolId, status },
    orderBy: { createdAt: status === 'PENDING' ? 'asc' : 'desc' },
    take: 100,
    include: {
      reportedBy: { select: { firstName: true, lastNamePaternal: true, cellphone: true } },
      reviewedBy: { select: { firstName: true, lastNamePaternal: true } },
      transaction: { select: { receiptNumber: true } },
      obligation: {
        select: {
          id: true,
          title: true,
          amountDue: true,
          dueDate: true,
          transactions: { where: { status: 'ACTIVE' }, select: { amountPaid: true } },
          enrollment: {
            select: {
              student: { select: { firstNames: true, lastNamePaternal: true, lastNameMaternal: true } },
              classroom: { select: { grade: true, section: true, educationLevel: true } },
            },
          },
        },
      },
    },
  });
  res.status(200).json({
    status: 'success',
    data: reports.map((r) => ({
      id: r.id,
      amount: Number(r.amount),
      method: r.method,
      operationNumber: r.operationNumber,
      paidOn: r.paidOn,
      voucherFileUrl: r.voucherFileUrl,
      note: r.note,
      status: r.status,
      rejectionReason: r.rejectionReason,
      createdAt: r.createdAt,
      reviewedAt: r.reviewedAt,
      reviewedBy: r.reviewedBy ? `${r.reviewedBy.firstName} ${r.reviewedBy.lastNamePaternal}` : null,
      receiptNumber: r.transaction?.receiptNumber ?? null,
      reportedBy: `${r.reportedBy.firstName} ${r.reportedBy.lastNamePaternal}`,
      reportedByPhone: r.reportedBy.cellphone,
      obligation: {
        id: r.obligation.id,
        title: r.obligation.title,
        dueDate: r.obligation.dueDate,
        balance: remainingBalance(r.obligation.amountDue, r.obligation.transactions),
      },
      student: `${r.obligation.enrollment.student.firstNames} ${r.obligation.enrollment.student.lastNamePaternal} ${r.obligation.enrollment.student.lastNameMaternal ?? ''}`.trim(),
      classroom: `${r.obligation.enrollment.classroom.grade}° "${r.obligation.enrollment.classroom.section}"`,
    })),
  });
});

async function loadPending(schoolId: string, id: string) {
  const report = await prisma.paymentReport.findFirst({
    where: { id, schoolId },
    include: { obligation: { select: { id: true, title: true, enrollment: { select: { student: { select: { firstNames: true, lastNamePaternal: true } } } } } } },
  });
  if (!report) throw new AppError('Reporte no encontrado.', 404);
  if (report.status !== 'PENDING') throw new AppError('Este reporte ya fue revisado.', 409);
  return report;
}

/** Aprobar: registra la transacción (con su recibo interno) y avisa a la familia. */
paymentReportRouter.post('/:id/approve', requireFinance('manage'), async (req: Request, res: Response) => {
  const { id } = z.object({ id: uuid }).parse(req.params);
  const schoolId = req.user!.schoolId;
  const report = await loadPending(schoolId, id);

  // Marcar primero como revisado (evita doble aprobación simultánea)
  const claimed = await prisma.paymentReport.updateMany({ where: { id, status: 'PENDING' }, data: { status: 'APPROVED', reviewedById: req.user!.userId, reviewedAt: new Date() } });
  if (claimed.count === 0) throw new AppError('Este reporte ya fue revisado.', 409);

  try {
    // Cada medio queda separado (Yape, Plin, transferencia o depósito) para la conciliación.
    // No entra a ninguna caja: el dinero llegó a la cuenta del colegio, no al efectivo del cajero.
    const transaction = await paymentService.registerTransaction(
      schoolId,
      {
        obligationId: report.obligationId,
        amountPaid: Number(report.amount),
        paymentMethod: report.method as ReportMethod,
        operationNumber: report.operationNumber,
        notes: `Reportado por la familia vía app (${METHOD_LABEL[report.method as ReportMethod] ?? report.method}, pagado el ${report.paidOn.toISOString().slice(0, 10)})`,
      },
      { userId: req.user!.userId, role: req.user!.role },
      { outsideCashSession: true },
    );
    await prisma.paymentReport.update({ where: { id }, data: { transactionId: transaction.id } });
    const receipt = (transaction as { receiptNumber?: string | null }).receiptNumber;
    void deliver(
      schoolId,
      [{ userId: report.reportedById }],
      {
        title: 'Pago validado ✅',
        message: `Tesorería validó tu pago de ${money(Number(report.amount))} por "${report.obligation.title}"${receipt ? `. Recibo ${receipt}` : ''}.`,
        type: 'PAYMENT',
        link: '/payments',
      },
      { schoolName: await schoolName(schoolId) },
    ).catch(() => undefined);
    recordAudit(req, { action: 'PAYMENT_REPORT_APPROVED', entity: 'PaymentReport', entityId: id, after: { recibo: receipt, monto: Number(report.amount) } });
    res.status(200).json({ status: 'success', data: { transactionId: transaction.id, receiptNumber: receipt } });
  } catch (error) {
    // Si no se pudo registrar (p. ej. el saldo cambió), el reporte vuelve a quedar pendiente
    await prisma.paymentReport.update({ where: { id }, data: { status: 'PENDING', reviewedById: null, reviewedAt: null } });
    throw error;
  }
});

paymentReportRouter.post('/:id/reject', requireFinance('manage'), async (req: Request, res: Response) => {
  const { id } = z.object({ id: uuid }).parse(req.params);
  const { reason } = z.object({ reason: z.string().trim().min(5, 'Indica el motivo para la familia.').max(300) }).parse(req.body);
  const schoolId = req.user!.schoolId;
  const report = await loadPending(schoolId, id);
  const claimed = await prisma.paymentReport.updateMany({
    where: { id, status: 'PENDING' },
    data: { status: 'REJECTED', reviewedById: req.user!.userId, reviewedAt: new Date(), rejectionReason: reason },
  });
  if (claimed.count === 0) throw new AppError('Este reporte ya fue revisado.', 409);
  void deliver(
    schoolId,
    [{ userId: report.reportedById }],
    {
      title: 'No pudimos validar tu pago',
      message: `"${report.obligation.title}" (${money(Number(report.amount))}): ${reason}`,
      type: 'PAYMENT',
      link: '/payments',
    },
    { schoolName: await schoolName(schoolId) },
  ).catch(() => undefined);
  recordAudit(req, { action: 'PAYMENT_REPORT_REJECTED', entity: 'PaymentReport', entityId: id, after: { motivo: reason } });
  res.status(200).json({ status: 'success', data: { rejected: true } });
});
