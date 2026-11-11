import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/axios';
import type {
  Catalog, ConsolidationResponse, GradebookData, GradebookResult, Level, MyCourse, PeriodsResponse, PeriodState,
  ProgressResponse, ReportCard, ResultLetter, SetupStatus, StudyPlan, TeachingLoad,
} from './types';

interface Envelope<T> { status: string; data: T }
const get = async <T,>(url: string, params?: Record<string, unknown>) => (await api.get<Envelope<T>>(url, { params })).data.data;

export const apiErrorMessage = (e: unknown, fallback = 'No se pudo completar la acción.') => {
  const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return msg || fallback;
};

const useInvalidate = () => {
  const qc = useQueryClient();
  return (...keys: string[]) => keys.forEach((k) => qc.invalidateQueries({ queryKey: ['academic', k] }));
};

// ── Catálogo y plan de estudios
export const useCatalog = () => useQuery({ queryKey: ['academic', 'catalog'], queryFn: () => get<Catalog>('/academic/catalog'), staleTime: Infinity });

export const useSetupStatus = () => useQuery({ queryKey: ['academic', 'setup'], queryFn: () => get<SetupStatus>('/academic/setup-status') });

export const useStudyPlan = (level: Level, grade: number | null) =>
  useQuery({
    queryKey: ['academic', 'plan', level, grade],
    queryFn: () => get<StudyPlan>('/academic/study-plan', { level, grade }),
    enabled: grade !== null,
  });

const planMutation = <V,>(fn: (v: V) => Promise<unknown>, success: string) => () => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const invalidate = useInvalidate();
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useMutation({
    mutationFn: fn,
    onSuccess: () => { invalidate('plan', 'setup', 'load'); toast.success(success); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
};

export const useApplyTemplate = planMutation(
  (v: { level: Level; grades: number[]; includeOptional: string[] }) => api.post('/academic/study-plan/apply-template', v),
  'Plantilla aplicada',
);
export const useCreateSubcourses = planMutation(
  (v: { level: Level; grades: number[]; officialAreaCode: string; subcourses: Array<{ name: string; cnebNumbers: number[]; weight?: number }> }) =>
    api.post('/academic/study-plan/subcourses', v),
  'Área dividida en cursos',
);
export const useAddWorkshop = planMutation(
  (v: { level: Level; grades: number[]; name: string; weeklyHours?: number | null }) => api.post('/academic/study-plan/workshops', v),
  'Taller agregado',
);
export const useRemovePlanCourse = planMutation((planCourseId: string) => api.delete(`/academic/study-plan/courses/${planCourseId}`), 'Curso quitado del plan');
export const useUpdateCourseCompetences = planMutation(
  (v: { areaId: string; competences: Array<{ cnebNumber: number; weight?: number }> }) => api.put(`/academic/courses/${v.areaId}/competences`, { competences: v.competences }),
  'Competencias actualizadas',
);
export const useCopyPlan = planMutation((v: { fromAcademicYearId: string; toAcademicYearId: string }) => api.post('/academic/study-plan/copy', v), 'Plan copiado');

export const useUpdatePlanCourse = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (v: { planCourseId: string; weeklyHours?: number | null; order?: number }) =>
      api.patch(`/academic/study-plan/courses/${v.planCourseId}`, { weeklyHours: v.weeklyHours, order: v.order }),
    onSuccess: () => invalidate('plan', 'load'),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
};

// ── Carga docente
export const useTeachingLoad = (level: Level) =>
  useQuery({ queryKey: ['academic', 'load', level], queryFn: () => get<TeachingLoad>('/academic/teaching-load', { level }) });

export const useSaveTeachingLoad = planMutation(
  (changes: Array<{ classroomId: string; areaId: string; teacherId: string | null }>) => api.put('/academic/teaching-load', { changes }),
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
  useQuery({ queryKey: ['academic', 'my-courses'], queryFn: () => get<{ courses: MyCourse[]; academicYearId: string | null }>('/academic/my-courses') });

// ── Periodos y avance
export const usePeriods = () => useQuery({ queryKey: ['academic', 'periods'], queryFn: () => get<PeriodsResponse>('/academic/periods') });

export const useSetPeriodStatus = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (v: { periodNumber: number; status: PeriodState; reason?: string | null; gradingDeadline?: string | null; force?: boolean; classroomId?: string | null }) =>
      api.put('/academic/periods/status', v),
    onSuccess: () => { invalidate('periods', 'progress', 'gradebook'); toast.success('Periodo actualizado'); },
  });
};

export const useProgress = (periodNumber: number | null, level?: Level) =>
  useQuery({
    queryKey: ['academic', 'progress', periodNumber, level ?? 'ALL'],
    queryFn: () => get<ProgressResponse>('/academic/progress', { periodNumber, level }),
    enabled: periodNumber !== null,
  });

export const useMyProgress = (periodNumber: number | null) =>
  useQuery({
    queryKey: ['academic', 'progress', 'mine', periodNumber],
    queryFn: () => get<ProgressResponse>('/academic/my-progress', { periodNumber }),
    enabled: periodNumber !== null,
  });

export const useRemindPending = () =>
  useMutation({
    mutationFn: (periodNumber: number) => api.post<Envelope<{ notified: number }>>('/academic/progress/remind', { periodNumber }),
    onSuccess: (r) => toast.success(`Recordatorio enviado a ${r.data.data.notified} docentes`),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

// ── Registro de notas
export const useGradebook = (assignmentId: string | undefined, periodNumber: number) =>
  useQuery({
    queryKey: ['academic', 'gradebook', assignmentId, periodNumber],
    queryFn: () => get<GradebookData>(`/academic/gradebook/${assignmentId}`, { periodNumber }),
    enabled: !!assignmentId,
  });

export interface ScoreInput { enrollmentId: string; competenceId: string; criterionId: string; numericScore: number | null; literalScore: ResultLetter | null }

export const useSaveScores = (assignmentId: string) =>
  useMutation({
    mutationFn: async (v: { periodNumber: number; items: ScoreInput[]; reason?: string | null }) =>
      (await api.put<Envelope<{ saved: number; results: GradebookResult[] }>>(`/academic/gradebook/${assignmentId}/scores`, v)).data.data,
  });

export const useSetFinalLetter = (assignmentId: string) => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (v: { periodNumber: number; enrollmentId: string; competenceId: string; finalLetter: ResultLetter | null; reason?: string | null }) =>
      api.put(`/academic/gradebook/${assignmentId}/final-letter`, v),
    onSuccess: () => invalidate('gradebook'),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
};

export const useSaveConclusions = (assignmentId: string) => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (v: { periodNumber: number; items: Array<{ enrollmentId: string; competenceId: string; conclusion: string }>; reason?: string | null }) =>
      api.put(`/academic/gradebook/${assignmentId}/conclusions`, v),
    onSuccess: () => invalidate('gradebook'),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
};

export const useSetCourseCriteria = (assignmentId: string) => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (criteria: Array<{ criterionId: string; weight?: number | null }>) => api.put(`/academic/gradebook/${assignmentId}/criteria`, { criteria }),
    onSuccess: () => { invalidate('gradebook'); toast.success('Criterios del curso guardados'); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
};

export const useImportHomework = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (v: { courseAssignmentId: string; periodNumber: number }) => api.post('/grades/matrix/sync-homework', v),
    onSuccess: () => { invalidate('gradebook'); toast.success('Notas de tareas importadas'); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
};

// ── Consolidado, libretas y exportaciones
export const useConsolidation = (classroomId: string | null, period: number | 'FINAL') =>
  useQuery({
    queryKey: ['academic', 'consolidation', classroomId, period],
    queryFn: () => get<ConsolidationResponse>('/academic/consolidation', { classroomId, period }),
    enabled: !!classroomId,
  });

export const useReportCard = (enrollmentId: string | null | undefined) =>
  useQuery({
    queryKey: ['academic', 'report-card', enrollmentId],
    queryFn: () => get<ReportCard>(`/academic/report-card/${enrollmentId}`),
    enabled: !!enrollmentId,
    retry: false,
  });

export const useClassroomReportCards = (classroomId: string | null) =>
  useQuery({
    queryKey: ['academic', 'report-cards', classroomId],
    queryFn: () => get<ReportCard[]>('/academic/report-cards', { classroomId }),
    enabled: !!classroomId,
  });

export async function downloadFile(url: string, params: Record<string, unknown>, filename: string): Promise<boolean> {
  try {
    const response = await api.get(url, { params, responseType: 'blob' });
    const blob = response.data as Blob;
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = filename.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '_');
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
    return true;
  } catch (e) {
    let message: string | undefined;
    const data = (e as { response?: { data?: unknown } })?.response?.data;
    if (data instanceof Blob) {
      try { message = JSON.parse(await data.text())?.message; } catch { /* respuesta no JSON */ }
    }
    toast.error(message || apiErrorMessage(e, 'No se pudo descargar el archivo.'));
    return false;
  }
}

