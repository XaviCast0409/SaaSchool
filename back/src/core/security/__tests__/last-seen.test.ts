import { describe, it, expect, vi, beforeEach } from 'vitest';

const userUpdate = vi.fn().mockResolvedValue({ count: 1 });
const studentUpdate = vi.fn().mockResolvedValue({ count: 1 });
vi.mock('../../../config/prisma', () => ({
  prisma: {
    user: { updateMany: (...a: unknown[]) => userUpdate(...a) },
    student: { updateMany: (...a: unknown[]) => studentUpdate(...a) },
  },
}));

import { touchLastSeen, LAST_SEEN_THROTTLE_MS } from '../last-seen';

describe('touchLastSeen (última actividad para el panel SuperAdmin)', () => {
  beforeEach(() => {
    userUpdate.mockClear();
    studentUpdate.mockClear();
  });

  it('escribe como máximo una vez cada 15 minutos por cuenta', () => {
    const t0 = 1_000_000_000;
    touchLastSeen({ userId: 'u-1', role: 'TEACHER', schoolId: 's' } as never, t0);
    touchLastSeen({ userId: 'u-1', role: 'TEACHER', schoolId: 's' } as never, t0 + 60_000);
    expect(userUpdate).toHaveBeenCalledTimes(1);
    touchLastSeen({ userId: 'u-1', role: 'TEACHER', schoolId: 's' } as never, t0 + LAST_SEEN_THROTTLE_MS);
    expect(userUpdate).toHaveBeenCalledTimes(2);
  });

  it('los alumnos se registran en su propia tabla', () => {
    touchLastSeen({ userId: 'x', studentId: 'st-1', role: 'STUDENT', schoolId: 's' } as never, 5);
    expect(studentUpdate).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'st-1' } }));
  });

  it('el soporte (SUPER_ADMIN) no cuenta como actividad del colegio', () => {
    touchLastSeen({ userId: 'sa', role: 'SUPER_ADMIN', schoolId: 's' } as never, 5);
    expect(userUpdate).not.toHaveBeenCalled();
  });
});
