import { OFFICE, STAFF } from '@/lib/roles';
import type { NavTab } from './types';

/** Las cuatro pantallas de asistencia viven bajo una sola entrada del menú */
export const ATTENDANCE_TABS: NavTab[] = [
  { label: 'Pase de lista', path: '/attendance', roles: STAFF },
  { label: 'Por curso', path: '/course-attendance', roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'] },
  { label: 'Justificaciones', path: '/attendance-justifications', roles: STAFF },
  { label: 'Alertas', path: '/attendance-alerts', roles: STAFF },
];

/** Los dos centros de reportes académicos, antes dos entradas con nombres casi iguales */
export const REPORT_TABS: NavTab[] = [
  { label: 'Notas y libretas', path: '/academic/reports', roles: OFFICE },
  { label: 'Catálogo de reportes', path: '/academic-reports', roles: STAFF },
];

export const TAB_GROUPS = {
  attendance: ATTENDANCE_TABS,
  reports: REPORT_TABS,
} as const;

export type TabGroupKey = keyof typeof TAB_GROUPS;
