import { S3Client } from '@aws-sdk/client-s3';

/**
 * Configuración de Cloudflare R2 leída de un objeto de variables (process.env o env validado).
 * No importa config/env a propósito: el respaldo de la BD corre en GitHub Actions
 * solo con DATABASE_URL y las variables R2_*.
 */
export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint?: string;
}

type Vars = Partial<Record<'R2_ACCOUNT_ID' | 'R2_ACCESS_KEY_ID' | 'R2_SECRET_ACCESS_KEY' | 'R2_BUCKET' | 'R2_ENDPOINT', string>>;

export const readR2Config = (vars: Vars): R2Config | null => {
  const accountId = vars.R2_ACCOUNT_ID?.trim();
  const accessKeyId = vars.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = vars.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = vars.R2_BUCKET?.trim();
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket, endpoint: vars.R2_ENDPOINT?.trim() || undefined };
};

export const createR2Client = (config: R2Config): S3Client =>
  new S3Client({
    region: 'auto',
    endpoint: config.endpoint || `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  });
