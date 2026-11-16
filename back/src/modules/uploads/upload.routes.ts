import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';
import { AppError } from '../../core/errors/app-error';
import { assertFileSignature } from './file-signature.util';
import { fileStorageService, type FilePurpose } from '../files/file-storage.service';
import { cleanupOptimized, IMAGE_MAX_SIZE, isOptimizableImage, optimizeImage, type OptimizedImage } from '../files/image-optimizer';

export const uploadRouter = Router();

const STAFF_ROLES = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'];
const FAMILY_ROLES = ['PARENT', 'STUDENT'];
/** Tope por archivo. Las imágenes además se reducen (WebP, máx. 1920 px) antes de guardarse. */
const MAX_STAFF_BYTES = 25 * 1024 * 1024;
const MAX_FAMILY_BYTES = 15 * 1024 * 1024;
const DAILY_QUOTA_STAFF = 100;
const DAILY_QUOTA_FAMILY = 20;

const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.pptx', '.ppt', '.docx', '.doc', '.xlsx', '.xls', '.jpg', '.jpeg', '.png', '.webp', '.zip', '.txt',
]);

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, os.tmpdir()),
    filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: MAX_STAFF_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.has(ext)) {
      cb(null, true);
    } else {
      cb(new AppError(`Tipo de archivo no permitido (${ext}). Formatos válidos: PDF, Word, Excel, PowerPoint, imágenes, ZIP o TXT.`, 400));
    }
  },
});

/** multer con un mensaje que indica el límite real de esta ruta. */
const singleFile = (req: Request, res: Response, next: NextFunction): void => {
  upload.single('file')(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      next(new AppError('El archivo supera el máximo de 25 MB. Elige uno más liviano o comprímelo.', 413));
      return;
    }
    next(error as Error | undefined);
  });
};

uploadRouter.use(authMiddleware, tenantMiddleware);

uploadRouter.post(
  ['/material', '/materials'],
  authorizeRoles(...STAFF_ROLES, ...FAMILY_ROLES),
  singleFile,
  async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) throw new AppError('No se ha subido ningún archivo.', 400);

    const user = req.user!;
    const isFamily = FAMILY_ROLES.includes(user.role);
    let optimized: OptimizedImage | null = null;

    try {
      if (isFamily && file.size > MAX_FAMILY_BYTES) {
        throw new AppError('El archivo supera el máximo de 15 MB permitido para entregas.', 413);
      }
      await assertFileSignature(file.path, path.extname(file.originalname).toLowerCase());

      const uploadedById = user.studentId ?? user.userId;
      await fileStorageService.assertDailyQuota(user.schoolId, uploadedById, isFamily ? DAILY_QUOTA_FAMILY : DAILY_QUOTA_STAFF);

      const requestedPurpose = (req.body as { purpose?: string }).purpose;
      // Vouchers de pago: solo imágenes o PDF
      if (requestedPurpose === 'PAYMENT_VOUCHER' && !['.jpg', '.jpeg', '.png', '.webp', '.pdf'].includes(path.extname(file.originalname).toLowerCase())) {
        throw new AppError('El voucher debe ser una foto o captura (JPG, PNG) o un PDF.', 400);
      }
      const purpose: FilePurpose =
        requestedPurpose === 'PAYMENT_VOUCHER'
          ? 'PAYMENT_VOUCHER'
          : isFamily
            ? 'HOMEWORK_SUBMISSION'
            : requestedPurpose === 'HOMEWORK_SUBMISSION'
              ? 'HOMEWORK_SUBMISSION'
              : requestedPurpose === 'SCHOOL_ASSET'
                ? 'SCHOOL_ASSET'
                : 'COURSE_MATERIAL';

      // Imágenes: se redimensionan y se pasan a WebP (sin metadatos) para ocupar menos en R2
      if (isOptimizableImage(file.originalname)) {
        optimized = await optimizeImage({ tempPath: file.path, originalName: file.originalname, maxSize: IMAGE_MAX_SIZE.document });
      }

      const stored = await fileStorageService.store({
        schoolId: user.schoolId,
        uploadedById,
        uploaderRole: user.role,
        purpose,
        tempPath: optimized?.tempPath ?? file.path,
        originalName: optimized?.originalName ?? file.originalname,
        mimeType: optimized?.mimeType ?? file.mimetype,
        size: optimized?.size ?? file.size,
      });

      const url = `/api/files/${stored.id}`;
      res.status(201).json({
        status: 'success',
        data: {
          fileId: stored.id,
          url,
          viewUrl: url,
          downloadUrl: url,
          fileName: stored.fileName,
          fileType: stored.mimeType,
          fileSize: stored.size,
          storage: stored.storage,
        },
      });
    } finally {
      await fs.promises.unlink(file.path).catch(() => undefined);
      await cleanupOptimized(optimized);
    }
  },
);
