import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export interface AutomationLastRun {
  jobName: string;
  status: 'RUNNING' | 'SUCCESS' | 'FAILED';
  startedAt: string;
  finishedAt: string | null;
  summary: string | null;
  itemsProcessed: number;
  triggeredById: string | null;
}

export interface AutomationJob {
  name: string;
  label: string;
  description: string;
  audience: string;
  channels: string;
  scheduleLabel: string;
  minPlan: 'BASIC' | 'PRO';
  availableInPlan: boolean;
  enabled: boolean;
  lastRun: AutomationLastRun | null;
}

export interface AutomationsResponse {
  jobs: AutomationJob[];
  email: { pending: number; sentToday: number; dailyLimit: number };
}

export interface AutomationRun {
  id: string;
  runKey: string;
  status: 'RUNNING' | 'SUCCESS' | 'FAILED';
  itemsProcessed: number;
  summary: string | null;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
  triggeredById: string | null;
}

const KEY = ['automations'];

export const useAutomations = () =>
  useQuery({
    queryKey: KEY,
    queryFn: async () => (await api.get<{ data: AutomationsResponse }>('/automations')).data.data,
  });

export const useAutomationRuns = (jobName: string | null) =>
  useQuery({
    queryKey: [...KEY, 'runs', jobName],
    enabled: Boolean(jobName),
    queryFn: async () => (await api.get<{ data: AutomationRun[] }>(`/automations/${jobName}/runs`)).data.data,
  });

export const useToggleAutomation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, enabled }: { name: string; enabled: boolean }) =>
      (await api.patch(`/automations/${name}`, { enabled })).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

export const useRunAutomation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) =>
      (await api.post<{ data: { items: number; summary: string } }>(`/automations/${name}/run`)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};
