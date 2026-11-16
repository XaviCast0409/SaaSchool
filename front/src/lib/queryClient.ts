import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Al volver a la pestaña o a la app se actualiza lo que está en pantalla
      // (si el dato tiene más de `staleTime`), así se ven los cambios del colegio sin refrescar.
      refetchOnWindowFocus: true,
      retry: 1,
      staleTime: 30_000, // 30 s: evita repetir consultas al navegar entre pantallas
    },
  },
});
