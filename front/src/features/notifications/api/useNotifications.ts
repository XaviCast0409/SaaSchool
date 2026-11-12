import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { NotificationFilters, NotificationsResponse, AppNotification } from '../types';

export const NOTIFICATIONS_QUERY_KEY = ['notifications'];

export const useGetNotifications = (filters: NotificationFilters = { limit: 15, page: 1 }) => {
  return useQuery({
    queryKey: [...NOTIFICATIONS_QUERY_KEY, filters],
    queryFn: async (): Promise<NotificationsResponse> => {
      const params = new URLSearchParams();
      if (filters.page) params.append('page', String(filters.page));
      if (filters.limit) params.append('limit', String(filters.limit));
      if (filters.isRead !== undefined) params.append('isRead', String(filters.isRead));

      const response = await api.get<NotificationsResponse>(`/notifications?${params.toString()}`);
      return response.data;
    },
    // Polling inteligente cada 45 segundos para que la campanita se actualice sola
    refetchInterval: 45000,
    refetchOnWindowFocus: true,
  });
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<AppNotification> => {
      const response = await api.patch<{ status: string; data: AppNotification }>(
        `/notifications/${id}/read`,
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
  });
};

export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<{ count: number }> => {
      const response = await api.patch<{ status: string; data: { count: number } }>(
        '/notifications/read-all',
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
  });
};

export const useDeleteNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<AppNotification> => {
      const response = await api.delete<{ status: string; data: AppNotification }>(
        `/notifications/${id}`,
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
  });
};

export const useGetVapidPublicKey = () => {
  return useQuery({
    queryKey: ['vapid-public-key'],
    queryFn: async (): Promise<string> => {
      const response = await api.get<{ status: string; data: { publicKey: string } }>(
        '/notifications/vapid-public-key',
      );
      return response.data.data.publicKey;
    },
    staleTime: Infinity,
  });
};

export const useSavePushSubscription = () => {
  return useMutation({
    mutationFn: async (payload: {
      endpoint: string;
      keys: { p256dh: string; auth: string };
      userAgent?: string;
    }) => {
      const response = await api.post('/notifications/push-subscription', payload);
      return response.data;
    },
  });
};

export const useSendTestPushNotification = () => {
  return useMutation({
    mutationFn: async () => {
      const response = await api.post('/notifications/test-push');
      return response.data;
    },
  });
};

// ===== Preferencias de notificación =====

export type NotificationKind = 'PAYMENT' | 'ATTENDANCE' | 'ANNOUNCEMENT' | 'ACADEMIC' | 'INCIDENT' | 'GENERAL';

export interface NotificationPreferences {
  mutedPush: NotificationKind[];
  mutedEmail: NotificationKind[];
  weeklyDigest: boolean;
  quietFrom: string | null;
  quietTo: string | null;
}

const PREFS_KEY = ['notification-preferences'];

export const useNotificationPreferences = () =>
  useQuery({
    queryKey: PREFS_KEY,
    queryFn: async () =>
      (await api.get<{ data: NotificationPreferences }>('/notifications/preferences')).data.data,
  });

export const useSaveNotificationPreferences = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (prefs: NotificationPreferences) =>
      (await api.put<{ data: NotificationPreferences }>('/notifications/preferences', prefs)).data.data,
    onSuccess: (data) => queryClient.setQueryData(PREFS_KEY, data),
  });
};
