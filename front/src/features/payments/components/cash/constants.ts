import { getPeruToday } from '@/lib/dateUtils';
import { type CashSessionStatus } from '../../types';

export const selectCls =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

export const filterSelectCls =
  'rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

export const SESSION_STATUS: Record<
  CashSessionStatus,
  { label: string; variant: 'success' | 'warning' | 'secondary' }
> = {
  OPEN: { label: 'Abierta', variant: 'warning' },
  CLOSED: { label: 'Cerrada (por revisar)', variant: 'secondary' },
  REVIEWED: { label: 'Revisada', variant: 'success' },
};

export const monthStart = () => `${getPeruToday().slice(0, 8)}01`;
