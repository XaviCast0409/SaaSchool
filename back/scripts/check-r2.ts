import 'dotenv/config';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { r2StorageService } from '../src/modules/files/r2-storage.service';

/**
 * Diagnóstico de Cloudflare R2: variables, acceso al bucket y prueba de subida/lectura/borrado.
 * Uso: pnpm run r2:check
 */
async function main() {
  console.log('\n🔍 DIAGNÓSTICO DE CLOUDFLARE R2 — KIPUX\n');

  const vars = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET'] as const;
  for (const name of vars) {
    console.log(`   - ${name}: ${process.env[name]?.trim() ? '✅ configurado' : '❌ falta'}`);
  }
  if (process.env.R2_ENDPOINT) console.log(`   - R2_ENDPOINT: ${process.env.R2_ENDPOINT}`);

  if (!r2StorageService.isConfigured()) {
    console.error('\n❌ Faltan variables de R2 en back/.env.');
    process.exit(1);
  }

  console.log('\n1. Acceso al bucket...');
  await r2StorageService.checkBucket();
  console.log('   ✅ Credenciales válidas y bucket accesible');

  console.log('2. Prueba de subida, lectura y borrado...');
  const key = `_diagnostico/${crypto.randomUUID()}.txt`;
  const content = `Verificación KIPUX ${new Date().toISOString()}`;
  const temp = path.join(os.tmpdir(), `r2-check-${crypto.randomUUID()}.txt`);
  fs.writeFileSync(temp, content);
  try {
    await r2StorageService.upload({ tempPath: temp, objectKey: key, mimeType: 'text/plain', size: Buffer.byteLength(content) });
    console.log('   ✅ Subida correcta');

    const stream = await r2StorageService.getStream(key);
    const chunks: Buffer[] = [];
    for await (const chunk of stream as AsyncIterable<Buffer>) chunks.push(Buffer.from(chunk));
    const read = Buffer.concat(chunks).toString('utf8');
    console.log(read === content ? '   ✅ Lectura correcta' : '   ❌ El contenido leído no coincide');

    await r2StorageService.deleteObject(key);
    console.log('   ✅ Borrado correcto');
  } finally {
    fs.rmSync(temp, { force: true });
  }

  console.log('\n🎉 R2 listo: los archivos nuevos se guardarán en el bucket.\n');
}

main().catch((error) => {
  console.error('\n❌ Error en el diagnóstico de R2:', error?.name ?? '', error?.message ?? error);
  process.exit(1);
});
