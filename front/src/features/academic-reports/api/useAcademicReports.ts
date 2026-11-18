import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { academicReportsKeys } from './keys';
import {
  ReportClassroomItem,
  ConsolidatedGradesReportData,
  DraftRegisterReportData,
  MeritClassroomReportData,
  MeritGradeReportData,
  ConductCommentsReportData,
  ClassroomRosterReportData,
  FamiliesByStateReportData,
  FamiliesChildrenReportData,
  FamiliesRelativesReportData,
  StudentBirthdaysReportData,
  EducationLevel,
} from '../types';

export const useReportCatalogClassrooms = (academicYearId?: string) => {
  return useQuery<ReportClassroomItem[]>({
    queryKey: academicReportsKeys.classrooms(academicYearId),
    queryFn: async () => {
      const response = await api.get('/academic-reports/catalog/classrooms', {
        params: { academicYearId },
      });
      return response.data.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos de caché
  });
};

export const useConsolidatedGradesReport = (
  classroomId: string,
  periodNumber: number,
  options?: { enabled?: boolean },
) => {
  return useQuery<ConsolidatedGradesReportData>({
    queryKey: academicReportsKeys.report0021(classroomId, periodNumber),
    queryFn: async () => {
      const response = await api.get('/academic-reports/0021-consolidated-grades', {
        params: { classroomId, periodNumber },
      });
      return response.data.data;
    },
    enabled: Boolean(classroomId) && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 2,
  });
};

export const useDraftRegisterReport = (
  classroomId: string,
  courseAssignmentId?: string,
  options?: { enabled?: boolean },
) => {
  return useQuery<DraftRegisterReportData>({
    queryKey: academicReportsKeys.report0041(classroomId, courseAssignmentId),
    queryFn: async () => {
      const response = await api.get('/academic-reports/0041-draft-register', {
        params: { classroomId, courseAssignmentId },
      });
      return response.data.data;
    },
    enabled: Boolean(classroomId) && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 5,
  });
};

export const useMeritClassroomReport = (classroomId: string, periodNumber: number, options?: { enabled?: boolean }) => {
  return useQuery<MeritClassroomReportData>({
    queryKey: academicReportsKeys.report0048(classroomId, periodNumber),
    queryFn: async () => {
      const response = await api.get('/academic-reports/0048-merit-classroom', {
        params: { classroomId, periodNumber },
      });
      return response.data.data;
    },
    enabled: Boolean(classroomId) && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 2,
  });
};

export const useMeritGradeReport = (
  educationLevel: EducationLevel,
  grade: number,
  periodNumber: number,
  options?: { enabled?: boolean },
) => {
  return useQuery<MeritGradeReportData>({
    queryKey: academicReportsKeys.report0049(educationLevel, grade, periodNumber),
    queryFn: async () => {
      const response = await api.get('/academic-reports/0049-merit-grade', {
        params: { educationLevel, grade, periodNumber },
      });
      return response.data.data;
    },
    enabled: Boolean(educationLevel && grade) && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 2,
  });
};

export const useConductCommentsReport = (
  classroomId: string,
  periodNumber: number,
  options?: { enabled?: boolean },
) => {
  return useQuery<ConductCommentsReportData>({
    queryKey: academicReportsKeys.report0030(classroomId, periodNumber),
    queryFn: async () => {
      const response = await api.get('/academic-reports/0030-conduct-comments', {
        params: { classroomId, periodNumber },
      });
      return response.data.data;
    },
    enabled: Boolean(classroomId) && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 2,
  });
};

export const useClassroomRosterReport = (classroomId: string, options?: { enabled?: boolean }) => {
  return useQuery<ClassroomRosterReportData>({
    queryKey: academicReportsKeys.report0011(classroomId),
    queryFn: async () => {
      const response = await api.get('/academic-reports/0011-classroom-roster', {
        params: { classroomId },
      });
      return response.data.data;
    },
    enabled: Boolean(classroomId) && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 5,
  });
};

export const useFamiliesByStateReport = (state?: string, academicYearId?: string, options?: { enabled?: boolean }) => {
  return useQuery<FamiliesByStateReportData>({
    queryKey: academicReportsKeys.report0001(state, academicYearId),
    queryFn: async () => {
      const response = await api.get('/academic-reports/0001-families-by-state', {
        params: { state, academicYearId },
      });
      return response.data.data;
    },
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60 * 5,
  });
};

export const useFamiliesChildrenReport = (
  classroomId?: string,
  academicYearId?: string,
  options?: { enabled?: boolean },
) => {
  return useQuery<FamiliesChildrenReportData>({
    queryKey: academicReportsKeys.report0002(classroomId, academicYearId),
    queryFn: async () => {
      const response = await api.get('/academic-reports/0002-families-children', {
        params: { classroomId, academicYearId },
      });
      return response.data.data;
    },
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60 * 5,
  });
};

export const useFamiliesRelativesReport = (
  classroomId?: string,
  academicYearId?: string,
  options?: { enabled?: boolean },
) => {
  return useQuery<FamiliesRelativesReportData>({
    queryKey: academicReportsKeys.report0003(classroomId, academicYearId),
    queryFn: async () => {
      const response = await api.get('/academic-reports/0003-families-relatives', {
        params: { classroomId, academicYearId },
      });
      return response.data.data;
    },
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60 * 5,
  });
};

export const useStudentBirthdaysReport = (
  month?: number,
  classroomId?: string,
  educationLevel?: EducationLevel,
  academicYearId?: string,
  options?: { enabled?: boolean },
) => {
  return useQuery<StudentBirthdaysReportData>({
    queryKey: academicReportsKeys.report0019(month, classroomId, educationLevel, academicYearId),
    queryFn: async () => {
      const response = await api.get('/academic-reports/0019-student-birthdays', {
        params: { month, classroomId, educationLevel, academicYearId },
      });
      return response.data.data;
    },
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60 * 5,
  });
};
