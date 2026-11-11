import { z } from 'zod';
import { isValidGrade } from '../academic/cneb.catalog';

const level = z.enum(['INITIAL', 'PRIMARY', 'SECONDARY']);
const shift = z.enum(['MORNING', 'AFTERNOON', 'NIGHT']);
/** Secciones en mayúsculas y sin espacios extra: "a " y "A" son la misma sección. */
const section = z
  .string()
  .trim()
  .min(1, 'La sección es requerida')
  .max(10, 'La sección admite hasta 10 caracteres')
  .transform((s) => s.replace(/\s+/g, ' ').toUpperCase());

const classroomBase = z.object({
  educationLevel: level,
  grade: z.number().int().min(1).max(6),
  section,
  shift: shift.default('MORNING'),
  capacity: z.number().int().min(1, 'La capacidad mínima es 1').max(60, 'La capacidad máxima es 60').default(30),
  tutorTeacherId: z.string().uuid().nullable().optional(),
});

const gradeMessage = 'El grado no corresponde al nivel (Inicial 3-5 años, Primaria 1.°-6.°, Secundaria 1.°-5.°).';

export const createClassroomSchema = classroomBase.superRefine((v, ctx) => {
  if (!isValidGrade(v.educationLevel, v.grade)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['grade'], message: gradeMessage });
});

export const updateClassroomSchema = classroomBase.partial();

/** Crear varias aulas a la vez: grados × secciones. */
export const bulkCreateClassroomsSchema = z
  .object({
    educationLevel: level,
    grades: z.array(z.number().int()).min(1, 'Elige al menos un grado').max(6),
    sections: z.array(section).min(1, 'Escribe al menos una sección').max(10),
    shift: shift.default('MORNING'),
    capacity: z.number().int().min(1).max(60).default(30),
  })
  .superRefine((v, ctx) => {
    if (v.grades.some((g) => !isValidGrade(v.educationLevel, g))) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['grades'], message: gradeMessage });
  });

export type CreateClassroomDto = z.infer<typeof createClassroomSchema>;
export type UpdateClassroomDto = z.infer<typeof updateClassroomSchema>;
export type BulkCreateClassroomsDto = z.infer<typeof bulkCreateClassroomsSchema>;
