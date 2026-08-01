import { z } from 'zod';

export const createObligationSchema = z.object({
  enrollmentId: z.string().uuid(),
  title: z.string().min(1, 'El título es requerido'),
  concept: z.string().min(1, 'El concepto es requerido'),
  amountDue: z.number().positive('El monto debe ser positivo'),
  dueDate: z.string().datetime({ message: 'Fecha de vencimiento inválida (ISO 8601)' }),
});

export const createTransactionSchema = z.object({
  obligationId: z.string().uuid(),
  amountPaid: z.number().positive('El monto pagado debe ser positivo'),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'CREDIT_CARD']),
  operationNumber: z.string().optional(),
  receiptType: z.string().optional(),
  receiptNumber: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateObligationDto = z.infer<typeof createObligationSchema>;
export type CreateTransactionDto = z.infer<typeof createTransactionSchema>;
