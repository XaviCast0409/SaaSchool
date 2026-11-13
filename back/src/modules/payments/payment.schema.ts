import { z } from 'zod';
import { EXPENSE_CATEGORIES, EXPENSE_DOCUMENT_TYPES, MIN_REASON_LENGTH, PAYMENT_METHODS, requiresOperationNumber } from './finance.rules';

const emptyToUndefined = z.literal('').transform(() => undefined);

export const PAYMENT_CONCEPTS = [
  'PENSION',
  'MATRICULA',
  'LIBROS_MATERIALES',
  'UNIFORME',
  'CARNET_AGENDA',
  'EXCURSION_EVENTO',
  'OTROS',
] as const;

export const createObligationSchema = z
  .object({
    enrollmentId: z.string().uuid('ID de matrícula inválido').optional(),
    studentId: z.string().uuid('ID de estudiante inválido').optional(),
    title: z.string().min(1, 'El título es requerido'),
    concept: z.enum(PAYMENT_CONCEPTS),
    amountDue: z.number().positive('El monto debe ser positivo'),
    dueDate: z.string().min(1, 'Fecha de vencimiento requerida'),
    notes: z.string().optional().nullable(),
    paidNow: z.boolean().optional(),
    paymentMethod: z.enum(PAYMENT_METHODS).optional(),
    operationNumber: z.string().trim().optional().nullable(),
  })
  .refine((data) => Boolean(data.enrollmentId || data.studentId), {
    message: 'Debe especificar el enrollmentId o studentId',
  })
  .refine((data) => !data.paymentMethod || !requiresOperationNumber(data.paymentMethod) || Boolean(data.operationNumber), {
    message: 'Para Yape, Plin, transferencia, depósito o tarjeta, ingresa el número de operación.',
    path: ['operationNumber'],
  });

export const bulkCreateObligationsSchema = z.object({
  classroomId: z.string().uuid('ID de aula inválido').optional().nullable().or(emptyToUndefined),
  title: z.string().min(1, 'El título es requerido'),
  concept: z.enum(PAYMENT_CONCEPTS),
  amountDue: z.number().positive('El monto debe ser positivo'),
  dueDate: z.string().min(1, 'Fecha de vencimiento requerida'),
});

export const updateObligationSchema = z.object({
  title: z.string().min(1).optional(),
  concept: z.enum(PAYMENT_CONCEPTS).optional(),
  amountDue: z.number().positive().optional(),
  dueDate: z.string().optional(),
  /** Obligatorio si se cambia el monto. El estado ya no se edita a mano: se calcula de los pagos. */
  reason: z.string().trim().optional().nullable(),
});

export const reasonSchema = z.object({
  reason: z.string().trim().min(MIN_REASON_LENGTH, `Escribe el motivo (mínimo ${MIN_REASON_LENGTH} caracteres).`).max(300),
});

export const obligationFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z.enum(['PENDING', 'PARTIAL', 'PAID', 'CANCELLED']).optional().nullable().or(emptyToUndefined),
  classroomId: z.string().uuid().optional().nullable().or(emptyToUndefined),
  enrollmentId: z.string().uuid().optional().nullable().or(emptyToUndefined),
  search: z.string().optional().nullable().or(emptyToUndefined),
  // Solo pendientes o parciales con fecha de vencimiento pasada
  overdue: z.enum(['true', 'false']).optional().transform((v) => (v === undefined ? undefined : v === 'true')),
});

export const createTransactionSchema = z
  .object({
    obligationId: z.string().uuid('ID de obligación inválido'),
    amountPaid: z.number().positive('El monto pagado debe ser positivo'),
    paymentMethod: z.enum(PAYMENT_METHODS),
    operationNumber: z.string().trim().optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .refine((data) => !requiresOperationNumber(data.paymentMethod) || Boolean(data.operationNumber), {
    message: 'Para Yape, Plin, transferencia, depósito o tarjeta, ingresa el número de operación.',
    path: ['operationNumber'],
  });

export const transactionFilterSchema = z.object({
  startDate: z.string().optional().or(emptyToUndefined),
  endDate: z.string().optional().or(emptyToUndefined),
  paymentMethod: z.enum(PAYMENT_METHODS).optional().or(emptyToUndefined),
  status: z.enum(['ACTIVE', 'VOIDED']).optional().or(emptyToUndefined),
  collectedById: z.string().uuid().optional().or(emptyToUndefined),
  cashSessionId: z.string().uuid().optional().or(emptyToUndefined),
});

// ──────────────────────────────────────────────────────────────────
// Caja diaria y egresos
// ──────────────────────────────────────────────────────────────────
export const openCashSessionSchema = z.object({
  openingAmount: z.number().min(0, 'El fondo inicial no puede ser negativo').max(100_000),
  openingNote: z.string().trim().max(300).optional().nullable(),
});

export const closeCashSessionSchema = z.object({
  countedCash: z.number().min(0, 'El efectivo contado no puede ser negativo').max(1_000_000),
  closingNote: z.string().trim().max(500).optional().nullable(),
});

export const reviewCashSessionSchema = z.object({
  reviewNote: z.string().trim().max(500).optional().nullable(),
});

export const cashSessionFilterSchema = z.object({
  status: z.enum(['OPEN', 'CLOSED', 'REVIEWED']).optional().or(emptyToUndefined),
  cashierId: z.string().uuid().optional().or(emptyToUndefined),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(emptyToUndefined),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(emptyToUndefined),
});

export const createCashExpenseSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES),
  description: z.string().trim().min(3, 'Describe el gasto').max(300),
  amount: z.number().positive('El monto debe ser mayor a cero').max(100_000),
  beneficiary: z.string().trim().max(150).optional().nullable(),
  documentType: z.enum(EXPENSE_DOCUMENT_TYPES).optional().nullable(),
  documentNumber: z.string().trim().max(50).optional().nullable(),
  attachmentUrl: z.string().trim().url().max(500).optional().nullable().or(emptyToUndefined),
});

export const sendReminderSchema = z.object({
  channel: z
    .enum(['EMAIL', 'WHATSAPP', 'BOTH'])
    .default('EMAIL')
    .transform(() => 'EMAIL' as const),
});

export const dailyCashCloseQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)').optional(),
});

export type CreateObligationDto = z.infer<typeof createObligationSchema>;
export type BulkCreateObligationsDto = z.infer<typeof bulkCreateObligationsSchema>;
export type UpdateObligationDto = z.infer<typeof updateObligationSchema>;
export type ObligationFilterDto = z.infer<typeof obligationFilterSchema>;
export type CreateTransactionDto = z.infer<typeof createTransactionSchema>;
export type TransactionFilterDto = z.infer<typeof transactionFilterSchema>;
export type OpenCashSessionDto = z.infer<typeof openCashSessionSchema>;
export type CloseCashSessionDto = z.infer<typeof closeCashSessionSchema>;
export type CashSessionFilterDto = z.infer<typeof cashSessionFilterSchema>;
export type CreateCashExpenseDto = z.infer<typeof createCashExpenseSchema>;
export type SendReminderDto = z.infer<typeof sendReminderSchema>;
export type DailyCashCloseQueryDto = z.infer<typeof dailyCashCloseQuerySchema>;
