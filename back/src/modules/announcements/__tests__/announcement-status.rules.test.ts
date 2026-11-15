import { describe, it, expect } from 'vitest';
import { announcementEndsAt, isCurrentAnnouncement, statusWhere, UNDATED_ARCHIVE_DAYS } from '../announcement-status.rules';

const now = new Date('2026-11-14T15:00:00Z');
const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

describe('vigencia de comunicados', () => {
  it('con fecha: vigente hasta esa fecha', () => {
    expect(isCurrentAnnouncement({ expiresAt: new Date('2026-11-15T04:59:59Z'), publishedAt: daysAgo(100) }, now)).toBe(true);
    expect(isCurrentAnnouncement({ expiresAt: new Date('2026-11-14T14:59:59Z'), publishedAt: daysAgo(1) }, now)).toBe(false);
  });

  it(`sin fecha: vigente ${UNDATED_ARCHIVE_DAYS} días desde su publicación`, () => {
    expect(isCurrentAnnouncement({ expiresAt: null, publishedAt: daysAgo(UNDATED_ARCHIVE_DAYS - 1) }, now)).toBe(true);
    expect(isCurrentAnnouncement({ expiresAt: null, publishedAt: daysAgo(UNDATED_ARCHIVE_DAYS + 1) }, now)).toBe(false);
    expect(announcementEndsAt({ expiresAt: null, publishedAt: daysAgo(UNDATED_ARCHIVE_DAYS) })).toEqual(now);
  });

  it('el filtro de vigentes y el de anteriores son complementarios', () => {
    const current = statusWhere('current', now);
    const past = statusWhere('past', now);
    expect(current).toEqual({
      OR: [{ expiresAt: { gt: now } }, { expiresAt: null, publishedAt: { gt: daysAgo(UNDATED_ARCHIVE_DAYS) } }],
    });
    expect(past).toEqual({
      OR: [{ expiresAt: { lte: now } }, { expiresAt: null, publishedAt: { lte: daysAgo(UNDATED_ARCHIVE_DAYS) } }],
    });
  });
});
