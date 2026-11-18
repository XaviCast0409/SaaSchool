import { useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

type FilterValue = string | number | boolean;

/**
 * Filtros, pestaña y página guardados en la URL (?q=...&page=2): sobreviven a recargar,
 * al botón Atrás y se pueden compartir como enlace.
 *
 * Los valores iguales al valor por defecto no se escriben, para que la URL quede limpia.
 * `set` acepta varios campos a la vez (p. ej. cambiar el filtro y volver a la página 1).
 */
export function useUrlFilters<T extends Record<string, FilterValue>>(defaults: T): [T, (patch: Partial<T>) => void] {
  const location = useLocation();
  const navigate = useNavigate();
  // Los valores por defecto se fijan en el primer render (suelen ser literales)
  const defaultsRef = useRef(defaults);

  const values = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const result: Record<string, FilterValue> = {};
    for (const [key, def] of Object.entries(defaultsRef.current)) {
      const raw = params.get(key);
      if (raw === null) {
        result[key] = def;
      } else if (typeof def === 'number') {
        const n = Number(raw);
        result[key] = Number.isFinite(n) ? n : def;
      } else if (typeof def === 'boolean') {
        result[key] = raw === '1';
      } else {
        result[key] = raw;
      }
    }
    return result as T;
  }, [location.search]);

  const set = useCallback(
    (patch: Partial<T>) => {
      // Se lee la URL real y no la del render: así dos cambios seguidos no se pisan
      const params = new URLSearchParams(window.location.search);
      for (const [key, value] of Object.entries(patch)) {
        const def = defaultsRef.current[key];
        if (value === undefined || value === def || value === '') {
          params.delete(key);
        } else if (typeof value === 'boolean') {
          params.set(key, value ? '1' : '0');
        } else {
          params.set(key, String(value));
        }
      }
      const search = params.toString();
      navigate({ search: search ? `?${search}` : '' }, { replace: true });
    },
    [navigate],
  );

  return [values, set];
}
