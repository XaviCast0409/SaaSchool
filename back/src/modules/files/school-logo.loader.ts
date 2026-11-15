import { fileStorageService } from './file-storage.service';
import { parsePublicMediaUrl } from './public-media.rules';

export interface LogoImage {
  buffer: Buffer;
  extension: 'png' | 'jpeg';
  width: number;
  height: number;
}

const MAX_LOGO_BYTES = 3 * 1024 * 1024;

/** Ancho y alto leyendo la cabecera del PNG o los marcadores SOF del JPEG (sin librerías). */
export function imageSize(buffer: Buffer, extension: 'png' | 'jpeg'): { width: number; height: number } | null {
  if (extension === 'png') {
    if (buffer.length < 24) return null;
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) return null;
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    // SOF0..SOF15 salvo DHT (C4), JPG (C8) y DAC (CC)
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  return null;
}

/**
 * Logo del colegio para incrustarlo en documentos generados en el servidor (Excel).
 * Solo se leen logos subidos a la plataforma, desde el propio almacenamiento: nunca se
 * descargan URLs externas (evita que el servidor haga peticiones a direcciones arbitrarias).
 */
export async function loadSchoolLogo(logoUrl?: string | null): Promise<LogoImage | null> {
  const media = parsePublicMediaUrl(logoUrl);
  if (!media || media.kind !== 'logos') return null;
  try {
    const file = await fileStorageService.getById(media.fileId);
    const extension = file.mimeType === 'image/png' ? 'png' : file.mimeType === 'image/jpeg' ? 'jpeg' : null;
    if (!extension || file.size > MAX_LOGO_BYTES) return null;

    const stream = await fileStorageService.openStream(file);
    const chunks: Buffer[] = [];
    for await (const chunk of stream as AsyncIterable<Buffer | string>) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    const buffer = Buffer.concat(chunks);
    const size = imageSize(buffer, extension);
    if (!size || !size.width || !size.height) return null;
    return { buffer, extension, ...size };
  } catch (error) {
    console.error('[Logo] No se pudo leer el logo del colegio', media.fileId, error);
    return null;
  }
}
