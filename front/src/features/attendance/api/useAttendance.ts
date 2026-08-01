import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { AttendanceRecord } from '../types';

interface AttendanceResponse {
  status: string;
  data: AttendanceRecord[];
}

export const useAttendance = (date?: string) => {
  const selectedDate = date || new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['attendance', selectedDate],
    queryFn: async () => {
      const response = await api.get<AttendanceResponse>(`/attendance?date=${selectedDate}`);
      return response.data.data;
    },
  });
};
