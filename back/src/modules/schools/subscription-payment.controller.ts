import { Request, Response } from 'express';
import { z } from 'zod';
import { createSubscriptionPaymentSchema, voidSubscriptionPaymentSchema } from './subscription-payment.schema';
import type { SubscriptionPaymentService } from './subscription-payment.service';

const monthsQuery = z.coerce.number().int().min(1).max(24).default(1);

export class SubscriptionPaymentController {
  constructor(private readonly service: SubscriptionPaymentService) {}

  list = async (request: Request, response: Response): Promise<void> => {
    const data = await this.service.list(request.params.id as string);
    response.status(200).json({ status: 'success', data });
  };

  preview = async (request: Request, response: Response): Promise<void> => {
    const months = monthsQuery.parse(request.query.months);
    const data = await this.service.preview(request.params.id as string, months);
    response.status(200).json({ status: 'success', data });
  };

  create = async (request: Request, response: Response): Promise<void> => {
    const dto = createSubscriptionPaymentSchema.parse(request.body);
    const data = await this.service.create(request.params.id as string, dto, {
      userId: request.user!.userId,
      email: request.user!.email,
    });
    response.status(201).json({ status: 'success', data });
  };

  void = async (request: Request, response: Response): Promise<void> => {
    const { reason } = voidSubscriptionPaymentSchema.parse(request.body);
    const data = await this.service.void(request.params.id as string, request.params.paymentId as string, reason, {
      userId: request.user!.userId,
      email: request.user!.email,
    });
    response.status(200).json({ status: 'success', data });
  };

  billingSummary = async (_request: Request, response: Response): Promise<void> => {
    const data = await this.service.billingSummary();
    response.status(200).json({ status: 'success', data });
  };
}
