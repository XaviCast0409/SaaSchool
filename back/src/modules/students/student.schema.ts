import { z } from 'zod';
import { EducationLevel } from '@prisma/client';

export const createStudentSchema = z.object({
  firstNames: z.string().min(2, 'Nombres requeridos'),
  lastNamePaternal: z.string().min(2, 'Apellido paterno requerido'),
  lastNameMaternal: z.string().min(2, 'Apellido materno requerido'),
  documentType: z.enum(['DNI', 'CE', 'PASSPORT', 'PNA', 'OTHER']).default('DNI'),
  documentId: z.string().min(1, 'Documento de identidad requerido'),
  gender: z.enum(['MALE', 'FEMALE']),
  birthDate: z.string().datetime({ message: 'Fecha de nacimiento inválida (ISO 8601)' }),
  birthCountry: z.string().default('PERÚ'),
  birthDepartment: z.string().optional(),
  birthProvince: z.string().optional(),
  birthDistrict: z.string().optional(),
  motherTongue: z.string().default('CASTELLANO'),
  hasDisability: z.boolean().default(false),
  disabilityType: z.string().optional(),
  address: z.string().optional(),
  studentCode: z.string().optional(),
});

export const updateStudentSchema = createStudentSchema.partial();

export const studentFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  classroomId: z.string().uuid().optional(),
  educationLevel: z.nativeEnum(EducationLevel).optional(),
  grade: z.coerce.number().int().optional(),
  section: z.string().optional(),
});

export type CreateStudentDto = z.infer<typeof createStudentSchema>;
export type UpdateStudentDto = z.infer<typeof updateStudentSchema>;
export type StudentFilterDto = z.infer<typeof studentFilterSchema>;
