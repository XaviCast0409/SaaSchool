import { Request, Response } from 'express';
import { createObligationSchema, createTransactionSchema } from './payment.schema';
import type { PaymentService } from './payment.service';

export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  getAllObligations = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const obligations = await this.paymentService.getAllObligations(schoolId);
    response.status(200).json({ status: 'success', data: obligations });
  };

  getObligationById = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const id = request.params.id as string;
    const obligation = await this.paymentService.getObligationById(id, schoolId);
    response.status(200).json({ status: 'success', data: obligation });
  };

  createObligation = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const createObligationDto = createObligationSchema.parse(request.body);
    const obligation = await this.paymentService.createObligation(schoolId, createObligationDto);
    response.status(201).json({ status: 'success', data: obligation });
  };

  registerTransaction = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const createTransactionDto = createTransactionSchema.parse(request.body);
    const transaction = await this.paymentService.registerTransaction(
      schoolId,
      createTransactionDto,
    );
    response.status(201).json({ status: 'success', data: transaction });
  };
}
