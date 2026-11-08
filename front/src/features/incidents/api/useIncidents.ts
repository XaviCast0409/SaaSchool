import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type {
  StudentIncident,
  CreateIncidentPayload,
  IncidentFilterParams,
  IncidentsPaginatedResponse,
} from '../types';

export const useIncidents = (filters: IncidentFilterParams = {}, enabled = true) => {
  const queryParams = new URLSearchParams();
  if (filters.page) queryParams.append('page', String(filters.page));
  if (filters.limit) queryParams.append('limit', String(filters.limit));
  if (filters.enrollmentId) queryParams.append('enrollmentId', filters.enrollmentId);
  if (filters.studentId) queryParams.append('studentId', filters.studentId);
  if (filters.classroomId) queryParams.append('classroomId', filters.classroomId);
  if (filters.type) queryParams.append('type', filters.type);
  if (filters.severity) queryParams.append('severity', filters.severity);
  if (filters.startDate) queryParams.append('startDate', filters.startDate);
  if (filters.endDate) queryParams.append('endDate', filters.endDate);

  const queryString = queryParams.toString();
  const url = `/incidents${queryString ? `?${queryString}` : ''}`;

  return useQuery({
    queryKey: ['incidents', filters],
    queryFn: async () => {
      const response = await api.get<IncidentsPaginatedResponse>(url);
      return response.data;
    },
    enabled,
  });
};

export const useCreateIncident = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateIncidentPayload) => {
      const response = await api.post<{ status: string; data: StudentIncident }>('/incidents', payload);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    },
  });
};

export const useAcknowledgeIncident = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch<{ status: string; data: StudentIncident }>(
        `/incidents/${id}/acknowledge`,
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

