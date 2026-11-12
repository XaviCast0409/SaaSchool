import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { AnnouncementFilters, AnnouncementResponsesDetail, AnnouncementsResponse, CreateAnnouncementPayload } from '../types';

export const useGetAnnouncements = (filters: AnnouncementFilters) => {
  return useQuery({
    queryKey: ['announcements', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.append('page', String(filters.page));
      if (filters.limit) params.append('limit', String(filters.limit));
      if (filters.search) params.append('search', filters.search);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.classroomId) params.append('classroomId', filters.classroomId);

      const response = await api.get<AnnouncementsResponse>(`/announcements?${params.toString()}`);
      return response.data;
    },
  });
};

export const useCreateAnnouncement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateAnnouncementPayload) => {
      const response = await api.post('/announcements', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
};

export const useDeleteAnnouncement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/announcements/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
};

export const useRespondAnnouncement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, studentId, response, comment }: { id: string; studentId: string; response: string; comment?: string }) =>
      (await api.post(`/announcements/${id}/respond`, { studentId, response, comment })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['announcements'] }),
  });
};

export const useAnnouncementResponses = (id: string | null) =>
  useQuery({
    queryKey: ['announcements', 'responses', id],
    enabled: Boolean(id),
    queryFn: async () => (await api.get<{ data: AnnouncementResponsesDetail }>(`/announcements/${id}/responses`)).data.data,
  });

export const useRemindAnnouncement = () =>
  useMutation({
    mutationFn: async (id: string) => (await api.post<{ data: { reminded: number } }>(`/announcements/${id}/remind`)).data.data,
  });
