import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import '../zod-es';

describe('zodEsErrorMap', () => {
  it('traduce Required a mensaje en español', () => {
    const schema = z.object({
      name: z.string(),
    });
    const result = schema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Este campo es obligatorio.');
    }
  });

  it('traduce Invalid enum value a mensaje en español con opciones', () => {
    const schema = z.object({
      role: z.enum(['TEACHER', 'PARENT']),
    });
    const result = schema.safeParse({ role: 'UNKNOWN' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Valor no válido. Opciones permitidas:');
      expect(result.error.issues[0].message).toContain('«TEACHER»');
    }
  });

  it('traduce validación de número y tipo', () => {
    const schema = z.object({
      age: z.number(),
    });
    const result = schema.safeParse({ age: 'veinte' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Se esperaba un número válido.');
    }
  });
});

