import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from 'sonner';

export interface ChangePasswordPayload {
  currentPassword?: string;
  newPassword: string;
}

export const useChangePassword = () => {
  const updateUser = useAuthStore((state) => state.updateUser);

  return useMutation({
    mutationFn: async (payload: ChangePasswordPayload) => {
      const response = await api.post<{ status: string; data: { message: string } }>(
        '/auth/change-password',
        payload
      );
      return response.data.data;
    },
    onSuccess: (data) => {
      updateUser({ mustChangePassword: false });
      toast.success(data.message || 'Contraseña actualizada con éxito');
    },
    onError: (err: unknown) => {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Error al actualizar contraseña';
      toast.error(errorMsg);
    },
  });
};
