import { Router, Request, Response } from 'express';
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

export const uploadRouter = Router();

const STAFF_ROLES = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'];
const FAMILY_ROLES = ['PARENT', 'STUDENT'];
const MAX_STAFF_BYTES = 30 * 1024 * 1024;
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

uploadRouter.use(authMiddleware, tenantMiddleware);

uploadRouter.post(
  ['/material', '/materials'],
  authorizeRoles(...STAFF_ROLES, ...FAMILY_ROLES),
  upload.single('file'),
  async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) throw new AppError('No se ha subido ningún archivo.', 400);

    const user = req.user!;
    const isFamily = FAMILY_ROLES.includes(user.role);

    try {
      if (isFamily && file.size > MAX_FAMILY_BYTES) {
        throw new AppError('El archivo supera el máximo de 15 MB permitido para entregas.', 413);
      }
      await assertFileSignature(file.path, path.extname(file.originalname).toLowerCase());

      const uploadedById = user.studentId ?? user.userId;
      await fileStorageService.assertDailyQuota(user.schoolId, uploadedById, isFamily ? DAILY_QUOTA_FAMILY : DAILY_QUOTA_STAFF);

      const requestedPurpose = (req.body as { purpose?: string }).purpose;
      const purpose: FilePurpose = isFamily
        ? 'HOMEWORK_SUBMISSION'
        : requestedPurpose === 'HOMEWORK_SUBMISSION'
          ? 'HOMEWORK_SUBMISSION'
          : 'COURSE_MATERIAL';

      const stored = await fileStorageService.store({
        schoolId: user.schoolId,
        uploadedById,
        uploaderRole: user.role,
        purpose,
        tempPath: file.path,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
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
    }
  },
);
