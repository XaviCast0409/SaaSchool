/**
 * Reglas puras de reportes financieros (antigüedad de deuda, agrupaciones).
 */
import { fromCents, toCents } from './payment.rules';

type Money = number | string | { toString(): string };

export const AGING_BUCKETS = ['0-30', '31-60', '61-90', '90+'] as const;
export type AgingBucket = (typeof AGING_BUCKETS)[number];

/** Tramo de antigüedad de una deuda vencida según días de atraso (≥ 1). */
export function agingBucket(days: number): AgingBucket {
  if (days <= 30) return '0-30';
  if (days <= 60) return '31-60';
  if (days <= 90) return '61-90';
  return '90+';
}

/** Suma montos agrupando por una clave; devuelve [{ key, total, count }] ordenado por clave. */
export function groupSum<T>(items: T[], keyOf: (item: T) => string, amountOf: (item: T) => Money) {
  const map = new Map<string, { cents: number; count: number }>();
  for (const it of items) {
    const k = keyOf(it);
    const cur = map.get(k) ?? { cents: 0, count: 0 };
    cur.cents += toCents(amountOf(it));
    cur.count += 1;
    map.set(k, cur);
  }
  return [...map.entries()]
    .map(([key, v]) => ({ key, total: fromCents(v.cents), count: v.count }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

/** Totales de una cuota para el estado de cuenta: original, rebajas, moras, vigente, pagado y saldo. */
export function obligationTotals(o: {
  originalAmount: Money | null;
  amountDue: Money;
  adjustments: Array<{ type: string; amount: Money; status: string }>;
  payments: Array<{ amountPaid: Money; status: string }>;
}) {
  let discounts = 0;
  let lateFees = 0;
  for (const a of o.adjustments) {
    if (a.status !== 'ACTIVE') continue;
    if (a.type === 'LATE_FEE') lateFees += toCents(a.amount);
    else discounts += toCents(a.amount);
  }
  const paid = o.payments.filter((p) => p.status === 'ACTIVE').reduce((s, p) => s + toCents(p.amountPaid), 0);
  const net = toCents(o.amountDue);
  return {
    original: fromCents(o.originalAmount === null ? net + discounts - lateFees : toCents(o.originalAmount)),
    discounts: fromCents(discounts),
    lateFees: fromCents(lateFees),
    net: fromCents(net),
    paid: fromCents(paid),
    balance: fromCents(Math.max(0, net - paid)),
  };
}

/** Suma campo a campo una lista de totales. */
export function addTotals<K extends string>(rows: Array<Record<K, number>>, keys: K[]): Record<K, number> {
  const acc = Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
  for (const r of rows) for (const k of keys) acc[k] += toCents(r[k]);
  for (const k of keys) acc[k] = fromCents(acc[k]);
  return acc;
}
