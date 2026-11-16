import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Lee `?abrir=<acción>` una sola vez (p. ej. un acceso rápido del Inicio que debe abrir un formulario)
 * y lo quita de la URL, para que recargar o volver atrás no lo abra de nuevo.
 */
export const useQueryAction = (): string | null => {
  const [params, setParams] = useSearchParams();
  const [action] = useState(() => params.get('abrir'));

  useEffect(() => {
    if (!params.has('abrir')) return;
    const next = new URLSearchParams(params);
    next.delete('abrir');
    setParams(next, { replace: true });
    // Solo al montar: después la URL ya no lleva la acción
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return action;
};
