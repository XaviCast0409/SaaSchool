/**
 * Vigencia de los comunicados del muro.
 *
 * - Con fecha "visible hasta" (expiresAt): vigente hasta esa fecha.
 * - Sin fecha: vigente durante UNDATED_ARCHIVE_DAYS desde su publicación y luego
 *   pasa a "Anteriores" (así el muro no crece sin fin).
 *
 * Nunca se borran: los vencidos se siguen viendo en la pestaña "Anteriores".
 */
import type { Prisma } from '@prisma/client';

export const UNDATED_ARCHIVE_DAYS = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

export type AnnouncementStatus = 'current' | 'past';

/** Momento en que el comunicado deja de estar vigente. */
export function announcementEndsAt(a: { expiresAt: Date | null; publishedAt: Date }): Date {
  return a.expiresAt ?? new Date(a.publishedAt.getTime() + UNDATED_ARCHIVE_DAYS * DAY_MS);
}

export function isCurrentAnnouncement(a: { expiresAt: Date | null; publishedAt: Date }, now: Date = new Date()): boolean {
  return announcementEndsAt(a) > now;
}

/** Filtro de Prisma equivalente a isCurrentAnnouncement (o a su negación para 'past'). */
export function statusWhere(status: AnnouncementStatus, now: Date = new Date()): Prisma.AnnouncementWhereInput {
  const undatedCutoff = new Date(now.getTime() - UNDATED_ARCHIVE_DAYS * DAY_MS);
  return status === 'current'
    ? { OR: [{ expiresAt: { gt: now } }, { expiresAt: null, publishedAt: { gt: undatedCutoff } }] }
    : { OR: [{ expiresAt: { lte: now } }, { expiresAt: null, publishedAt: { lte: undatedCutoff } }] };
}
