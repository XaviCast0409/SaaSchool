import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export type ResourceKind = 'SESION' | 'FICHA' | 'EVALUACION' | 'GUIA' | 'PRESENTACION' | 'OTRO';
export type Level = 'INITIAL' | 'PRIMARY' | 'SECONDARY';
export type RubricLevel = 'AD' | 'A' | 'B' | 'C';

export const KIND_LABEL: Record<ResourceKind, string> = {
  SESION: 'Sesión de aprendizaje',
  FICHA: 'Ficha de trabajo',
  EVALUACION: 'Evaluación',
  GUIA: 'Guía o lectura',
  PRESENTACION: 'Presentación',
  OTRO: 'Otro',
};
export const LEVEL_LABEL: Record<Level, string> = { INITIAL: 'Inicial', PRIMARY: 'Primaria', SECONDARY: 'Secundaria' };

export interface SharedResource {
  id: string;
  title: string;
  description: string | null;
  kind: ResourceKind;
  areaName: string | null;
  educationLevel: Level | null;
  grade: number | null;
  fileUrl: string | null;
  fileName: string | null;
  link: string | null;
  tags: string[];
  downloads: number;
  createdAt: string;
  authorName: string;
  canDelete: boolean;
}

export interface RubricCriterion {
  name: string;
  levels: Record<RubricLevel, string>;
}

export interface Rubric {
  id: string;
  title: string;
  description: string | null;
  areaName: string | null;
  educationLevel: Level | null;
  criteria: RubricCriterion[];
  isShared: boolean;
  updatedAt: string;
  authorName: string;
  canEdit: boolean;
}

export type RubricInput = Pick<Rubric, 'title' | 'description' | 'areaName' | 'educationLevel' | 'criteria' | 'isShared'>;

const KEY = ['teacher-resources'];

export const useResources = (filters: { q?: string; kind?: string; level?: string; area?: string; mine?: boolean }) =>
  useQuery({
    queryKey: [...KEY, 'resources', filters],
    queryFn: async () =>
      (
        await api.get<{ data: { rows: SharedResource[]; areas: string[] } }>('/teacher-resources/resources', {
          params: { ...filters, mine: filters.mine ? 'true' : undefined },
        })
      ).data.data,
  });

export const useShareResource = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<SharedResource> & { title: string; kind: ResourceKind; tags: string[] }) => (await api.post('/teacher-resources/resources', input)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

export const useDeleteResource = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/teacher-resources/resources/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

export const markOpened = (id: string) => api.post(`/teacher-resources/resources/${id}/open`).catch(() => undefined);

export const useRubrics = (filters: { q?: string; level?: string; mine?: boolean }) =>
  useQuery({
    queryKey: [...KEY, 'rubrics', filters],
    queryFn: async () =>
      (await api.get<{ data: Rubric[] }>('/teacher-resources/rubrics', { params: { ...filters, mine: filters.mine ? 'true' : undefined } })).data.data,
  });

export const useSaveRubric = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: RubricInput }) =>
      id ? (await api.put(`/teacher-resources/rubrics/${id}`, input)).data.data : (await api.post('/teacher-resources/rubrics', input)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

export const useDuplicateRubric = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post<{ data: Rubric }>(`/teacher-resources/rubrics/${id}/duplicate`)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

export const useDeleteRubric = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/teacher-resources/rubrics/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};
