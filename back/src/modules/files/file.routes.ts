import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { env } from '../../config/env';
import { AppError } from '../../core/errors/app-error';
import { authMiddleware } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';
import { fileStorageService } from './file-storage.service';

export const fileRouter = Router();

const SIGNED_URL_TTL_SECONDS = 600;
const INLINE_MIME = /^(application\/pdf|image\/(png|jpeg|webp))$/;

const sign = (id: string, exp: number): string =>
  crypto.createHmac('sha256', env.FILES_SIGNING_SECRET).update(`${id}.${exp}`).digest('base64url');

/**
 * GET /api/files/:id/link — (autenticado) genera una URL firmada válida por 10 minutos.
 */
fileRouter.get('/:id/link', authMiddleware, tenantMiddleware, async (req: Request, res: Response) => {
  const file = await fileStorageService.getForSchool(String(req.params.id), req.user!.schoolId);
  const exp = Math.floor(Date.now() / 1000) + SIGNED_URL_TTL_SECONDS;
  const url = `${env.PUBLIC_API_URL.replace(/\/$/, '')}/api/files/${file.id}/content?exp=${exp}&sig=${sign(file.id, exp)}`;
  res.status(200).json({
    status: 'success',
    data: {
      url,
      downloadUrl: `${url}&download=1`,
      expiresAt: new Date(exp * 1000).toISOString(),
      fileName: file.fileName,
      mimeType: file.mimeType,
    },
  });
});

/**
 * GET /api/files/:id/content?exp=&sig=[&download=1] — entrega el archivo si la firma es válida.
 */
fileRouter.get('/:id/content', async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const exp = Number(req.query.exp);
  const sig = String(req.query.sig ?? '');

  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) {
    throw new AppError('El enlace del archivo expiró. Vuelve a abrirlo desde la plataforma.', 410);
  }
  const provided = Buffer.from(sig);
  const expected = Buffer.from(sign(id, exp));
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    throw new AppError('Enlace de archivo inválido.', 403);
  }

  const file = await fileStorageService.getById(id);
  const inline = INLINE_MIME.test(file.mimeType) && req.query.download !== '1';
  const frameAncestors = env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean).join(' ');

  res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(file.fileName)}`);
  res.setHeader('Cache-Control', 'private, max-age=600');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.removeHeader('X-Frame-Options');
  res.setHeader('Content-Security-Policy', `frame-ancestors 'self' ${frameAncestors}`);

  const stream = await fileStorageService.openStream(file);
  stream.on('error', (error) => {
    console.error('[Files] Error al transmitir archivo', id, error);
    if (!res.headersSent) {
      res.status(502).end();
    } else {
      res.destroy();
    }
  });
  stream.pipe(res);
});
