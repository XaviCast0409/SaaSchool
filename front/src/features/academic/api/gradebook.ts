import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/axios';
import { academicKeys } from './keys';
import { get, useInvalidate, type Envelope } from './shared';
import { getApiErrorMessage as apiErrorMessage } from '@/lib/errors';
import type {
  GradebookData,
  GradebookResult,
  Level,
  ProgressResponse,
  ResultLetter,
} from '../types';

export interface ScoreInput {
  enrollmentId: string;
  competenceId: string;
  criterionId: string;
  numericScore: number | null;
  literalScore: ResultLetter | null;
}

export const useProgress = (periodNumber: number | null, level?: Level) =>
  useQuery({
    queryKey: academicKeys.progress(periodNumber, level ?? 'ALL'),
    queryFn: () => get<ProgressResponse>('/academic/progress', { periodNumber, level }),
    enabled: periodNumber !== null,
  });

export const useMyProgress = (periodNumber: number | null) =>
  useQuery({
    queryKey: academicKeys.progressMine(periodNumber),
    queryFn: () => get<ProgressResponse>('/academic/my-progress', { periodNumber }),
    enabled: periodNumber !== null,
  });

export const useRemindPending = () =>
  useMutation({
    mutationFn: (periodNumber: number) =>
      api.post<Envelope<{ notified: number }>>('/academic/progress/remind', { periodNumber }),
    onSuccess: (r) => toast.success(`Recordatorio enviado a ${r.data.data.notified} docentes`),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

export const useGradebook = (assignmentId: string | undefined, periodNumber: number) =>
  useQuery({
    queryKey: academicKeys.gradebook(assignmentId, periodNumber),
    queryFn: () => get<GradebookData>(`/academic/gradebook/${assignmentId}`, { periodNumber }),
    enabled: !!assignmentId,
    refetchOnWindowFocus: false,
  });

export const useSaveScores = (assignmentId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { periodNumber: number; items: ScoreInput[]; reason?: string | null }) =>
      (
        await api.put<Envelope<{ saved: number; results: GradebookResult[] }>>(
          `/academic/gradebook/${assignmentId}/scores`,
          v,
        )
      ).data.data,
    onSuccess: (res, v) => {
      qc.setQueryData<GradebookData>(academicKeys.gradebook(assignmentId, v.periodNumber), (old) => {
        if (!old) return old;
        const keyOf = (x: { enrollmentId: string; competenceId: string; criterionId: string }) =>
          `${x.enrollmentId}|${x.competenceId}|${x.criterionId}`;
        const scores = new Map(old.scores.map((sc) => [keyOf(sc), sc]));
        v.items.forEach((it) => {
          if (it.numericScore === null && it.literalScore === null) scores.delete(keyOf(it));
          else scores.set(keyOf(it), { ...it, isExonerated: it.literalScore === 'EXO' });
        });
        const results = new Map(old.results.map((r) => [`${r.enrollmentId}|${r.competenceId}`, r]));
        res.results.forEach((r) => results.set(`${r.enrollmentId}|${r.competenceId}`, r));
        return { ...old, scores: [...scores.values()], results: [...results.values()] };
      });
      qc.invalidateQueries({ queryKey: academicKeys.progressAll });
    },
  });
};

export const useSetFinalLetter = (assignmentId: string) => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (v: {
      periodNumber: number;
      enrollmentId: string;
      competenceId: string;
      finalLetter: ResultLetter | null;
      reason?: string | null;
    }) => api.put(`/academic/gradebook/${assignmentId}/final-letter`, v),
    onSuccess: () => invalidate('gradebook'),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
};

export const useSaveConclusions = (assignmentId: string) => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (v: {
      periodNumber: number;
      items: Array<{ enrollmentId: string; competenceId: string; conclusion: string }>;
      reason?: string | null;
    }) => api.put(`/academic/gradebook/${assignmentId}/conclusions`, v),
    onSuccess: () => invalidate('gradebook'),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
};

export const useSetCourseCriteria = (assignmentId: string) => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (criteria: Array<{ criterionId: string; weight?: number | null }>) =>
      api.put(`/academic/gradebook/${assignmentId}/criteria`, { criteria }),
    onSuccess: () => {
      invalidate('gradebook');
      toast.success('Criterios del curso guardados');
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
};

export const useImportHomework = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (v: { courseAssignmentId: string; periodNumber: number }) =>
      api.post('/grades/matrix/sync-homework', v),
    onSuccess: () => {
      invalidate('gradebook');
      toast.success('Notas de tareas importadas');
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
};

