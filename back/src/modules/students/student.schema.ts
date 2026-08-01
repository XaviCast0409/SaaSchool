import { z } from 'zod';

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

export type CreateStudentDto = z.infer<typeof createStudentSchema>;
export type UpdateStudentDto = z.infer<typeof updateStudentSchema>;
