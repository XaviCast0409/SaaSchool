import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { fileStorageService } from './file-storage.service';
import { isCurrentPublicMedia, PUBLIC_IMAGE_MIME, type PublicMediaKind } from './public-media.rules';

/**
 * RUTAS PÚBLICAS INTENCIONALES (sin sesión): logo del colegio y foto de perfil del personal.
 * Se muestran en el panel, en documentos impresos y en las páginas públicas del colegio.
 * Solo se entrega la imagen vigente del dueño indicado en la URL.
 */
export const publicMediaRouter = Router();

const NOT_FOUND = 'Imagen no encontrada.';
const uuid = z.string().uuid();

async function sendImage(res: Response, fileId: string): Promise<void> {
  const file = await fileStorageService.getById(fileId);
  if (!PUBLIC_IMAGE_MIME.test(file.mimeType)) throw new AppError(NOT_FOUND, 404);

  res.setHeader('Content-Type', file.mimeType);
  // El id del archivo cambia con cada imagen nueva: se puede cachear sin miedo
  res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Disposition', 'inline');

  const stream = await fileStorageService.openStream(file);
  stream.on('error', (error) => {
    console.error('[PublicMedia] Error al transmitir la imagen', fileId, error);
    if (!res.headersSent) res.status(502).end();
    else res.destroy();
  });
  stream.pipe(res);
}

function parseParams(req: Request): { ownerId: string; fileId: string } {
  const ownerId = uuid.safeParse(req.params.ownerId);
  const fileId = uuid.safeParse(req.params.fileId);
  if (!ownerId.success || !fileId.success) throw new AppError(NOT_FOUND, 404);
  return { ownerId: ownerId.data.toLowerCase(), fileId: fileId.data.toLowerCase() };
}

async function assertCurrent(kind: PublicMediaKind, ownerId: string, fileId: string): Promise<void> {
  const storedUrl =
    kind === 'logos'
      ? (await prisma.school.findFirst({ where: { id: ownerId, isActive: true }, select: { logoUrl: true } }))?.logoUrl
      : (await prisma.user.findFirst({ where: { id: ownerId, isActive: true }, select: { avatarUrl: true } }))?.avatarUrl;
  if (!isCurrentPublicMedia(storedUrl, kind, ownerId, fileId)) throw new AppError(NOT_FOUND, 404);
}

/** GET /api/public/media/logos/:schoolId/:fileId — logo vigente del colegio. */
publicMediaRouter.get('/logos/:ownerId/:fileId', async (req: Request, res: Response) => {
  const { ownerId, fileId } = parseParams(req);
  await assertCurrent('logos', ownerId, fileId);
  await sendImage(res, fileId);
});

/** GET /api/public/media/avatars/:userId/:fileId — foto de perfil vigente de una persona del personal. */
publicMediaRouter.get('/avatars/:ownerId/:fileId', async (req: Request, res: Response) => {
  const { ownerId, fileId } = parseParams(req);
  await assertCurrent('avatars', ownerId, fileId);
  await sendImage(res, fileId);
});
