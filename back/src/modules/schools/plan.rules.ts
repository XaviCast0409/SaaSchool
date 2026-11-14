import type { SubscriptionPlan } from '@prisma/client';
import { dateOnlyKey, getSchoolTimeParts } from '../../utils/timezone.util';

/**
 * Catálogo único de planes de suscripción: precio de lista y cupo de alumnos.
 * Es la fuente de verdad para el back (cupos al matricular) y para el panel SuperAdmin
 * (se expone en GET /schools/plans). Un colegio puede tener un precio pactado distinto
 * en School.monthlyFee; si está vacío se usa el precio de lista.
 */
export const PLAN_CATALOG: Record<SubscriptionPlan, { label: string; monthlyPrice: number; studentQuota: number | null }> = {
  BASIC: { label: 'Básico', monthlyPrice: 400, studentQuota: 150 },
  PRO: { label: 'Pro', monthlyPrice: 650, studentQuota: 500 },
  ENTERPRISE: { label: 'Enterprise', monthlyPrice: 1200, studentQuota: null }, // null = ilimitado
};

/**
 * Ciclo de un plan vencido (días contados desde el día siguiente a la fecha de vencimiento,
 * en hora de Lima; el plan vale todo el día de su vencimiento):
 *  - días 1..PLAN_GRACE_DAYS          → GRACE: todo funciona, solo se avisa.
 *  - hasta PLAN_READ_ONLY_UNTIL_DAY   → READ_ONLY: se puede consultar, no registrar ni modificar.
 *  - después                          → BLOCKED: sin acceso a los datos del colegio.
 */
export const PLAN_GRACE_DAYS = 7;
export const PLAN_READ_ONLY_UNTIL_DAY = 30;

export type PlanAccess = 'ACTIVE' | 'GRACE' | 'READ_ONLY' | 'BLOCKED';

export interface PlanStatus {
  access: PlanAccess;
  /** Días que faltan para el vencimiento (0 = vence hoy). null si no tiene fecha o ya venció. */
  daysUntilExpiry: number | null;
  /** Días transcurridos desde el vencimiento (0 si está vigente). */
  daysOverdue: number;
  /** Fecha (YYYY-MM-DD) en que pasa a solo lectura / bloqueo. null si no tiene fecha. */
  readOnlyFrom: string | null;
  blockedFrom: string | null;
}

const DAY_MS = 86_400_000;

const addDays = (dateKey: string, days: number): string =>
  new Date(Date.parse(`${dateKey}T00:00:00.000Z`) + days * DAY_MS).toISOString().slice(0, 10);

export function getPlanStatus(planExpiresAt: Date | string | null | undefined, now: Date = new Date()): PlanStatus {
  if (!planExpiresAt) {
    return { access: 'ACTIVE', daysUntilExpiry: null, daysOverdue: 0, readOnlyFrom: null, blockedFrom: null };
  }

  // La fecha de vencimiento se guarda como medianoche UTC del día elegido (sin hora).
  const expiryKey = dateOnlyKey(new Date(planExpiresAt));
  const todayKey = getSchoolTimeParts(now).dateStr;
  const diff = Math.round((Date.parse(`${todayKey}T00:00:00.000Z`) - Date.parse(`${expiryKey}T00:00:00.000Z`)) / DAY_MS);

  const readOnlyFrom = addDays(expiryKey, PLAN_GRACE_DAYS + 1);
  const blockedFrom = addDays(expiryKey, PLAN_READ_ONLY_UNTIL_DAY + 1);

  if (diff <= 0) {
    return { access: 'ACTIVE', daysUntilExpiry: diff === 0 ? 0 : -diff, daysOverdue: 0, readOnlyFrom, blockedFrom };
  }

  const access: PlanAccess =
    diff <= PLAN_GRACE_DAYS ? 'GRACE' : diff <= PLAN_READ_ONLY_UNTIL_DAY ? 'READ_ONLY' : 'BLOCKED';
  return { access, daysUntilExpiry: null, daysOverdue: diff, readOnlyFrom, blockedFrom };
}

/** ¿El colegio puede registrar o modificar datos? (vigente o en días de gracia) */
export const planAllowsWrites = (access: PlanAccess): boolean => access === 'ACTIVE' || access === 'GRACE';

/** Cupo de alumnos del plan (Infinity si es ilimitado). */
export const studentQuotaFor = (plan: SubscriptionPlan | string): number => {
  const quota = PLAN_CATALOG[plan as SubscriptionPlan]?.studentQuota;
  if (quota === undefined) return PLAN_CATALOG.BASIC.studentQuota as number;
  return quota ?? Infinity;
};

/** Mensualidad efectiva: precio pactado del colegio o, si no hay, el de lista del plan. */
export const effectiveMonthlyFee = (school: { plan: SubscriptionPlan; monthlyFee?: unknown }): number => {
  if (school.monthlyFee !== null && school.monthlyFee !== undefined) return Number(school.monthlyFee);
  return PLAN_CATALOG[school.plan]?.monthlyPrice ?? PLAN_CATALOG.BASIC.monthlyPrice;
};

export const PLAN_READ_ONLY_MESSAGE =
  'La suscripción de tu colegio está vencida: la plataforma está en modo solo lectura. Puedes consultar la información, pero no registrar ni modificar datos hasta renovar. Contacta con administración.';

export const PLAN_BLOCKED_MESSAGE =
  'La suscripción de tu colegio venció y el acceso está suspendido. Contacta con administración para renovarla.';

/** Suma meses a una fecha 'YYYY-MM-DD'; si el día no existe en el mes destino, usa el último (31/01 + 1 → 28/02). */
export function addMonthsKey(dateKey: string, months: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

/**
 * Desde qué fecha corre una renovación:
 *  - vigente, en gracia o en solo lectura → desde su vencimiento (los días usados se pagan; renovar antes no hace perder días).
 *  - sin fecha (mensual indefinido) o ya bloqueado → desde hoy (hora de Lima).
 */
export function renewalBaseKey(planExpiresAt: Date | string | null | undefined, now: Date = new Date()): string {
  const todayKey = getSchoolTimeParts(now).dateStr;
  if (!planExpiresAt) return todayKey;
  if (getPlanStatus(planExpiresAt, now).access === 'BLOCKED') return todayKey;
  return dateOnlyKey(new Date(planExpiresAt));
}

/** Nueva fecha de vencimiento al pagar `months` meses. */
export const renewedExpiryKey = (planExpiresAt: Date | string | null | undefined, months: number, now: Date = new Date()): string =>
  addMonthsKey(renewalBaseKey(planExpiresAt, now), months);
