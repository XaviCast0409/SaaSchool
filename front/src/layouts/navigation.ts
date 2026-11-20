export type {
  Plan,
  NavTab,
  NavItem,
  NavSection,
  ResolvedNavItem,
  ResolvedNavSection,
  NavAudience,
  ResolveNavOptions,
} from './navigation/types';

export {
  ATTENDANCE_TABS,
  REPORT_TABS,
  TAB_GROUPS,
  type TabGroupKey,
} from './navigation/tabs';

export { superAdminNavSections } from './navigation/superAdminNav';
export { schoolNavSections } from './navigation/schoolNav';
export { parentNavSections } from './navigation/parentNav';
export { studentNavSections } from './navigation/studentNav';

export {
  PLAN_HIERARCHY,
  resolveNav,
  isNavItemActive,
  BOTTOM_NAV_PATHS,
  BOTTOM_NAV_LABELS,
} from './navigation/resolve';
