/**
 * Reduce una imagen en el navegador antes de subirla: las fotos del celular pesan varios MB
 * y para un logo o una foto de perfil basta con unos cientos de píxeles.
 */
export const ACCEPTED_IMAGE_TYPES = 'image/png,image/jpeg,image/webp';
export const isAcceptedImage = (file: File): boolean => /^image\/(png|jpeg|webp)$/.test(file.type);

const loadImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen.'));
    };
    img.src = url;
  });

interface ResizeOptions {
  /** Lado mayor máximo en píxeles. */
  maxSize: number;
  /** Recorta al centro en un cuadrado (fotos de perfil). */
  square?: boolean;
}

export async function resizeImage(file: File, { maxSize, square = false }: ResizeOptions): Promise<File> {
  const img = await loadImage(file);
  const srcW = img.naturalWidth;
  const srcH = img.naturalHeight;

  // Zona de origen: completa, o el cuadrado central
  const side = Math.min(srcW, srcH);
  const sx = square ? (srcW - side) / 2 : 0;
  const sy = square ? (srcH - side) / 2 : 0;
  const sw = square ? side : srcW;
  const sh = square ? side : srcH;

  const scale = Math.min(1, maxSize / Math.max(sw, sh));
  const width = Math.max(1, Math.round(sw * scale));
  const height = Math.max(1, Math.round(sh * scale));

  // Ya es pequeña y no hay que recortar: se sube tal cual
  if (scale === 1 && !square && file.size < 600 * 1024) return file;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);

  // PNG y WEBP pueden tener transparencia (logos): se conserva; las fotos van en JPEG
  const keepsAlpha = file.type === 'image/png' || file.type === 'image/webp';
  const type = keepsAlpha ? 'image/png' : 'image/jpeg';
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.88));
  if (!blob) return file;
  const base = file.name.replace(/\.[^.]+$/, '') || 'imagen';
  return new File([blob], `${base}.${keepsAlpha ? 'png' : 'jpg'}`, { type });
}

/**
 * Comprime una foto o captura antes de subirla como material, tarea, voucher o justificación:
 * lado mayor `maxSize` px y formato WebP (JPEG si el navegador no sabe generar WebP).
 * Si no es una imagen, o si el resultado no pesa menos, devuelve el archivo original.
 * El servidor vuelve a optimizarla igual, así que un fallo aquí nunca bloquea la subida.
 */
export async function compressImageForUpload(file: File, maxSize = 1920): Promise<File> {
  if (!isAcceptedImage(file)) return file;
  try {
    const img = await loadImage(file);
    const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
    // Ya es pequeña y liviana: no vale la pena recodificarla
    if (scale === 1 && file.size < 300 * 1024) return file;

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const toBlob = (type: string, quality: number) =>
      new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
    let blob = await toBlob('image/webp', 0.8);
    // Safari antiguo ignora WebP y devuelve PNG (más pesado): se usa JPEG en su lugar
    if (!blob || blob.type !== 'image/webp') blob = await toBlob('image/jpeg', 0.82);
    if (!blob || blob.size >= file.size) return file;

    const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
    const base = file.name.replace(/\.[^.]+$/, '') || 'imagen';
    return new File([blob], `${base}.${ext}`, { type: blob.type });
  } catch {
    return file;
  }
}
