import { describe, expect, it } from 'vitest';
import { createConcurrencyLimit, resolveImageConcurrency } from '../concurrency-limit';

describe('resolveImageConcurrency', () => {
  it('usa el valor configurado si existe', () => {
    expect(resolveImageConcurrency(6, 1)).toBe(6);
  });
  it('sin configuración usa los núcleos con tope de 2', () => {
    expect(resolveImageConcurrency(undefined, 1)).toBe(1);
    expect(resolveImageConcurrency(undefined, 16)).toBe(2);
    expect(resolveImageConcurrency(undefined, 0)).toBe(1);
  });
});

describe('createConcurrencyLimit', () => {
  it('nunca ejecuta más de `max` tareas a la vez y las completa todas', async () => {
    const run = createConcurrencyLimit(2);
    let active = 0;
    let peak = 0;
    const task = (i: number) => async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5 + (i % 3)));
      active--;
      return i;
    };
    const results = await Promise.all(Array.from({ length: 10 }, (_, i) => run(task(i))));
    expect(results).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(peak).toBe(2);
  });

  it('libera el lugar aunque la tarea falle', async () => {
    const run = createConcurrencyLimit(1);
    await expect(run(async () => { throw new Error('x'); })).rejects.toThrow('x');
    await expect(run(async () => 'ok')).resolves.toBe('ok');
  });
});
