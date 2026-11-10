import type { Request } from 'express';
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

/** Registra una acción en la bitácora sin bloquear la respuesta. Nunca lanza errores. */
export function recordAudit(request: Request, entry: AuditEntry): void {
  const user = request.user;
  if (!user?.schoolId) return;

  const before = sanitize(entry.before);
  const after = sanitize(entry.after);

  void prisma.auditLog
    .create({
      data: {
        schoolId: user.schoolId,
        actorId: user.studentId ?? user.userId,
        actorRole: user.role,
        actorEmail: user.email ?? null,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId ?? null,
        ...(before !== undefined && { before: before as any }),
        ...(after !== undefined && { after: after as any }),
        ip: request.ip ?? null,
        userAgent: request.get('user-agent')?.slice(0, 300) ?? null,
      },
    })
    .catch((error) => console.error('[Audit] No se pudo registrar la acción', entry.action, error));
}
