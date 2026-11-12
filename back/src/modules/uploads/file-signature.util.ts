import fs from 'fs';
import { AppError } from '../../core/errors/app-error';

const isJpeg = (b: Buffer): boolean => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
const isZip = (b: Buffer): boolean =>
  b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07);
const OLE_SIGNATURE = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const isOle = (b: Buffer): boolean => b.subarray(0, 8).equals(OLE_SIGNATURE);

const SIGNATURES: Record<string, (b: Buffer) => boolean> = {
  '.pdf': (b) => b.subarray(0, 4).toString('latin1') === '%PDF',
  '.png': (b) => b.subarray(0, 8).equals(PNG_SIGNATURE),
  '.jpg': isJpeg,
  '.jpeg': isJpeg,
  '.webp': (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP',
  '.docx': isZip,
  '.xlsx': isZip,
  '.pptx': isZip,
  '.zip': isZip,
  '.doc': isOle,
  '.xls': isOle,
  '.ppt': isOle,
  '.txt': (b) => !b.includes(0),
};

/** Verifica que el contenido real del archivo corresponda a su extensión (firma o "magic bytes"). */
export async function assertFileSignature(filePath: string, extension: string): Promise<void> {
  const check = SIGNATURES[extension];
  if (!check) {
    throw new AppError('Formato de archivo no permitido.', 415);
  }
  const handle = await fs.promises.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(4100);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    if (!check(buffer.subarray(0, bytesRead))) {
      throw new AppError('El contenido del archivo no coincide con su extensión.', 415);
    }
  } finally {
    await handle.close();
  }
}
