import { useEffect, useState } from 'react';

/** Devuelve `value` solo cuando deja de cambiar durante `delayMs` (para buscadores que consultan al servidor). */
export const useDebouncedValue = <T,>(value: T, delayMs = 300): T => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
};
