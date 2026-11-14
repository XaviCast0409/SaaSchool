import { Router, Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { extractStoredFileId, fileStorageService } from '../files/file-storage.service';
import { isValidSlug, normalizeSlug } from './school-slug.rules';

/**
 * RUTAS PÚBLICAS INTENCIONALES (sin sesión): página de ingreso de cada colegio.
 * Solo exponen lo que el colegio decidió mostrar en su login (nombre, logo, color, fondo y mensaje).
 * Nunca RUC, plan, contactos ni datos de personas.
 */
export const schoolLoginPageRouter = Router();

const NOT_FOUND_MESSAGE = 'No encontramos un colegio con ese código. Verifícalo con tu colegio.';
const IMAGE_MIME = /^image\/(png|jpeg|webp)$/;

async function loadBySlug(rawSlug: string) {
  const slug = normalizeSlug(rawSlug);
  if (!isValidSlug(slug)) throw new AppError(NOT_FOUND_MESSAGE, 404);
  const school = await prisma.school.findFirst({
    where: { slug, isActive: true },
    select: {
      name: true,
      slug: true,
      logoUrl: true,
      brandColor: true,
      loginBackgroundUrl: true,
      loginTitle: true,
      loginMessage: true,
    },
  });
  if (!school) throw new AppError(NOT_FOUND_MESSAGE, 404);
  return school;
}

/** GET /api/public/login-pages/:slug — marca del colegio para su página de ingreso. */
schoolLoginPageRouter.get('/:slug', async (req: Request, res: Response) => {
  const school = await loadBySlug(String(req.params.slug));
  const backgroundId = extractStoredFileId(school.loginBackgroundUrl);
  // Sin caché del navegador: lo que el director cambia se ve al instante (la imagen sí se cachea)
  res.setHeader('Cache-Control', 'no-cache');
  res.status(200).json({
    status: 'success',
    data: {
      name: school.name,
      slug: school.slug,
      logoUrl: school.logoUrl,
      brandColor: school.brandColor,
      loginTitle: school.loginTitle,
      loginMessage: school.loginMessage,
      // El id del archivo en la ruta sirve para invalidar la caché cuando cambia el fondo
      backgroundPath: backgroundId ? `/public/login-pages/${school.slug}/background/${backgroundId}` : null,
    },
  });
});

/** GET /api/public/login-pages/:slug/background/:fileId — imagen de fondo publicada por el colegio. */
schoolLoginPageRouter.get('/:slug/background/:fileId', async (req: Request, res: Response) => {
  const school = await loadBySlug(String(req.params.slug));
  const currentId = extractStoredFileId(school.loginBackgroundUrl);
  // Solo se entrega el fondo vigente: un id distinto (o adivinado) no abre otros archivos
  if (!currentId || currentId !== String(req.params.fileId).toLowerCase()) {
    throw new AppError('Imagen no encontrada.', 404);
  }
  const file = await fileStorageService.getById(currentId);
  if (!IMAGE_MIME.test(file.mimeType)) throw new AppError('Imagen no encontrada.', 404);

  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Disposition', 'inline');

  const stream = await fileStorageService.openStream(file);
  stream.on('error', (error) => {
    console.error('[LoginPage] Error al transmitir el fondo', currentId, error);
    if (!res.headersSent) res.status(502).end();
    else res.destroy();
  });
  stream.pipe(res);
});
