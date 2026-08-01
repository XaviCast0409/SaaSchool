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
}
