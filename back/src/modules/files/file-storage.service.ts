import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { StoredFile } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { AppError } from '../../core/errors/app-error';
import { googleDriveService } from '../uploads/google-drive.service';

const LOCAL_DIR = path.join(process.cwd(), 'storage-local');

export type FilePurpose = 'COURSE_MATERIAL' | 'HOMEWORK_SUBMISSION' | 'OTHER';

const sanitizeFileName = (name: string): string =>
  path.basename(name).replace(/[\u0000-\u001f<>:"/\\|?*]+/g, '_').slice(0, 150) || 'archivo';

export const extractStoredFileId = (url?: string | null): string | null => {
  const match = url?.match(/^\/api\/files\/([0-9a-f-]{36})$/i);
  return match ? match[1] : null;
};

export class FileStorageService {
  async assertDailyQuota(schoolId: string, uploadedById: string, maxPerDay: number): Promise<void> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const count = await prisma.storedFile.count({ where: { schoolId, uploadedById, createdAt: { gte: since } } });
    if (count >= maxPerDay) {
      throw new AppError(`Alcanzaste el límite de ${maxPerDay} archivos por día. Intenta mañana.`, 429);
    }
  }

  async store(input: {
    schoolId: string;
    uploadedById: string;
    uploaderRole: string;
    purpose: FilePurpose;
    tempPath: string;
    originalName: string;
    mimeType: string;
    size: number;
  }): Promise<StoredFile> {
    const fileName = sanitizeFileName(input.originalName);
    const base = {
      schoolId: input.schoolId,
      uploadedById: input.uploadedById,
      uploaderRole: input.uploaderRole,
      purpose: input.purpose,
      fileName,
      mimeType: input.mimeType || 'application/octet-stream',
      size: input.size,
    };

    if (googleDriveService.isConfigured()) {
      const driveFileId = await googleDriveService.uploadPrivateFile({
        tempPath: input.tempPath,
        fileName,
        mimeType: base.mimeType,
        folderPath: [input.schoolId, String(new Date().getFullYear()), input.purpose],
      });
      return prisma.storedFile.create({ data: { ...base, storage: 'GOOGLE_DRIVE', driveFileId } });
    }

    if (env.NODE_ENV === 'production') {
      throw new AppError('El almacenamiento de archivos no está disponible. Intenta nuevamente en unos minutos.', 503);
    }

    await fs.promises.mkdir(LOCAL_DIR, { recursive: true });
    const localName = `${crypto.randomUUID()}${path.extname(fileName).toLowerCase()}`;
    await fs.promises.copyFile(input.tempPath, path.join(LOCAL_DIR, localName));
    return prisma.storedFile.create({ data: { ...base, storage: 'LOCAL', localPath: localName } });
  }

  async getForSchool(id: string, schoolId: string): Promise<StoredFile> {
    const file = await prisma.storedFile.findFirst({ where: { id, schoolId, deletedAt: null } });
    if (!file) throw new AppError('Archivo no encontrado.', 404);
    return file;
  }

  async getById(id: string): Promise<StoredFile> {
    const file = await prisma.storedFile.findFirst({ where: { id, deletedAt: null } });
    if (!file) throw new AppError('Archivo no encontrado.', 404);
    return file;
  }

  async openStream(file: StoredFile): Promise<NodeJS.ReadableStream> {
    if (file.storage === 'GOOGLE_DRIVE' && file.driveFileId) {
      return googleDriveService.getFileStream(file.driveFileId);
    }
    if (file.storage === 'LOCAL' && file.localPath) {
      return fs.createReadStream(path.join(LOCAL_DIR, path.basename(file.localPath)));
    }
    throw new AppError('Archivo no disponible.', 404);
  }

  /** Marca el archivo como eliminado y lo envía a la papelera de Drive. No lanza errores. */
  async softDeleteByUrl(url?: string | null): Promise<void> {
    const id = extractStoredFileId(url);
    if (!id) return;
    try {
      const file = await prisma.storedFile.update({ where: { id }, data: { deletedAt: new Date() } });
      if (file.storage === 'GOOGLE_DRIVE' && file.driveFileId) {
        await googleDriveService.trashFile(file.driveFileId);
      } else if (file.storage === 'LOCAL' && file.localPath) {
        await fs.promises.unlink(path.join(LOCAL_DIR, path.basename(file.localPath))).catch(() => undefined);
      }
    } catch (error) {
      console.error('[Files] No se pudo eliminar el archivo', id, error);
    }
  }
}

export const fileStorageService = new FileStorageService();
