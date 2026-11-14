import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { useAuthStore, User } from '@/store/useAuthStore';
import { LoginFormData } from '../schemas/login.schema';
import { setLastSchoolCode } from '../lib/lastSchool';

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
    /** `schoolSlug`: ingreso desde la página del colegio (busca la cuenta solo en ese colegio). */
    mutationFn: async (data: LoginFormData & { schoolSlug?: string }) => {
      const response = await api.post<LoginResponse>('/auth/login', data);
      return response.data.data;
    },
    onSuccess: (data, variables) => {
      // Antes de guardar la sesión: al guardarla, la página de ingreso se desmonta
      if (variables.schoolSlug) setLastSchoolCode(variables.schoolSlug);
      setAuth(data.token, data.user);
    },
  });
};
