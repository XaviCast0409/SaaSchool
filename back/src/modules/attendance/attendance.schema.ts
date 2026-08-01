import { z } from 'zod';

export const createAttendanceSchema = z.object({
  enrollmentId: z.string().uuid('ID de matrícula inválido'),
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

export const updateAttendanceSchema = createAttendanceSchema
  .omit({ enrollmentId: true })
  .partial();

export const bulkAttendanceSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (YYYY-MM-DD)'),
  records: z.array(
    z.object({
      enrollmentId: z.string().uuid('ID de matrícula inválido'),
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

export const attendanceFilterSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (YYYY-MM-DD)').optional(),
  classroomId: z.string().uuid('ID de aula inválido').optional(),
});

export const attendanceSummaryQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Mes inválido (YYYY-MM)').optional(),
  classroomId: z.string().uuid('ID de aula inválido').optional(),
});

export type CreateAttendanceDto = z.infer<typeof createAttendanceSchema>;
export type UpdateAttendanceDto = z.infer<typeof updateAttendanceSchema>;
export type BulkAttendanceDto = z.infer<typeof bulkAttendanceSchema>;
export type AttendanceFilterDto = z.infer<typeof attendanceFilterSchema>;
export type AttendanceSummaryQueryDto = z.infer<typeof attendanceSummaryQuerySchema>;
