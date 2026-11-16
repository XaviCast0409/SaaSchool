import crypto from 'crypto';
import { env } from '../config/env';

/**
 * TOTP (RFC 6238) para la verificación en dos pasos, compatible con Google Authenticator,
 * Microsoft Authenticator, Authy, 1Password, etc. Sin dependencias externas.
 */

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP_SECONDS = 30;
const DIGITS = 6;

export const base32Encode = (buffer: Buffer): string => {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32[(value << (5 - bits)) & 31];
  return output;
};

export const base32Decode = (input: string): Buffer => {
  const clean = input.toUpperCase().replace(/=+$/, '').replace(/\s/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const idx = BASE32.indexOf(char);
    if (idx === -1) throw new Error('Secreto TOTP inválido');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
};

/** Secreto nuevo de 160 bits en base32. */
export const generateTotpSecret = (): string => base32Encode(crypto.randomBytes(20));

export const totpAt = (secretBase32: string, step: number): string => {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const hmac = crypto.createHmac('sha1', base32Decode(secretBase32)).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary = (hmac.readUInt32BE(offset) & 0x7fffffff) % 10 ** DIGITS;
  return binary.toString().padStart(DIGITS, '0');
};

export const currentTotpStep = (nowMs = Date.now()): number => Math.floor(nowMs / 1000 / STEP_SECONDS);

/**
 * Verifica un código con tolerancia de ±1 paso (relojes desfasados) y devuelve el paso que
 * coincidió, o null. `lastUsedStep` impide reutilizar el mismo código (o uno anterior).
 */
export const verifyTotp = (
  secretBase32: string,
  code: string,
  lastUsedStep: number | null = null,
  nowMs = Date.now(),
): number | null => {
  if (!/^\d{6}$/.test(code)) return null;
  const now = currentTotpStep(nowMs);
  for (const step of [now - 1, now, now + 1]) {
    if (lastUsedStep !== null && step <= lastUsedStep) continue;
    const expected = Buffer.from(totpAt(secretBase32, step));
    if (crypto.timingSafeEqual(expected, Buffer.from(code))) return step;
  }
  return null;
};

export const buildOtpAuthUri = (secretBase32: string, accountName: string, issuer = 'KIPUX'): string =>
  `otpauth://totp/${encodeURIComponent(`${issuer}:${accountName}`)}?secret=${secretBase32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;

// --- Cifrado del secreto en la BD (AES-256-GCM) ---
// Si se filtra la base, los secretos no sirven sin la clave del servidor.

const encryptionKey = (): Buffer =>
  crypto.createHash('sha256').update(`kipux-mfa:${env.MFA_ENCRYPTION_KEY ?? env.JWT_SECRET}`).digest();

export const encryptTotpSecret = (secretBase32: string): string => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secretBase32, 'utf8'), cipher.final()]);
  return `v1.${iv.toString('base64')}.${cipher.getAuthTag().toString('base64')}.${encrypted.toString('base64')}`;
};

export const decryptTotpSecret = (payload: string): string => {
  const [version, iv, tag, data] = payload.split('.');
  if (version !== 'v1' || !iv || !tag || !data) throw new Error('Secreto MFA con formato desconocido');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8');
};
