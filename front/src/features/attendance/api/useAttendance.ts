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
  ScanAttendanceResult,
  AttendanceSheetData,
  SaveAttendanceSheetPayload,
  AttendanceScheduleConfig,
  UpsertAttendanceScheduleConfigPayload,
  CloseClassroomAttendancePayload,
  CloseAttendanceResult,
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

interface SheetResponse {
  status: string;
  data: AttendanceSheetData;
}

/** Hook para obtener asistencias paginadas */
export const useAttendance = (filters: AttendanceFilterParams = {}, enabledOverride?: boolean) => {
  const queryParams = new URLSearchParams();
  if (filters.date) queryParams.append('date', filters.date);
  if (filters.classroomId) queryParams.append('classroomId', filters.classroomId);
  if (filters.status && filters.status !== 'ALL') queryParams.append('status', filters.status);
  if (filters.search) queryParams.append('search', filters.search);
  if (filters.page) queryParams.append('page', String(filters.page));
  if (filters.limit) queryParams.append('limit', String(filters.limit));

  const queryString = queryParams.toString();
  const url = `/attendance${queryString ? `?${queryString}` : ''}`;
  const isEnabled = enabledOverride !== undefined ? enabledOverride : true;

  return useQuery({
    queryKey: [
      'attendance',
      filters.date,
      filters.classroomId,
      filters.status,
      filters.search,
      filters.page,
      filters.limit,
    ],
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

/** Mutation hook para escaneo rápido de asistencia por QR o código de barras */
export const useScanAttendance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      code: string;
      toleranceTime?: string;
      statusOverride?: AttendanceStatus;
    }) => {
      const response = await api.post<{ status: string; data: ScanAttendanceResult }>(
        '/attendance/scan',
        payload
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-sheet'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-matrix'] });
    },
  });
};

/** Hook para obtener la hoja unificada de asistencia de un aula y fecha */
export const useAttendanceSheet = (params: { classroomId?: string; date: string }) => {
  return useQuery({
    queryKey: ['attendance-sheet', params.classroomId, params.date],
    queryFn: async () => {
      if (!params.classroomId) return null;
      const response = await api.get<SheetResponse>(
        `/attendance/sheet?classroomId=${params.classroomId}&date=${params.date}`
      );
      return response.data.data;
    },
    enabled: Boolean(params.classroomId && params.date),
  });
};

/** Mutation hook para guardar la hoja de asistencia de un aula con upsert atómico */
export const useSaveAttendanceSheet = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SaveAttendanceSheetPayload) => {
      const response = await api.put<{ status: string; data: { count: number } }>(
        '/attendance/sheet',
        payload
      );
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['attendance-sheet', variables.classroomId, variables.date],
      });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-matrix'] });
      queryClient.invalidateQueries({ queryKey: ['student-attendance-detail'] });
    },
  });
};

/** Hook para obtener el historial de asistencia por matrícula (Portal de Padres) */
export const useAttendanceByEnrollment = (enrollmentId?: string, enabled = true) => {
  return useQuery({
    queryKey: ['attendance-by-enrollment', enrollmentId],
    queryFn: async (): Promise<AttendanceRecord[]> => {
      if (!enrollmentId) return [];
      const response = await api.get<{ status: string; data: AttendanceRecord[] }>(
        `/attendance/enrollment/${enrollmentId}`
      );
      return response.data.data;
    },
    enabled: Boolean(enrollmentId) && enabled,
    staleTime: 1000 * 60 * 2,
  });
};

/** Hook para consultar las configuraciones de horarios de asistencia del colegio */
export const useAttendanceScheduleConfigs = () => {
  return useQuery({
    queryKey: ['attendance-schedule-configs'],
    queryFn: async (): Promise<AttendanceScheduleConfig[]> => {
      const response = await api.get<{ status: string; data: AttendanceScheduleConfig[] }>(
        '/attendance/config'
      );
      return response.data.data;
    },
    staleTime: 1000 * 60 * 5,
  });
};

/** Mutation hook para guardar o actualizar horarios de asistencia (Director / Admin) */
export const useUpsertAttendanceScheduleConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpsertAttendanceScheduleConfigPayload) => {
      const response = await api.put<{ status: string; data: AttendanceScheduleConfig }>(
        '/attendance/config',
        payload
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-schedule-configs'] });
    },
  });
};

/** Mutation hook para ejecutar el cierre de asistencia (Asigna Falta Injustificada a los no registrados) */
export const useCloseAttendance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CloseClassroomAttendancePayload = {}) => {
      const response = await api.post<{ status: string; data: CloseAttendanceResult }>(
        '/attendance/close',
        payload
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-sheet'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-matrix'] });
      queryClient.invalidateQueries({ queryKey: ['student-attendance-detail'] });
    },
  });
};

