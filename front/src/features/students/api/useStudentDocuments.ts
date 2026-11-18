import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { studentsKeys } from './keys';

export interface NominaMatriculaStudent {
  id: string;
  studentCode?: string | null;
  documentType: string;
  documentId: string;
  firstNames: string;
  lastNamePaternal: string;
  lastNameMaternal?: string | null;
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
  condition: string;
  repeatingGrade: boolean;
  enrollmentDate: string;
  guardian?: {
    relationshipType: string;
    isLegalGuardian: boolean;
    documentType?: string;
    documentId?: string;
    fullName: string;
    cellphone?: string;
    email?: string;
  } | null;
}

export interface NominaMatriculaResponse {
  school: {
    id: string;
    name: string;
    modularCode?: string | null;
    localCode?: string | null;
    department?: string | null;
    province?: string | null;
    district?: string | null;
    address?: string | null;
  };
  classroom: {
    id: string;
    grade: number;
    section: string;
    educationLevel: 'INITIAL' | 'PRIMARY' | 'SECONDARY';
    shift: string;
    tutorTeacher?: {
      id: string;
      firstName: string;
      lastNamePaternal: string;
      lastNameMaternal: string;
    } | null;
  };
  academicYear?: {
    id: string;
    year: number;
    name?: string;
  } | null;
  totalStudents: number;
  students: NominaMatriculaStudent[];
}

export const useNominaMatricula = (classroomId?: string, enabled = true) => {
  return useQuery({
    queryKey: studentsKeys.nominaMatricula(classroomId),
    queryFn: async () => {
      if (!classroomId) throw new Error('ID de aula requerido');
      const response = await api.get<{ status: string; data: NominaMatriculaResponse }>(
        `/students/nomina-matricula/${classroomId}`,
      );
      return response.data.data;
    },
    enabled: Boolean(classroomId) && enabled,
    staleTime: 1000 * 60 * 5, // 5 minutos de caché
  });
};

export interface CertificateData {
  certificateType: 'ENROLLMENT' | 'NO_DEBT';
  certificateNumber: string;
  issueDate: string;
  school: {
    name: string;
    modularCode?: string;
    documentId: string;
    address?: string;
    logoUrl?: string;
  };
  student: {
    id: string;
    fullName: string;
    documentType: string;
    documentId: string;
    studentCode?: string;
  };
  enrollment?: {
    id: string;
    grade: number;
    section: string;
    educationLevel: string;
    shift: string;
    academicYear: number;
    enrollmentDate: string;
  };
  academicYear?: number;
  status?: string;
}

export const useEnrollmentCertificate = (studentId?: string, enabled = true) => {
  return useQuery({
    queryKey: studentsKeys.certificateEnrollment(studentId),
    queryFn: async () => {
      if (!studentId) throw new Error('ID requerido');
      const response = await api.get<{ status: string; data: CertificateData }>(
        `/students/${studentId}/certificates/enrollment`,
      );
      return response.data.data;
    },
    enabled: !!studentId && enabled,
    retry: false,
  });
};

export const useNoDebtCertificate = (studentId?: string, enabled = true) => {
  return useQuery({
    queryKey: studentsKeys.certificateNoDebt(studentId),
    queryFn: async () => {
      if (!studentId) throw new Error('ID requerido');
      const response = await api.get<{ status: string; data: CertificateData }>(
        `/students/${studentId}/certificates/no-debt`,
      );
      return response.data.data;
    },
    enabled: !!studentId && enabled,
    retry: false,
  });
};
