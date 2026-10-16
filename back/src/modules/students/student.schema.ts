import { z } from 'zod';
import { EducationLevel } from '@prisma/client';

const emptyToUndefined = z.literal('').transform(() => undefined);

// Parser para género que acepta tanto 'MALE'/'FEMALE' como 'M'/'F'
const genderSchema = z.preprocess((val) => {
  if (typeof val === 'string') {
    const upper = val.toUpperCase().trim();
    if (upper === 'M' || upper === 'MALE') return 'MALE';
    if (upper === 'F' || upper === 'FEMALE') return 'FEMALE';
  }
  return val;
}, z.enum(['MALE', 'FEMALE']));

// Parser para tipo de documento
const documentTypeSchema = z.enum([
  'DNI',
  'CE',
  'CARNET_EXTRANJERIA',
  'PASSPORT',
  'PNA',
  'CODIGO_TEMPORAL',
  'OTHER',
]);

export const createStudentSchema = z
  .object({
    firstNames: z.string().trim().min(2, 'Nombres requeridos (mínimo 2 caracteres)'),
    lastNamePaternal: z.string().trim().min(2, 'Apellido paterno requerido'),
    lastNameMaternal: z.string().trim().optional().nullable().or(z.literal('')),
    documentType: documentTypeSchema.default('DNI'),
    documentId: z.string().trim().min(1, 'Número de documento requerido'),
    gender: genderSchema,
    birthDate: z.string().min(1, 'Fecha de nacimiento requerida'),
    birthCountry: z.string().trim().default('PERÚ'),
    birthUbigeo: z
      .string()
      .trim()
      .regex(/^\d{6}$/, 'El Ubigeo de nacimiento debe tener 6 dígitos INEI (ej: 150101)')
      .optional()
      .nullable()
      .or(z.literal('')),
    birthDepartment: z.string().trim().optional().nullable().or(z.literal('')),
    birthProvince: z.string().trim().optional().nullable().or(z.literal('')),
    birthDistrict: z.string().trim().optional().nullable().or(z.literal('')),
    residenceUbigeo: z
      .string()
      .trim()
      .regex(/^\d{6}$/, 'El Ubigeo de residencia debe tener 6 dígitos INEI (ej: 150101)')
      .optional()
      .nullable()
      .or(z.literal('')),
    motherTongue: z.string().trim().default('CASTELLANO'),
    hasDisability: z.boolean().default(false),
    disabilityType: z.string().trim().optional().nullable().or(z.literal('')),
    address: z.string().trim().optional().nullable().or(z.literal('')),
    studentCode: z
      .string()
      .trim()
      .regex(/^\d{14}$/, 'El código SIAGIE debe constar de 14 dígitos numéricos')
      .optional()
      .nullable()
      .or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    // Si el documento es DNI, debe ser estrictamente de 8 dígitos numéricos
    if (data.documentType === 'DNI') {
      const cleanDoc = data.documentId.trim();
      if (!/^\d{8}$/.test(cleanDoc)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'El DNI debe tener exactamente 8 dígitos numéricos (ej: 08123456)',
          path: ['documentId'],
        });
      }
    }
  });

export const updateStudentSchema = z
  .object({
    firstNames: z.string().trim().min(2).optional(),
    lastNamePaternal: z.string().trim().min(2).optional(),
    lastNameMaternal: z.string().trim().optional().nullable().or(z.literal('')),
    documentType: documentTypeSchema.optional(),
    documentId: z.string().trim().min(1).optional(),
    gender: genderSchema.optional(),
    birthDate: z.string().optional(),
    birthCountry: z.string().trim().optional(),
    birthUbigeo: z.string().trim().regex(/^\d{6}$/).optional().nullable().or(z.literal('')),
    birthDepartment: z.string().trim().optional().nullable().or(z.literal('')),
    birthProvince: z.string().trim().optional().nullable().or(z.literal('')),
    birthDistrict: z.string().trim().optional().nullable().or(z.literal('')),
    residenceUbigeo: z.string().trim().regex(/^\d{6}$/).optional().nullable().or(z.literal('')),
    motherTongue: z.string().trim().optional(),
    hasDisability: z.boolean().optional(),
    disabilityType: z.string().trim().optional().nullable().or(z.literal('')),
    address: z.string().trim().optional().nullable().or(z.literal('')),
    studentCode: z.string().trim().regex(/^\d{14}$/).optional().nullable().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    if (data.documentType === 'DNI' && data.documentId) {
      if (!/^\d{8}$/.test(data.documentId.trim())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'El DNI debe tener exactamente 8 dígitos numéricos (ej: 08123456)',
          path: ['documentId'],
        });
      }
    }
  });

export const studentFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(10),
  search: z.string().optional().or(emptyToUndefined),
  classroomId: z.string().uuid().optional().or(emptyToUndefined),
  educationLevel: z.nativeEnum(EducationLevel).optional().or(emptyToUndefined),
  grade: z.coerce.number().int().optional().or(emptyToUndefined),
  section: z.string().optional().or(emptyToUndefined),
});

/**
 * Esquema Unificado para Registrar la Ficha de Matrícula SIAGIE en una sola transacción
 */
export const registerFichaMatriculaSchema = z.object({
  // 1. Datos del Estudiante
  student: createStudentSchema,

  // 2. Datos de Matrícula
  enrollment: z.object({
    academicYearId: z.string().uuid('ID de Año Lectivo inválido'),
    classroomId: z.string().uuid('ID de Aula inválido'),
    condition: z.enum(['INGRESANTE', 'CONTINUO', 'TRASLADO', 'REENTRANTE']).default('CONTINUO'),
    previousSchoolModularCode: z
      .string()
      .trim()
      .regex(/^\d{7}$/, 'El Código Modular de colegio consta de 7 dígitos')
      .optional()
      .nullable()
      .or(z.literal('')),
    repeatingGrade: z.boolean().default(false),
  }),

  // 3. Datos del Apoderado
  guardian: z
    .object({
      mode: z.enum(['EXISTING', 'NEW']).default('EXISTING'),
      existingUserId: z.string().uuid().optional().nullable().or(z.literal('')),
      relationshipType: z.enum(['MOTHER', 'FATHER', 'TUTOR_LEGAL', 'GRANDPARENT', 'UNCLE_AUNT', 'OTHER']).default('FATHER'),
      isLegalGuardian: z.boolean().default(true),
      isFinancialResponsible: z.boolean().default(true),
      livesWithStudent: z.boolean().default(true),

      // Si mode === 'NEW'
      newGuardian: z
        .object({
          firstName: z.string().trim().min(2, 'Nombres de apoderado requeridos').optional(),
          lastNamePaternal: z.string().trim().min(2, 'Apellido paterno de apoderado requerido').optional(),
          lastNameMaternal: z.string().trim().optional().nullable().or(z.literal('')),
          documentType: documentTypeSchema.default('DNI'),
          documentId: z.string().trim().optional().nullable().or(z.literal('')),
          email: z.string().email('Email de apoderado inválido').optional(),
          cellphone: z
            .string()
            .trim()
            .regex(/^(\+?51)?\s?9\d{8}$/, 'Celular debe tener 9 dígitos y empezar con 9')
            .optional()
            .nullable()
            .or(z.literal('')),
          educationLevel: z.string().trim().optional().nullable().or(z.literal('')),
        })
        .optional(),
    })
    .superRefine((data, ctx) => {
      if (data.mode === 'EXISTING' && !data.existingUserId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Debe seleccionar un apoderado del directorio existente',
          path: ['existingUserId'],
        });
      }
      if (data.mode === 'NEW') {
        if (!data.newGuardian?.firstName) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Nombres del apoderado requeridos',
            path: ['newGuardian', 'firstName'],
          });
        }
        if (!data.newGuardian?.lastNamePaternal) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Apellido paterno del apoderado requerido',
            path: ['newGuardian', 'lastNamePaternal'],
          });
        }
        if (!data.newGuardian?.email) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Correo electrónico del apoderado requerido',
            path: ['newGuardian', 'email'],
          });
        }
        if (data.newGuardian?.documentType === 'DNI' && data.newGuardian?.documentId) {
          if (!/^\d{8}$/.test(data.newGuardian.documentId.trim())) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'El DNI del apoderado debe tener 8 dígitos numéricos',
              path: ['newGuardian', 'documentId'],
            });
          }
        }
      }
    }),
});

export type CreateStudentDto = z.infer<typeof createStudentSchema>;
export type UpdateStudentDto = z.infer<typeof updateStudentSchema>;
export type StudentFilterDto = z.infer<typeof studentFilterSchema>;
export type RegisterFichaMatriculaDto = z.infer<typeof registerFichaMatriculaSchema>;
