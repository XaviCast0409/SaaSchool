import 'dotenv/config';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { pipeline } from 'stream/promises';
import { PrismaClient } from '@prisma/client';
import { googleDriveService } from '../src/modules/uploads/google-drive.service';
import { r2StorageService } from '../src/modules/files/r2-storage.service';
import { buildObjectKey } from '../src/modules/files/storage-provider.rules';

/**
 * Copia a R2 los archivos guardados en Google Drive y actualiza su registro.
 * - No borra nada de Drive: deja driveFileId como respaldo.
 * - Se puede cortar y volver a correr: solo toma los que siguen en GOOGLE_DRIVE.
 *
 * Uso:
 *   pnpm run r2:migrate-from-drive -- --dry-run          (solo cuenta)
 *   pnpm run r2:migrate-from-drive -- --limit=200        (por tandas)
 *   pnpm run r2:migrate-from-drive -- --school=<id>      (un colegio)
 */
const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');
const argValue = (name: string): string | undefined =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const LIMIT = Number(argValue('limit') ?? 0) || undefined;
const SCHOOL_ID = argValue('school');

async function main() {
  if (!DRY_RUN) {
    if (!r2StorageService.isConfigured()) throw new Error('Faltan las variables de R2.');
    if (!googleDriveService.isConfigured()) throw new Error('Faltan las variables de Google Drive.');
    await r2StorageService.checkBucket();
  }

  const files = await prisma.storedFile.findMany({
    where: { storage: 'GOOGLE_DRIVE', driveFileId: { not: null }, deletedAt: null, ...(SCHOOL_ID ? { schoolId: SCHOOL_ID } : {}) },
    orderBy: { createdAt: 'asc' },
    take: LIMIT,
  });

  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
  console.log(`📦 ${files.length} archivo(s) en Drive por migrar (${(totalBytes / 1024 ** 2).toFixed(1)} MB)${DRY_RUN ? ' — simulación' : ''}`);
  if (DRY_RUN || files.length === 0) return;

  let migrated = 0;
  const failed: string[] = [];

  for (const [index, file] of files.entries()) {
    const temp = path.join(os.tmpdir(), `r2-migrate-${crypto.randomUUID()}`);
    try {
      await pipeline(await googleDriveService.getFileStream(file.driveFileId!), fs.createWriteStream(temp));
      const size = fs.statSync(temp).size;
      const objectKey = buildObjectKey({
        schoolId: file.schoolId,
        purpose: file.purpose,
        fileName: file.fileName,
        id: file.id,
        now: file.createdAt,
      });
      await r2StorageService.upload({ tempPath: temp, objectKey, mimeType: file.mimeType, size });
      // Solo se cambia el registro si el archivo sigue en Drive (evita pisar cambios hechos en paralelo)
      const updated = await prisma.storedFile.updateMany({
        where: { id: file.id, storage: 'GOOGLE_DRIVE' },
        data: { storage: 'R2', objectKey, size },
      });
      if (updated.count === 1) migrated++;
      if ((index + 1) % 25 === 0) console.log(`   … ${index + 1}/${files.length}`);
    } catch (error) {
      failed.push(file.id);
      console.error(`   ❌ ${file.id} (${file.fileName}):`, (error as Error)?.message ?? error);
    } finally {
      fs.rmSync(temp, { force: true });
    }
  }

  console.log(`\n✅ Migrados: ${migrated}`);
  if (failed.length) {
    console.log(`⚠️  Con error: ${failed.length}. Siguen en Drive; vuelve a correr el script para reintentarlos.`);
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error('❌', error?.message ?? error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
