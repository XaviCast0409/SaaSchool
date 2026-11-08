import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { authMiddleware } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';
import { AppError } from '../../core/errors/app-error';
import { googleDriveService } from './google-drive.service';

export const uploadRouter = Router();

const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'materials');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Almacenamiento en disco temporal (os.tmpdir) para cero consumo de RAM
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, os.tmpdir());
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
  ['/material', '/materials'],
  upload.single('file'),
  async (req: Request, res: Response) => {
    if (!req.file) {
      throw new AppError('No se ha subido ningún archivo.', 400);
    }

    const tempFilePath = req.file.path;
    let fileUrl: string;
    let viewUrl: string | undefined;
    let storageUsed: 'GOOGLE_DRIVE' | 'LOCAL' = 'LOCAL';

    // 1. Si Google Drive está configurado, transmitir a Drive vía Stream desde disco
    if (googleDriveService.isConfigured()) {
      try {
        const driveResult = await googleDriveService.uploadFile(
          tempFilePath,
          req.file.originalname,
          req.file.mimetype
        );
        fileUrl = driveResult.downloadUrl;
        viewUrl = driveResult.viewUrl;
        storageUsed = 'GOOGLE_DRIVE';
      } catch (driveErr) {
        console.error('[Upload] Error al subir a Google Drive, usando almacenamiento local de respaldo:', driveErr);
        fileUrl = await saveFileLocally(req.file);
      }
    } else {
      fileUrl = await saveFileLocally(req.file);
    }

    // Determinar si es un archivo previsualizable (PDF, imágenes, documentos)
    const isPreviewable =
      /pdf|image|document|presentation|sheet|msword|officedocument/i.test(req.file.mimetype) ||
      /\.(pdf|jpg|jpeg|png|webp|pptx|ppt|docx|doc|xlsx|xls)$/i.test(req.file.originalname);

    // Priorizar visor embebido para previsualizaciones para evitar bloqueo por descargas simultáneas masivas
    const primaryUrl = (storageUsed === 'GOOGLE_DRIVE' && isPreviewable && viewUrl) ? viewUrl : fileUrl;

    res.status(201).json({
      status: 'success',
      data: {
        url: primaryUrl,
        viewUrl: viewUrl || primaryUrl,
        downloadUrl: fileUrl,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        storage: storageUsed,
      },
    });
  },
);

async function saveFileLocally(file: Express.Multer.File): Promise<string> {
  const targetPath = path.join(UPLOADS_DIR, file.filename);
  try {
    if (fs.existsSync(file.path)) {
      await fs.promises.copyFile(file.path, targetPath);
    }
    return `/uploads/materials/${file.filename}`;
  } finally {
    await fs.promises.unlink(file.path).catch(() => {});
  }
}


