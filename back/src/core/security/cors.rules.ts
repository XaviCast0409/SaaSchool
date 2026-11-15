/**
 * Orígenes permitidos para CORS. Acepta valores exactos ("https://app.kipuxedu.com") y comodines
 * de un solo nivel para los subdominios de los colegios ("https://*.kipuxedu.com").
 */
export function buildOriginMatcher(list: string[]): (origin: string) => boolean {
  const exact = new Set<string>();
  const patterns: RegExp[] = [];
  for (const raw of list.map((o) => o.trim().replace(/\/$/, '')).filter(Boolean)) {
    if (raw.includes('*')) {
      const escaped = raw.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[a-z0-9](?:[a-z0-9-]*[a-z0-9])?');
      patterns.push(new RegExp(`^${escaped}$`, 'i'));
    } else {
      exact.add(raw.toLowerCase());
    }
  }
  return (origin: string) => exact.has(origin.toLowerCase()) || patterns.some((p) => p.test(origin));
}
