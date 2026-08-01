import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { useAuthStore, User } from '@/store/useAuthStore';
import { LoginFormData } from '../schemas/login.schema';

interface LoginResponse {
  status: string;
  data: {
    token: string;
    user: User;
  };
}

export const useLogin = () => {
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: async (data: LoginFormData) => {
      const response = await api.post<LoginResponse>('/auth/login', data);
      return response.data.data;
    },
    onSuccess: (data) => {
      setAuth(data.token, data.user);
    },
  });
};
