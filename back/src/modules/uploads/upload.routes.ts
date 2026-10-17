import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authMiddleware } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';
import { AppError } from '../../core/errors/app-error';

export const uploadRouter = Router();

const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'materials');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeBaseName = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 40);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${safeBaseName}-${uniqueSuffix}${ext}`);
  },
});

const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.pptx',
  '.ppt',
  '.docx',
  '.doc',
  '.xlsx',
  '.xls',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.zip',
  '.txt',
]);

const upload = multer({
  storage,
  limits: {
    fileSize: 30 * 1024 * 1024, // Máximo 30 MB por archivo
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.has(ext)) {
      cb(null, true);
    } else {
      cb(new AppError(`Tipo de archivo no permitido (${ext}). Formatos válidos: PDF, PPTX, DOCX, XLSX, imágenes.`, 400));
    }
  },
});

uploadRouter.use(authMiddleware, tenantMiddleware);

uploadRouter.post(
  '/material',
  upload.single('file'),
  (req: Request, res: Response) => {
    if (!req.file) {
      throw new AppError('No se ha subido ningún archivo.', 400);
    }

    const fileUrl = `/uploads/materials/${req.file.filename}`;

    res.status(201).json({
      status: 'success',
      data: {
        url: fileUrl,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
      },
    });
  },
);
