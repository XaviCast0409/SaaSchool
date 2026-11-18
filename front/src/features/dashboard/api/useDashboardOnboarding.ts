import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { OnboardingStatus } from '@/features/super-admin/api/usePlatform';

export const useDashboardOnboarding = (enabled: boolean = true) =>
  useQuery({
    queryKey: ['my-school-onboarding'],
    queryFn: async () =>
      (await api.get<{ status: string; data: OnboardingStatus }>('/schools/me/onboarding')).data.data,
    enabled,
    staleTime: 30_000,
  });
