import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { superAdminKeys } from './keys';

// ── Tipos ───────────────────────────────────────────────────────────────

export type AnnouncementLevel = 'INFO' | 'WARNING' | 'CRITICAL';
export type AnnouncementAudience = 'SCHOOL_ADMIN' | 'ADMINISTRATIVE' | 'TEACHER' | 'PARENT' | 'STUDENT';

export const AUDIENCE_LABELS: Record<AnnouncementAudience, string> = {
  SCHOOL_ADMIN: 'Dirección',
  ADMINISTRATIVE: 'Administrativos',
  TEACHER: 'Docentes',
  PARENT: 'Familias',
  STUDENT: 'Alumnos',
};

export interface PlatformAnnouncement {
  id: string;
  title: string;
  message: string;
  level: AnnouncementLevel;
  audience: AnnouncementAudience[];
  startsAt: string;
  endsAt: string | null;
  isActive: boolean;
  isLive?: boolean;
  createdByEmail: string | null;
  createdAt: string;
}

export interface AnnouncementPayload {
  title: string;
  message: string;
  level: AnnouncementLevel;
  audience: AnnouncementAudience[];
  startsAt?: string;
  endsAt?: string | null;
  isActive?: boolean;
}

export interface OnboardingStep {
  key: string;
  label: string;
  done: boolean;
  detail?: string;
}

export interface OnboardingStatus {
  steps: OnboardingStep[];
  completed: number;
  total: number;
  percent: number;
  nextStep: OnboardingStep | null;
}

export interface SchoolNote {
  id: string;
  schoolId: string;
  body: string;
  pinned: boolean;
  authorEmail: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformHealth {
  checkedAt: string;
  server: {
    uptimeSeconds: number;
    nodeVersion: string;
    environment: string;
    appVersion: string | null;
    memoryMb: { rss: number; heapUsed: number };
    automationsEnabled: boolean;
    sentryConfigured: boolean;
  };
  database: { ok: boolean; latencyMs: number | null; sizeMb: number | null; error?: string };
  automations: {
    last24h: { success: number; failed: number; running: number };
    stuck: number;
    jobs: { name: string; label: string; lastRunAt: string | null }[];
    recentFailures: { jobName: string; schoolName: string; startedAt: string; error: string | null }[];
  };
  storage: {
    files: number;
    totalMb: number;
    byStorage: { storage: string; files: number; mb: number }[];
    topSchools: { schoolName: string; files: number; mb: number }[];
  };
  recentErrors: { at: string; method: string; path: string; message: string }[];
}

type Envelope<T> = { status: string; data: T };

// ── Ficha del colegio ───────────────────────────────────────────────────

export const useSchoolOnboarding = (schoolId: string | undefined) =>
  useQuery({
    queryKey: superAdminKeys.onboarding(schoolId),
    queryFn: async () => (await api.get<Envelope<OnboardingStatus>>(`/schools/${schoolId}/onboarding`)).data.data,
    enabled: !!schoolId,
  });

export const useSchoolNotes = (schoolId: string | undefined) =>
  useQuery({
    queryKey: superAdminKeys.notes(schoolId),
    queryFn: async () => (await api.get<Envelope<SchoolNote[]>>(`/schools/${schoolId}/notes`)).data.data,
    enabled: !!schoolId,
  });

export const useSaveSchoolNote = (schoolId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id?: string; body?: string; pinned?: boolean }) => {
      const { id, ...payload } = input;
      const response = id
        ? await api.patch<Envelope<SchoolNote>>(`/schools/${schoolId}/notes/${id}`, payload)
        : await api.post<Envelope<SchoolNote>>(`/schools/${schoolId}/notes`, payload);
      return response.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: superAdminKeys.notes(schoolId) }),
  });
};

export const useDeleteSchoolNote = (schoolId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (noteId: string) => {
      await api.delete(`/schools/${schoolId}/notes/${noteId}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: superAdminKeys.notes(schoolId) }),
  });
};

// ── Avisos de la plataforma ─────────────────────────────────────────────

/** Avisos vigentes para el usuario actual (todos los roles salvo SUPER_ADMIN) */
export const useActivePlatformAnnouncements = (enabled: boolean) =>
  useQuery({
    queryKey: superAdminKeys.announcementsActive,
    queryFn: async () => (await api.get<Envelope<PlatformAnnouncement[]>>('/platform/announcements/active')).data.data,
    enabled,
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60_000,
  });

export const usePlatformAnnouncements = () =>
  useQuery({
    queryKey: superAdminKeys.announcementsAll,
    queryFn: async () => (await api.get<Envelope<PlatformAnnouncement[]>>('/platform/announcements')).data.data,
  });

export const useSavePlatformAnnouncement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id?: string; payload: Partial<AnnouncementPayload> }) => {
      const response = id
        ? await api.patch<Envelope<PlatformAnnouncement>>(`/platform/announcements/${id}`, payload)
        : await api.post<Envelope<PlatformAnnouncement>>('/platform/announcements', payload);
      return response.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: superAdminKeys.announcementsAll }),
  });
};

export const useDeletePlatformAnnouncement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/platform/announcements/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: superAdminKeys.announcementsAll }),
  });
};

// ── Salud del sistema ───────────────────────────────────────────────────

export const usePlatformHealth = () =>
  useQuery({
    queryKey: superAdminKeys.health,
    queryFn: async () => (await api.get<Envelope<PlatformHealth>>('/platform/health')).data.data,
    refetchInterval: 60_000,
  });
