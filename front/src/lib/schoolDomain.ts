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

/** true si el código puede usarse como subdominio de colegio (formato válido y no reservado). */
export function isSubdomainSlug(slug: string): boolean {
  return !RESERVED.has(slug) && SLUG_REGEX.test(slug) && !slug.includes('--');
}

/** Código del colegio según el nombre del servidor, o null si no es un subdominio de colegio. */
export function schoolSlugFromHost(hostname: string, rootDomain: string = ROOT_DOMAIN): string | null {
  if (!rootDomain) return null;
  const host = hostname.toLowerCase().replace(/\.$/, '');
  if (host === rootDomain || !host.endsWith(`.${rootDomain}`)) return null;
  const labels = host.slice(0, -(rootDomain.length + 1)).split('.').filter(Boolean);
  if (labels[0] === 'www') labels.shift();
  if (labels.length !== 1) return null;
  const slug = labels[0];
  return isSubdomainSlug(slug) ? slug : null;
}

/**
 * true si la app corre en el dominio raíz o en uno de sus subdominios (kipuxedu.com, www.kipuxedu.com,
 * <colegio>.kipuxedu.com). Solo ahí se redirige entre subdominios; en localhost u otros nombres
 * todo sigue funcionando con /c/<código>.
 */
export function onSchoolDomain(hostname: string = typeof window === 'undefined' ? '' : window.location.hostname): boolean {
  if (!ROOT_DOMAIN) return false;
  const host = hostname.toLowerCase().replace(/\.$/, '');
  return host === ROOT_DOMAIN || host.endsWith(`.${ROOT_DOMAIN}`);
}

/** true si el ingreso de este colegio debe abrirse en su propio subdominio en lugar de /c/<código>. */
export function shouldUseSchoolSubdomain(slug: string): boolean {
  return onSchoolDomain() && isSubdomainSlug(slug);
}

function currentPortSuffix(): string {
  const port = typeof window === 'undefined' ? '' : window.location.port;
  return port && !['80', '443'].includes(port) ? `:${port}` : '';
}

/** Dirección en el sitio principal de KIPUX (www.<dominio raíz>), por ejemplo para cambiar de colegio. */
export function mainSiteUrl(path: string): string {
  return `${window.location.protocol}//www.${ROOT_DOMAIN}${currentPortSuffix()}${path}`;
}

/** Colegio del subdominio actual (se calcula una vez al cargar la app). */
export const currentSchoolSlug: string | null =
  typeof window === 'undefined' ? null : schoolSlugFromHost(window.location.hostname);

/** Dirección pública de ingreso de un colegio: su subdominio si está configurado, si no /c/<código>. */
export function schoolLoginUrl(slug: string): string {
  if (ROOT_DOMAIN && typeof window !== 'undefined') {
    return `${window.location.protocol}//${slug}.${ROOT_DOMAIN}${currentPortSuffix()}`;
  }
  return `${typeof window === 'undefined' ? '' : window.location.origin}/c/${slug}`;
}
