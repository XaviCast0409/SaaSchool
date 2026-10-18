import { z } from 'zod';

// Validar que todas las variables de entorno requeridas estén presentes
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('7d'),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  BCRYPT_ROUNDS: z.coerce.number().default(12),
  USER_EMAIL: z.string().email().optional(),
  PASS_EMAIL: z.string().optional(),
  VAPID_PUBLIC_KEY: z.string().default('BDycXn1jX1LXpQl2Adj-7gSn6FmG5pk5doNB_YYR3lKCDHBMv-0OpacqwUoXByoXxdfsG1GpcIgYxgVeenz9sFc'),
  VAPID_PRIVATE_KEY: z.string().default('lGd3yRSQ4Dt0txdXBLZ_jD83Fldw0rIN40nvds8jad4'),
  VAPID_SUBJECT: z.string().default('mailto:xavier.mont.0409@gmail.com'),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REFRESH_TOKEN: z.string().optional(),
  GOOGLE_DRIVE_FOLDER_ID: z.string().optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Variables de entorno inválidas:', parsedEnv.error.format());
  process.exit(1);
}

// Configuración centralizada de variables de entorno (incluye SMTP Nodemailer)
export const env = parsedEnv.data;
