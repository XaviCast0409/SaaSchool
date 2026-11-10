import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from 'sonner';

export interface ChangePasswordPayload {
  currentPassword?: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  message: string;
  token: string;
}

export const useChangePassword = () => {
  return useMutation({
    mutationFn: async (payload: ChangePasswordPayload): Promise<ChangePasswordResponse> => {
      const response = await api.post<{ status: string; data: ChangePasswordResponse }>(
        '/auth/change-password',
        payload
      );
      return response.data.data;
    },
    onSuccess: (data) => {
      const { user, setAuth } = useAuthStore.getState();
      if (user) {
        setAuth(data.token, { ...user, mustChangePassword: false });
      }
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
