import { SchoolWithStats } from '../types';
import { PlanCatalog } from '../api/useSuperAdmin';
import {
  DAY_MS,
  INACTIVE_DAYS,
  QUOTA_WARN_PERCENT,
  EXPIRY_WARN_DAYS,
  AttentionReason,
} from '../constants';
import { formatPeruShortDate } from '@/lib/dateUtils';

/** "hace 5 min", "hace 3 h", "hace 12 días" */
export const timeAgo = (iso: string | null | undefined, now = Date.now()): string | null => {
  if (!iso) return null;
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (minutes < 60) return minutes <= 1 ? 'hace un momento' : `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return `hace ${days} ${days === 1 ? 'día' : 'días'}`;
};

export const getQuotaOf = (s: SchoolWithStats, catalog?: PlanCatalog): number | null | undefined =>
  catalog?.plans[s.plan]?.studentQuota;

export const getQuotaPercent = (s: SchoolWithStats, catalog?: PlanCatalog): number | null => {
  const quota = getQuotaOf(s, catalog);
  return quota ? Math.round(((s._count?.students || 0) / quota) * 100) : null;
};

export const getAttentionReasons = (s: SchoolWithStats, catalog?: PlanCatalog): AttentionReason[] => {
  if (!s.isActive) return [];
  const reasons: AttentionReason[] = [];
  const st = s.planStatus;

  if (st?.access === 'BLOCKED') {
    reasons.push({ tone: 'danger', label: `Sin acceso · ${st.daysOverdue} d vencido` });
  } else if (st?.access === 'READ_ONLY') {
    reasons.push({ tone: 'danger', label: `Solo lectura · ${st.daysOverdue} d vencido` });
  } else if (st?.access === 'GRACE') {
    reasons.push({ tone: 'warn', label: `En gracia · ${st.daysOverdue} d vencido` });
  } else if (st?.daysUntilExpiry != null && st.daysUntilExpiry <= EXPIRY_WARN_DAYS) {
    reasons.push({
      tone: 'warn',
      label: st.daysUntilExpiry === 0 ? 'Vence hoy' : `Vence en ${st.daysUntilExpiry} d`,
    });
  }

  const pct = getQuotaPercent(s, catalog);
  if (pct !== null && pct >= QUOTA_WARN_PERCENT) {
    reasons.push({ tone: pct >= 100 ? 'danger' : 'info', label: `Cupo de alumnos al ${pct}%` });
  }

  const isNew = Boolean(s.createdAt) && Date.now() - new Date(s.createdAt!).getTime() < INACTIVE_DAYS * DAY_MS;
  const lastSeen = s.activity?.lastSeenAt;
  if (!isNew && (!lastSeen || Date.now() - new Date(lastSeen).getTime() > INACTIVE_DAYS * DAY_MS)) {
    reasons.push({
      tone: 'info',
      label: lastSeen ? `Sin uso desde ${formatPeruShortDate(lastSeen)}` : 'Sin uso registrado',
    });
  }

  return reasons;
};
