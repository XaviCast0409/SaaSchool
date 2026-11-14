import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';

/** Lo que cada colegio muestra en su página de ingreso (datos públicos). */
export interface SchoolLoginPage {
  name: string;
  slug: string;
  logoUrl: string | null;
  brandColor: string | null;
  loginTitle: string | null;
  loginMessage: string | null;
  /** Ruta relativa a la API; usar `loginBackgroundSrc` para mostrarla. */
  backgroundPath: string | null;
}

/** URL lista para <img>/CSS a partir de la ruta que devuelve la API. */
export const loginBackgroundSrc = (path: string | null | undefined): string | null =>
  path ? `${String(api.defaults.baseURL ?? '/api').replace(/\/$/, '')}${path}` : null;

export const fetchSchoolLoginPage = async (code: string): Promise<SchoolLoginPage> =>
  (await api.get<{ data: SchoolLoginPage }>(`/public/login-pages/${encodeURIComponent(code)}`)).data.data;

export const useSchoolLoginPage = (code: string | undefined) =>
  useQuery({
    queryKey: ['school-login-page', code],
    queryFn: () => fetchSchoolLoginPage(code as string),
    enabled: Boolean(code),
    staleTime: 5 * 60 * 1000,
    retry: (count, error: unknown) => {
      const status = (error as { response?: { status?: number } })?.response?.status;
      return status !== 404 && count < 2;
    },
  });
