export interface Student {
  id: string;
  schoolId: string;
  studentCode?: string;
  firstNames: string;
  lastNamePaternal: string;
  lastNameMaternal: string;
  documentType: string;
  documentId: string;
  gender: 'MALE' | 'FEMALE';
  birthDate: string;
  birthCountry: string;
  birthDepartment?: string;
  birthProvince?: string;
  birthDistrict?: string;
  motherTongue: string;
  hasDisability: boolean;
  disabilityType?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
  enrollments?: Array<{
    id: string;
    classroom?: {
      id: string;
      educationLevel: 'INITIAL' | 'PRIMARY' | 'SECONDARY';
      grade: number;
      section: string;
      shift: string;
    };
  }>;
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
