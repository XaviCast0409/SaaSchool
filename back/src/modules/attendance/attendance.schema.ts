import { z } from 'zod';

export const createAttendanceSchema = z.object({
  enrollmentId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (YYYY-MM-DD)'),
  status: z
    .enum([
      'PRESENT',
      'ABSENT_JUSTIFIED',
      'ABSENT_UNJUSTIFIED',
      'LATE_JUSTIFIED',
      'LATE_UNJUSTIFIED',
    ])
    .default('PRESENT'),
  notes: z.string().optional(),
});

export const bulkAttendanceSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (YYYY-MM-DD)'),
  records: z.array(
    z.object({
      enrollmentId: z.string().uuid(),
      status: z.enum([
        'PRESENT',
        'ABSENT_JUSTIFIED',
        'ABSENT_UNJUSTIFIED',
        'LATE_JUSTIFIED',
        'LATE_UNJUSTIFIED',
      ]),
      notes: z.string().optional(),
    }),
  ),
});

export type CreateAttendanceDto = z.infer<typeof createAttendanceSchema>;
export type BulkAttendanceDto = z.infer<typeof bulkAttendanceSchema>;
