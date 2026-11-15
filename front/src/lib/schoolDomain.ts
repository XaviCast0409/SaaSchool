/**
 * Subdominio por colegio: con VITE_ROOT_DOMAIN="kipuxedu.com", abrir santaelena.kipuxedu.com
 * (o www.santaelena.kipuxedu.com) lleva directo a la página de ingreso del colegio "santaelena".
 * Sin VITE_ROOT_DOMAIN todo sigue funcionando con /c/<código>.
 */

const ROOT_DOMAIN = String(import.meta.env.VITE_ROOT_DOMAIN ?? '')
  .trim()
  .toLowerCase()
  .replace(/^\.+/, '');

/** Subdominios que nunca son de un colegio (coinciden con los códigos reservados del backend). */
const RESERVED = new Set(['www', 'app', 'api', 'admin', 'administrador', 'staging', 'static', 'mail', 'soporte', 'support', 'demo', 'test', 'kipux', 'login', 'dashboard']);
const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$/;

/** Código del colegio según el nombre del servidor, o null si no es un subdominio de colegio. */
export function schoolSlugFromHost(hostname: string, rootDomain: string = ROOT_DOMAIN): string | null {
  if (!rootDomain) return null;
  const host = hostname.toLowerCase().replace(/\.$/, '');
  if (host === rootDomain || !host.endsWith(`.${rootDomain}`)) return null;
  const labels = host.slice(0, -(rootDomain.length + 1)).split('.').filter(Boolean);
  if (labels[0] === 'www') labels.shift();
  if (labels.length !== 1) return null;
  const slug = labels[0];
  if (RESERVED.has(slug) || !SLUG_REGEX.test(slug) || slug.includes('--')) return null;
  return slug;
}

/** Colegio del subdominio actual (se calcula una vez al cargar la app). */
export const currentSchoolSlug: string | null =
  typeof window === 'undefined' ? null : schoolSlugFromHost(window.location.hostname);

/** Dirección pública de ingreso de un colegio: su subdominio si está configurado, si no /c/<código>. */
export function schoolLoginUrl(slug: string): string {
  if (ROOT_DOMAIN && typeof window !== 'undefined') {
    const port = window.location.port && !['80', '443'].includes(window.location.port) ? `:${window.location.port}` : '';
    return `${window.location.protocol}//${slug}.${ROOT_DOMAIN}${port}`;
  }
  return `${typeof window === 'undefined' ? '' : window.location.origin}/c/${slug}`;
}
