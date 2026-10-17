import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { Classroom } from '../types';

export interface CreateClassroomPayload {
  educationLevel: 'INITIAL' | 'PRIMARY' | 'SECONDARY';
  grade: number;
  section: string;
  shift?: 'MORNING' | 'AFTERNOON' | 'NIGHT';
  capacity?: number;
  tutorTeacherId?: string | null;
}

interface ClassroomsResponse {
  status: string;
  data: Classroom[];
}

interface SingleClassroomResponse {
  status: string;
  data: Classroom;
}

export const useClassrooms = () => {
  return useQuery({
    queryKey: ['classrooms'],
    queryFn: async () => {
      const response = await api.get<ClassroomsResponse>('/classrooms');
      return response.data.data;
    },
  });
};

export const useCreateClassroom = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateClassroomPayload) => {
      const response = await api.post<SingleClassroomResponse>('/classrooms', payload);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
    },
  });
};

export const useUpdateClassroom = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<CreateClassroomPayload> }) => {
      const response = await api.patch<SingleClassroomResponse>(`/classrooms/${id}`, payload);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
    },
  });
};

export const useDeleteClassroom = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/classrooms/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
    },
  });
};
