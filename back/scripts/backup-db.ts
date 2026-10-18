import 'dotenv/config';
import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { google } from 'googleapis';

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

// 2. Subir a Google Drive
async function uploadToGoogleDrive(filePath: string, fileName: string): Promise<{ fileId: string; folderName: string }> {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN?.trim();
  const mainFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim();

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Credenciales de Google Drive (CLIENT_ID, SECRET, REFRESH_TOKEN) no configuradas en .env');
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  // Buscar o crear subcarpeta "Backups_SaaSchool"
  let targetFolderId = mainFolderId;
  const folderName = 'Backups_SaaSchool';

  if (mainFolderId) {
    try {
      const listRes = await drive.files.list({
        q: `'${mainFolderId}' in parents and name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name)',
      });

      if (listRes.data.files && listRes.data.files.length > 0) {
        targetFolderId = listRes.data.files[0].id || mainFolderId;
      } else {
        const createFolderRes = await drive.files.create({
          requestBody: {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [mainFolderId],
          },
          fields: 'id',
        });
        targetFolderId = createFolderRes.data.id || mainFolderId;
      }
    } catch {
      targetFolderId = mainFolderId;
    }
  }

  const fileStream = fs.createReadStream(filePath);
  const uploadRes = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: targetFolderId ? [targetFolderId] : undefined,
    },
    media: {
      mimeType: 'application/octet-stream',
      body: fileStream,
    },
    fields: 'id, name',
  });

  return {
    fileId: uploadRes.data.id || 'OK',
    folderName,
  };
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

    // Subir a la nube (Google Drive)
    console.log(`☁️  [2/2] Subiendo respaldo a Google Drive...`);
    try {
      const driveResult = await uploadToGoogleDrive(outputPath, fileName);
      console.log(`✅ Respaldo subido a la nube correctamente:`);
      console.log(`   📁 Carpeta Drive: ${driveResult.folderName}`);
      console.log(`   🆔 ID de archivo: ${driveResult.fileId}\n`);
    } catch (cloudError: any) {
      console.warn(`⚠️  Advertencia: No se pudo subir a la nube: ${cloudError.message}`);
      console.log(`💡 Nota: Tu copia local en la PC sigue 100% segura en: ${outputPath}`);
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
