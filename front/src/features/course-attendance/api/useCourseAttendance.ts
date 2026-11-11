import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export type CourseAttendanceStatus =
  | 'PRESENT'
  | 'LATE_UNJUSTIFIED'
  | 'LATE_JUSTIFIED'
  | 'ABSENT_UNJUSTIFIED'
  | 'ABSENT_JUSTIFIED';

export interface CourseAttendanceStudent {
  enrollmentId: string;
  fullName: string;
  documentId: string;
  studentCode: string | null;
  status: CourseAttendanceStatus;
  note: string | null;
  dailyStatus: string | null;
}

export interface CourseAttendanceSessionResponse {
  sessionExists: boolean;
  sessionId: string | null;
  courseAssignmentId: string;
  date: string;
  periodLabel: string;
  updatedAt: string | null;
  students: CourseAttendanceStudent[];
}

export interface SaveCourseAttendanceRecordPayload {
  enrollmentId: string;
  status: CourseAttendanceStatus;
  note?: string | null;
}

export interface SaveCourseAttendancePayload {
  courseAssignmentId: string;
  date: string;
  periodLabel: string;
  records: SaveCourseAttendanceRecordPayload[];
}

export interface CourseAttendanceStudentSummary {
  enrollmentId: string;
  fullName: string;
  documentId: string;
  presents: number;
  lates: number;
  absences: number;
  totalSessions: number;
  attendancePercent: number;
}

export interface CourseAttendanceSummaryResponse {
  courseAssignmentId: string;
  month: string;
  totalSessions: number;
  summary: CourseAttendanceStudentSummary[];
}

interface ApiResponse<T> {
  status: string;
  data: T;
}

export const useCourseAttendanceSession = (params: {
  courseAssignmentId?: string;
  date?: string;
  periodLabel?: string;
}) => {
  const { courseAssignmentId, date, periodLabel = '1' } = params;
  return useQuery({
    queryKey: ['course-attendance', 'session', courseAssignmentId, date, periodLabel],
    queryFn: async () => {
      const response = await api.get<ApiResponse<CourseAttendanceSessionResponse>>(
        '/course-attendance/session',
        {
          params: { courseAssignmentId, date, periodLabel },
        },
      );
      return response.data.data;
    },
    enabled: Boolean(courseAssignmentId && date),
  });
};

export const useSaveCourseAttendanceSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SaveCourseAttendancePayload) => {
      const response = await api.put<ApiResponse<unknown>>('/course-attendance/session', payload);
      return response.data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          'course-attendance',
          'session',
          variables.courseAssignmentId,
          variables.date,
          variables.periodLabel,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: ['course-attendance', 'summary', variables.courseAssignmentId],
      });
    },
  });
};

export const useCourseAttendanceSummary = (params: {
  courseAssignmentId?: string;
  month?: string;
}) => {
  const { courseAssignmentId, month } = params;
  return useQuery({
    queryKey: ['course-attendance', 'summary', courseAssignmentId, month],
    queryFn: async () => {
      const response = await api.get<ApiResponse<CourseAttendanceSummaryResponse>>(
        '/course-attendance/summary',
        {
          params: { courseAssignmentId, month },
        },
      );
      return response.data.data;
    },
    enabled: Boolean(courseAssignmentId && month),
  });
};
