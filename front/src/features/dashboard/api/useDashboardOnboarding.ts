import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { dashboardKeys } from './keys';
import type { OnboardingStatus } from '@/features/super-admin/api/usePlatform';

export const useDashboardOnboarding = (enabled: boolean = true) =>
  useQuery({
    queryKey: dashboardKeys.mySchoolOnboarding,
    queryFn: async () =>
      (await api.get<{ status: string; data: OnboardingStatus }>('/schools/me/onboarding')).data.data,
    enabled,
    staleTime: 30_000,
  });
