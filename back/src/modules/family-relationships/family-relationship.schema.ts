import { z } from 'zod';

export const createFamilyRelationshipSchema = z.object({
  studentId: z.string().uuid('ID de estudiante inválido'),
  userId: z.string().uuid('ID de usuario/padre inválido'),
  relationshipType: z.enum(['MOTHER', 'FATHER', 'TUTOR_LEGAL', 'GRANDPARENT', 'UNCLE_AUNT', 'OTHER']),
  isLegalGuardian: z.boolean().default(false),
  isFinancialResponsible: z.boolean().default(false),
  livesWithStudent: z.boolean().default(true),
});

export const updateFamilyRelationshipSchema = createFamilyRelationshipSchema
  .omit({ studentId: true, userId: true })
  .partial();

export type CreateFamilyRelationshipDto = z.infer<typeof createFamilyRelationshipSchema>;
export type UpdateFamilyRelationshipDto = z.infer<typeof updateFamilyRelationshipSchema>;
