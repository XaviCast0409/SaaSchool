import os from 'os';

/** Sin configuración explícita no se pasa de 2: en contenedores los núcleos reportados pueden ser los del host. */
const AUTO_MAX = 2;

/**
 * Cuántas imágenes se optimizan a la vez.
 * `configured` (IMAGE_CONCURRENCY) manda; si no hay, se usan los núcleos disponibles con tope AUTO_MAX.
 */
export const resolveImageConcurrency = (configured: number | undefined, cores = os.availableParallelism()): number =>
  configured && configured > 0 ? Math.floor(configured) : Math.max(1, Math.min(cores, AUTO_MAX));

/**
 * Cola simple: ejecuta como máximo `max` tareas a la vez; las demás esperan su turno en orden.
 */
export function createConcurrencyLimit(max: number) {
  let active = 0;
  const queue: Array<() => void> = [];

  // El lugar que se libera pasa directo al siguiente en espera (así nunca se supera `max`)
  const next = () => {
    const waiter = queue.shift();
    if (waiter) waiter();
    else active--;
  };

  return async function run<T>(task: () => Promise<T>): Promise<T> {
    if (active >= max) await new Promise<void>((resolve) => queue.push(resolve));
    else active++;
    try {
      return await task();
    } finally {
      next();
    }
  };
}
