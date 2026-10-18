import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authMiddleware } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';
import { AppError } from '../../core/errors/app-error';
import { googleDriveService } from './google-drive.service';

export const uploadRouter = Router();

const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'materials');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Almacenamiento en memoria para transmitir directamente a Drive sin saturar el disco
const storage = multer.memoryStorage();

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

    let fileUrl: string;
    let storageUsed: 'GOOGLE_DRIVE' | 'LOCAL' = 'LOCAL';

    // 1. Si Google Drive está configurado, transmitir a Drive (0 saturación de disco)
    console.log('[Upload] Verificando Google Drive... isConfigured:', googleDriveService.isConfigured());
    if (googleDriveService.isConfigured()) {
      try {
        const driveResult = await googleDriveService.uploadFile(
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype
        );
        console.log('[Upload] Archivo subido exitosamente a Google Drive:', driveResult.fileId);
        fileUrl = driveResult.downloadUrl;
        storageUsed = 'GOOGLE_DRIVE';
      } catch (driveErr) {
        console.error('[Upload] Error al subir a Google Drive, usando almacenamiento local de respaldo:', driveErr);
        fileUrl = saveFileLocally(req.file);
      }
    } else {
      console.log('[Upload] Google Drive no configurado, guardando localmente.');
      fileUrl = saveFileLocally(req.file);
    }

    res.status(201).json({
      status: 'success',
      data: {
        url: fileUrl,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        storage: storageUsed,
      },
    });
  },
);

function saveFileLocally(file: Express.Multer.File): string {
  const ext = path.extname(file.originalname).toLowerCase();
  const safeBaseName = path
    .basename(file.originalname, ext)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 40);
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  const filename = `${safeBaseName}-${uniqueSuffix}${ext}`;
  const filePath = path.join(UPLOADS_DIR, filename);

  fs.writeFileSync(filePath, file.buffer);
  return `/uploads/materials/${filename}`;
}

