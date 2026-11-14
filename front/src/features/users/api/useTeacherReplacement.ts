import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';

/** Reemplazo de docente a mitad de año (cursos, tutoría y contenidos en un paso, con historial). */

export interface ReplacementPreview {
  year: { id: string; year: number; isActive: boolean };
  teacher: { id: string; firstName: string; lastNamePaternal: string; lastNameMaternal: string | null; email: string | null };
  courses: Array<{
    id: string;
    course: string;
    classroom: string;
    grades: number;
    contents: number;
    attendanceSessions: number;
    scheduleBlocks: number;
    pendingSubmissions: number;
  }>;
  tutorOf: string[];
  rubrics: number;
}

export interface ReplacementBody {
  outgoingTeacherId: string;
  incomingTeacherId: string;
  kind: 'PERMANENT' | 'TEMPORARY';
  effectiveDate: string;
  untilDate?: string | null;
  reason: string;
  outgoingAction: 'KEEP' | 'REMOVE_FROM_YEAR' | 'DEACTIVATE';
  copyRubrics: boolean;
}

export interface TeacherReplacementRow {
  id: string;
  kind: 'PERMANENT' | 'TEMPORARY';
  status: 'ACTIVE' | 'ENDED';
  effectiveDate: string;
  untilDate: string | null;
  reason: string;
  createdAt: string;
  endedAt: string | null;
  outgoing: { id: string; firstName: string; lastNamePaternal: string };
  incoming: { id: string; firstName: string; lastNamePaternal: string };
  detail: { assignmentIds: string[]; tutorClassroomIds: string[] };
}

const invalidate = (qc: ReturnType<typeof useQueryClient>) => {
  for (const key of ['users', 'staff-load', 'teacher-replacements', 'classrooms', 'teaching-load']) qc.invalidateQueries({ queryKey: [key] });
};

export const useReplacementPreview = (teacherId: string | null) =>
  useQuery({
    queryKey: ['teacher-replacements', 'preview', teacherId],
    queryFn: async () => (await api.get<{ data: ReplacementPreview }>(`/academic/teacher-replacements/preview/${teacherId}`)).data.data,
    enabled: !!teacherId,
  });

export const useTeacherReplacements = () =>
  useQuery({
    queryKey: ['teacher-replacements', 'list'],
    queryFn: async () => (await api.get<{ data: TeacherReplacementRow[] }>('/academic/teacher-replacements')).data.data,
  });

export const useReplaceTeacher = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: ReplacementBody) =>
      (await api.post<{ data: { transferred: { courses: number; tutorships: number; rubricsCopied: number } } }>('/academic/teacher-replacements', body)).data.data,
    onSuccess: () => invalidate(qc),
  });
};

export const useEndReplacement = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, returnDate }: { id: string; returnDate?: string }) =>
      (await api.post<{ data: { returned: number } }>(`/academic/teacher-replacements/${id}/end`, { returnDate })).data.data,
    onSuccess: () => invalidate(qc),
  });
};
