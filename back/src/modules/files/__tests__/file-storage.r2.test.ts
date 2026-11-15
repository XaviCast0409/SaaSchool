import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  env: { NODE_ENV: 'production', FILE_STORAGE: undefined as undefined | 'r2' | 'drive' | 'local' },
  r2: {
    isConfigured: vi.fn(() => true),
    upload: vi.fn(async () => undefined),
    getStream: vi.fn(async () => 'r2-stream'),
    moveToTrash: vi.fn(async () => undefined),
  },
  drive: {
    isConfigured: vi.fn(() => true),
    uploadPrivateFile: vi.fn(async () => 'drive-id'),
    getFileStream: vi.fn(async () => 'drive-stream'),
    trashFile: vi.fn(async () => undefined),
  },
  prisma: {
    storedFile: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: data.id ?? 'generated', ...data })),
      update: vi.fn(),
    },
  },
}));

vi.mock('../../../config/env', () => ({ env: mocks.env }));
vi.mock('../../../config/prisma', () => ({ prisma: mocks.prisma }));
vi.mock('../r2-storage.service', () => ({ r2StorageService: mocks.r2 }));
vi.mock('../../uploads/google-drive.service', () => ({ googleDriveService: mocks.drive }));

import { FileStorageService } from '../file-storage.service';

const input = {
  schoolId: 'school-1',
  uploadedById: 'user-1',
  uploaderRole: 'TEACHER',
  purpose: 'COURSE_MATERIAL' as const,
  tempPath: '/tmp/x',
  originalName: 'Guía de práctica.PDF',
  mimeType: 'application/pdf',
  size: 1234,
};

describe('archivos en R2', () => {
  const service = new FileStorageService();

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.env.FILE_STORAGE = undefined;
    mocks.r2.isConfigured.mockReturnValue(true);
  });

  it('con R2 configurado, el archivo nuevo va a R2 con una clave por colegio', async () => {
    const stored = await service.store(input);
    expect(mocks.drive.uploadPrivateFile).not.toHaveBeenCalled();
    const { objectKey } = (mocks.r2.upload.mock.calls[0] as unknown as [{ objectKey: string }])[0];
    expect(objectKey).toMatch(new RegExp(`^school-1/\\d{4}/COURSE_MATERIAL/${stored.id}\\.pdf$`));
    expect(stored).toMatchObject({ storage: 'R2', objectKey, fileName: 'Guía de práctica.PDF', size: 1234 });
  });

  it('con FILE_STORAGE=drive sigue usando Drive', async () => {
    mocks.env.FILE_STORAGE = 'drive';
    const stored = await service.store(input);
    expect(mocks.r2.upload).not.toHaveBeenCalled();
    expect(stored).toMatchObject({ storage: 'GOOGLE_DRIVE', driveFileId: 'drive-id' });
  });

  it('si la subida a R2 falla, no se registra el archivo', async () => {
    mocks.r2.upload.mockRejectedValueOnce(new Error('caído'));
    await expect(service.store(input)).rejects.toThrow();
    expect(mocks.prisma.storedFile.create).not.toHaveBeenCalled();
  });

  it('lee cada archivo desde donde está guardado', async () => {
    const r2File = { storage: 'R2', objectKey: 'k' } as never;
    const driveFile = { storage: 'GOOGLE_DRIVE', driveFileId: 'd' } as never;
    expect(await service.openStream(r2File)).toBe('r2-stream');
    expect(await service.openStream(driveFile)).toBe('drive-stream');
  });

  it('al borrar, el objeto de R2 va a la papelera', async () => {
    mocks.prisma.storedFile.update.mockResolvedValueOnce({ storage: 'R2', objectKey: 'school-1/2026/OTHER/a.pdf' });
    await service.softDeleteByUrl('/api/files/123e4567-e89b-12d3-a456-426614174000');
    expect(mocks.r2.moveToTrash).toHaveBeenCalledWith('school-1/2026/OTHER/a.pdf');
    expect(mocks.drive.trashFile).not.toHaveBeenCalled();
  });
});
