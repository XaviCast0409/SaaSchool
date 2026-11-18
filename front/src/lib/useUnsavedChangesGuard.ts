import { useEffect } from 'react';

const DEFAULT_MESSAGE = 'Tienes cambios sin guardar. Si sales ahora se perderán. ¿Salir de todos modos?';

/**
 * Avisa antes de perder cambios sin guardar: al cerrar o recargar la pestaña y al hacer clic en
 * cualquier enlace interno (menú lateral, migas, botones con Link). La app usa BrowserRouter, sin
 * `useBlocker`, así que se intercepta el clic en fase de captura antes de que React Router navegue.
 */
export function useUnsavedChangesGuard(dirty: boolean, message: string = DEFAULT_MESSAGE): void {
  useEffect(() => {
    if (!dirty) return undefined;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor = (event.target as HTMLElement | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [dirty, message]);
}
