/**
 * Descifra un respaldo .dump.enc para restaurarlo con pg_restore.
 *
 *   pnpm db:decrypt -- respaldo.dump.enc ruta/kipux-backup-private.pem
 *   pg_restore --clean --if-exists --no-owner -d "$DATABASE_URL" respaldo.dump
 */
import fs from 'fs';
import { decryptFile } from './backup-crypto';

async function main(): Promise<void> {
  const [input, keyPath] = process.argv.slice(2).filter((a) => a !== '--');
  if (!input || !keyPath) {
    console.error('Uso: pnpm db:decrypt -- <respaldo.dump.enc> <clave-privada.pem>');
    process.exit(1);
  }
  const output = input.replace(/\.enc$/, '') === input ? `${input}.dump` : input.replace(/\.enc$/, '');
  await decryptFile(input, output, fs.readFileSync(keyPath, 'utf8'));
  console.log(`Respaldo descifrado en: ${output}`);
}

main().catch((error) => {
  console.error('No se pudo descifrar:', error instanceof Error ? error.message : error);
  process.exit(1);
});
