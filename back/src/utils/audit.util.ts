import type { Request } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

const SENSITIVE_KEYS = new Set([
  'passwordHash',
  'password',
  'newPassword',
  'currentPassword',
  'temporaryPassword',
  'token',
]);

const sanitize = (value: unknown): unknown => {
  if (value === undefined) return undefined;
  const json = JSON.stringify(value, (key, v) => (SENSITIVE_KEYS.has(key) ? undefined : v));
  if (!json) return undefined;
  // Limitar tamaño para no inflar la base de datos
  return json.length > 20_000 ? { truncated: true, preview: json.slice(0, 20_000) } : JSON.parse(json);
};

export interface AuditEntry {
  action: string;
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
}

/**
 * Datos de una fila de bitácora para el usuario de la petición (o null si no hay colegio).
 * Sirve para escribir la bitácora DENTRO de la misma transacción que el cambio (p. ej. notas):
 * así no puede quedar una nota cambiada sin su registro.
 */
export function buildAuditData(request: Request, entry: AuditEntry): Prisma.AuditLogUncheckedCreateInput | null {
  const user = request.user;
  if (!user?.schoolId) return null;
  const before = sanitize(entry.before);
  const after = sanitize(entry.after);
  return {
    schoolId: user.schoolId,
    actorId: user.studentId ?? user.userId,
    actorRole: user.role,
    actorEmail: user.email ?? null,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId ?? null,
    ...(before !== undefined && { before: before as Prisma.InputJsonValue }),
    ...(after !== undefined && { after: after as Prisma.InputJsonValue }),
    ip: request.ip ?? null,
    userAgent: request.get('user-agent')?.slice(0, 300) ?? null,
  };
}

/** Registra una acción en la bitácora sin bloquear la respuesta. Nunca lanza errores. */
export function recordAudit(request: Request, entry: AuditEntry): void {
  let data: Prisma.AuditLogUncheckedCreateInput | null;
  try {
    data = buildAuditData(request, entry);
  } catch (error) {
    console.error('[Audit] No se pudo preparar el registro', entry.action, error);
    return;
  }
  if (!data) return;
  void prisma.auditLog
    .create({ data })
    .catch((error) => console.error('[Audit] No se pudo registrar la acción', entry.action, error));
}
