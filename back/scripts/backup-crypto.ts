/**
 * Cifrado de respaldos con clave pública (híbrido RSA-OAEP + AES-256-GCM).
 *
 * - El job de respaldo solo conoce la clave PÚBLICA (BACKUP_PUBLIC_KEY): puede cifrar, nunca descifrar.
 *   Si se filtran los secretos de GitHub o del bucket, los respaldos siguen ilegibles.
 * - La clave PRIVADA se guarda fuera de la nube (gestor de contraseñas + copia impresa/USB).
 *
 * Generar el par de claves (una sola vez):
 *   openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:4096 -out kipux-backup-private.pem
 *   openssl pkey -in kipux-backup-private.pem -pubout -out kipux-backup-public.pem
 *
 * Formato del archivo .dump.enc:
 *   "KPXBK1" | uint16 BE largo de la clave cifrada | clave AES cifrada (RSA-OAEP-SHA256) | IV (12 B) | datos | tag GCM (16 B)
 */
import crypto from 'crypto';
import fs from 'fs';
import { pipeline } from 'stream/promises';
import { Transform } from 'stream';

const MAGIC = Buffer.from('KPXBK1');
const IV_BYTES = 12;
const TAG_BYTES = 16;

/** Acepta el PEM tal cual o con los saltos de línea escapados como "\n" (secretos de una sola línea). */
export const normalizePem = (pem: string): string => pem.replace(/\\n/g, '\n').trim();

export async function encryptFile(inputPath: string, outputPath: string, publicKeyPem: string): Promise<void> {
  const dataKey = crypto.randomBytes(32);
  const iv = crypto.randomBytes(IV_BYTES);
  const wrappedKey = crypto.publicEncrypt(
    { key: normalizePem(publicKeyPem), padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    dataKey,
  );
  const header = Buffer.alloc(2);
  header.writeUInt16BE(wrappedKey.length);

  const cipher = crypto.createCipheriv('aes-256-gcm', dataKey, iv);
  const out = fs.createWriteStream(outputPath);
  out.write(Buffer.concat([MAGIC, header, wrappedKey, iv]));
  await pipeline(fs.createReadStream(inputPath), cipher, out, { end: false });
  await new Promise<void>((resolve, reject) => {
    out.end(cipher.getAuthTag(), () => resolve());
    out.on('error', reject);
  });
}

export async function decryptFile(inputPath: string, outputPath: string, privateKeyPem: string): Promise<void> {
  const size = fs.statSync(inputPath).size;
  const fd = fs.openSync(inputPath, 'r');
  try {
    const head = Buffer.alloc(MAGIC.length + 2);
    fs.readSync(fd, head, 0, head.length, 0);
    if (!head.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error('El archivo no es un respaldo cifrado de KIPUX.');
    const keyLength = head.readUInt16BE(MAGIC.length);
    const wrappedKey = Buffer.alloc(keyLength);
    fs.readSync(fd, wrappedKey, 0, keyLength, head.length);
    const iv = Buffer.alloc(IV_BYTES);
    fs.readSync(fd, iv, 0, IV_BYTES, head.length + keyLength);
    const tag = Buffer.alloc(TAG_BYTES);
    fs.readSync(fd, tag, 0, TAG_BYTES, size - TAG_BYTES);

    const dataKey = crypto.privateDecrypt(
      { key: normalizePem(privateKeyPem), padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
      wrappedKey,
    );
    const decipher = crypto.createDecipheriv('aes-256-gcm', dataKey, iv);
    decipher.setAuthTag(tag);
    const start = head.length + keyLength + IV_BYTES;
    const end = size - TAG_BYTES - 1;
    await pipeline(
      fs.createReadStream(inputPath, { start, end }),
      decipher as unknown as Transform,
      fs.createWriteStream(outputPath),
    );
  } finally {
    fs.closeSync(fd);
  }
}
