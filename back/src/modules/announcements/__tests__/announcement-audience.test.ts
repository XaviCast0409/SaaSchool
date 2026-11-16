import { describe, it, expect, vi, beforeEach } from 'vitest';
import { audienceWhere } from '../announcement.repository';
import { AnnouncementService } from '../announcement.service';
import type { AnnouncementRepository } from '../announcement.repository';

vi.mock('../../../config/prisma', () => ({
  prisma: {
    classroom: { count: vi.fn().mockResolvedValue(1) },
    familyRelationship: { findMany: vi.fn().mockResolvedValue([]) },
    academicYear: { findFirst: vi.fn().mockResolvedValue(null) },
  },
}));
vi.mock('../../automations/delivery', () => ({ deliver: vi.fn() }));

describe('Comunicados: a quién va dirigido', () => {
  it('Dirección ve todo', () => {
    expect(audienceWhere({ role: 'SCHOOL_ADMIN', userId: 'dir' })).toEqual({});
  });

  it('el docente ve lo dirigido a docentes y siempre lo que publicó', () => {
    expect(audienceWhere({ role: 'TEACHER', userId: 't1' })).toEqual({
      OR: [{ targetRoles: { has: 'TEACHER' } }, { authorId: 't1' }],
    });
  });

  it('el alumno ve lo dirigido a las familias', () => {
    expect(audienceWhere({ role: 'STUDENT', userId: 's1' })).toEqual({
      OR: [{ targetRoles: { has: 'PARENT' } }, { authorId: 's1' }],
    });
  });
});

describe('Comunicados: permisos', () => {
  const repo = {
    findById: vi.fn(),
    findVisibleById: vi.fn(),
    softDelete: vi.fn(),
  };
  const service = new AnnouncementService(repo as unknown as AnnouncementRepository);

  beforeEach(() => vi.clearAllMocks());

  it('un docente no elimina comunicados ajenos', async () => {
    repo.findById.mockResolvedValue({ id: 'a1', authorId: 'otro' });
    await expect(service.deleteAnnouncement('a1', 'school-1', { userId: 't1', role: 'TEACHER' })).rejects.toMatchObject({ statusCode: 403 });
    expect(repo.softDelete).not.toHaveBeenCalled();
  });

  it('un docente sí elimina los suyos', async () => {
    repo.findById.mockResolvedValue({ id: 'a1', authorId: 't1' });
    await service.deleteAnnouncement('a1', 'school-1', { userId: 't1', role: 'TEACHER' });
    expect(repo.softDelete).toHaveBeenCalledWith('a1', 'school-1');
  });

  it('leer por ID un comunicado que no le corresponde responde 404', async () => {
    repo.findVisibleById.mockResolvedValue(null);
    await expect(
      service.getAnnouncementForViewer({ userId: 'p1', role: 'PARENT', schoolId: 'school-1' }, 'a-interno'),
    ).rejects.toMatchObject({ statusCode: 404 });
    // Se consulta con las reglas de destinatarios del apoderado (no un findById sin filtros)
    expect(repo.findVisibleById).toHaveBeenCalledWith('a-interno', 'school-1', expect.objectContaining({ role: 'PARENT' }), expect.any(Object));
    expect(repo.findById).not.toHaveBeenCalled();
  });
});
