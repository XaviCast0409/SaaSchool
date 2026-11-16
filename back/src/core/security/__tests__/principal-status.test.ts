import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../../config/prisma';
import { assertPrincipalIsActive, invalidatePrincipalCache } from '../principal-status';

vi.mock('../../../config/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    student: { findUnique: vi.fn() },
    enrollment: { findFirst: vi.fn() },
  },
}));

const userFind = prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>;
const studentFind = prisma.student.findUnique as unknown as ReturnType<typeof vi.fn>;
const enrollmentFind = prisma.enrollment.findFirst as unknown as ReturnType<typeof vi.fn>;

describe('assertPrincipalIsActive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidatePrincipalCache('user', 'u1');
    invalidatePrincipalCache('student', 's1');
  });

  it('acepta un token cuyo rol y colegio coinciden con la BD', async () => {
    userFind.mockResolvedValue({ isActive: true, passwordChangedAt: null, role: 'DIRECTOR', schoolId: 'sch1' });
    await expect(assertPrincipalIsActive({ userId: 'u1', role: 'DIRECTOR', schoolId: 'sch1' })).resolves.toBeUndefined();
  });

  it('rechaza el token si el rol cambió después de emitirlo', async () => {
    userFind.mockResolvedValue({ isActive: true, passwordChangedAt: null, role: 'TEACHER', schoolId: 'sch1' });
    await expect(assertPrincipalIsActive({ userId: 'u1', role: 'DIRECTOR', schoolId: 'sch1' })).rejects.toMatchObject({ statusCode: 401 });
  });

  it('rechaza el token si el colegio cambió', async () => {
    userFind.mockResolvedValue({ isActive: true, passwordChangedAt: null, role: 'TEACHER', schoolId: 'sch2' });
    await expect(assertPrincipalIsActive({ userId: 'u1', role: 'TEACHER', schoolId: 'sch1' })).rejects.toMatchObject({ statusCode: 401 });
  });

  it('acepta SUPER_ADMIN sin colegio', async () => {
    userFind.mockResolvedValue({ isActive: true, passwordChangedAt: null, role: 'SUPER_ADMIN', schoolId: null });
    await expect(
      assertPrincipalIsActive({ userId: 'u1', role: 'SUPER_ADMIN', schoolId: null as unknown as string }),
    ).resolves.toBeUndefined();
  });

  it('cierra el acceso del alumno cuya matrícula más reciente es retiro o traslado', async () => {
    studentFind.mockResolvedValue({ id: 's1', schoolId: 'sch1', passwordChangedAt: null });
    enrollmentFind.mockResolvedValue({ enrollmentState: 'TRANSFERRED' });
    await expect(
      assertPrincipalIsActive({ userId: 's1', studentId: 's1', role: 'STUDENT', schoolId: 'sch1' }),
    ).rejects.toThrow(/retirada o trasladada/);
  });

  it('mantiene el acceso del alumno matriculado o sin matrícula', async () => {
    studentFind.mockResolvedValue({ id: 's1', schoolId: 'sch1', passwordChangedAt: null });
    enrollmentFind.mockResolvedValue(null);
    await expect(
      assertPrincipalIsActive({ userId: 's1', studentId: 's1', role: 'STUDENT', schoolId: 'sch1' }),
    ).resolves.toBeUndefined();
  });
});
