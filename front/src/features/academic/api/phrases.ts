import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/axios';
import { academicKeys } from './keys';
import { get, useInvalidate, type Envelope } from './shared';
import { getApiErrorMessage as apiErrorMessage } from '@/lib/errors';
import type { Letter, Level, Phrase, PhrasesForAssignment, PhrasesManage } from '../types';

export const usePhrases = (assignmentId: string | null) =>
  useQuery({
    queryKey: academicKeys.phrases(assignmentId),
    queryFn: () => get<PhrasesForAssignment>('/academic/phrases', { assignmentId }),
    enabled: !!assignmentId,
    staleTime: 5 * 60_000,
  });

export const usePhrasesManage = (level: Level, cnebNumber: number | null, courseKey: string | null) =>
  useQuery({
    queryKey: academicKeys.phrasesManage(level, cnebNumber, courseKey),
    queryFn: () =>
      get<PhrasesManage>('/academic/phrases/manage', { level, cnebNumber, courseKey: courseKey ?? undefined }),
    enabled: cnebNumber !== null,
  });

export const useCreatePhrase = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (v: {
      scope: 'MINE' | 'SCHOOL';
      cnebNumber: number;
      letter?: Letter | null;
      level?: Level | null;
      courseKey?: string | null;
      text: string;
    }) => (await api.post<Envelope<Phrase>>('/academic/phrases', v)).data.data,
    onSuccess: () => {
      invalidate('phrases');
      toast.success('Frase guardada');
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
};

export const useUpdatePhrase = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (v: { id: string; text?: string; letter?: Letter | null }) =>
      api.patch(`/academic/phrases/${v.id}`, { text: v.text, letter: v.letter }),
    onSuccess: () => invalidate('phrases'),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
};

export const useDeletePhrase = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/academic/phrases/${id}`),
    onSuccess: () => invalidate('phrases'),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
};

export const useSetPhraseHidden = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (v: { phraseKey: string; hidden: boolean }) => api.put('/academic/phrases/hidden', v),
    onSuccess: () => invalidate('phrases'),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
};

