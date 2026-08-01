export type UserRole = 'SUPER_ADMIN' | 'SCHOOL_ADMIN' | 'TEACHER' | 'PARENT';
export type DocumentType = 'DNI' | 'CE' | 'PASSPORT' | 'PNA' | 'OTHER';

export interface DirectoryUser {
  id: string;
  schoolId: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastNamePaternal: string;
  lastNameMaternal: string;
  documentType: DocumentType;
  documentId?: string;
  cellphone?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
