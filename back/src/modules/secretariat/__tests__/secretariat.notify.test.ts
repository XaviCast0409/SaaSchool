import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../config/prisma', () => ({ prisma: {} }));
vi.mock('../../automations/delivery', () => ({ deliver: vi.fn(), renderEmailHtml: vi.fn(() => '') }));
vi.mock('../../automations/email-queue', () => ({ enqueueEmail: vi.fn() }));

import { neutralizeLinks } from '../secretariat.notify';

describe('neutralizeLinks (texto libre de formularios públicos reenviado por correo)', () => {
  it('quita URLs y dominios', () => {
    const out = neutralizeLinks('Gana dinero en http://spam.ru/x, www.promo.com o bit.ly/abc123 hoy');
    expect(out).not.toMatch(/spam\.ru|promo\.com|bit\.ly/);
    expect(out.match(/\[enlace omitido\]/g)).toHaveLength(3);
  });

  it('no altera texto normal con montos y fechas', () => {
    const text = 'Pagué S/ 350.00 el 03.04.2026 y no me dieron boleta. Sr. Pérez atendió.';
    expect(neutralizeLinks(text)).toBe(text);
  });
});
