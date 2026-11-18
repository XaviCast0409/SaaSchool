import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/axios';
import { academicKeys } from './keys';
import { get, useInvalidate } from './shared';
import { getApiErrorMessage as apiErrorMessage } from '@/lib/errors';
import type { ConsolidationResponse, Letter, ReportCard, TutorReport } from '../types';

export const useConsolidation = (classroomId: string | null, period: number | 'FINAL') =>
  useQuery({
    queryKey: academicKeys.consolidation(classroomId, period),
    queryFn: () => get<ConsolidationResponse>('/academic/consolidation', { classroomId, period }),
    enabled: !!classroomId,
  });

export const useReportCard = (enrollmentId: string | null | undefined) =>
  useQuery({
    queryKey: academicKeys.reportCard(enrollmentId),
    queryFn: () => get<ReportCard>(`/academic/report-card/${enrollmentId}`),
    enabled: !!enrollmentId,
    retry: false,
  });

export const useClassroomReportCards = (classroomId: string | null) =>
  useQuery({
    queryKey: academicKeys.reportCards(classroomId),
    queryFn: () => get<ReportCard[]>('/academic/report-cards', { classroomId }),
    enabled: !!classroomId,
  });

export const useTutorReport = (classroomId: string | null, periodNumber: number | null) =>
  useQuery({
    queryKey: academicKeys.tutorReport(classroomId, periodNumber),
    queryFn: () => get<TutorReport>('/academic/tutor-report', { classroomId, periodNumber }),
    enabled: !!classroomId && !!periodNumber,
    refetchOnWindowFocus: false,
  });

export const useSaveTutorReport = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (v: {
      classroomId: string;
      periodNumber: number;
      rows: Array<{
        enrollmentId: string;
        conductScore: number | null;
        conductLetter: Letter | null;
        conductComment: string;
        tutorComment: string;
      }>;
    }) => api.put('/academic/tutor-report', v),
    onSuccess: () => {
      invalidate('tutor-report', 'report-card', 'report-cards');
      toast.success('Libreta guardada');
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
};

