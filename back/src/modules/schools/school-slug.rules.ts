/**
 * Código del colegio (slug): identifica su página de ingreso (/c/<slug>).
 * Es público por diseño (se comparte con las familias), así que solo sirve para ELEGIR
 * el colegio antes de autenticar; nunca concede acceso por sí mismo.
 */

export const SLUG_MIN = 3;
export const SLUG_MAX = 40;

/** Minúsculas, números y guiones internos; 3 a 40 caracteres. */
export const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$/;

/** Palabras que no pueden ser código de colegio (rutas, subdominios futuros o confusas). */
export const RESERVED_SLUGS = new Set([
  'admin',
  'administrador',
  'api',
  'app',
  'c',
  'colegio',
  'dashboard',
  'demo',
  'help',
  'login',
  'mail',
  'plataforma',
  'saaschool',
  'soporte',
  'staging',
  'static',
  'support',
  'test',
  'www',
]);

export const SLUG_INVALID_MESSAGE =
  'El código del colegio debe tener de 3 a 40 caracteres: letras minúsculas, números y guiones (sin espacios ni tildes).';

/** Normaliza lo que escribe la persona: sin espacios alrededor y en minúsculas. */
export const normalizeSlug = (value: string): string => value.trim().toLowerCase();

export const isValidSlug = (value: string): boolean =>
  SLUG_REGEX.test(value) && !value.includes('--') && !RESERVED_SLUGS.has(value);

/** Genera un código a partir del nombre del colegio ("I.E.P. San José" → "iep-san-jose"). */
export const slugify = (name: string): string => {
  const base = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, SLUG_MAX - 4)
    .replace(/^-+|-+$/g, '');
  if (base.length < SLUG_MIN || RESERVED_SLUGS.has(base)) return `colegio-${base || 'nuevo'}`.replace(/-+$/g, '');
  return base;
};

/** Candidatos en orden: base, base-2, base-3... */
export const slugCandidates = (base: string, count = 20): string[] =>
  Array.from({ length: count }, (_, i) => (i === 0 ? base : `${base}-${i + 1}`));
