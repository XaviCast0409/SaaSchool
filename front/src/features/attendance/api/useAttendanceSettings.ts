import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { attendanceKeys } from './keys';
import type { AttendanceScheduleConfig, UpsertAttendanceScheduleConfigPayload } from '../types';

export interface SchoolHolidayItem {
  id: string;
  schoolId: string;
  date: string;
  name: string;
  createdAt: string;
}

/** Hook para consultar las configuraciones de horarios de asistencia del colegio */
export const useAttendanceScheduleConfigs = () => {
  return useQuery({
    queryKey: attendanceKeys.scheduleConfigs(),
    queryFn: async (): Promise<AttendanceScheduleConfig[]> => {
      const response = await api.get<{ status: string; data: AttendanceScheduleConfig[] }>('/attendance/config');
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
      const response = await api.put<{ status: string; data: AttendanceScheduleConfig }>('/attendance/config', payload);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.scheduleConfigsAll });
    },
  });
};

export const useHolidays = (year?: number) => {
  const currentYear = year || new Date().getFullYear();
  return useQuery({
    queryKey: attendanceKeys.holidays(currentYear),
    queryFn: async (): Promise<SchoolHolidayItem[]> => {
      const response = await api.get<{ status: string; data: SchoolHolidayItem[] }>(
        `/attendance/holidays?year=${currentYear}`,
      );
      return response.data.data;
    },
  });
};

export const useCreateHoliday = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { date: string; name: string }) => {
      const response = await api.post<{ status: string; data: SchoolHolidayItem }>('/attendance/holidays', payload);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.holidaysAll });
    },
  });
};

export const useDeleteHoliday = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (holidayId: string) => {
      const response = await api.delete<{ status: string; message: string }>(`/attendance/holidays/${holidayId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.holidaysAll });
    },
  });
};

