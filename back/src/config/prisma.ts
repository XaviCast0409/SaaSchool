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

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: buildDatabaseUrl() } },
    log: env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  });

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
