import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/errors';

declare module '@tanstack/react-query' {
  interface Register {
    queryMeta: { errorMessage?: string };
    mutationMeta: { errorMessage?: string };
  }
}

export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Al volver a la pestaña o a la app se actualiza lo que está en pantalla
        // (si el dato tiene más de `staleTime`), así se ven los cambios del colegio sin refrescar.
        refetchOnWindowFocus: true,
        retry: 1,
        staleTime: 30_000, // 30 s: evita repetir consultas al navegar entre pantallas
      },
    },
    queryCache: new QueryCache({
      onError: (err, query) => {
        const m = query.meta?.errorMessage;
        if (m) {
          toast.error(getApiErrorMessage(err, m));
        }
      },
    }),
    mutationCache: new MutationCache({
      onError: (err, _v, _c, mutation) => {
        const m = mutation.meta?.errorMessage;
        if (m) {
          toast.error(getApiErrorMessage(err, m));
        }
      },
    }),
  });
}

export const queryClient = createAppQueryClient();
