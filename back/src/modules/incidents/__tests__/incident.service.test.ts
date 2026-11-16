import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../../config/prisma';
import { IncidentService } from '../incident.service';
import type { IncidentRepository } from '../incident.repository';

vi.mock('../../../config/prisma', () => ({
  prisma: {
    enrollment: { count: vi.fn(), findFirst: vi.fn() },
    pushSubscription: { findMany: vi.fn() },
  },
}));
vi.mock('../../../utils/web-push.util', () => ({ sendWebPushNotification: vi.fn() }));

const repo = {
  create: vi.fn(),
  findById: vi.fn(),
  findAll: vi.fn(),
  acknowledge: vi.fn(),
  updateSiseve: vi.fn(),
};
const service = new IncidentService(repo as unknown as IncidentRepository);

const dto = {
  enrollmentId: 'enr-otro-colegio',
  type: 'BEHAVIOR',
  severity: 'LOW',
  title: 'Incidencia de prueba',
  description: 'Descripción de prueba suficientemente larga',
} as never;

const violenceCase = {
  id: 'inc-1',
  isViolenceCase: true,
  authorId: 'teacher-author',
  enrollment: { classroom: { tutorTeacherId: 'teacher-tutor' }, student: { id: 's-1', familyRelations: [] } },
};

describe('Incidencias: aislamiento entre colegios', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rechaza una matrícula que no pertenece al colegio', async () => {
    vi.mocked(prisma.enrollment.count).mockResolvedValue(0);
    await expect(service.createIncident('school-1', 'teacher-1', dto)).rejects.toMatchObject({ statusCode: 404 });
    expect(prisma.enrollment.count).toHaveBeenCalledWith({ where: { id: 'enr-otro-colegio', schoolId: 'school-1' } });
    expect(repo.create).not.toHaveBeenCalled();
  });
});

describe('Incidencias: privacidad de los casos de violencia', () => {
  beforeEach(() => vi.clearAllMocks());

  it('un docente ajeno no puede abrir un caso de violencia', async () => {
    repo.findById.mockResolvedValue(violenceCase);
    await expect(
      service.getIncidentById('school-1', 'inc-1', { userId: 'teacher-otro', role: 'TEACHER' }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('el autor y el tutor del aula sí pueden abrirlo', async () => {
    repo.findById.mockResolvedValue(violenceCase);
    await expect(service.getIncidentById('school-1', 'inc-1', { userId: 'teacher-author', role: 'TEACHER' })).resolves.toBe(violenceCase);
    await expect(service.getIncidentById('school-1', 'inc-1', { userId: 'teacher-tutor', role: 'TEACHER' })).resolves.toBe(violenceCase);
  });

  it('la Dirección puede abrirlo', async () => {
    repo.findById.mockResolvedValue(violenceCase);
    await expect(service.getIncidentById('school-1', 'inc-1', { userId: 'dir-1', role: 'SCHOOL_ADMIN' })).resolves.toBe(violenceCase);
  });

  it('el listado del docente se filtra por autor o tutoría', async () => {
    repo.findAll.mockResolvedValue({ data: [], meta: {} });
    await service.getIncidents('school-1', {} as never, { userId: 'teacher-1', role: 'TEACHER' });
    expect(repo.findAll).toHaveBeenCalledWith('school-1', {}, { teacherUserId: 'teacher-1' });
  });
});
