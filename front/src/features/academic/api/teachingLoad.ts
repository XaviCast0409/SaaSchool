import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/axios';
import { academicKeys } from './keys';
import { get, planMutation, useInvalidate } from './shared';
import type { Level, MyCourse, PeriodsResponse, PeriodState, TeachingLoad } from '../types';

export const useTeachingLoad = (level: Level) =>
  useQuery({
    queryKey: academicKeys.load(level),
    queryFn: () => get<TeachingLoad>('/academic/teaching-load', { level }),
  });

export const useSaveTeachingLoad = planMutation(
  (changes: Array<{ classroomId: string; areaId: string; teacherId: string | null }>) =>
    api.put('/academic/teaching-load', { changes }),
  'Carga docente guardada',
);

export const useAssignWholeClassroom = planMutation(
  (v: { classroomId: string; teacherId: string }) => api.post('/academic/teaching-load/whole-classroom', v),
  'Aula asignada',
);

export const useCopyTeachingLoad = planMutation(
  (v: { fromAcademicYearId: string; toAcademicYearId: string }) => api.post('/academic/teaching-load/copy', v),
  'Carga docente copiada',
);

export const useMyCourses = () =>
  useQuery({
    queryKey: academicKeys.myCourses(),
    queryFn: () =>
      get<{ courses: MyCourse[]; tutorClassrooms?: MyCourse['classroom'][]; academicYearId: string | null }>(
        '/academic/my-courses',
      ),
  });

// ── Periodos
export const usePeriods = () =>
  useQuery({ queryKey: academicKeys.periods(), queryFn: () => get<PeriodsResponse>('/academic/periods') });

export const useSetPeriodStatus = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (v: {
      periodNumber: number;
      status: PeriodState;
      reason?: string | null;
      gradingDeadline?: string | null;
      force?: boolean;
      classroomId?: string | null;
    }) => api.put('/academic/periods/status', v),
    onSuccess: () => {
      invalidate('periods', 'progress', 'gradebook');
      toast.success('Periodo actualizado');
    },
  });
};

