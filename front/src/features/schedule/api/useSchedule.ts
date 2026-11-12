import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const SHORT_DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export interface ScheduleBlock {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string | null;
  label: string | null;
  courseAssignmentId: string | null;
  courseName?: string | null;
  teacherName?: string | null;
  classroomLabel?: string;
}

export interface ClassroomSchedule {
  classroom: { id: string; label: string };
  blocks: ScheduleBlock[];
  courses: Array<{ id: string; name: string; teacherName: string | null; weeklyMinutes: number }>;
}

export interface DayAgenda {
  date: string;
  weekday: number;
  studentName: string;
  holiday: string | null;
  blocks: ScheduleBlock[];
  homeworks: Array<{ id: string; title: string; courseName: string; dueDate: string; submitted: boolean }>;
  events: Array<{ id: string; title: string; type: string; startTime: string | null; endTime: string | null; location: string | null }>;
}

const KEY = ['schedule'];

export const useClassroomSchedule = (classroomId: string | null) =>
  useQuery({
    queryKey: [...KEY, 'classroom', classroomId],
    enabled: Boolean(classroomId),
    queryFn: async () => (await api.get<{ data: ClassroomSchedule }>(`/schedule/classroom/${classroomId}`)).data.data,
  });

export const useSaveClassroomSchedule = (classroomId: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { blocks: ScheduleBlock[]; allowTeacherConflicts?: boolean }) =>
      (
        await api.put<{ data: { saved: number; conflicts: string[] } }>(`/schedule/classroom/${classroomId}`, {
          allowTeacherConflicts: input.allowTeacherConflicts,
          blocks: input.blocks.map((b) => ({
            dayOfWeek: b.dayOfWeek,
            startTime: b.startTime,
            endTime: b.endTime,
            courseAssignmentId: b.courseAssignmentId,
            label: b.label,
            room: b.room,
          })),
        })
      ).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

export const useMyTeacherSchedule = (enabled: boolean) =>
  useQuery({
    queryKey: [...KEY, 'teacher'],
    enabled,
    queryFn: async () => (await api.get<{ data: { blocks: ScheduleBlock[] } }>('/schedule/teacher/me')).data.data.blocks,
  });

export const useStudentSchedule = (studentId: string | null) =>
  useQuery({
    queryKey: [...KEY, 'student', studentId],
    enabled: Boolean(studentId),
    queryFn: async () =>
      (await api.get<{ data: { classroom: { label: string } | null; blocks: ScheduleBlock[] } }>(`/schedule/student/${studentId}`)).data.data,
  });

export const useDayAgenda = (studentId: string | null, date?: string) =>
  useQuery({
    queryKey: [...KEY, 'day', studentId, date ?? 'next'],
    enabled: Boolean(studentId),
    queryFn: async () =>
      (await api.get<{ data: DayAgenda }>('/schedule/day', { params: { studentId, ...(date ? { date } : {}) } })).data.data,
  });
