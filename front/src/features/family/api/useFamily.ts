import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export type Light = 'GREEN' | 'YELLOW' | 'RED' | 'GRAY';

export interface ChildOverview {
  studentId: string;
  name: string;
  classroom: string;
  lights: Array<{ light: Light; label: string; detail: string }>;
  badges: Array<{ id: string; title: string; description: string; emoji: string; earned: boolean; progress?: string }>;
}

export interface TimelineItem {
  id: string;
  at: string;
  kind: 'ATTENDANCE' | 'HOMEWORK' | 'MATERIAL' | 'GRADE' | 'ANNOUNCEMENT' | 'INCIDENT' | 'PAYMENT' | 'MEETING';
  title: string;
  detail?: string;
  link?: string;
  tone: 'info' | 'success' | 'warning' | 'danger';
}

export const useFamilyOverview = (enabled = true) =>
  useQuery({
    queryKey: ['family', 'overview'],
    enabled,
    queryFn: async () => (await api.get<{ data: ChildOverview[] }>('/family/overview')).data.data,
    staleTime: 60_000,
  });

export const useFamilyTimeline = (studentId: string | null, days = 14) =>
  useQuery({
    queryKey: ['family', 'timeline', studentId, days],
    enabled: Boolean(studentId),
    queryFn: async () =>
      (await api.get<{ data: { past: TimelineItem[]; upcoming: TimelineItem[] } }>('/family/timeline', { params: { studentId, days } })).data.data,
    refetchInterval: 60_000,
  });

export interface GateToday {
  present: number;
  checkedOut: number;
  rows: Array<{ id: string; checkOutTime: string; student: string; classroom: string; pickedUpByName: string | null; pickedUpByDocument: string | null; earlyLeaveReason: string | null }>;
}

export const useGateToday = () =>
  useQuery({
    queryKey: ['family', 'gate'],
    queryFn: async () => (await api.get<{ data: GateToday }>('/family/gate/today')).data.data,
    refetchInterval: 20_000,
  });
