import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../../config/prisma';
import { assertSchoolDay } from '../school-day';

vi.mock('../../../config/prisma', () => ({
  prisma: {
    academicYear: { findFirst: vi.fn() },
    schoolHoliday: { findFirst: vi.fn() },
  },
}));

const activeYear = { year: 2026, startDate: new Date('2026-03-02'), endDate: new Date('2026-12-18') };

describe('assertSchoolDay: día lectivo compartido por la asistencia diaria y por curso', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.academicYear.findFirst).mockResolvedValue(activeYear as never);
    vi.mocked(prisma.schoolHoliday.findFirst).mockResolvedValue(null);
  });

  it('acepta un martes lectivo', async () => {
    await expect(assertSchoolDay('school-1', '2026-11-17')).resolves.toBeUndefined();
  });

  it('rechaza el fin de semana', async () => {
    await expect(assertSchoolDay('school-1', '2026-11-21')).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rechaza un feriado nacional', async () => {
    await expect(assertSchoolDay('school-1', '2026-12-08')).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rechaza un feriado propio del colegio y solo consulta esa fecha', async () => {
    vi.mocked(prisma.schoolHoliday.findFirst).mockResolvedValue({ name: 'Aniversario del colegio' } as never);
    await expect(assertSchoolDay('school-1', '2026-11-17')).rejects.toThrow(/Aniversario/);
    expect(prisma.schoolHoliday.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ schoolId: 'school-1' }) }),
    );
  });
});
