import { z } from 'zod';

const emptyToUndefined = z.literal('').transform(() => undefined);

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
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (YYYY-MM-DD)')
    .optional()
    .or(emptyToUndefined),
  classroomId: z
    .string()
    .uuid('ID de aula inválido')
    .optional()
    .or(emptyToUndefined),
  status: z
    .string()
    .optional()
    .or(emptyToUndefined),
  search: z
    .string()
    .optional()
    .or(emptyToUndefined),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(15),
});

export const attendanceSummaryQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Mes inválido (YYYY-MM)')
    .optional()
    .or(emptyToUndefined),
  classroomId: z
    .string()
    .uuid('ID de aula inválido')
    .optional()
    .or(emptyToUndefined),
});

export const attendanceExportQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Mes inválido (YYYY-MM)'),
  classroomId: z
    .string()
    .uuid('ID de aula inválido')
    .optional()
    .or(emptyToUndefined),
});

// Schema para consulta de matriz sábana mensual por días
export const attendanceMatrixQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Mes inválido (YYYY-MM)'),
  classroomId: z
    .string()
    .uuid('ID de aula inválido')
    .optional()
    .or(emptyToUndefined),
});

// Schema para expediente individual de alumno
export const studentAttendanceQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Mes inválido (YYYY-MM)')
    .optional()
    .or(emptyToUndefined),
});

// Schema para escaneo rápido de QR o código de barras
export const scanAttendanceSchema = z.object({
  code: z.string().min(1, 'El código o token de escaneo es requerido'),
  toleranceTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Hora de tolerancia inválida (HH:mm)')
    .optional()
    .or(emptyToUndefined),
  statusOverride: z
    .enum([
      'PRESENT',
      'ABSENT_JUSTIFIED',
      'ABSENT_UNJUSTIFIED',
      'LATE_JUSTIFIED',
      'LATE_UNJUSTIFIED',
    ])
    .optional(),
});

// Schema para consultar la hoja completa de asistencia de un aula en una fecha
export const attendanceSheetQuerySchema = z.object({
  classroomId: z.string().uuid('ID de aula inválido'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (YYYY-MM-DD)'),
});

// Schema para guardar o actualizar la hoja de asistencia de un aula (Upsert Atómico)
export const saveAttendanceSheetSchema = z.object({
  classroomId: z.string().uuid('ID de aula inválido'),
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

export const attendanceScheduleScopeEnum = z.enum([
  'GENERAL',
  'INITIAL',
  'PRIMARY',
  'SECONDARY',
]);

export const upsertAttendanceScheduleConfigSchema = z.object({
  scope: attendanceScheduleScopeEnum.default('GENERAL'),
  entryTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Hora de entrada inválida (HH:mm)'),
  lateToleranceTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Hora límite de tardanza inválida (HH:mm)'),
  autoCloseTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Hora de corte inválida (HH:mm)'),
  autoCloseEnabled: z.boolean().default(false),
});

export const closeClassroomAttendanceSchema = z.object({
  classroomId: z.string().uuid('ID de aula inválido').optional(),
  educationLevel: z.enum(['INITIAL', 'PRIMARY', 'SECONDARY']).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (YYYY-MM-DD)').optional(),
});

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (YYYY-MM-DD)');

export const createJustificationSchema = z
  .object({
    enrollmentId: z.string().uuid(),
    dateFrom: isoDate,
    dateTo: isoDate,
    reason: z.enum(['MEDICAL', 'FAMILY', 'BEREAVEMENT', 'TRANSPORT', 'OTHER']),
    description: z.string().trim().min(5, 'Describe brevemente el motivo').max(1000),
    fileUrl: z
      .string()
      .trim()
      .refine((v) => v.startsWith('/api/files/'), 'Adjunto inválido')
      .optional()
      .nullable(),
    fileName: z.string().trim().max(150).optional().nullable(),
  })
  .refine((v) => v.dateFrom <= v.dateTo, { message: 'La fecha inicial no puede ser posterior a la final', path: ['dateTo'] });

export const reviewJustificationSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  reviewNote: z.string().trim().max(500).optional().nullable(),
});

export const justificationFilterSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  enrollmentId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateAttendanceDto = z.infer<typeof createAttendanceSchema>;
export type UpdateAttendanceDto = z.infer<typeof updateAttendanceSchema>;
export type BulkAttendanceDto = z.infer<typeof bulkAttendanceSchema>;
export type AttendanceFilterDto = z.infer<typeof attendanceFilterSchema>;
export type AttendanceSummaryQueryDto = z.infer<typeof attendanceSummaryQuerySchema>;
export type AttendanceExportQueryDto = z.infer<typeof attendanceExportQuerySchema>;
export type AttendanceMatrixQueryDto = z.infer<typeof attendanceMatrixQuerySchema>;
export type StudentAttendanceQueryDto = z.infer<typeof studentAttendanceQuerySchema>;
export type ScanAttendanceDto = z.infer<typeof scanAttendanceSchema>;
export type AttendanceSheetQueryDto = z.infer<typeof attendanceSheetQuerySchema>;
export type SaveAttendanceSheetDto = z.infer<typeof saveAttendanceSheetSchema>;
export type UpsertAttendanceScheduleConfigDto = z.infer<typeof upsertAttendanceScheduleConfigSchema>;
export type CloseClassroomAttendanceDto = z.infer<typeof closeClassroomAttendanceSchema>;
export type CreateJustificationDto = z.infer<typeof createJustificationSchema>;
export type ReviewJustificationDto = z.infer<typeof reviewJustificationSchema>;
export type JustificationFilterDto = z.infer<typeof justificationFilterSchema>;
