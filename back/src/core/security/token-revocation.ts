import { prisma } from '../../config/prisma';

/**
 * Tokens revocados (cierre de sesión). Se guardan en la BD para sobrevivir a reinicios y se consultan
 * en memoria en cada petición (sin ir a la BD). Solo hace falta recordarlos hasta que vencen.
 * Nota: con varias instancias del servidor, cada una cargaría la lista al arrancar; hoy hay una sola.
 */
const revoked = new Map<string, number>(); // jti → vencimiento (ms)

const purgeExpired = (): void => {
  const now = Date.now();
  for (const [jti, exp] of revoked) if (exp <= now) revoked.delete(jti);
};

export const isTokenRevoked = (jti: string | undefined): boolean => {
  if (!jti) return false;
  const exp = revoked.get(jti);
  if (exp === undefined) return false;
  if (exp <= Date.now()) {
    revoked.delete(jti);
    return false;
  }
  return true;
};

/** Revoca un token hasta su vencimiento (expSec: campo exp del JWT, en segundos). */
export async function revokeToken(jti: string, expSec: number | undefined): Promise<void> {
  const expiresAt = new Date((expSec ?? Math.floor(Date.now() / 1000) + 12 * 3600) * 1000);
  if (expiresAt.getTime() <= Date.now()) return;
  revoked.set(jti, expiresAt.getTime());
  if (revoked.size > 10_000) purgeExpired();
  await prisma.revokedToken.upsert({ where: { jti }, update: {}, create: { jti, expiresAt } });
}

/** Al arrancar: borra los vencidos y carga los vigentes en memoria. Nunca lanza. */
export async function loadRevokedTokens(): Promise<void> {
  try {
    await prisma.revokedToken.deleteMany({ where: { expiresAt: { lte: new Date() } } });
    const rows = await prisma.revokedToken.findMany({ select: { jti: true, expiresAt: true } });
    rows.forEach((r) => revoked.set(r.jti, r.expiresAt.getTime()));
  } catch (error) {
    console.error('[Sesiones] No se pudo cargar la lista de tokens revocados:', error);
  }
}

/** Solo para tests. */
export const __resetRevokedTokens = (): void => revoked.clear();
