import { Request, Response } from 'express';
import { recordAudit } from '../../utils/audit.util';
import {
  bulkCreateObligationsSchema,
  createObligationSchema,
  createTransactionSchema,
  obligationFilterSchema,
  reasonSchema,
  sendReminderSchema,
  transactionFilterSchema,
  updateObligationSchema,
  dailyCashCloseQuerySchema,
} from './payment.schema';
import type { FinanceActor, PaymentService } from './payment.service';
import { resolveFinanceLevel } from './finance-access';
import { capabilities, FINANCE_LEVEL_LABEL } from './finance.rules';

const actorOf = (request: Request): FinanceActor => ({ userId: request.user!.userId, role: request.user!.role });

export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /** GET /api/payments/obligations?status=PENDING&classroomId=UUID&search=text&page=1&limit=10 */
  getAllObligations = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const filters = obligationFilterSchema.parse(request.query);
    const result = await this.paymentService.getAllObligations(schoolId, filters);
    response.status(200).json({ status: 'success', data: result.data, meta: result.meta });
  };

  /** GET /api/payments/obligations/my-children — deudas de los hijos del apoderado */
  getMyChildrenObligations = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const userId = request.user!.userId;
    const obligations = await this.paymentService.getObligationsByParent(userId, schoolId);
    response.status(200).json({ status: 'success', data: obligations });
  };

  /** GET /api/payments/obligations/:id */
  getObligationById = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const id = String(request.params.id);
    const userContext = { userId: request.user!.userId, role: request.user!.role };
    const obligation = await this.paymentService.getObligationDetail(id, schoolId, userContext);
    response.status(200).json({ status: 'success', data: obligation });
  };

  /** GET /api/payments/access — qué puede hacer la persona en caja y tesorería */
  getAccess = async (request: Request, response: Response): Promise<void> => {
    const level = await resolveFinanceLevel(request);
    response.status(200).json({
      status: 'success',
      data: { level, label: FINANCE_LEVEL_LABEL[level], can: capabilities(level) },
    });
  };

  /** POST /api/payments/obligations — crear obligación individual */
  createObligation = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const createObligationDto = createObligationSchema.parse(request.body);
    const obligation = await this.paymentService.createObligation(schoolId, createObligationDto, actorOf(request));
    recordAudit(request, {
      action: 'PAYMENT_OBLIGATION_CREATED',
      entity: 'PaymentObligation',
      entityId: obligation.id,
      after: obligation,
    });
    response.status(201).json({ status: 'success', data: obligation });
  };

  /** POST /api/payments/obligations/bulk — generar cronograma masivo por aula o colegio */
  bulkCreateObligations = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const bulkDto = bulkCreateObligationsSchema.parse(request.body);
    const result = await this.paymentService.bulkCreateObligations(schoolId, bulkDto, actorOf(request));
    recordAudit(request, {
      action: 'PAYMENT_OBLIGATIONS_BULK_CREATED',
      entity: 'PaymentObligation',
      entityId: null,
      after: request.body,
    });
    response.status(201).json({ status: 'success', data: result });
  };

  /** PATCH /api/payments/obligations/:id — editar obligación */
  updateObligation = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const id = String(request.params.id);
    const updateDto = updateObligationSchema.parse(request.body);
    const { before, after } = await this.paymentService.updateObligation(id, schoolId, updateDto);
    recordAudit(request, {
      action: 'PAYMENT_OBLIGATION_UPDATED',
      entity: 'PaymentObligation',
      entityId: id,
      before: { title: before.title, concept: before.concept, amountDue: before.amountDue, dueDate: before.dueDate },
      after: { title: after.title, concept: after.concept, amountDue: after.amountDue, dueDate: after.dueDate, motivo: updateDto.reason ?? null },
    });
    response.status(200).json({ status: 'success', data: after });
  };

  /** POST /api/payments/obligations/:id/cancel — anular cuota (con motivo, no se borra) */
  cancelObligation = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const id = String(request.params.id);
    const { reason } = reasonSchema.parse(request.body);
    const obligation = await this.paymentService.cancelObligation(id, schoolId, actorOf(request), reason);
    recordAudit(request, {
      action: 'PAYMENT_OBLIGATION_CANCELLED',
      entity: 'PaymentObligation',
      entityId: id,
      after: { cuota: obligation.title, monto: obligation.amountDue, motivo: reason },
    });
    response.status(200).json({ status: 'success', data: obligation });
  };

  /** POST /api/payments/transactions — registrar cobro/pago manual */
  registerTransaction = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const createTransactionDto = createTransactionSchema.parse(request.body);
    const transaction = await this.paymentService.registerTransaction(
      schoolId,
      createTransactionDto,
      actorOf(request),
    );
    recordAudit(request, {
      action: 'PAYMENT_TRANSACTION_CREATED',
      entity: 'PaymentTransaction',
      entityId: transaction.id,
      after: transaction,
    });
    response.status(201).json({ status: 'success', data: transaction });
  };

  /** GET /api/payments/transactions?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD */
  getAllTransactions = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const filters = transactionFilterSchema.parse(request.query);
    const transactions = await this.paymentService.getAllTransactions(schoolId, filters);
    response.status(200).json({ status: 'success', data: transactions });
  };

  /** POST /api/payments/transactions/:id/void — anular cobro (el recibo se conserva como ANULADO) */
  voidTransaction = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const id = String(request.params.id);
    const { reason } = reasonSchema.parse(request.body);
    const { before, after } = await this.paymentService.voidTransaction(id, schoolId, actorOf(request), reason);
    recordAudit(request, {
      action: 'PAYMENT_TRANSACTION_VOIDED',
      entity: 'PaymentTransaction',
      entityId: id,
      before: { recibo: before.receiptNumber, monto: before.amountPaid, medio: before.paymentMethod, estado: before.status },
      after: { recibo: after.receiptNumber, estado: after.status, motivo: reason },
    });
    response.status(200).json({ status: 'success', data: after });
  };

  /** GET /api/payments/transactions/:id/receipt — datos formateados de recibo/boleta */
  getTransactionReceipt = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const id = String(request.params.id);
    const userContext = { userId: request.user!.userId, role: request.user!.role };
    const receipt = await this.paymentService.getTransactionReceipt(id, schoolId, userContext);
    response.status(200).json({ status: 'success', data: receipt });
  };

  /** POST /api/payments/obligations/:id/remind — enviar recordatorio WA/Email */
  sendReminder = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const id = String(request.params.id);
    const { channel } = sendReminderSchema.parse(request.body);
    const result = await this.paymentService.sendObligationReminder(id, schoolId, channel);
    response.status(200).json({ status: 'success', data: result });
  };

  /** POST /api/payments/obligations/remind-overdue — enviar recordatorios masivos por morosidad */
  sendBulkReminders = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const { channel } = sendReminderSchema.parse(request.body);
    const result = await this.paymentService.sendBulkOverdueReminders(schoolId, channel);
    response.status(202).json({ status: 'success', data: result });
  };

  /** GET /api/payments/summary — resumen financiero del colegio */
  getSummary = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const summary = await this.paymentService.getFinancialSummary(schoolId);
    response.status(200).json({ status: 'success', data: summary });
  };

  /** GET /api/payments/daily-cash-close?date=YYYY-MM-DD — arqueo de caja diario */
  getDailyCashClose = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const { date } = dailyCashCloseQuerySchema.parse(request.query);
    const cashClose = await this.paymentService.getDailyCashClose(schoolId, date);
    response.status(200).json({ status: 'success', data: cashClose });
  };
}
