import { describe, it, expect } from 'vitest';
import { buildOriginMatcher } from '../cors.rules';

describe('CORS con subdominios de colegios', () => {
  const allowed = buildOriginMatcher(['https://app.kipuxedu.com', 'https://*.kipuxedu.com', 'http://localhost:5173']);

  it('acepta orígenes exactos y subdominios de un nivel', () => {
    expect(allowed('https://app.kipuxedu.com')).toBe(true);
    expect(allowed('https://santaelena.kipuxedu.com')).toBe(true);
    expect(allowed('http://localhost:5173')).toBe(true);
  });

  it('rechaza dominios parecidos, otros protocolos y varios niveles', () => {
    expect(allowed('https://kipuxedu.com.atacante.com')).toBe(false);
    expect(allowed('https://atacantekipuxedu.com')).toBe(false);
    expect(allowed('http://santaelena.kipuxedu.com')).toBe(false);
    expect(allowed('https://a.b.kipuxedu.com')).toBe(false);
  });
});
