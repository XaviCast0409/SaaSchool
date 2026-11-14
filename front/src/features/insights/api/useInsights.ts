import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export interface ActionItem {
  id: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  detail: string;
  count: number;
  link: string;
}

export type RiskLevel = 'ALTO' | 'MEDIO' | 'BAJO';

export interface RiskRow {
  enrollmentId: string;
  studentId: string;
  name: string;
  classroomId: string;
  classroom: string;
  score: number;
  level: RiskLevel;
  reasons: string[];
  lastIntervention: { date: string; type: string; status: string } | null;
}

export interface Intervention {
  id: string;
  type: string;
  date: string;
  notes: string;
  agreements: string | null;
  followUpDate: string | null;
  status: 'OPEN' | 'CLOSED';
  authorName: string;
  createdAt: string;
}

export interface Heatmap {
  periodNumber: number;
  periodLabel: string;
  periods: Array<{ number: number; label: string }>;
  provisional: boolean;
  classrooms: Array<{ id: string; label: string }>;
  areas: string[];
  cells: Record<string, { AD: number; A: number; B: number; C: number; total: number }>;
}

export const INTERVENTION_LABEL: Record<string, string> = {
  ENTREVISTA_ESTUDIANTE: 'Entrevista con el estudiante',
  ENTREVISTA_FAMILIA: 'Entrevista con la familia',
  DERIVACION: 'Derivación (psicología u otro)',
  COMPROMISO: 'Compromiso firmado',
  SEGUIMIENTO: 'Seguimiento',
  OTRO: 'Otro',
};

const KEY = ['insights'];

export const useActions = (enabled: boolean) =>
  useQuery({
    queryKey: [...KEY, 'actions'],
    enabled,
    queryFn: async () => (await api.get<{ data: ActionItem[] }>('/insights/actions')).data.data,
    refetchInterval: 120_000,
  });

export const useRisk = (classroomId: string | null, enabled: boolean) =>
  useQuery({
    queryKey: [...KEY, 'risk', classroomId],
    enabled,
    queryFn: async () =>
      (await api.get<{ data: { periodLabel: string; rows: RiskRow[] } }>('/insights/risk', { params: classroomId ? { classroomId } : {} })).data.data,
  });

export const useInterventions = (enrollmentId: string | null) =>
  useQuery({
    queryKey: [...KEY, 'tutoring', enrollmentId],
    enabled: Boolean(enrollmentId),
    queryFn: async () => (await api.get<{ data: Intervention[] }>(`/insights/tutoring/${enrollmentId}`)).data.data,
  });

export const useCreateIntervention = (enrollmentId: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { type: string; date: string; notes: string; agreements?: string | null; followUpDate?: string | null }) =>
      (await api.post(`/insights/tutoring/${enrollmentId}`, input)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

export const useSetInterventionStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'OPEN' | 'CLOSED' }) => (await api.patch(`/insights/tutoring/item/${id}`, { status })).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

export const useHeatmap = (periodNumber: number | null, level: string | null, enabled: boolean) =>
  useQuery({
    queryKey: [...KEY, 'heatmap', periodNumber, level],
    enabled,
    queryFn: async () =>
      (await api.get<{ data: Heatmap }>('/insights/heatmap', { params: { ...(periodNumber ? { periodNumber } : {}), ...(level ? { level } : {}) } })).data.data,
  });

export const useSiagieData = (enabled: boolean) =>
  useQuery({
    queryKey: [...KEY, 'siagie'],
    enabled,
    queryFn: async () =>
      (await api.get<{ data: { rows: Array<{ studentId: string; name: string; classroom: string; issues: string[] }>; totals: Record<string, number> } }>('/insights/siagie-data')).data.data,
  });
