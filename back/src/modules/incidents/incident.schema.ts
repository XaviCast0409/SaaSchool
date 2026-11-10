import { z } from 'zod';

export const INCIDENT_TYPES = [
  'MERITO',
  'DEMERITO',
  'ATENCION_TOPICO',
  'CITACION_PADRES',
  'BEHAVIORAL',
  'HEALTH',
  'ACADEMIC',
  'CITATION',
  'POSITIVE',
] as const;

export const INCIDENT_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

export const createIncidentSchema = z
  .object({
    enrollmentId: z.string().uuid('ID de matrícula inválido').optional(),
    studentId: z.string().uuid('ID de estudiante inválido').optional(),
    type: z.enum(INCIDENT_TYPES),
    severity: z.enum(INCIDENT_SEVERITIES).default('LOW'),
    title: z.string().min(1, 'El título es obligatorio'),
    description: z.string().min(1, 'La descripción es obligatoria'),
    actionTaken: z.string().optional().nullable(),
    citationDate: z.string().optional().nullable(),
    isViolenceCase: z.boolean().default(false),
  })
  .refine((data) => Boolean(data.enrollmentId || data.studentId), {
    message: 'Debe especificar enrollmentId o studentId',
  });

export const siseveUpdateSchema = z.object({
  siseveCode: z.string().trim().min(3).max(40),
});

export const incidentFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  enrollmentId: z.string().uuid().optional(),
  studentId: z.string().uuid().optional(),
  classroomId: z.string().uuid().optional(),
  type: z.string().optional(),
  severity: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type CreateIncidentDto = z.infer<typeof createIncidentSchema>;
export type SiseveUpdateDto = z.infer<typeof siseveUpdateSchema>;
export type IncidentFilterDto = z.infer<typeof incidentFilterSchema>;

