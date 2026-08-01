import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import {
  AttendanceRecord,
  AttendanceMonthlySummary,
  AttendanceFilterParams,
  AttendanceSummaryQueryParams,
  AttendanceStatus,
} from '../types';

interface AttendanceResponse {
  status: string;
  data: AttendanceRecord[];
}

interface SummaryResponse {
  status: string;
  data: AttendanceMonthlySummary;
}

interface SingleAttendanceResponse {
  status: string;
  data: AttendanceRecord;
}

/** Hook para obtener asistencias filtradas por fecha y/o aula/sección */
export const useAttendance = (filters: AttendanceFilterParams = {}) => {
  const queryParams = new URLSearchParams();
  if (filters.date) queryParams.append('date', filters.date);
  if (filters.classroomId) queryParams.append('classroomId', filters.classroomId);

  const queryString = queryParams.toString();
  const url = `/attendance${queryString ? `?${queryString}` : ''}`;

  return useQuery({
    queryKey: ['attendance', filters.date, filters.classroomId],
    queryFn: async () => {
      const response = await api.get<AttendanceResponse>(url);
      return response.data.data;
    },
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
  });
};

/** Mutation hook para corregir/actualizar un registro de asistencia ya existente (PATCH /api/attendance/:id) */
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
    },
  });
};

/** Mutation hook para registro masivo de asistencia por aula (POST /api/attendance/bulk) */
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
    },
  });
};
