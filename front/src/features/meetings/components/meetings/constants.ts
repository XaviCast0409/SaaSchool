import { formatPeruDate, formatPeruTime } from '@/lib/dateUtils';

export const CANCEL_NOTICE_MS = 2 * 3_600_000;

export const panel = 'rounded-2xl bg-card border border-border shadow-sm overflow-hidden';

export const fieldLabel =
  'block min-w-0 space-y-1 [&>span]:block [&>span]:truncate text-xs font-bold uppercase tracking-wider text-muted-foreground';

export const fieldControl = 'h-10 rounded-xl text-sm normal-case tracking-normal font-normal';

export const selectControl =
  'h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal normal-case tracking-normal text-foreground focus:outline-none focus:ring-2 focus:ring-primary';

export const upperFirst = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export const dayLabel = (iso: string) => upperFirst(formatPeruDate(iso, { weekday: 'long', day: 'numeric', month: 'long' }));

export const range = (s: { startsAt: string; endsAt: string }) =>
  `${formatPeruTime(s.startsAt)} – ${formatPeruTime(s.endsAt)}`;

export function groupByDay<T extends { startsAt: string }>(items: T[]) {
  const map = new Map<string, T[]>();
  for (const it of items) {
    const k = dayLabel(it.startsAt);
    map.set(k, [...(map.get(k) ?? []), it]);
  }
  return [...map.entries()];
}
