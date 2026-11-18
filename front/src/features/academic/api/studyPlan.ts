import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/axios';
import { academicKeys } from './keys';
import { get, planMutation, useInvalidate } from './shared';
import { getApiErrorMessage as apiErrorMessage } from '@/lib/errors';
import type { Catalog, Level, PreuniversityCatalog, SetupStatus, StudyPlan } from '../types';

export const useCatalog = () =>
  useQuery({
    queryKey: academicKeys.catalog(),
    queryFn: () => get<Catalog>('/academic/catalog'),
    staleTime: Infinity,
  });

export const useSetupStatus = () =>
  useQuery({ queryKey: academicKeys.setup(), queryFn: () => get<SetupStatus>('/academic/setup-status') });

export const useStudyPlan = (level: Level, grade: number | null) =>
  useQuery({
    queryKey: academicKeys.plan(level, grade),
    queryFn: () => get<StudyPlan>('/academic/study-plan', { level, grade }),
    enabled: grade !== null,
  });

export const useApplyTemplate = planMutation(
  (v: { level: Level; grades: number[]; includeOptional: string[] }) =>
    api.post('/academic/study-plan/apply-template', v),
  'Plantilla aplicada',
);

export const useCreateSubcourses = planMutation(
  (v: {
    level: Level;
    grades: number[];
    officialAreaCode: string;
    subcourses: Array<{ name: string; cnebNumbers: number[]; weight?: number }>;
  }) => api.post('/academic/study-plan/subcourses', v),
  'Área dividida en cursos',
);

export const usePreuniversityCatalog = (level: Level, grade: number | null, enabled = true) =>
  useQuery({
    queryKey: academicKeys.planPreuniversity(level, grade),
    queryFn: () => get<PreuniversityCatalog>('/academic/study-plan/preuniversity', { level, grade }),
    enabled: enabled && grade !== null,
  });

export const useConfigurePreuniversity = planMutation(
  (v: { level: Level; grades: number[]; officialAreaCode: string; courses: Array<{ key: string; weight?: number }> }) =>
    api.put('/academic/study-plan/preuniversity', v),
  'Cursos del área actualizados',
);

export const useAddWorkshop = planMutation(
  (v: { level: Level; grades: number[]; name: string; weeklyHours?: number | null }) =>
    api.post('/academic/study-plan/workshops', v),
  'Taller agregado',
);

export const useRemovePlanCourse = planMutation(
  (planCourseId: string) => api.delete(`/academic/study-plan/courses/${planCourseId}`),
  'Curso quitado del plan',
);

export const useUpdateCourseCompetences = planMutation(
  (v: { areaId: string; competences: Array<{ cnebNumber: number; weight?: number }> }) =>
    api.put(`/academic/courses/${v.areaId}/competences`, { competences: v.competences }),
  'Competencias actualizadas',
);

export const useCopyPlan = planMutation(
  (v: { fromAcademicYearId: string; toAcademicYearId: string }) => api.post('/academic/study-plan/copy', v),
  'Plan copiado',
);

export const useUpdatePlanCourse = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (v: { planCourseId: string; weeklyHours?: number | null; order?: number }) =>
      api.patch(`/academic/study-plan/courses/${v.planCourseId}`, { weeklyHours: v.weeklyHours, order: v.order }),
    onSuccess: () => invalidate('plan', 'load'),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
};

