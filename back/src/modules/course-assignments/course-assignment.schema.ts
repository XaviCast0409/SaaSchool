import { z } from 'zod';

export const createCourseAssignmentSchema = z.object({
  classroomId: z.string().uuid('ID de aula inválido'),
  areaId: z.string().uuid('ID de área curricular inválido'),
  teacherId: z.string().uuid('ID de docente inválido'),
});

export const bulkAssignUnidocenteSchema = z.object({
  classroomId: z.string().uuid('ID de aula inválido'),
  teacherId: z.string().uuid('ID de docente inválido'),
  // Los areaIds a asignar (todas las áreas del nivel/grado)
  areaIds: z.array(z.string().uuid()).min(1, 'Debe especificar al menos un área curricular'),
});

export type CreateCourseAssignmentDto = z.infer<typeof createCourseAssignmentSchema>;
export type BulkAssignUnidocenteDto = z.infer<typeof bulkAssignUnidocenteSchema>;
