import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import {
  AttendanceRecord,
  AttendanceMonthlySummary,
  AttendanceFilterParams,
  AttendanceSummaryQueryParams,
  AttendanceStatus,
  AttendancePaginatedResult,
  AttendanceExportRow,
  AttendanceMatrixData,
  StudentAttendanceDetail,
} from '../types';

interface SummaryResponse {
  status: string;
  data: AttendanceMonthlySummary;
}

interface SingleAttendanceResponse {
  status: string;
  data: AttendanceRecord;
}

interface ExportResponse {
  status: string;
  data: AttendanceExportRow[];
}

interface MatrixResponse {
  status: string;
  data: AttendanceMatrixData;
}

interface StudentDetailResponse {
  status: string;
  data: StudentAttendanceDetail;
}

/** Hook para obtener asistencias paginadas filtradas obligatoriamente por aula/sección para evitar tráfico masivo */
export const useAttendance = (filters: AttendanceFilterParams = {}, enabledOverride?: boolean) => {
  const queryParams = new URLSearchParams();
  if (filters.date) queryParams.append('date', filters.date);
  if (filters.classroomId) queryParams.append('classroomId', filters.classroomId);
  if (filters.page) queryParams.append('page', String(filters.page));
  if (filters.limit) queryParams.append('limit', String(filters.limit));

  const queryString = queryParams.toString();
  const url = `/attendance${queryString ? `?${queryString}` : ''}`;
  const isEnabled = enabledOverride !== undefined ? enabledOverride : Boolean(filters.classroomId);

  return useQuery({
    queryKey: ['attendance', filters.date, filters.classroomId, filters.page, filters.limit],
    queryFn: async () => {
      const response = await api.get<AttendancePaginatedResult>(url);
      return response.data;
    },
    enabled: isEnabled,
  });
};

/** Hook para obtener la matriz sábana mensual de asistencia por días (1..31) (requiere sección elegida) */
export const useAttendanceMatrix = (params: { month: string; classroomId?: string }) => {
  const queryParams = new URLSearchParams({ month: params.month });
  if (params.classroomId) queryParams.append('classroomId', params.classroomId);

  return useQuery({
    queryKey: ['attendance-matrix', params.month, params.classroomId],
    queryFn: async () => {
      const response = await api.get<MatrixResponse>(`/attendance/matrix?${queryParams.toString()}`);
      return response.data.data;
    },
    enabled: Boolean(params.classroomId),
  });
};

/** Hook para obtener el expediente individual de asistencia de un estudiante */
export const useStudentAttendanceDetail = (enrollmentId?: string, month?: string) => {
  const queryParams = new URLSearchParams();
  if (month) queryParams.append('month', month);

  return useQuery({
    queryKey: ['student-attendance-detail', enrollmentId, month],
    queryFn: async () => {
      if (!enrollmentId) return null;
      const response = await api.get<StudentDetailResponse>(
        `/attendance/student/${enrollmentId}/summary?${queryParams.toString()}`
      );
      return response.data.data;
    },
    enabled: Boolean(enrollmentId),
  });
};

/** Hook para obtener el resumen/reporte de asistencia mensual */
export const useAttendanceSummary = (params: AttendanceSummaryQueryParams = {}) => {
  const queryParams = new URLSearchParams();
  if (params.month) queryParams.append('month', params.month);
  if (params.classroomId) queryParams.append('classroomId', params.classroomId);

  const queryString = queryParams.toString();
  const url = `/attendance/summary${queryString ? `?${queryString}` : ''}`;

  return useQuery({
    queryKey: ['attendance-summary', params.month, params.classroomId],
    queryFn: async () => {
      const response = await api.get<SummaryResponse>(url);
      return response.data.data;
    },
    enabled: Boolean(params.classroomId),
  });
};

/** Hook para obtener los datos del Acta Mensual exportable */
export const useAttendanceExportData = (params: { month: string; classroomId?: string }) => {
  const queryParams = new URLSearchParams({ month: params.month });
  if (params.classroomId) queryParams.append('classroomId', params.classroomId);

  return useQuery({
    queryKey: ['attendance-export', params.month, params.classroomId],
    queryFn: async () => {
      const response = await api.get<ExportResponse>(`/attendance/export?${queryParams.toString()}`);
      return response.data.data;
    },
    enabled: false,
  });
};

/** Mutation hook para corregir/actualizar un registro de asistencia ya existente */
export const useUpdateAttendance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      notes,
    }: {
      id: string;
      status: AttendanceStatus;
      notes?: string;
    }) => {
      const response = await api.patch<SingleAttendanceResponse>(`/attendance/${id}`, {
        status,
        notes,
      });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-matrix'] });
      queryClient.invalidateQueries({ queryKey: ['student-attendance-detail'] });
    },
  });
};

/** Mutation hook para registro masivo de asistencia por aula */
export const useBulkAttendance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      date: string;
      records: Array<{
        enrollmentId: string;
        status: AttendanceStatus;
        notes?: string;
      }>;
    }) => {
      const response = await api.post<{ status: string; data: { count: number } }>(
        '/attendance/bulk',
        payload
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-matrix'] });
      queryClient.invalidateQueries({ queryKey: ['student-attendance-detail'] });
    },
  });
};
