import { z } from 'zod';

const emptyToUndefined = z.literal('').transform(() => undefined);

export const createObligationSchema = z.object({
  enrollmentId: z.string().uuid('ID de matrícula inválido'),
  title: z.string().min(1, 'El título es requerido'),
  concept: z.string().min(1, 'El concepto es requerido'),
  amountDue: z.number().positive('El monto debe ser positivo'),
  dueDate: z.string().min(1, 'Fecha de vencimiento requerida'),
});

export const bulkCreateObligationsSchema = z.object({
  classroomId: z.string().uuid('ID de aula inválido').optional().nullable().or(emptyToUndefined),
  title: z.string().min(1, 'El título es requerido'),
  concept: z.string().min(1, 'El concepto es requerido'),
  amountDue: z.number().positive('El monto debe ser positivo'),
  dueDate: z.string().min(1, 'Fecha de vencimiento requerida'),
});

export const updateObligationSchema = z.object({
  title: z.string().min(1).optional(),
  concept: z.string().min(1).optional(),
  amountDue: z.number().positive().optional(),
  dueDate: z.string().optional(),
  status: z.enum(['PENDING', 'PARTIAL', 'PAID', 'CANCELLED']).optional(),
});

export const obligationFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z.enum(['PENDING', 'PARTIAL', 'PAID', 'CANCELLED']).optional().nullable().or(emptyToUndefined),
  classroomId: z.string().uuid().optional().nullable().or(emptyToUndefined),
  enrollmentId: z.string().uuid().optional().nullable().or(emptyToUndefined),
  search: z.string().optional().nullable().or(emptyToUndefined),
});

export const createTransactionSchema = z.object({
  obligationId: z.string().uuid('ID de obligación inválido'),
  amountPaid: z.number().positive('El monto pagado debe ser positivo'),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'CREDIT_CARD']),
  operationNumber: z.string().optional(),
  receiptType: z.string().optional(),
  receiptNumber: z.string().optional(),
  notes: z.string().optional(),
});

export const transactionFilterSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'CREDIT_CARD']).optional(),
});

export const sendReminderSchema = z.object({
  channel: z
    .enum(['EMAIL', 'WHATSAPP', 'BOTH'])
    .default('EMAIL')
    .transform(() => 'EMAIL' as const),
});

export type CreateObligationDto = z.infer<typeof createObligationSchema>;
export type BulkCreateObligationsDto = z.infer<typeof bulkCreateObligationsSchema>;
export type UpdateObligationDto = z.infer<typeof updateObligationSchema>;
export type ObligationFilterDto = z.infer<typeof obligationFilterSchema>;
export type CreateTransactionDto = z.infer<typeof createTransactionSchema>;
export type TransactionFilterDto = z.infer<typeof transactionFilterSchema>;
export type SendReminderDto = z.infer<typeof sendReminderSchema>;
