import { parentNavSections } from './parentNav';
import { schoolNavSections } from './schoolNav';
import { studentNavSections } from './studentNav';
import { superAdminNavSections } from './superAdminNav';
import type { NavAudience, ResolvedNavItem, ResolvedNavSection, ResolveNavOptions } from './types';

export const PLAN_HIERARCHY: Record<string, number> = { BASIC: 1, PRO: 2, ENTERPRISE: 3 };

export const resolveNav = ({ audience, role, planLevel, showLocked }: ResolveNavOptions): ResolvedNavSection[] => {
  const source =
    audience === 'platform'
      ? superAdminNavSections
      : audience === 'student'
        ? studentNavSections
        : audience === 'parent'
          ? parentNavSections
          : schoolNavSections;

  return source
    .map((section) => ({
      title: section.title,
      items: section.items.flatMap<ResolvedNavItem>((item) => {
        if (!item.roles.includes(role)) return [];
        const tabs = item.tabs?.filter((tab) => tab.roles.includes(role));
        if (item.tabs && !tabs?.length) return [];

        const hasPlan = role === 'SUPER_ADMIN' || planLevel >= (PLAN_HIERARCHY[item.minPlan] || 1);
        if (!hasPlan && !showLocked) return [];

        // Una entrada con pestañas abre la primera que el rol puede ver
        const path = tabs?.[0]?.path ?? item.path;
        return [
          {
            ...item,
            path,
            tabs,
            locked: !hasPlan,
            matchPaths: tabs ? tabs.map((tab) => tab.path) : [path],
          },
        ];
      }),
    }))
    .filter((section) => section.items.length > 0);
};

export const isNavItemActive = (item: ResolvedNavItem, pathname: string): boolean =>
  item.matchPaths.includes(pathname) || Boolean(item.matchPrefixes?.some((prefix) => pathname.startsWith(prefix)));

/** Accesos de la barra inferior del celular, en orden de preferencia (se toman los 4 primeros disponibles) */
export const BOTTOM_NAV_PATHS: Record<NavAudience, string[]> = {
  platform: [],
  parent: ['/dashboard', '/attendance', '/announcements', '/payments', '/messages'],
  student: ['/dashboard', '/virtual-classroom', '/grades', '/attendance', '/announcements', '/schedule'],
  school: ['/dashboard', '/attendance', '/my-courses', '/payments', '/messages', '/announcements'],
};

/** Etiquetas cortas para la barra inferior */
export const BOTTOM_NAV_LABELS: Record<string, string> = {
  '/dashboard': 'Inicio',
  '/attendance': 'Asistencia',
  '/announcements': 'Avisos',
  '/payments': 'Pagos',
  '/messages': 'Mensajes',
  '/virtual-classroom': 'Aula',
  '/grades': 'Notas',
  '/schedule': 'Horario',
  '/my-courses': 'Cursos',
};
