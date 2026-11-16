import 'dotenv/config';
import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { DeleteObjectsCommand, ListObjectsV2Command, PutObjectCommand } from '@aws-sdk/client-s3';
import { createR2Client, readR2Config } from '../src/modules/files/r2-client';
import { BACKUP_PREFIX } from '../src/modules/files/storage-provider.rules';
import { encryptFile } from './backup-crypto';

/**
 * Respaldo de la base de datos:
 *   1. pg_dump (formato custom comprimido).
 *   2. Prueba de restauración en una base vacía (RESTORE_TEST_URL), si está configurada.
 *   3. Cifrado con la clave pública BACKUP_PUBLIC_KEY (ver backup-crypto.ts).
 *   4. Subida a un bucket de R2 SEPARADO del de la app (BACKUP_R2_*), con credenciales propias.
 *
 * Variables:
 *   BACKUP_R2_ACCOUNT_ID, BACKUP_R2_ACCESS_KEY_ID, BACKUP_R2_SECRET_ACCESS_KEY, BACKUP_R2_BUCKET
 *     Bucket exclusivo de respaldos. Lo ideal: un token con permiso solo de escritura y la
 *     depuración de antiguos con una regla de ciclo de vida del bucket (no desde aquí).
 *     Si faltan, usa las R2_* de la app con una advertencia.
 *   BACKUP_PUBLIC_KEY          PEM de la clave pública. Sin ella el respaldo sale SIN cifrar (advertencia).
 *   BACKUP_REQUIRE_ENCRYPTION  '1': falla si no hay clave pública.
 *   RESTORE_TEST_URL           Base vacía donde se prueba restaurar el respaldo antes de subirlo.
 *   BACKUP_RETENTION_DAYS      Borra respaldos más antiguos (solo si las credenciales permiten borrar).
 *   BACKUP_STRICT              '1': cualquier fallo de subida o de prueba termina con error.
 */

const execFileAsync = promisify(execFile);
const strict = process.env.BACKUP_STRICT === '1';

// 1. Buscar binarios de PostgreSQL en Windows o en PATH
function findPgBinary(name: 'pg_dump' | 'pg_restore' | 'psql'): string {
  for (const version of ['18', '17', '16', '15']) {
    const candidate = `C:\\Program Files\\PostgreSQL\\${version}\\bin\\${name}.exe`;
    if (fs.existsSync(candidate)) return candidate;
  }
  return name;
}

// 2. Bucket de respaldos (separado del de la app)
function getR2() {
  const env = process.env;
  const dedicated = readR2Config({
    R2_ACCOUNT_ID: env.BACKUP_R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: env.BACKUP_R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: env.BACKUP_R2_SECRET_ACCESS_KEY,
    R2_BUCKET: env.BACKUP_R2_BUCKET,
    R2_ENDPOINT: env.BACKUP_R2_ENDPOINT,
  });
  if (dedicated) return { client: createR2Client(dedicated), bucket: dedicated.bucket, dedicated: true };

  const shared = readR2Config(env);
  if (!shared) {
    throw new Error('Configura BACKUP_R2_ACCOUNT_ID, BACKUP_R2_ACCESS_KEY_ID, BACKUP_R2_SECRET_ACCESS_KEY y BACKUP_R2_BUCKET.');
  }
  console.warn(
    '⚠️  Usando el bucket y las credenciales de la APP para el respaldo. Si se filtran las llaves del servidor se pierden\n' +
      '    los archivos Y los respaldos. Crea un bucket exclusivo y define las variables BACKUP_R2_*.',
  );
  return { client: createR2Client(shared), bucket: shared.bucket, dedicated: false };
}

async function uploadToR2(filePath: string, fileName: string): Promise<string> {
  const { client, bucket } = getR2();
  const key = `${BACKUP_PREFIX}${fileName}`;
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: fs.createReadStream(filePath),
      ContentLength: fs.statSync(filePath).size,
      ContentType: 'application/octet-stream',
    }),
  );
  return key;
}

/** Elimina de R2 los respaldos con más de `retentionDays` días. */
async function pruneOldBackups(retentionDays: number): Promise<number> {
  const { client, bucket } = getR2();
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  let removed = 0;
  let continuationToken: string | undefined;
  do {
    const page = await client.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: `${BACKUP_PREFIX}saaschool_backup_`, ContinuationToken: continuationToken }),
    );
    const old = (page.Contents ?? []).filter((o) => o.Key && o.LastModified && o.LastModified.getTime() < cutoff);
    if (old.length > 0) {
      await client.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: old.map((o) => ({ Key: o.Key! })) } }));
      removed += old.length;
    }
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);
  return removed;
}

/**
 * Restaura el respaldo en una base vacía y verifica que tenga el historial de migraciones.
 * Un respaldo que nunca se probó restaurar no es un respaldo.
 */
async function testRestore(dumpPath: string, restoreUrl: string): Promise<void> {
  try {
    await execFileAsync(findPgBinary('pg_restore'), ['--no-owner', '--no-privileges', '-d', restoreUrl, dumpPath], {
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (error: any) {
    // pg_restore termina con error aunque solo haya avisos menores (p. ej. extensiones o comentarios del
    // esquema public); lo que decide es que los datos estén. Se muestran las últimas líneas para revisar.
    const tail = String(error.stderr ?? error.message).trim().split('\n').slice(-5).join('\n   ');
    console.warn(`   ⚠️ pg_restore reportó avisos:\n   ${tail}`);
  }
  const { stdout } = await execFileAsync(findPgBinary('psql'), [
    restoreUrl,
    '-tA',
    '-c',
    'SELECT (SELECT count(*) FROM "_prisma_migrations") || \'|\' || (SELECT count(*) FROM "School") || \'|\' || (SELECT count(*) FROM "User")',
  ]);
  const [migrations, schools, users] = stdout.trim().split('|').map(Number);
  if (!migrations) throw new Error('La base restaurada no tiene migraciones: el respaldo está incompleto.');
  console.log(`   ✔ Restaurado: ${migrations} migraciones, ${schools} colegios, ${users} usuarios.`);
}

async function main() {
  console.log('\n======================================================');
  console.log('📦 INICIANDO RESPALDO DE BASE DE DATOS');
  console.log('======================================================\n');

  // Permitir pasar URL por argumento: --url="postgresql://..." o tomar DATABASE_URL_PROD o DATABASE_URL
  const customUrlArg = process.argv.find((arg) => arg.startsWith('--url='));
  const databaseUrl = customUrlArg
    ? customUrlArg.slice('--url='.length).replace(/^["']|["']$/g, '')
    : process.env.DATABASE_URL_PROD || process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ Error: No se encontró DATABASE_URL en .env ni como parámetro --url');
    process.exit(1);
  }

  const publicKey = process.env.BACKUP_PUBLIC_KEY?.trim();
  if (!publicKey && process.env.BACKUP_REQUIRE_ENCRYPTION === '1') {
    console.error('❌ BACKUP_REQUIRE_ENCRYPTION=1 pero falta BACKUP_PUBLIC_KEY.');
    process.exit(1);
  }

  console.log(`🔌 Conectando a: ${databaseUrl.replace(/:([^:@]+)@/, ':****@')}`);

  const backupsDir = path.join(process.cwd(), 'backups');
  fs.mkdirSync(backupsDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/T/, '_').replace(/:/g, '-').replace(/\..+/, '');
  const fileName = `saaschool_backup_${timestamp}.dump`;
  const dumpPath = path.join(backupsDir, fileName);

  try {
    console.log('⏳ [1/4] Generando respaldo con pg_dump...');
    await execFileAsync(findPgBinary('pg_dump'), ['-d', databaseUrl, '-F', 'c', '-b', '-f', dumpPath]);
    const size = fs.statSync(dumpPath).size;
    console.log(`   ✔ ${dumpPath} (${(size / (1024 * 1024)).toFixed(2)} MB)\n`);

    // La prueba no bloquea la subida: un respaldo dudoso es mejor que ninguno, pero el job termina en error
    let restoreFailed = false;
    const restoreUrl = process.env.RESTORE_TEST_URL;
    if (restoreUrl) {
      console.log('🧪 [2/4] Probando restaurar el respaldo en una base vacía...');
      try {
        await testRestore(dumpPath, restoreUrl);
      } catch (restoreError: any) {
        restoreFailed = true;
        console.error(`   ❌ La prueba de restauración falló: ${restoreError.message}`);
      }
      console.log('');
    } else {
      console.log('ℹ️  [2/4] Sin RESTORE_TEST_URL: se omite la prueba de restauración.\n');
    }

    let uploadPath = dumpPath;
    let uploadName = fileName;
    if (publicKey) {
      console.log('🔐 [3/4] Cifrando con la clave pública...');
      uploadPath = `${dumpPath}.enc`;
      uploadName = `${fileName}.enc`;
      await encryptFile(dumpPath, uploadPath, publicKey);
      // El dump en claro no debe quedar en el disco del runner ni del equipo
      fs.rmSync(dumpPath, { force: true });
      console.log(`   ✔ ${uploadPath}\n`);
    } else {
      console.warn('⚠️  [3/4] Sin BACKUP_PUBLIC_KEY: el respaldo se sube SIN cifrar. Genera un par de claves (ver backup-crypto.ts).\n');
    }

    console.log('☁️  [4/4] Subiendo a Cloudflare R2...');
    try {
      const key = await uploadToR2(uploadPath, uploadName);
      console.log(`   ✔ R2: ${key}\n`);
    } catch (cloudError: any) {
      console.warn(`⚠️  No se pudo subir a la nube: ${cloudError.message}`);
      console.log(`💡 La copia local sigue en: ${uploadPath}`);
      if (strict) process.exit(1);
    }

    const retentionDays = Number(process.env.BACKUP_RETENTION_DAYS);
    if (retentionDays > 0) {
      try {
        const removed = await pruneOldBackups(retentionDays);
        console.log(`🧹 Respaldos de más de ${retentionDays} días eliminados: ${removed}.\n`);
      } catch (pruneError: any) {
        // Esperado con un token de solo escritura: la depuración la hace la regla de ciclo de vida del bucket
        console.warn(`ℹ️  No se depuraron respaldos antiguos (${pruneError.message}). Usa una regla de ciclo de vida en el bucket.\n`);
      }
    }

    if (restoreFailed) {
      console.error('❌ El respaldo NO se pudo restaurar en la prueba. Revísalo hoy mismo.');
      process.exit(1);
    }

    console.log('======================================================');
    console.log('🎉 PROCESO COMPLETADO EXITOSAMENTE');
    console.log('======================================================\n');
  } catch (error: any) {
    console.error('❌ Error en el respaldo:', error.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('❌ Error no controlado:', err);
  process.exit(1);
});
