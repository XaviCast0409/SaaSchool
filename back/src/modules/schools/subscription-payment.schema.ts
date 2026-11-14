import { z } from 'zod';

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (AAAA-MM-DD)');

export const createSubscriptionPaymentSchema = z.object({
  amount: z.number().positive('El monto debe ser mayor a 0').max(1_000_000),
  paidOn: dateKey,
  method: z.enum(['TRANSFER', 'YAPE', 'PLIN', 'CASH', 'CARD', 'OTHER']),
  monthsCovered: z.number().int().min(1, 'Mínimo 1 mes').max(24, 'Máximo 24 meses'),
  reference: z.string().trim().max(120).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const voidSubscriptionPaymentSchema = z.object({
  reason: z.string().trim().min(3, 'Indica el motivo de la anulación').max(300),
});

export type CreateSubscriptionPaymentDto = z.infer<typeof createSubscriptionPaymentSchema>;
