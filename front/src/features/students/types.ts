export interface StudentEnrollment {
  id: string;
  condition?: 'INGRESANTE' | 'CONTINUO' | 'TRASLADO' | 'REENTRANTE';
  enrollmentDate: string;
  enrollmentState?: string;
  previousSchoolModularCode?: string | null;
  repeatingGrade?: boolean;
  academicYear?: {
    id: string;
    year: number;
    name?: string;
  };
  classroom?: {
    id: string;
    educationLevel: 'INITIAL' | 'PRIMARY' | 'SECONDARY';
    grade: number;
    section: string;
    shift: string;
  };
}

export interface StudentFamilyRelation {
  id: string;
  relationshipType: 'MOTHER' | 'FATHER' | 'TUTOR_LEGAL' | 'GRANDPARENT' | 'UNCLE_AUNT' | 'OTHER';
  isLegalGuardian: boolean;
  isFinancialResponsible: boolean;
  livesWithStudent: boolean;
  user?: {
    id: string;
    firstName: string;
    lastNamePaternal: string;
    lastNameMaternal?: string;
    documentType: string;
    documentId?: string;
    email: string;
    cellphone?: string;
    educationLevel?: string;
  };
}

export interface Student {
  id: string;
  schoolId: string;
  studentCode?: string;
  firstNames: string;
  lastNamePaternal: string;
  lastNameMaternal?: string | null;
  documentType: string;
  documentId: string;
  gender: 'MALE' | 'FEMALE';
  birthDate: string;
  birthCountry: string;
  birthUbigeo?: string | null;
  birthDepartment?: string | null;
  birthProvince?: string | null;
  birthDistrict?: string | null;
  residenceUbigeo?: string | null;
  motherTongue: string;
  hasDisability: boolean;
  disabilityType?: string | null;
  address?: string | null;
  createdAt: string;
  updatedAt: string;
  enrollments?: StudentEnrollment[];
  familyRelations?: StudentFamilyRelation[];
}

export interface StudentFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  classroomId?: string;
  educationLevel?: 'INITIAL' | 'PRIMARY' | 'SECONDARY';
  grade?: number;
  section?: string;
}

export interface StudentsPaginatedResponse {
  status: string;
  data: Student[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface SiagieCatalogs {
  documentTypes: Array<{ code: string; name: string; length: number; isNumeric: boolean }>;
  genders: Array<{ code: string; name: string; symbol: string }>;
  enrollmentConditions: Array<{ code: string; name: string }>;
  relationshipTypes: Array<{ code: string; name: string }>;
  educationLevels: Array<{ code: string; name: string }>;
  nativeLanguages: Array<{ code: string; name: string }>;
  disabilityTypes: Array<{ code: string; name: string }>;
  commonUbigeos: Array<{ code: string; department: string; province: string; district: string }>;
}
