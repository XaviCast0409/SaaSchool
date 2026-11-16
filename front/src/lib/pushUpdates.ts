import type { Query, QueryClient } from '@tanstack/react-query';

/**
 * Cuando llega una notificación push, el service worker (public/sw.js) avisa a las pestañas abiertas.
 * Aquí se marca todo como desactualizado y se vuelve a pedir solo lo que está en pantalla
 * (la campana, la lista de pagos, el comunicado abierto…), sin que el usuario tenga que refrescar.
 */
const DEBOUNCE_MS = 800;

/**
 * No se recargan:
 * - Datos que no cambian (staleTime: Infinity: catálogos, textos legales).
 * - Consultas que alimentan un formulario en edición (refetchOnWindowFocus: false).
 */
const shouldRefresh = (query: Query): boolean => {
  // query.options incluye las opciones del useQuery que la creó (staleTime, refetchOnWindowFocus…)
  const { staleTime, refetchOnWindowFocus } = query.options as unknown as { staleTime?: unknown; refetchOnWindowFocus?: unknown };
  return staleTime !== Infinity && refetchOnWindowFocus !== false;
};

export function listenForPushUpdates(queryClient: QueryClient): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

  let timer: ReturnType<typeof setTimeout> | undefined;
  navigator.serviceWorker.addEventListener('message', (event: MessageEvent) => {
    if ((event.data as { type?: string } | null)?.type !== 'PUSH_RECEIVED') return;
    // Varias notificaciones seguidas (p. ej. un comunicado masivo) disparan una sola actualización
    clearTimeout(timer);
    timer = setTimeout(() => {
      void queryClient.invalidateQueries({ predicate: shouldRefresh, refetchType: 'active' });
    }, DEBOUNCE_MS);
  });
  // Habilita la entrega de mensajes del service worker desde ya (si no, esperan a DOMContentLoaded)
  navigator.serviceWorker.startMessages();
}
