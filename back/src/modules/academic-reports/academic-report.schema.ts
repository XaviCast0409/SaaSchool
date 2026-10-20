import { z } from 'zod';
import { EducationLevel } from '@prisma/client';

// ============================================================================
// Catálogo de aulas para reportes (Filtro transversal sin restricción docente)
// ============================================================================
export const getClassroomsQuerySchema = z.object({
  academicYearId: z.string().uuid().optional(),
});

export type GetClassroomsQueryDto = z.infer<typeof getClassroomsQuerySchema>;

// ============================================================================
// Reporte 0021: Consolidado de Estudios
// ============================================================================
export const getConsolidatedGradesQuerySchema = z.object({
  classroomId: z.string().uuid('El ID del aula debe ser un UUID válido'),
  periodNumber: z.coerce.number().int().min(1).max(4, 'El periodo debe estar entre 1 y 4'),
});

export type GetConsolidatedGradesQueryDto = z.infer<typeof getConsolidatedGradesQuerySchema>;

// ============================================================================
// Reporte 0041: Registro Auxiliar Borrador
// ============================================================================
export const getDraftRegisterQuerySchema = z.object({
  classroomId: z.string().uuid('El ID del aula debe ser un UUID válido'),
  courseAssignmentId: z
    .string()
    .uuid('El ID del curso debe ser un UUID válido')
    .optional()
    .or(z.literal(''))
    .transform((val) => val || undefined),
  periodNumber: z.coerce.number().int().min(1).max(4).optional(),
});

export type GetDraftRegisterQueryDto = z.infer<typeof getDraftRegisterQuerySchema>;

// ============================================================================
// Reporte 0048: Orden de Mérito y Tercios por Salón
// ============================================================================
export const getMeritClassroomQuerySchema = z.object({
  classroomId: z.string().uuid('El ID del aula debe ser un UUID válido'),
  periodNumber: z.coerce.number().int().min(1).max(4, 'El periodo debe estar entre 1 y 4'),
});

export type GetMeritClassroomQueryDto = z.infer<typeof getMeritClassroomQuerySchema>;

// ============================================================================
// Reporte 0049: Orden de Mérito y Tercios/Quintos por Grado
// ============================================================================
export const getMeritGradeQuerySchema = z.object({
  educationLevel: z.nativeEnum(EducationLevel, {
    errorMap: () => ({ message: 'El nivel educativo debe ser INITIAL, PRIMARY o SECONDARY' }),
  }),
  grade: z.coerce.number().int().min(1).max(6, 'El grado debe estar entre 1 y 6'),
  periodNumber: z.coerce.number().int().min(1).max(4, 'El periodo debe estar entre 1 y 4'),
  academicYearId: z.string().uuid().optional(),
});

export type GetMeritGradeQueryDto = z.infer<typeof getMeritGradeQuerySchema>;

// ============================================================================
// Reporte 0030: Listado de Comentarios a la Conducta
// ============================================================================
export const getConductCommentsQuerySchema = z.object({
  classroomId: z.string().uuid('El ID del aula debe ser un UUID válido'),
  periodNumber: z.coerce.number().int().min(1).max(4, 'El periodo debe estar entre 1 y 4'),
});

export type GetConductCommentsQueryDto = z.infer<typeof getConductCommentsQuerySchema>;

// ============================================================================
// Reporte 0011: Reporte de Alumnos por Salón (Padrón Oficial)
// ============================================================================
export const getClassroomRosterQuerySchema = z.object({
  classroomId: z.string().uuid('El ID del aula debe ser un UUID válido'),
});

export type GetClassroomRosterQueryDto = z.infer<typeof getClassroomRosterQuerySchema>;

// ============================================================================
// Reporte 0001: Listado de Familias por Estado
// ============================================================================
export const getFamiliesByStateQuerySchema = z.object({
  state: z.enum(['ALL', 'REGISTERED', 'TRANSFERRED', 'WITHDRAWN']).default('REGISTERED'),
  academicYearId: z.string().uuid().optional(),
});

export type GetFamiliesByStateQueryDto = z.infer<typeof getFamiliesByStateQuerySchema>;

// ============================================================================
// Reporte 0002: Listado de Familias e Hijos
// ============================================================================
export const getFamiliesWithChildrenQuerySchema = z.object({
  classroomId: z.string().uuid().optional().or(z.literal('')).transform((v) => v || undefined),
  academicYearId: z.string().uuid().optional(),
});

export type GetFamiliesWithChildrenQueryDto = z.infer<typeof getFamiliesWithChildrenQuerySchema>;

// ============================================================================
// Reporte 0003: Listado de Familias y Parientes (Directorio Institucional)
// ============================================================================
export const getFamiliesRelativesQuerySchema = z.object({
  classroomId: z.string().uuid().optional().or(z.literal('')).transform((v) => v || undefined),
  academicYearId: z.string().uuid().optional(),
});

export type GetFamiliesRelativesQueryDto = z.infer<typeof getFamiliesRelativesQuerySchema>;

// ============================================================================
// Reporte 0019: Listado de Cumpleaños del Alumno
// ============================================================================
export const getStudentBirthdaysQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  classroomId: z.string().uuid().optional().or(z.literal('')).transform((v) => v || undefined),
  educationLevel: z.nativeEnum(EducationLevel).optional(),
  academicYearId: z.string().uuid().optional(),
});

export type GetStudentBirthdaysQueryDto = z.infer<typeof getStudentBirthdaysQuerySchema>;
