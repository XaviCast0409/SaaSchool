import { z } from 'zod';

export const createObligationSchema = z.object({
  enrollmentId: z.string().uuid('Selecciona un estudiante válido'),
  title: z.string().min(1, 'El título es requerido'),
  concept: z.string().min(1, 'El concepto es requerido'),
  amountDue: z.coerce.number().positive('El monto debe ser un número positivo'),
  dueDate: z.string().min(1, 'Fecha de vencimiento requerida'),
});

export const bulkCreateObligationsSchema = z.object({
  classroomId: z.string().optional(),
  title: z.string().min(1, 'El título es requerido (ej: Pensión Marzo 2026)'),
  concept: z.string().min(1, 'El concepto es requerido (ej: PENSION, MATRICULA)'),
  amountDue: z.coerce.number().positive('El monto debe ser un número positivo'),
  dueDate: z.string().min(1, 'Fecha de vencimiento requerida'),
});

export const registerTransactionSchema = z.object({
  obligationId: z.string().uuid(),
  amountPaid: z.coerce.number().positive('El monto pagado debe ser positivo'),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'CREDIT_CARD'], {
    errorMap: () => ({ message: 'Selecciona el método de pago' }),
  }),
  operationNumber: z.string().optional(),
  receiptType: z.string().default('BOLETA DE VENTA'),
  receiptNumber: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateObligationFormData = z.infer<typeof createObligationSchema>;
export type BulkCreateObligationsFormData = z.infer<typeof bulkCreateObligationsSchema>;
export type RegisterTransactionFormData = z.infer<typeof registerTransactionSchema>;
