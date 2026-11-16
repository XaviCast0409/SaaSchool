import { Router, type Request, type Response, type NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { AppError } from '../../core/errors/app-error';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';
import { recordAudit } from '../../utils/audit.util';
import { assertFileSignature } from '../uploads/file-signature.util';
import { fileStorageService, type FilePurpose } from './file-storage.service';
import { cleanupOptimized, IMAGE_MAX_SIZE, optimizeImage, type OptimizedImage } from './image-optimizer';
import {
  buildPublicMediaUrl,
  parsePublicMediaUrl,
  PUBLIC_IMAGE_EXTENSIONS,
  PUBLIC_IMAGE_MIME,
  type PublicMediaKind,
} from './public-media.rules';

/**
 * Logo del colegio y foto de perfil del personal.
 *   POST/DELETE /api/media/school-logo      — Dirección (o soporte en modo colegio)
 *   POST/DELETE /api/media/me/avatar        — cada docente / personal, su propia foto
 *   POST/DELETE /api/media/users/:id/avatar — Dirección, la foto de alguien de su personal
 */
export const profileMediaRouter = Router();

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const DAILY_QUOTA = 30;
const STAFF_ROLES = ['SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'] as const;

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, os.tmpdir()),
    filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (PUBLIC_IMAGE_EXTENSIONS.has(ext) && PUBLIC_IMAGE_MIME.test(file.mimetype)) cb(null, true);
    else cb(new AppError('Usa una imagen JPG, PNG o WEBP.', 400));
  },
});

/** multer con mensajes claros (el tamaño excedido llega como MulterError, no como AppError). */
const singleImage = (req: Request, res: Response, next: NextFunction): void => {
  upload.single('file')(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      next(new AppError(error.code === 'LIMIT_FILE_SIZE' ? 'La imagen supera 5 MB. Usa una más liviana.' : 'No se pudo leer la imagen.', 400));
      return;
    }
    next(error as Error | undefined);
  });
};

/** Valida y guarda la imagen subida en R2 (o disco local en desarrollo). */
async function storeImage(req: Request, purpose: FilePurpose, maxSize: number) {
  const file = req.file;
  if (!file) throw new AppError('Selecciona una imagen.', 400);
  const user = req.user!;
  let optimized: OptimizedImage | null = null;
  try {
    await assertFileSignature(file.path, path.extname(file.originalname).toLowerCase());
    await fileStorageService.assertDailyQuota(user.schoolId, user.userId, DAILY_QUOTA);
    // Se reduce a WebP (sin metadatos) aunque el navegador ya la haya achicado
    optimized = await optimizeImage({ tempPath: file.path, originalName: file.originalname, maxSize });
    return await fileStorageService.store({
      schoolId: user.schoolId,
      uploadedById: user.userId,
      uploaderRole: user.role,
      purpose,
      tempPath: optimized.tempPath,
      originalName: optimized.originalName,
      mimeType: optimized.mimeType,
      size: optimized.size,
    });
  } finally {
    await fs.promises.unlink(file.path).catch(() => undefined);
    await cleanupOptimized(optimized);
  }
}

/** Envía a la papelera la imagen anterior si era una subida a la plataforma (no una URL externa). */
async function discardPrevious(url: string | null | undefined, kind: PublicMediaKind): Promise<void> {
  const parsed = parsePublicMediaUrl(url);
  if (parsed && parsed.kind === kind) await fileStorageService.softDeleteById(parsed.fileId);
}

profileMediaRouter.use(authMiddleware, tenantMiddleware);

// ─── Logo del colegio ──────────────────────────────────────────────────────────

profileMediaRouter.post('/school-logo', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'), singleImage, async (req: Request, res: Response) => {
  const schoolId = req.user!.schoolId;
  const stored = await storeImage(req, 'SCHOOL_ASSET', IMAGE_MAX_SIZE.logo);
  const before = await prisma.school.findUniqueOrThrow({ where: { id: schoolId }, select: { logoUrl: true } });
  const logoUrl = buildPublicMediaUrl(env.PUBLIC_API_URL, 'logos', schoolId, stored.id);
  await prisma.school.update({ where: { id: schoolId }, data: { logoUrl } });
  await discardPrevious(before.logoUrl, 'logos');
  recordAudit(req, { action: 'SCHOOL_LOGO_UPDATED', entity: 'School', entityId: schoolId, before: { logo: before.logoUrl }, after: { logo: logoUrl } });
  res.status(200).json({ status: 'success', data: { logoUrl } });
});

profileMediaRouter.delete('/school-logo', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'), async (req: Request, res: Response) => {
  const schoolId = req.user!.schoolId;
  const before = await prisma.school.findUniqueOrThrow({ where: { id: schoolId }, select: { logoUrl: true } });
  await prisma.school.update({ where: { id: schoolId }, data: { logoUrl: null } });
  await discardPrevious(before.logoUrl, 'logos');
  recordAudit(req, { action: 'SCHOOL_LOGO_UPDATED', entity: 'School', entityId: schoolId, before: { logo: before.logoUrl }, after: { logo: null } });
  res.status(200).json({ status: 'success', data: { logoUrl: null } });
});

// ─── Foto de perfil del personal ──────────────────────────────────────────────

async function findStaff(schoolId: string, userId: string) {
  const person = await prisma.user.findFirst({ where: { id: userId, schoolId }, select: { id: true, role: true, avatarUrl: true } });
  if (!person || !(STAFF_ROLES as readonly string[]).includes(person.role)) {
    throw new AppError('Solo el personal del colegio (docentes, dirección y secretaría) puede tener foto de perfil.', 404);
  }
  return person;
}

async function setAvatar(req: Request, res: Response, userId: string): Promise<void> {
  const schoolId = req.user!.schoolId;
  const person = await findStaff(schoolId, userId);
  const stored = await storeImage(req, 'PROFILE_PHOTO', IMAGE_MAX_SIZE.avatar);
  const avatarUrl = buildPublicMediaUrl(env.PUBLIC_API_URL, 'avatars', person.id, stored.id);
  await prisma.user.update({ where: { id: person.id }, data: { avatarUrl } });
  await discardPrevious(person.avatarUrl, 'avatars');
  recordAudit(req, { action: 'USER_AVATAR_UPDATED', entity: 'User', entityId: person.id, after: { foto: 'actualizada' } });
  res.status(200).json({ status: 'success', data: { avatarUrl } });
}

async function removeAvatar(req: Request, res: Response, userId: string): Promise<void> {
  const person = await findStaff(req.user!.schoolId, userId);
  await prisma.user.update({ where: { id: person.id }, data: { avatarUrl: null } });
  await discardPrevious(person.avatarUrl, 'avatars');
  recordAudit(req, { action: 'USER_AVATAR_UPDATED', entity: 'User', entityId: person.id, after: { foto: 'eliminada' } });
  res.status(200).json({ status: 'success', data: { avatarUrl: null } });
}

profileMediaRouter.post('/me/avatar', authorizeRoles(...STAFF_ROLES), singleImage, (req: Request, res: Response) => setAvatar(req, res, req.user!.userId));
profileMediaRouter.delete('/me/avatar', authorizeRoles(...STAFF_ROLES), (req: Request, res: Response) => removeAvatar(req, res, req.user!.userId));

profileMediaRouter.post('/users/:id/avatar', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'), singleImage, (req: Request, res: Response) =>
  setAvatar(req, res, z.string().uuid().parse(req.params.id)),
);
profileMediaRouter.delete('/users/:id/avatar', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'), (req: Request, res: Response) =>
  removeAvatar(req, res, z.string().uuid().parse(req.params.id)),
);
