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

  // Web Push (obligatorias, sin valores por defecto)
  VAPID_PUBLIC_KEY: z.string().min(20),
  VAPID_PRIVATE_KEY: z.string().min(20),
  VAPID_SUBJECT: z.string().startsWith('mailto:'),

  // Google Drive (OAuth2 de la cuenta propietaria)
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REFRESH_TOKEN: z.string().optional(),
  GOOGLE_DRIVE_FOLDER_ID: z.string().optional(),

  // Monitoreo (opcional)
  SENTRY_DSN: z.string().optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Variables de entorno inválidas:', parsedEnv.error.format());
  process.exit(1);
}

export const env = parsedEnv.data;
