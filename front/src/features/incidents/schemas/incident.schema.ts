import { z } from 'zod';

export const createIncidentSchema = z.object({
  studentId: z.string().optional(),
  type: z.enum([
    'MERITO',
    'DEMERITO',
    'ATENCION_TOPICO',
    'CITACION_PADRES',
    'BEHAVIORAL',
    'HEALTH',
    'ACADEMIC',
    'CITATION',
    'POSITIVE',
  ]),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres'),
  description: z.string().min(5, 'La descripción debe tener al menos 5 caracteres'),
  actionTaken: z.string().optional(),
  citationDate: z.string().optional(),
  isViolenceCase: z.boolean().default(false),
  notifyFamily: z.boolean().default(true),
});

export type CreateIncidentFormData = z.infer<typeof createIncidentSchema>;
