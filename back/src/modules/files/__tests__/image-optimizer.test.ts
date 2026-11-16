import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../config/env', () => ({ env: {} }));

import { cleanupOptimized, isOptimizableImage, optimizeImage, toWebpFileName, type OptimizedImage } from '../image-optimizer';

const created: string[] = [];
const tmp = (ext: string) => {
  const p = path.join(os.tmpdir(), `${crypto.randomUUID()}${ext}`);
  created.push(p);
  return p;
};

afterEach(async () => {
  await Promise.all(created.splice(0).map((p) => fs.promises.unlink(p).catch(() => undefined)));
});

/** Foto "de celular": 4000×3000 con ruido (no comprime fácil) y EXIF con GPS. */
async function makePhoto(): Promise<string> {
  const width = 4000;
  const height = 3000;
  const raw = crypto.randomBytes(width * height * 3);
  const p = tmp('.jpg');
  await sharp(raw, { raw: { width, height, channels: 3 } })
    .jpeg({ quality: 95 })
    .withExif({ IFD0: { Make: 'Phone' }, IFD3: { GPSLatitudeRef: 'S', GPSLatitude: '12/1 2/1 0/1' } })
    .toFile(p);
  return p;
}

describe('image-optimizer', () => {
  it('reconoce las extensiones de imagen', () => {
    expect(isOptimizableImage('Foto.JPG')).toBe(true);
    expect(isOptimizableImage('captura.png')).toBe(true);
    expect(isOptimizableImage('tarea.pdf')).toBe(false);
    expect(isOptimizableImage('sin-extension')).toBe(false);
  });

  it('cambia la extensión a .webp conservando el nombre', () => {
    expect(toWebpFileName('voucher de pago.JPEG')).toBe('voucher de pago.webp');
    expect(toWebpFileName('.png')).toBe('.png.webp');
  });

  it('reduce tamaño, dimensiones y elimina el EXIF', async () => {
    const input = await makePhoto();
    const before = (await fs.promises.stat(input)).size;
    let out: OptimizedImage | null = null;
    try {
      out = await optimizeImage({ tempPath: input, originalName: 'foto.jpg', maxSize: 1920 });
      const meta = await sharp(out.tempPath).metadata();
      expect(meta.format).toBe('webp');
      expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBe(1920);
      expect(meta.exif).toBeUndefined();
      expect(out.size).toBeLessThan(before / 2);
      expect(out.mimeType).toBe('image/webp');
      expect(out.originalName).toBe('foto.webp');
    } finally {
      await cleanupOptimized(out);
    }
    if (out) expect(fs.existsSync(out.tempPath)).toBe(false);
  });

  it('no agranda imágenes pequeñas', async () => {
    const input = tmp('.png');
    await sharp({ create: { width: 200, height: 100, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toFile(input);
    const out = await optimizeImage({ tempPath: input, originalName: 'logo.png', maxSize: 512 });
    created.push(out.tempPath);
    const meta = await sharp(out.tempPath).metadata();
    expect(meta.width).toBe(200);
    expect(meta.hasAlpha).toBe(true);
  });

  it('rechaza imágenes con demasiados megapíxeles', async () => {
    const input = tmp('.png');
    // 8000×6000 = 48 MP (de un solo color: pesa poco en disco, pero abierta ocuparía mucha memoria)
    await sharp({ create: { width: 8000, height: 6000, channels: 3, background: '#fff' } }).png().toFile(input);
    await expect(optimizeImage({ tempPath: input, originalName: 'enorme.png', maxSize: 1920 })).rejects.toThrow('megapíxeles');
  });

  it('rechaza una imagen dañada con un error claro', async () => {
    const input = tmp('.jpg');
    await fs.promises.writeFile(input, Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), crypto.randomBytes(500)]));
    await expect(optimizeImage({ tempPath: input, originalName: 'x.jpg', maxSize: 1920 })).rejects.toThrow('No se pudo procesar la imagen');
    expect(fs.existsSync(`${input}.opt.webp`)).toBe(false);
  });
});
