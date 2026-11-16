import 'dotenv/config';
import { z } from 'zod';

// Validar que todas las variables de entorno requeridas estén presentes.
// IMPORTANTE: no se permiten valores por defecto para secretos.
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('12h'),
  FILES_SIGNING_SECRET: z.string().min(32, 'FILES_SIGNING_SECRET debe tener al menos 32 caracteres'),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  BCRYPT_ROUNDS: z.coerce.number().default(12),

  // URLs públicas
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  PUBLIC_API_URL: z.string().url().default('http://localhost:3000'),
  // URL pública del frontend (enlaces en correos). Por defecto, el primer origen de CORS.
  FRONTEND_URL: z.string().url().optional(),

  // Correo (Nodemailer). SMTP_USER/SMTP_PASS tienen prioridad; USER_EMAIL/PASS_EMAIL se mantienen por compatibilidad.
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().default(465),
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().optional(),
  USER_EMAIL: z.string().email().optional(),
  PASS_EMAIL: z.string().optional(),
  // Tope diario de correos automáticos (Gmail personal ≈ 500/día)
  MAIL_DAILY_LIMIT: z.coerce.number().int().positive().default(400),
  // Programador de automatizaciones. Sin valor: activo solo en producción (evita enviar avisos
  // reales desde desarrollo). 'true' lo fuerza en desarrollo; 'false' lo apaga (p. ej. segunda instancia).
  AUTOMATIONS_ENABLED: z.enum(['true', 'false']).optional(),

  // Web Push (obligatorias, sin valores por defecto)
  VAPID_PUBLIC_KEY: z.string().min(20),
  VAPID_PRIVATE_KEY: z.string().min(20),
  VAPID_SUBJECT: z.string().startsWith('mailto:'),

  // Cloudflare R2 (compatible con S3): archivos subidos y respaldos. Sin R2, en producción no se pueden subir archivos.
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  // Solo si el bucket usa jurisdicción (p. ej. https://<cuenta>.eu.r2.cloudflarestorage.com)
  R2_ENDPOINT: z.string().url().optional(),
  // Imágenes que se optimizan a la vez (sharp). Sin valor: según los núcleos, máximo 2.
  IMAGE_CONCURRENCY: z.preprocess((v) => (v === '' ? undefined : v), z.coerce.number().int().min(1).max(32).optional()),

  // Verificación en dos pasos del SUPER_ADMIN. Clave para cifrar los secretos TOTP en la BD
  // (sin valor se deriva de JWT_SECRET; si rotas JWT_SECRET sin definir esta, hay que volver a enrolar el MFA).
  MFA_ENCRYPTION_KEY: z.string().min(32).optional(),
  // 'true': el SUPER_ADMIN no puede ingresar sin MFA configurado. Actívalo después de enrolar las cuentas.
  SUPERADMIN_REQUIRE_MFA: z.enum(['true', 'false']).default('false'),

  // Cloudflare Turnstile (CAPTCHA) para los formularios públicos. Sin valor, no se exige.
  TURNSTILE_SECRET_KEY: z.string().optional(),
  // Correos que puede generar un colegio al día desde sus formularios públicos (admisión, reclamos).
  // Sin valor: sin topes propios para formularios públicos (solo rige MAIL_DAILY_LIMIT).
  PUBLIC_FORM_DAILY_LIMIT_PER_SCHOOL: z.preprocess((v) => (v === '' ? undefined : v), z.coerce.number().int().positive().optional()),

  // Monitoreo (opcional)
  SENTRY_DSN: z.string().optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Variables de entorno inválidas:', parsedEnv.error.format());
  process.exit(1);
}

const missingR2 = (['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET'] as const).filter(
  (name) => !parsedEnv.data[name]?.trim(),
);
if (parsedEnv.data.NODE_ENV === 'production' && missingR2.length > 0) {
  console.error(`⚠️  Faltan variables de Cloudflare R2 (${missingR2.join(', ')}): no se podrán subir ni descargar archivos.`);
}

export const env = {
  ...parsedEnv.data,
  automationsEnabled:
    parsedEnv.data.AUTOMATIONS_ENABLED !== undefined
      ? parsedEnv.data.AUTOMATIONS_ENABLED === 'true'
      : parsedEnv.data.NODE_ENV === 'production',
};
