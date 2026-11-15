export type UserRole = 'SUPER_ADMIN' | 'SCHOOL_ADMIN' | 'ADMINISTRATIVE' | 'TEACHER' | 'PARENT';
export type FinanceRole = 'CASHIER' | 'TREASURER' | 'ACCOUNTANT';
export type DocumentType = 'DNI' | 'CE' | 'PASSPORT' | 'PNA' | 'OTHER';

export interface DirectoryUser {
  id: string;
  schoolId: string;
  email: string;
  role: UserRole;
  /** Solo personal administrativo: cajero, tesorero o contador. */
  financeRole?: FinanceRole | null;
  firstName: string;
  lastNamePaternal: string;
  lastNameMaternal: string;
  documentType: DocumentType;
  documentId?: string;
  cellphone?: string;
  isActive: boolean;
  /** Foto de perfil (solo personal del colegio) */
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  /** Contratación en el año que se está viendo (vacío = no contratado ese año) */
  staffYears?: Array<{ position: string | null }>;
}
