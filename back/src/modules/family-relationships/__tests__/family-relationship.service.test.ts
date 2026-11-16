import { describe, it, expect, vi, beforeEach } from 'vitest';

const studentFind = vi.fn();
const userFind = vi.fn();
const linkFind = vi.fn();
vi.mock('../../../config/prisma', () => ({
  prisma: {
    student: { findFirst: (...a: unknown[]) => studentFind(...a) },
    user: { findFirst: (...a: unknown[]) => userFind(...a) },
    familyRelationship: { findFirst: (...a: unknown[]) => linkFind(...a) },
  },
}));

import { FamilyRelationshipService } from '../family-relationship.service';

const dto = {
  studentId: '11111111-1111-1111-1111-111111111111',
  userId: '22222222-2222-2222-2222-222222222222',
  relationshipType: 'MOTHER' as const,
  isLegalGuardian: true,
  isFinancialResponsible: false,
  livesWithStudent: true,
};

describe('FamilyRelationshipService.create (vínculo apoderado–estudiante)', () => {
  const repo = { create: vi.fn(async () => ({ id: 'rel-1' })) };
  const service = new FamilyRelationshipService(repo as never);

  beforeEach(() => {
    vi.clearAllMocks();
    studentFind.mockResolvedValue({ id: dto.studentId });
    userFind.mockResolvedValue({ id: dto.userId, role: 'PARENT', isActive: true });
    linkFind.mockResolvedValue(null);
  });

  it('vincula cuando estudiante y apoderado son del mismo colegio', async () => {
    await expect(service.create('school-A', dto)).resolves.toEqual({ id: 'rel-1' });
    expect(studentFind).toHaveBeenCalledWith(expect.objectContaining({ where: { id: dto.studentId, schoolId: 'school-A' } }));
    expect(userFind).toHaveBeenCalledWith(expect.objectContaining({ where: { id: dto.userId, schoolId: 'school-A' } }));
  });

  it('rechaza un estudiante de otro colegio (no se filtra acceso entre colegios)', async () => {
    studentFind.mockResolvedValue(null);
    await expect(service.create('school-A', dto)).rejects.toMatchObject({ statusCode: 404 });
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('rechaza un apoderado de otro colegio', async () => {
    userFind.mockResolvedValue(null);
    await expect(service.create('school-A', dto)).rejects.toMatchObject({ statusCode: 404 });
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('rechaza vincular a personal que no es apoderado', async () => {
    userFind.mockResolvedValue({ id: dto.userId, role: 'TEACHER', isActive: true });
    await expect(service.create('school-A', dto)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rechaza un vínculo repetido', async () => {
    linkFind.mockResolvedValue({ id: 'rel-0' });
    await expect(service.create('school-A', dto)).rejects.toMatchObject({ statusCode: 409 });
  });
});
