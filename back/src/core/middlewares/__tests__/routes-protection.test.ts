import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Guardia estática: todo archivo de rutas debe usar authMiddleware.
 * Evita que un módulo nuevo quede expuesto sin autenticación por olvido.
 * Las rutas públicas legítimas se declaran aquí explícitamente.
 */
const MODULES_DIR = join(__dirname, '../../../modules');
const PUBLIC_ROUTE_FILES = new Set<string>([
  // Suscripción .ics: Google Calendar no envía token; se valida con firma HMAC en la URL
  'calendar/calendar-feed.routes.ts',
  // Formulario de admisión y Libro de Reclamaciones virtual (Indecopi): para personas sin cuenta
  'secretariat/secretariat.public.routes.ts',
  // agregar aquí otras rutas públicas intencionales
]);

describe('protección de rutas', () => {
  const files = readdirSync(MODULES_DIR).flatMap((mod) => {
    const dir = join(MODULES_DIR, mod);
    if (!existsSync(dir)) return [];
    try {
      return readdirSync(dir).filter((f) => f.endsWith('.routes.ts')).map((f) => `${mod}/${f}`);
    } catch {
      return [];
    }
  });

  it('encuentra archivos de rutas', () => expect(files.length).toBeGreaterThan(10));

  it.each(files.filter((f) => !PUBLIC_ROUTE_FILES.has(f)))('%s usa authMiddleware', (file) => {
    const src = readFileSync(join(MODULES_DIR, file), 'utf8');
    expect(src).toMatch(/authMiddleware/);
  });
});
