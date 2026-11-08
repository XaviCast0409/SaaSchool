import 'dotenv/config';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

async function verifyGoogleDrive() {
  console.log('\n======================================================');
  console.log('🔍 DIAGNÓSTICO DE INTEGRACIÓN GOOGLE DRIVE — SAASCHOOL');
  console.log('======================================================\n');

  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN?.trim();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim();

  console.log('1. Verificación de variables en .env:');
  console.log(`   - GOOGLE_CLIENT_ID: ${clientId ? '✅ Configurado (' + clientId.substring(0, 15) + '...)' : '❌ No configurado'}`);
  console.log(`   - GOOGLE_CLIENT_SECRET: ${clientSecret ? '✅ Configurado' : '❌ No configurado'}`);
  console.log(`   - GOOGLE_REFRESH_TOKEN: ${refreshToken ? '✅ Configurado (' + refreshToken.substring(0, 15) + '...)' : '❌ No configurado'}`);
  console.log(`   - GOOGLE_DRIVE_FOLDER_ID: ${folderId ? '✅ Configurado (' + folderId + ')' : '❌ No configurado'}\n`);

  if (!clientId || !clientSecret || !refreshToken) {
    console.error('❌ Error: Faltan credenciales de OAuth2 en back/.env.');
    return;
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  try {
    console.log('2. Conectando con Google Drive API v3 (OAuth2)...');
    const about = await drive.about.get({ fields: 'user, storageQuota' });
    console.log(`   ✅ Autenticación exitosa como: ${about.data.user?.displayName} (${about.data.user?.emailAddress})`);

    if (about.data.storageQuota) {
      const quota = about.data.storageQuota;
      const limitGB = quota.limit ? (Number(quota.limit) / (1024 ** 3)).toFixed(2) + ' GB' : 'Ilimitado';
      const usageGB = quota.usage ? (Number(quota.usage) / (1024 ** 3)).toFixed(2) + ' GB' : '0 GB';
      console.log(`   📊 Almacenamiento: ${usageGB} ocupados de ${limitGB}`);
    }

    if (folderId) {
      console.log('\n3. Verificando carpeta destino en Drive...');
      const folder = await drive.files.get({
        fileId: folderId,
        fields: 'id, name, mimeType, trashed, capabilities',
        supportsAllDrives: true,
      });
      console.log(`   ✅ Carpeta encontrada: "${folder.data.name}" (ID: ${folder.data.id})`);
      console.log(`   🔒 Permiso de escritura: ${folder.data.capabilities?.canAddChildren ? '✅ Permitido' : '❌ Restringido'}`);
    }

    console.log('\n4. Realizando prueba de subida de archivo...');
    const tempTestFile = path.join(process.cwd(), 'temp-drive-check.txt');
    fs.writeFileSync(tempTestFile, `Verificación SaaSchool ${new Date().toISOString()}`);

    const uploadRes = await drive.files.create({
      requestBody: {
        name: 'saaschool-check-test.txt',
        parents: folderId ? [folderId] : undefined,
      },
      media: {
        mimeType: 'text/plain',
        body: fs.createReadStream(tempTestFile),
      },
      fields: 'id, name, webViewLink',
      supportsAllDrives: true,
    });

    const fileId = uploadRes.data.id;
    console.log(`   ✅ Archivo de prueba subido exitosamente (ID: ${fileId})`);

    console.log('   Asignando permiso público de lectura (anyone:reader)...');
    await drive.permissions.create({
      fileId: fileId!,
      requestBody: { role: 'reader', type: 'anyone' },
      supportsAllDrives: true,
    });
    console.log('   ✅ Permisos públicos verificados correctamente.');

    // Limpieza
    await drive.files.delete({ fileId: fileId!, supportsAllDrives: true });
    if (fs.existsSync(tempTestFile)) fs.unlinkSync(tempTestFile);
    console.log('   🧹 Archivo de prueba eliminado de Google Drive.');

    console.log('\n======================================================');
    console.log('🎉 RESULTADO: GOOGLE DRIVE ESTÁ 100% OPERATIVO');
    console.log('======================================================\n');
  } catch (err: any) {
    console.error('\n❌ ERROR EN LA VERIFICACIÓN DE GOOGLE DRIVE:');
    console.error(`   ${err?.message || err}`);

    if (err?.message?.includes('invalid_grant')) {
      console.log('\n💡 CAUSA DEL "invalid_grant":');
      console.log('   El refresh token de Google OAuth2 ha caducado o fue revocado.');
      console.log('   Esto sucede cuando la aplicación en Google Cloud Console está en modo "Testing" (caduca a los 7 días).');
      console.log('\n🛠️ SOLUCIÓN:');
      console.log('   1. Ve a Google Cloud Console -> "Pantalla de consentimiento de OAuth".');
      console.log('   2. Cambia el estado de "Prueba" a "En producción" (para que el token no caduque).');
      console.log('   3. Genera un nuevo Refresh Token y actualiza GOOGLE_REFRESH_TOKEN en back/.env.');
    }
  }
}

verifyGoogleDrive();

