import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { env } from '../../config/env';
import { AppError } from '../../core/errors/app-error';
import { createConcurrencyLimit, resolveImageConcurrency } from './concurrency-limit';

/**
 * Reduce el peso de las imágenes antes de guardarlas en R2.
 * Las fotos del celular pesan 3–8 MB; redimensionadas y en WebP quedan en unos cientos de KB.
 * Además se eliminan los metadatos EXIF (incluida la ubicación GPS de la foto).
 */
export const OPTIMIZABLE_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

/** Lado mayor máximo (px) según el uso de la imagen. */
export const IMAGE_MAX_SIZE = {
  /** Material, tareas, vouchers, justificaciones: el texto debe seguir siendo legible. */
  document: 1920,
  logo: 512,
  avatar: 400,
} as const;

const WEBP_QUALITY = 80;

/**
 * Tope de megapíxeles de la imagen que llega al servidor. Normalmente el navegador ya la redujo
 * a 1920 px (~3 MP); esto solo frena imágenes gigantes sin comprimir (o hechas a propósito)
 * que podrían agotar la memoria del servidor. Una foto de celular estándar tiene 12–24 MP.
 */
export const MAX_INPUT_MEGAPIXELS = 40;

// Sin caché de archivos: si no, sharp deja abiertos los temporales y en Windows no se pueden borrar
sharp.cache({ files: 0 });

/** Cuántas imágenes se procesan a la vez (IMAGE_CONCURRENCY); las demás esperan su turno. */
export const IMAGE_CONCURRENCY = resolveImageConcurrency(env.IMAGE_CONCURRENCY);
const limit = createConcurrencyLimit(IMAGE_CONCURRENCY);

const isPixelLimitError = (error: unknown): boolean => /pixel limit/i.test((error as Error)?.message ?? '');

export const isOptimizableImage = (fileName: string): boolean =>
  OPTIMIZABLE_IMAGE_EXTENSIONS.has(path.extname(fileName).toLowerCase());

/** "foto del voucher.JPG" → "foto del voucher.webp" */
export const toWebpFileName = (fileName: string): string => {
  const base = path.basename(fileName, path.extname(fileName)) || 'imagen';
  return `${base}.webp`;
};

export interface OptimizedImage {
  tempPath: string;
  originalName: string;
  mimeType: string;
  size: number;
}

/**
 * Convierte la imagen a WebP con el lado mayor limitado a `maxSize`.
 * Crea un archivo temporal nuevo; quien llama debe borrarlo después (ver `cleanup`).
 */
export function optimizeImage(input: { tempPath: string; originalName: string; maxSize: number }): Promise<OptimizedImage> {
  return limit(() => processImage(input));
}

async function processImage(input: { tempPath: string; originalName: string; maxSize: number }): Promise<OptimizedImage> {
  const outPath = `${input.tempPath}.opt.webp`;
  try {
    const info = await sharp(input.tempPath, { failOn: 'error', limitInputPixels: MAX_INPUT_MEGAPIXELS * 1_000_000 })
      .rotate() // respeta la orientación EXIF antes de descartar los metadatos
      .resize({ width: input.maxSize, height: input.maxSize, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY, effort: 4 })
      .toFile(outPath);
    return {
      tempPath: outPath,
      originalName: toWebpFileName(input.originalName),
      mimeType: 'image/webp',
      size: info.size,
    };
  } catch (error) {
    await fs.promises.unlink(outPath).catch(() => undefined);
    if (isPixelLimitError(error)) {
      throw new AppError(`La imagen tiene una resolución demasiado grande (más de ${MAX_INPUT_MEGAPIXELS} megapíxeles). Usa una más pequeña.`, 413);
    }
    console.warn('[Images] No se pudo optimizar', input.originalName, error);
    throw new AppError('No se pudo procesar la imagen. Verifica que no esté dañada o usa otra.', 400);
  }
}

/** Borra el temporal generado por `optimizeImage` (no lanza errores). */
export const cleanupOptimized = async (image: OptimizedImage | null): Promise<void> => {
  if (image) await fs.promises.unlink(image.tempPath).catch(() => undefined);
};
