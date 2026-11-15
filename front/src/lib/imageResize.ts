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
