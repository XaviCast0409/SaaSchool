import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SchoolService } from '../school.service';
import type { SchoolRepository } from '../school.repository';
import { AppError } from '../../../core/errors/app-error';

describe('SchoolService - createSchool validation (P4, P5)', () => {
  let service: SchoolService;
  let mockRepo: Partial<SchoolRepository>;

  beforeEach(() => {
    mockRepo = {
      findByDocumentId: vi.fn(),
      findUserByEmail: vi.fn(),
      create: vi.fn(),
      findById: vi.fn(),
    };
    service = new SchoolService(mockRepo as SchoolRepository);
  });

  it('rejects duplicate school RUC with 409 and descriptive message', async () => {
    vi.mocked(mockRepo.findByDocumentId!).mockResolvedValue({
      id: 'sch-1',
      name: 'Colegio Existente',
      documentId: '20123456789',
    } as any);

    await expect(
      service.createSchool({
        name: 'Nuevo Colegio',
        documentId: '20123456789',
      } as any),
    ).rejects.toThrow(new AppError('Ya existe un colegio registrado con ese RUC.', 409));
  });

  it('rejects duplicate director email with 409 and descriptive message', async () => {
    vi.mocked(mockRepo.findByDocumentId!).mockResolvedValue(null);
    vi.mocked(mockRepo.findUserByEmail!).mockResolvedValue({ id: 'user-1' });

    await expect(
      service.createSchool({
        name: 'Nuevo Colegio',
        documentId: '20987654321',
        adminEmail: 'director@existente.pe',
        adminPassword: 'Password123!',
        adminFirstName: 'Ana',
        adminLastNamePaternal: 'Paz',
      } as any),
    ).rejects.toThrow(new AppError('Ese correo ya está registrado en la plataforma.', 409));
  });

  it('rejects missing admin password when admin email is provided', async () => {
    vi.mocked(mockRepo.findByDocumentId!).mockResolvedValue(null);

    await expect(
      service.createSchool({
        name: 'Nuevo Colegio',
        documentId: '20987654321',
        adminEmail: 'director@nuevo.pe',
      } as any),
    ).rejects.toThrow(new AppError('Indica la contraseña inicial del director.', 400));
  });

  it('rejects a director without first name or paternal last name', async () => {
    vi.mocked(mockRepo.findByDocumentId!).mockResolvedValue(null);

    await expect(
      service.createSchool({
        name: 'Nuevo Colegio',
        documentId: '20987654321',
        adminEmail: 'director@nuevo.pe',
        adminPassword: 'Password123!',
        adminFirstName: 'Ana',
      } as any),
    ).rejects.toThrow(new AppError('Indica el nombre y el apellido paterno del director.', 400));
  });

  it('creates school successfully when validations pass', async () => {
    vi.mocked(mockRepo.findByDocumentId!).mockResolvedValue(null);
    vi.mocked(mockRepo.findUserByEmail!).mockResolvedValue(null);
    vi.mocked(mockRepo.create!).mockResolvedValue({
      id: 'sch-new',
      name: 'Nuevo Colegio',
      documentId: '20987654321',
      monthlyFee: 350,
      planExpiresAt: null,
      plan: 'PRO',
    } as any);

    const result = await service.createSchool({
      name: 'Nuevo Colegio',
      documentId: '20987654321',
      adminEmail: 'director@nuevo.pe',
      adminPassword: 'Password123!',
      adminFirstName: 'Ana',
      adminLastNamePaternal: 'Paz',
    } as any);

    expect(result.id).toBe('sch-new');
    expect(mockRepo.create).toHaveBeenCalled();
  });
});

