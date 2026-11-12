import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { ScheduleBlock } from './useSchedule';

export type Level = 'INITIAL' | 'PRIMARY' | 'SECONDARY';
export const LEVEL_NAME: Record<Level, string> = { INITIAL: 'Inicial', PRIMARY: 'Primaria', SECONDARY: 'Secundaria' };

export interface TemplateSlot {
  start: string;
  end: string;
  kind: 'CLASS' | 'BREAK';
  label?: string;
}

export interface GeneratorCourse {
  assignmentId: string;
  name: string;
  teacherId: string;
  teacherName: string;
  studyPlanCourseId: string | null;
  hours: number | null;
  preferDoubleBlock: boolean;
  maxHoursPerDay: number;
  preferEarly: boolean;
}

export interface GeneratorSetup {
  levels: Array<{ level: Level; days: number[]; slots: TemplateSlot[]; custom: boolean }>;
  classrooms: Array<{ id: string; label: string; level: Level; grade: number; hasSchedule: boolean; courses: GeneratorCourse[] }>;
  teachers: Array<{ id: string; name: string; hours: number; unavailable: string[] }>;
}

export interface GenerationResult {
  proposal: Array<{ classroomId: string; label: string; blocks: ScheduleBlock[]; requiredHours: number; placedHours: number }>;
  unplaced: Array<{ classroomId: string; classroomLabel: string; assignmentId: string; courseName: string; missingHours: number; reason: string }>;
  warnings: string[];
  elapsedMs: number;
}

const KEY = ['schedule-generator'];

export const useGeneratorSetup = () =>
  useQuery({
    queryKey: KEY,
    queryFn: async () => (await api.get<{ data: GeneratorSetup }>('/schedule/generator/setup')).data.data,
  });

export const useSaveTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ level, days, slots }: { level: Level; days: number[]; slots: TemplateSlot[] }) =>
      (await api.put(`/schedule/generator/templates/${level}`, { days, slots })).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

export const useSavePlanCourse = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; weeklyHours?: number | null; preferDoubleBlock?: boolean; maxHoursPerDay?: number; preferEarly?: boolean }) =>
      (await api.patch(`/schedule/generator/plan-course/${id}`, data)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

export const useSaveAvailability = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ teacherId, unavailable }: { teacherId: string; unavailable: string[] }) =>
      (await api.put(`/schedule/generator/availability/${teacherId}`, { unavailable })).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

export const useGenerate = () =>
  useMutation({
    mutationFn: async (input: { classroomIds: string[]; seed?: number }) =>
      (await api.post<{ data: GenerationResult }>('/schedule/generator/generate', input)).data.data,
  });

export const useApplyGeneration = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (classrooms: Array<{ classroomId: string; blocks: ScheduleBlock[] }>) =>
      (
        await api.post('/schedule/generator/apply', {
          classrooms: classrooms.map((c) => ({
            classroomId: c.classroomId,
            blocks: c.blocks.map((b) => ({
              dayOfWeek: b.dayOfWeek,
              startTime: b.startTime,
              endTime: b.endTime,
              courseAssignmentId: b.courseAssignmentId,
              label: b.label,
              room: b.room,
            })),
          })),
        })
      ).data.data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule'] });
      qc.invalidateQueries({ queryKey: KEY });
    },
  });
};

export const useScheduleConflicts = (enabled: boolean) =>
  useQuery({
    queryKey: [...KEY, 'conflicts'],
    enabled,
    queryFn: async () =>
      (await api.get<{ data: Array<{ teacherName: string; day: string; time: string; detail: string }> }>('/schedule/generator/conflicts')).data.data,
  });
