import { z } from 'zod';

export const linkParentSchema = z.object({
  studentId: z.string().uuid('Selecciona un estudiante válido'),
  userId: z.string().uuid('Selecciona un apoderado válido'),
  relationshipType: z.enum(['MOTHER', 'FATHER', 'GRANDPARENT', 'UNCLE_AUNT', 'OTHER'], {
    errorMap: () => ({ message: 'Selecciona el tipo de relación' }),
  }),
  isLegalGuardian: z.boolean().default(false),
  isFinancialResponsible: z.boolean().default(false),
  livesWithStudent: z.boolean().default(true),
});

export type LinkParentFormData = z.infer<typeof linkParentSchema>;
