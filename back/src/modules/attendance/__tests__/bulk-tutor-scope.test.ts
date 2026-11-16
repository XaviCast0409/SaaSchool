import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../../config/prisma';
import { AttendanceService } from '../attendance.service';
import type { AttendanceRepository } from '../attendance.repository';

vi.mock('../../../config/prisma', () => ({
  prisma: { enrollment: { count: vi.fn() } },
}));
vi.mock('../school-day', () => ({ assertSchoolDay: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../notifications/notification.routes', () => ({ notificationService: {} }));
vi.mock('../../../utils/web-push.util', () => ({ sendWebPushNotification: vi.fn() }));

const repo = { bulkCreate: vi.fn() };
const service = new AttendanceService(repo as unknown as AttendanceRepository);

const payload = {
  date: '2026-11-17',
  records: [{ enrollmentId: 'enr-aula-sin-tutor', status: 'PRESENT' }],
} as never;
const teacher = { userId: 'teacher-1', role: 'TEACHER', schoolId: 'school-1' };

describe('Registro masivo: el docente solo escribe en su aula tutoriada', () => {
  beforeEach(() => vi.clearAllMocks());

  it('cuenta como ajenas las aulas sin tutor (NULL) además de las de otro tutor', async () => {
    vi.mocked(prisma.enrollment.count).mockResolvedValue(1);
    await expect(service.registerBulkAttendance('school-1', payload, teacher)).rejects.toMatchObject({ statusCode: 403 });

    const where = vi.mocked(prisma.enrollment.count).mock.calls[0][0]!.where as Record<string, unknown>;
    expect(where.classroom).toEqual({
      OR: [{ tutorTeacherId: null }, { tutorTeacherId: { not: 'teacher-1' } }],
    });
    expect(repo.bulkCreate).not.toHaveBeenCalled();
  });
});
