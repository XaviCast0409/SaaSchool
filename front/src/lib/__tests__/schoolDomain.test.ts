import { describe, it, expect } from 'vitest';
import { isSubdomainSlug, schoolSlugFromHost } from '../schoolDomain';

describe('subdominio de cada colegio', () => {
  it('reconoce el colegio en <colegio>.dominio y www.<colegio>.dominio', () => {
    expect(schoolSlugFromHost('santaelena.kipuxedu.com', 'kipuxedu.com')).toBe('santaelena');
    expect(schoolSlugFromHost('www.santaelena.kipuxedu.com', 'kipuxedu.com')).toBe('santaelena');
    expect(schoolSlugFromHost('SantaElena.KipuxEdu.com.', 'kipuxedu.com')).toBe('santaelena');
  });

  it('el dominio raíz, www, la API y otros dominios no son colegios', () => {
    expect(schoolSlugFromHost('kipuxedu.com', 'kipuxedu.com')).toBeNull();
    expect(schoolSlugFromHost('www.kipuxedu.com', 'kipuxedu.com')).toBeNull();
    expect(schoolSlugFromHost('api.kipuxedu.com', 'kipuxedu.com')).toBeNull();
    expect(schoolSlugFromHost('a.b.kipuxedu.com', 'kipuxedu.com')).toBeNull();
    expect(schoolSlugFromHost('santaelena.otrodominio.com', 'kipuxedu.com')).toBeNull();
    expect(schoolSlugFromHost('santaelena.kipuxedu.com', '')).toBeNull();
  });

  it('valida el formato del código', () => {
    expect(isSubdomainSlug('innova-academy')).toBe(true);
    expect(isSubdomainSlug('admin')).toBe(false);
    expect(isSubdomainSlug('mal--codigo')).toBe(false);
    expect(isSubdomainSlug('-inicio')).toBe(false);
    expect(isSubdomainSlug('ab')).toBe(false);
  });
});
