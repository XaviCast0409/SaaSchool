/**
 * Reglas puras de la agenda de entrevistas (sin base de datos), para poder probarlas.
 * Lima es UTC-5 todo el año.
 */

/** Instante UTC de una fecha y hora local de Lima. */
export function limaDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00.000-05:00`);
}

/** Divide un rango horario en espacios consecutivos de `durationMinutes`. Descarta el sobrante final. */
export function generateSlots(date: string, from: string, to: string, durationMinutes: number): Array<{ startsAt: Date; endsAt: Date }> {
  const start = limaDateTime(date, from).getTime();
  const end = limaDateTime(date, to).getTime();
  const step = durationMinutes * 60_000;
  const slots: Array<{ startsAt: Date; endsAt: Date }> = [];
  for (let t = start; t + step <= end; t += step) {
    slots.push({ startsAt: new Date(t), endsAt: new Date(t + step) });
  }
  return slots;
}

/** ¿Se cruzan dos rangos [a1, a2) y [b1, b2)? */
export function overlaps(a1: Date, a2: Date, b1: Date, b2: Date): boolean {
  return a1 < b2 && b1 < a2;
}

/** Quita los espacios nuevos que se cruzan con los existentes. */
export function withoutOverlaps<T extends { startsAt: Date; endsAt: Date }>(
  candidates: T[],
  existing: Array<{ startsAt: Date; endsAt: Date }>,
): T[] {
  return candidates.filter((c) => !existing.some((e) => overlaps(c.startsAt, c.endsAt, e.startsAt, e.endsAt)));
}

/** Para reservar o cancelar se exige un mínimo de anticipación (en horas). */
export function hasMinimumNotice(startsAt: Date, hours: number, now: Date = new Date()): boolean {
  return startsAt.getTime() - now.getTime() >= hours * 3_600_000;
}

/** Fechas (YYYY-MM-DD) de la misma semana repetida `weeks` veces: 2026-11-17 ×3 → 17, 24 de nov y 1 de dic. */
export function weeklyDates(date: string, weeks: number): string[] {
  const base = new Date(`${date}T12:00:00.000Z`);
  return Array.from({ length: Math.max(1, weeks) }, (_, k) => {
    const d = new Date(base.getTime() + k * 7 * 86_400_000);
    return d.toISOString().slice(0, 10);
  });
}
