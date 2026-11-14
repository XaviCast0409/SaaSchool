import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../config/prisma', () => ({ prisma: {} }));

import { buildOnboarding, isProfileComplete } from '../../schools/onboarding.rules';
import { isAnnouncementLive, createAnnouncementSchema } from '../platform-announcement.service';
import { recordServerError, getRecentServerErrors, clearRecentServerErrors } from '../../../core/observability/recent-errors';

const emptyCounts = {
  profileComplete: false,
  adminHasLoggedIn: false,
  activeYears: 0,
  classrooms: 0,
  teachers: 0,
  students: 0,
  courseAssignments: 0,
  familyLinks: 0,
  paymentObligations: 0,
  attendanceRecords: 0,
};

describe('onboarding del colegio', () => {
  it('un colegio recién creado empieza en 0 % y lo siguiente es que entre la dirección', () => {
    const o = buildOnboarding(emptyCounts);
    expect(o.percent).toBe(0);
    expect(o.nextStep?.key).toBe('admin-login');
  });

  it('cuenta los pasos hechos y sugiere el primer pendiente', () => {
    const o = buildOnboarding({ ...emptyCounts, adminHasLoggedIn: true, activeYears: 1, classrooms: 12, students: 0 });
    expect(o.completed).toBe(3);
    expect(o.nextStep?.key).toBe('profile');
    expect(o.steps.find((s) => s.key === 'classrooms')?.detail).toBe('12 aulas');
  });

  it('completo = 100 % sin paso siguiente', () => {
    const o = buildOnboarding({
      profileComplete: true,
      adminHasLoggedIn: true,
      activeYears: 1,
      classrooms: 1,
      teachers: 1,
      students: 1,
      courseAssignments: 1,
      familyLinks: 1,
      paymentObligations: 1,
      attendanceRecords: 1,
    });
    expect(o).toMatchObject({ percent: 100, nextStep: null });
  });

  it('el perfil exige código modular, contacto, dirección y logo', () => {
    const full = { modularCode: '123', phone: '999', email: 'a@b.pe', address: 'Av. 1', logoUrl: 'http://x' };
    expect(isProfileComplete(full)).toBe(true);
    expect(isProfileComplete({ ...full, logoUrl: null })).toBe(false);
  });
});

describe('avisos de la plataforma', () => {
  const now = new Date('2026-11-14T15:00:00Z');

  it('solo se muestra si está activo y dentro de sus fechas', () => {
    const base = { isActive: true, startsAt: new Date('2026-11-14T00:00:00Z'), endsAt: null };
    expect(isAnnouncementLive(base, now)).toBe(true);
    expect(isAnnouncementLive({ ...base, isActive: false }, now)).toBe(false);
    expect(isAnnouncementLive({ ...base, startsAt: new Date('2026-11-15T00:00:00Z') }, now)).toBe(false);
    expect(isAnnouncementLive({ ...base, endsAt: new Date('2026-11-14T14:00:00Z') }, now)).toBe(false);
  });

  it('valida audiencia y que el fin sea posterior al inicio', () => {
    const ok = { title: 'Mantenimiento', message: 'Sábado de 10 a 12', audience: ['SCHOOL_ADMIN'] };
    expect(createAnnouncementSchema.safeParse(ok).success).toBe(true);
    expect(createAnnouncementSchema.safeParse({ ...ok, audience: [] }).success).toBe(false);
    expect(createAnnouncementSchema.safeParse({ ...ok, audience: ['SUPER_ADMIN'] }).success).toBe(false);
    expect(
      createAnnouncementSchema.safeParse({ ...ok, startsAt: '2026-11-20T10:00:00Z', endsAt: '2026-11-20T09:00:00Z' }).success,
    ).toBe(false);
  });
});

describe('errores recientes del servidor', () => {
  it('guarda los últimos 50, más nuevos primero y sin query string', () => {
    clearRecentServerErrors();
    for (let i = 0; i < 55; i++) recordServerError({ method: 'GET', path: `/api/x/${i}?dni=12345678`, message: `fallo ${i}` });
    const errors = getRecentServerErrors();
    expect(errors).toHaveLength(50);
    expect(errors[0]).toMatchObject({ path: '/api/x/54', message: 'fallo 54' });
    expect(errors.some((e) => e.path.includes('dni'))).toBe(false);
  });
});
