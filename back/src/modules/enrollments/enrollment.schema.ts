import { z } from 'zod';

export const createEnrollmentSchema = z.object({
  studentId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  classroomId: z.string().uuid(),
  previousSchoolModularCode: z.string().optional(),
  condition: z.enum(['INGRESANTE', 'CONTINUO', 'TRASLADO', 'REENTRANTE']).default('CONTINUO'),
  repeatingGrade: z.boolean().default(false),
});

export const updateEnrollmentSchema = z.object({
  classroomId: z.string().uuid().optional(),
  enrollmentState: z.enum(['REGISTERED', 'TRANSFERRED', 'WITHDRAWN']).optional(),
  /**
   * Último día que el alumno estudió (AAAA-MM-DD); por defecto, hoy. Se guarda en la matrícula:
   * las notas de los periodos que terminaron hasta ese día y la asistencia hasta ese día siguen
   * contando, y las cuotas que vencen después se anulan.
   */
  stateChangeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (AAAA-MM-DD)').optional(),
  withdrawalReason: z.string().trim().max(500).optional().nullable(),
  /** Colegio de destino (solo traslados) */
  transferSchool: z.string().trim().max(200).optional().nullable(),
});

export const schedulePreviewSchema = z.object({
  academicYearId: z.string().uuid(),
  classroomId: z.string().uuid(),
  condition: z.enum(['INGRESANTE', 'CONTINUO', 'TRASLADO', 'REENTRANTE']).default('CONTINUO'),
});

export type CreateEnrollmentDto = z.infer<typeof createEnrollmentSchema>;
export type UpdateEnrollmentDto = z.infer<typeof updateEnrollmentSchema>;
