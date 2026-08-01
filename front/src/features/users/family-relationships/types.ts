import type { DirectoryUser } from '../types';

export type RelationshipType = 'MOTHER' | 'FATHER' | 'GRANDPARENT' | 'UNCLE_AUNT' | 'OTHER';

export interface FamilyRelationship {
  id: string;
  studentId: string;
  userId: string;
  relationshipType: RelationshipType;
  isLegalGuardian: boolean;
  isFinancialResponsible: boolean;
  livesWithStudent: boolean;
  student?: {
    id: string;
    firstNames: string;
    lastNamePaternal: string;
    lastNameMaternal: string;
    documentType: string;
    documentId: string;
    gender: string;
    birthDate: string;
    schoolId: string;
  };
  user?: Omit<DirectoryUser, 'passwordHash'>;
}
