import 'dotenv/config';
import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { DeleteObjectsCommand, ListObjectsV2Command, PutObjectCommand } from '@aws-sdk/client-s3';
import { createR2Client, readR2Config } from '../src/modules/files/r2-client';
import { BACKUP_PREFIX } from '../src/modules/files/storage-provider.rules';

const execFileAsync = promisify(execFile);

// 1. Buscar pg_dump en Windows o en PATH
function findPgDump(): string {
  const possiblePaths = [
    'C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe',
    'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe',
    'C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe',
    'C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe',
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return 'pg_dump';
}

// 2. Subir a Cloudflare R2 (mismo bucket de los archivos, carpeta respaldos/)
function getR2() {
  const config = readR2Config(process.env);
  if (!config) {
    throw new Error('Variables de Cloudflare R2 (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET) no configuradas');
  }
  return { client: createR2Client(config), bucket: config.bucket };
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

async function main() {
  console.log('\n======================================================');
  console.log('📦 INICIANDO RESPALDO DE BASE DE DATOS (LOCAL + NUBE)');
  console.log('======================================================\n');

  // Permitir pasar URL por argumento: --url="postgresql://..." o tomar DATABASE_URL_PROD o DATABASE_URL
  const customUrlArg = process.argv.find((arg) => arg.startsWith('--url='));
  const databaseUrl = customUrlArg
    ? customUrlArg.split('=')[1].replace(/^["']|["']$/g, '')
    : process.env.DATABASE_URL_PROD || process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ Error: No se encontró DATABASE_URL en .env ni como parámetro --url');
    process.exit(1);
  }

  // Ocultar contraseña al mostrar en consola
  const maskedUrl = databaseUrl.replace(/:([^:@]+)@/, ':****@');
  console.log(`🔌 Conectando a: ${maskedUrl}`);

  const pgDumpPath = findPgDump();
  console.log(`🛠️  Usando pg_dump: ${pgDumpPath}`);

  // Carpeta de respaldos local: back/backups
  const backupsDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  // Generar nombre de archivo con fecha y hora
  const now = new Date();
  const timestamp = now
    .toISOString()
    .replace(/T/, '_')
    .replace(/:/g, '-')
    .replace(/\..+/, '');
  const fileName = `saaschool_backup_${timestamp}.dump`;
  const outputPath = path.join(backupsDir, fileName);

  console.log(`⏳ Extrayendo datos y generando respaldo local...`);

  try {
    // Ejecutar pg_dump (-F c: formato custom comprimido, -b: incluye blobs, -v: verbose)
    await execFileAsync(pgDumpPath, ['-d', databaseUrl, '-F', 'c', '-b', '-f', outputPath]);

    const stats = fs.statSync(outputPath);
    const sizeKB = (stats.size / 1024).toFixed(1);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    const readableSize = stats.size > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`;

    console.log(`✅ [1/2] Respaldo LOCAL creado con éxito:`);
    console.log(`   📂 Ruta: ${outputPath}`);
    console.log(`   ⚖️  Tamaño: ${readableSize}\n`);

    // Subir a la nube (Cloudflare R2)
    console.log(`☁️  [2/2] Subiendo respaldo a Cloudflare R2...`);
    try {
      const key = await uploadToR2(outputPath, fileName);
      console.log(`✅ Respaldo subido a la nube correctamente:`);
      console.log(`   📁 R2: ${key}\n`);

      const retentionDays = Number(process.env.BACKUP_RETENTION_DAYS);
      if (retentionDays > 0) {
        const removed = await pruneOldBackups(retentionDays);
        console.log(`🧹 Depuración de respaldos antiguos (> ${retentionDays} días): ${removed} archivo(s) eliminados.\n`);
      }
    } catch (cloudError: any) {
      console.warn(`⚠️  Advertencia: No se pudo subir a la nube: ${cloudError.message}`);
      console.log(`💡 Nota: Tu copia local en la PC sigue 100% segura en: ${outputPath}`);
      if (process.env.BACKUP_STRICT === '1') {
        process.exit(1);
      }
    }

    console.log('======================================================');
    console.log('🎉 PROCESO COMPLETADO EXITOSAMENTE');
    console.log('======================================================\n');
  } catch (dumpError: any) {
    console.error('❌ Error al ejecutar pg_dump:', dumpError.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('❌ Error no controlado:', err);
  process.exit(1);
});
