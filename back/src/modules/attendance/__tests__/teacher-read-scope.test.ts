import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../../config/prisma';
import { AttendanceService } from '../attendance.service';
import type { AttendanceRepository } from '../attendance.repository';

vi.mock('../../../config/prisma', () => ({
  prisma: {
    classroom: { findMany: vi.fn() },
    enrollment: { findFirst: vi.fn() },
  },
}));
vi.mock('../school-day', () => ({ assertSchoolDay: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../notifications/notification.routes', () => ({ notificationService: {} }));
vi.mock('../../../utils/web-push.util', () => ({ sendWebPushNotification: vi.fn() }));

const repo = {
  findBySchoolAndFilters: vi.fn().mockResolvedValue({ data: [], meta: {}, stats: {} }),
  getClassroomAttendanceSheet: vi.fn().mockResolvedValue({}),
  getMonthlyMatrixData: vi.fn().mockResolvedValue({}),
};
const service = new AttendanceService(repo as unknown as AttendanceRepository);

const tutor = { userId: 'teacher-tutor', role: 'TEACHER', schoolId: 'school-1' };
const director = { userId: 'dir-1', role: 'SCHOOL_ADMIN', schoolId: 'school-1' };

describe('Asistencia diaria: el docente solo consulta su aula de tutoría', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.classroom.findMany).mockResolvedValue([{ id: 'aula-propia' }] as never);
  });

  it('hoja de su aula: permitida', async () => {
    await service.getAttendanceSheet('school-1', { classroomId: 'aula-propia', date: '2026-11-17' }, tutor);
    expect(repo.getClassroomAttendanceSheet).toHaveBeenCalled();
  });

  it('hoja de otra aula: 403', async () => {
    await expect(
      service.getAttendanceSheet('school-1', { classroomId: 'aula-ajena', date: '2026-11-17' }, tutor),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(repo.getClassroomAttendanceSheet).not.toHaveBeenCalled();
  });

  it('matriz sin aula elegida: 400; de otra aula: 403', async () => {
    await expect(service.getMonthlyMatrixData('school-1', { month: '2026-11' } as never, tutor)).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      service.getMonthlyMatrixData('school-1', { month: '2026-11', classroomId: 'aula-ajena' } as never, tutor),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('lista sin aula: usa su aula de tutoría; con aula ajena: 403', async () => {
    await service.getAttendanceByFilters('school-1', { date: '2026-11-17' } as never, tutor);
    expect(repo.findBySchoolAndFilters).toHaveBeenCalledWith('school-1', expect.objectContaining({ classroomId: 'aula-propia' }));
    await expect(
      service.getAttendanceByFilters('school-1', { classroomId: 'aula-ajena' } as never, tutor),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('docente sin tutoría: lista vacía, sin consultar la base', async () => {
    vi.mocked(prisma.classroom.findMany).mockResolvedValue([] as never);
    const result = await service.getAttendanceByFilters('school-1', { page: 1, limit: 15 } as never, tutor);
    expect(result.data).toEqual([]);
    expect(result.meta.total).toBe(0);
    expect(repo.findBySchoolAndFilters).not.toHaveBeenCalled();
  });

  it('expediente de un alumno de otra aula: 403; de la suya: permitido', async () => {
    vi.mocked(prisma.enrollment.findFirst).mockResolvedValue({ classroom: { tutorTeacherId: 'otro-tutor' } } as never);
    await expect(service.assertTeacherTutorsEnrollment('school-1', 'enr-1', tutor)).rejects.toMatchObject({ statusCode: 403 });
    vi.mocked(prisma.enrollment.findFirst).mockResolvedValue({ classroom: { tutorTeacherId: 'teacher-tutor' } } as never);
    await expect(service.assertTeacherTutorsEnrollment('school-1', 'enr-1', tutor)).resolves.toBeUndefined();
  });

  it('Dirección consulta cualquier aula sin restricciones', async () => {
    await service.getAttendanceSheet('school-1', { classroomId: 'aula-ajena', date: '2026-11-17' }, director);
    await service.assertTeacherTutorsEnrollment('school-1', 'enr-1', director);
    expect(repo.getClassroomAttendanceSheet).toHaveBeenCalled();
    expect(prisma.classroom.findMany).not.toHaveBeenCalled();
  });
});
