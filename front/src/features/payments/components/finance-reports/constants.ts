import { getPeruToday } from '@/lib/dateUtils';
export { CONCEPTS } from '../../constants';

export const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Setiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export const TABS = [
  ['statement', 'Estado de cuenta'],
  ['collections', 'Ingresos'],
  ['aging', 'Morosidad'],
  ['monthly', 'Resumen mensual'],
  ['adjustments', 'Descuentos y moras'],
  ['expenses', 'Egresos'],
] as const;

export type Tab = (typeof TABS)[number][0];

export const sel = 'rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground';

export const monthStart = () => `${getPeruToday().slice(0, 8)}01`;

export const studentName = (s: { firstNames: string; lastNamePaternal: string; lastNameMaternal?: string | null }) =>
  `${s.lastNamePaternal} ${s.lastNameMaternal ?? ''}, ${s.firstNames}`;
