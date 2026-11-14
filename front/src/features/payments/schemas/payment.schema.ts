import { z } from 'zod';

export const createObligationSchema = z.object({
  enrollmentId: z.string().uuid('Selecciona un estudiante válido'),
  title: z.string().min(1, 'El título es requerido'),
  concept: z.string().min(1, 'El concepto es requerido'),
  amountDue: z.coerce.number().positive('El monto debe ser un número positivo'),
  dueDate: z.string().min(1, 'Fecha de vencimiento requerida'),
});

const optionalAmount = z.preprocess(
  (v) => (v === '' || v === null || v === undefined || Number.isNaN(v) ? undefined : Number(v)),
  z.number().positive('El monto debe ser positivo').optional(),
);

export const bulkCreateObligationsSchema = z.object({
  /** '' = todo el colegio, 'level:PRIMARY' = un nivel, o el id de un aula */
  classroomId: z.string().optional(),
  title: z.string().min(1, 'El título es requerido (ej: Pensión Marzo 2026)'),
  concept: z.string().min(1, 'El concepto es requerido (ej: PENSION, MATRICULA)'),
  amountDue: optionalAmount,
  byLevel: z.boolean().default(false),
  amountInitial: optionalAmount,
  amountPrimary: optionalAmount,
  amountSecondary: optionalAmount,
  dueDate: z.string().min(1, 'Fecha de vencimiento requerida'),
});

export const registerTransactionSchema = z
  .object({
    obligationId: z.string().uuid(),
    amountPaid: z.coerce.number().positive('El monto pagado debe ser positivo'),
    paymentMethod: z.enum(['CASH', 'YAPE', 'PLIN', 'BANK_TRANSFER', 'DEPOSIT', 'CREDIT_CARD'], {
      errorMap: () => ({ message: 'Selecciona el medio de pago' }),
    }),
    operationNumber: z.string().trim().optional(),
    notes: z.string().trim().optional(),
  })
  .refine((d) => d.paymentMethod === 'CASH' || Boolean(d.operationNumber), {
    message: 'Ingresa el número de operación (sirve para conciliar con el banco o el aplicativo).',
    path: ['operationNumber'],
  });

export type CreateObligationFormData = z.infer<typeof createObligationSchema>;
export type BulkCreateObligationsFormData = z.infer<typeof bulkCreateObligationsSchema>;
export type RegisterTransactionFormData = z.infer<typeof registerTransactionSchema>;
