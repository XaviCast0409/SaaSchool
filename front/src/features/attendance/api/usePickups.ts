import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/axios';
import type { AuthorizedPickup, CreatePickupPayload, UpdatePickupPayload } from '../types';

export const usePickups = (studentId?: string | null) => {
  return useQuery({
    queryKey: ['pickups', studentId],
    queryFn: async (): Promise<AuthorizedPickup[]> => {
      if (!studentId) return [];
      const res = await api.get<{ status: string; data: AuthorizedPickup[] }>(
        `/pickups?studentId=${studentId}`,
      );
      return res.data.data;
    },
    enabled: Boolean(studentId),
  });
};

export const useCreatePickup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreatePickupPayload): Promise<AuthorizedPickup> => {
      const res = await api.post<{ status: string; data: AuthorizedPickup }>('/pickups', payload);
      return res.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pickups', variables.studentId] });
      queryClient.invalidateQueries({ queryKey: ['pickups'] });
      toast.success('Persona autorizada registrada con éxito.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Error al registrar persona autorizada.');
    },
  });
};

export const useUpdatePickup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      studentId: string;
      payload: UpdatePickupPayload;
    }): Promise<AuthorizedPickup> => {
      const res = await api.patch<{ status: string; data: AuthorizedPickup }>(
        `/pickups/${id}`,
        payload,
      );
      return res.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pickups', variables.studentId] });
      queryClient.invalidateQueries({ queryKey: ['pickups'] });
      toast.success('Datos actualizados correctamente.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Error al actualizar datos.');
    },
  });
};

export const useDeactivatePickup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string; studentId: string }): Promise<void> => {
      await api.delete(`/pickups/${id}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pickups', variables.studentId] });
      queryClient.invalidateQueries({ queryKey: ['pickups'] });
      toast.success('Persona autorizada retirada de la lista.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Error al retirar persona autorizada.');
    },
  });
};
