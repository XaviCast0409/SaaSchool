import { z } from 'zod';

const periodLabel = z.enum(['1', '2', '3', '4', '5', '6', '7', '8']).default('1');

export const sessionQuerySchema = z.object({
  courseAssignmentId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodLabel,
});

export const saveSessionSchema = sessionQuerySchema.extend({
  records: z.array(
    z.object({
      enrollmentId: z.string().uuid(),
      status: z.enum([
        'PRESENT',
        'LATE_UNJUSTIFIED',
        'LATE_JUSTIFIED',
        'ABSENT_UNJUSTIFIED',
        'ABSENT_JUSTIFIED',
      ]),
      note: z.string().trim().max(200).optional().nullable(),
    }),
  ).min(1).max(60),
});

export const summaryQuerySchema = z.object({
  courseAssignmentId: z.string().uuid(),
  month: z.string().regex(/^\d{4}-\d{2}$/),
});

export type SessionQueryDto = z.infer<typeof sessionQuerySchema>;
export type SaveSessionDto = z.infer<typeof saveSessionSchema>;
export type SummaryQueryDto = z.infer<typeof summaryQuerySchema>;
