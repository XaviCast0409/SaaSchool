import { Prisma, PrismaClient } from '@prisma/client';
import { env } from './env';

// Serializar los montos Decimal como number en las respuestas JSON (S/ con 2 decimales).
// Así el frontend sigue recibiendo números y no strings.
(Prisma.Decimal.prototype as unknown as { toJSON: () => number }).toJSON = function toJSON(
  this: Prisma.Decimal,
): number {
  return this.toNumber();
};

// Limitar las conexiones del pool: Render Postgres Basic tiene pocas conexiones disponibles.
const buildDatabaseUrl = (): string => {
  const url = new URL(env.DATABASE_URL);
  if (!url.searchParams.has('connection_limit')) {
    url.searchParams.set('connection_limit', env.NODE_ENV === 'production' ? '5' : '10');
  }
  return url.toString();
};

/**
 * Secretos que NUNCA salen de la BD salvo que la consulta los pida con `omit: { campo: false }`
 * (solo el login y el cambio de contraseña). Así un `include: { student: true }` olvidado en una
 * respuesta no puede filtrar hashes de contraseña ni secretos MFA al navegador.
 */
const SECRET_FIELDS = {
  user: { passwordHash: true, mfaSecret: true },
  student: { passwordHash: true },
} as const;

const createClient = () =>
  new PrismaClient({
    datasources: { db: { url: buildDatabaseUrl() } },
    log: env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    omit: SECRET_FIELDS,
  });

export type AppPrismaClient = ReturnType<typeof createClient>;

/** Filas tal como salen por defecto (sin los secretos omitidos). */
export type SafeUser = Omit<import('@prisma/client').User, keyof typeof SECRET_FIELDS.user>;
export type SafeStudent = Omit<import('@prisma/client').Student, keyof typeof SECRET_FIELDS.student>;

/** Para las pocas consultas que SÍ necesitan los secretos (login, cambio de contraseña, MFA). */
export const WITH_USER_SECRETS = { passwordHash: false, mfaSecret: false } as const;
export const WITH_STUDENT_SECRETS = { passwordHash: false } as const;

const globalForPrisma = globalThis as unknown as { prisma: AppPrismaClient };

export const prisma: AppPrismaClient = globalForPrisma.prisma ?? createClient();

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
