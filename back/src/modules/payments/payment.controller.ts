import { Request, Response } from 'express';
import {
  bulkCreateObligationsSchema,
  createObligationSchema,
  createTransactionSchema,
  obligationFilterSchema,
  sendReminderSchema,
  transactionFilterSchema,
  updateObligationSchema,
} from './payment.schema';
import type { PaymentService } from './payment.service';

export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /** GET /api/payments/obligations?status=PENDING&classroomId=UUID&search=text */
  getAllObligations = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const filters = obligationFilterSchema.parse(request.query);
    const obligations = await this.paymentService.getAllObligations(schoolId, filters);
    response.status(200).json({ status: 'success', data: obligations });
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
    const obligation = await this.paymentService.getObligationById(id, schoolId);
    response.status(200).json({ status: 'success', data: obligation });
  };

  /** POST /api/payments/obligations — crear obligación individual */
  createObligation = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const createObligationDto = createObligationSchema.parse(request.body);
    const obligation = await this.paymentService.createObligation(schoolId, createObligationDto);
    response.status(201).json({ status: 'success', data: obligation });
  };

  /** POST /api/payments/obligations/bulk — generar cronograma masivo por aula o colegio */
  bulkCreateObligations = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const bulkDto = bulkCreateObligationsSchema.parse(request.body);
    const result = await this.paymentService.bulkCreateObligations(schoolId, bulkDto);
    response.status(201).json({ status: 'success', data: result });
  };

  /** PATCH /api/payments/obligations/:id — editar obligación */
  updateObligation = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const id = String(request.params.id);
    const updateDto = updateObligationSchema.parse(request.body);
    const obligation = await this.paymentService.updateObligation(id, schoolId, updateDto);
    response.status(200).json({ status: 'success', data: obligation });
  };

  /** DELETE /api/payments/obligations/:id — anular/cancelar obligación */
  cancelObligation = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const id = String(request.params.id);
    const obligation = await this.paymentService.cancelObligation(id, schoolId);
    response.status(200).json({ status: 'success', data: obligation });
  };

  /** POST /api/payments/transactions — registrar cobro/pago manual */
  registerTransaction = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const createTransactionDto = createTransactionSchema.parse(request.body);
    const transaction = await this.paymentService.registerTransaction(
      schoolId,
      createTransactionDto,
    );
    response.status(201).json({ status: 'success', data: transaction });
  };

  /** GET /api/payments/transactions?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD */
  getAllTransactions = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const filters = transactionFilterSchema.parse(request.query);
    const transactions = await this.paymentService.getAllTransactions(schoolId, filters);
    response.status(200).json({ status: 'success', data: transactions });
  };

  /** DELETE /api/payments/transactions/:id — anular pago registrado */
  deleteTransaction = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const id = String(request.params.id);
    const transaction = await this.paymentService.deleteTransaction(id, schoolId);
    response.status(200).json({ status: 'success', data: transaction });
  };

  /** GET /api/payments/transactions/:id/receipt — datos formateados de recibo/boleta */
  getTransactionReceipt = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const id = String(request.params.id);
    const receipt = await this.paymentService.getTransactionReceipt(id, schoolId);
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
    response.status(200).json({ status: 'success', data: result });
  };

  /** GET /api/payments/summary — resumen financiero del colegio */
  getSummary = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const summary = await this.paymentService.getFinancialSummary(schoolId);
    response.status(200).json({ status: 'success', data: summary });
  };
}
