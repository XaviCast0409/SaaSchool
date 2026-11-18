import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { attendanceKeys, invalidateAttendanceViews } from './keys';
import type {
  AttendanceSheetData,
  SaveAttendanceSheetPayload,
  CloseClassroomAttendancePayload,
  CloseAttendanceResult,
} from '../types';

interface SheetResponse {
  status: string;
  data: AttendanceSheetData;
}

/** Hook para obtener la hoja unificada de asistencia de un aula y fecha */
export const useAttendanceSheet = (params: { classroomId?: string; date: string }) => {
  return useQuery({
    queryKey: attendanceKeys.sheet(params.classroomId, params.date),
    queryFn: async () => {
      if (!params.classroomId) return null;
      const response = await api.get<SheetResponse>(
        `/attendance/sheet?classroomId=${params.classroomId}&date=${params.date}`,
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
      const response = await api.put<{ status: string; data: { count: number } }>('/attendance/sheet', payload);
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: attendanceKeys.sheet(variables.classroomId, variables.date),
      });
      queryClient.invalidateQueries({ queryKey: attendanceKeys.all });
      queryClient.invalidateQueries({ queryKey: attendanceKeys.summaryAll });
      queryClient.invalidateQueries({ queryKey: attendanceKeys.matrixAll });
      queryClient.invalidateQueries({ queryKey: attendanceKeys.detailAll });
    },
  });
};

/** Mutation hook para ejecutar el cierre de asistencia (Asigna Falta Injustificada a los no registrados) */
export const useCloseAttendance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CloseClassroomAttendancePayload = {}) => {
      const response = await api.post<{ status: string; data: CloseAttendanceResult }>('/attendance/close', payload);
      return response.data.data;
    },
    onSuccess: () => {
      invalidateAttendanceViews(queryClient);
    },
  });
};

