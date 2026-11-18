import type { StatusTone } from '@/components/ui/status-badge';
import type { AttendanceStatus } from './types';

export interface AttendanceStatusItemConfig {
  label: string;
  short: string;
  tone: StatusTone;
  activeClass: string;
}

export const ATTENDANCE_STATUS_CONFIG: Record<AttendanceStatus, AttendanceStatusItemConfig> = {
  PRESENT: {
    label: 'Presente',
    short: 'P',
    tone: 'success',
    activeClass: 'bg-emerald-600 text-white font-bold shadow-sm border-emerald-600',
  },
  ABSENT_UNJUSTIFIED: {
    label: 'Falta Injustificada',
    short: 'FI',
    tone: 'danger',
    activeClass: 'bg-destructive text-destructive-foreground font-bold shadow-sm border-destructive',
  },
  ABSENT_JUSTIFIED: {
    label: 'Falta Justificada',
    short: 'FJ',
    tone: 'warning',
    activeClass: 'bg-amber-600 text-white font-bold shadow-sm border-amber-600',
  },
  LATE_UNJUSTIFIED: {
    label: 'Tardanza Injustificada',
    short: 'TI',
    tone: 'warning',
    activeClass: 'bg-amber-500 text-white font-bold shadow-sm border-amber-500',
  },
  LATE_JUSTIFIED: {
    label: 'Tardanza Justificada',
    short: 'TJ',
    tone: 'info',
    activeClass: 'bg-sky-600 text-white font-bold shadow-sm border-sky-600',
  },
};

export const ATTENDANCE_STATUS_ORDER: AttendanceStatus[] = [
  'PRESENT',
  'ABSENT_UNJUSTIFIED',
  'ABSENT_JUSTIFIED',
  'LATE_UNJUSTIFIED',
  'LATE_JUSTIFIED',
];
