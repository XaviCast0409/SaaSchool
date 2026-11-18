import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { attendanceKeys } from './keys';
import type { AttendanceMatrixData, StudentAttendanceDetail } from '../types';

interface MatrixResponse {
  status: string;
  data: AttendanceMatrixData;
}

interface StudentDetailResponse {
  status: string;
  data: StudentAttendanceDetail;
}

/** Hook para obtener la matriz sábana mensual de asistencia por días (1..31) (requiere sección elegida) */
export const useAttendanceMatrix = (params: { month: string; classroomId?: string }) => {
  const queryParams = new URLSearchParams({ month: params.month });
  if (params.classroomId) queryParams.append('classroomId', params.classroomId);

  return useQuery({
    queryKey: attendanceKeys.matrix(params.month, params.classroomId),
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
    queryKey: attendanceKeys.detail(enrollmentId, month),
    queryFn: async () => {
      if (!enrollmentId) return null;
      const response = await api.get<StudentDetailResponse>(
        `/attendance/student/${enrollmentId}/summary?${queryParams.toString()}`,
      );
      return response.data.data;
    },
    enabled: Boolean(enrollmentId),
  });
};

