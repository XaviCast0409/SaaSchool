import type React from 'react';
import {
  Wallet,
  Percent,
  Receipt,
  BarChart3,
  GraduationCap,
  Users,
  CreditCard,
  BookOpenCheck,
  BookOpen,
  CalendarCheck,
  Calendar,
  LayoutDashboard,
  Megaphone,
  School as SchoolIcon,
  ShieldCheck,
  ShieldAlert,
  SlidersHorizontal,
  Laptop,
  FileSpreadsheet,
  History,
  ClipboardList,
  Bot,
  MessagesSquare,
  CalendarClock,
  CalendarDays,
  Clock3,
  DoorOpen,
  Activity,
  Library,
  Inbox,
  FileText,
} from 'lucide-react';

export type Plan = 'BASIC' | 'PRO' | 'ENTERPRISE';

export const PLAN_HIERARCHY: Record<string, number> = { BASIC: 1, PRO: 2, ENTERPRISE: 3 };

const STAFF = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'];
const OFFICE = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'];
const DIRECTION = ['SUPER_ADMIN', 'SCHOOL_ADMIN'];

/** Pestaña de una sección que agrupa varias pantallas (p. ej. Asistencia) */
export interface NavTab {
  label: string;
  path: string;
  roles: string[];
}

export interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
  minPlan: Plan;
  /** Pantallas que cuelgan de esta entrada y se muestran como pestañas */
  tabs?: NavTab[];
  /** Rutas hijas que también marcan la entrada como activa */
  matchPrefixes?: string[];
  /** Palabras extra para el buscador (Ctrl+K) */
  keywords?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

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

// SuperAdmin en modo SaaS puro: solo herramientas de negocio de plataforma
const superAdminNavSections: NavSection[] = [
  {
    title: 'Plataforma SaaS',
    items: [
      { label: 'Torre de Control SaaS', path: '/super-admin', icon: ShieldCheck, roles: ['SUPER_ADMIN'], minPlan: 'BASIC', matchPrefixes: ['/super-admin/schools/'], keywords: 'colegios clientes' },
      { label: 'Avisos a colegios', path: '/super-admin/announcements', icon: Megaphone, roles: ['SUPER_ADMIN'], minPlan: 'BASIC' },
      { label: 'Leads de la web', path: '/super-admin/leads', icon: Inbox, roles: ['SUPER_ADMIN'], minPlan: 'BASIC', keywords: 'contactos ventas' },
      { label: 'Salud del sistema', path: '/super-admin/health', icon: Activity, roles: ['SUPER_ADMIN'], minPlan: 'BASIC' },
    ],
  },
];

// Menú del personal del colegio, por área de trabajo
const schoolNavSections: NavSection[] = [
  {
    title: 'Día a día',
    items: [
      { label: 'Inicio', path: '/dashboard', icon: LayoutDashboard, roles: STAFF, minPlan: 'BASIC', keywords: 'dashboard panel resumen' },
      { label: 'Asistencia', path: '/attendance', icon: CalendarCheck, roles: STAFF, minPlan: 'BASIC', tabs: ATTENDANCE_TABS, keywords: 'kiosco qr tardanzas faltas' },
      { label: 'Portería', path: '/gate', icon: DoorOpen, roles: OFFICE, minPlan: 'BASIC', keywords: 'recojo salidas aún en el colegio' },
      { label: 'Agenda e incidencias', path: '/incidents', icon: ShieldAlert, roles: STAFF, minPlan: 'BASIC', keywords: 'conducta siseve' },
      { label: 'Horario de clases', path: '/schedule', icon: Clock3, roles: STAFF, minPlan: 'BASIC' },
      { label: 'Calendario escolar', path: '/calendar', icon: CalendarDays, roles: STAFF, minPlan: 'BASIC', keywords: 'feriados eventos' },
    ],
  },
  {
    title: 'Comunicación',
    items: [
      { label: 'Muro de comunicados', path: '/announcements', icon: Megaphone, roles: STAFF, minPlan: 'BASIC', keywords: 'avisos circulares' },
      { label: 'Mensajes', path: '/messages', icon: MessagesSquare, roles: STAFF, minPlan: 'BASIC', keywords: 'chat' },
      // Secretaría no: las familias solo reservan con el tutor, los docentes del aula o Dirección
      { label: 'Entrevistas', path: '/meetings', icon: CalendarClock, roles: ['SCHOOL_ADMIN', 'TEACHER'], minPlan: 'BASIC', keywords: 'citas reuniones padres' },
    ],
  },
  {
    title: 'Alumnos y familias',
    items: [
      { label: 'Alumnos y matrícula', path: '/students', icon: GraduationCap, roles: OFFICE, minPlan: 'BASIC', keywords: 'siagie estudiantes nómina carnets familias apoderados padres' },
      { label: 'Personal del colegio', path: '/directory', icon: Users, roles: DIRECTION, minPlan: 'BASIC', keywords: 'directorio docentes secretaría usuarios contratación' },
      { label: 'Secretaría', path: '/secretariat', icon: Inbox, roles: OFFICE, minPlan: 'BASIC', keywords: 'trámites admisión reclamaciones' },
    ],
  },
  {
    title: 'Académico',
    items: [
      { label: 'Inicio académico', path: '/academic', icon: GraduationCap, roles: DIRECTION, minPlan: 'BASIC' },
      { label: 'Mis cursos', path: '/my-courses', icon: BookOpen, roles: ['TEACHER'], minPlan: 'BASIC', matchPrefixes: ['/gradebook/'], keywords: 'notas registro' },
      { label: 'Plan de estudios', path: '/academic/study-plan', icon: BookOpen, roles: DIRECTION, minPlan: 'BASIC', keywords: 'áreas curriculares cursos' },
      { label: 'Carga docente', path: '/academic/teaching-load', icon: Users, roles: DIRECTION, minPlan: 'BASIC', keywords: 'asignaciones' },
      { label: 'Avance y cierre', path: '/academic/progress', icon: ClipboardList, roles: DIRECTION, minPlan: 'PRO', keywords: 'bimestre periodo' },
      {
        label: 'Reportes académicos',
        path: '/academic/reports',
        icon: FileSpreadsheet,
        roles: STAFF,
        minPlan: 'PRO',
        tabs: REPORT_TABS,
        matchPrefixes: ['/academic/report-cards/', '/academic/tutor-report'],
        keywords: 'libretas consolidado mérito nóminas',
      },
      { label: 'Analítica y tutoría', path: '/insights', icon: Activity, roles: STAFF, minPlan: 'PRO', keywords: 'riesgo seguimiento' },
      { label: 'Recursos docentes', path: '/teacher-resources', icon: Library, roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'], minPlan: 'BASIC', keywords: 'rúbricas banco' },
      { label: 'Aula virtual (supervisión)', path: '/virtual-classroom-supervision', icon: Laptop, roles: OFFICE, minPlan: 'PRO' },
    ],
  },
  {
    title: 'Tesorería y caja',
    items: [
      { label: 'Cobranzas y pensiones', path: '/payments', icon: CreditCard, roles: OFFICE, minPlan: 'BASIC', keywords: 'pagos deudas' },
      { label: 'Caja diaria', path: '/payments/cash', icon: Wallet, roles: OFFICE, minPlan: 'BASIC', keywords: 'arqueo egresos' },
      { label: 'Tarifario', path: '/payments/fee-schedules', icon: Receipt, roles: OFFICE, minPlan: 'BASIC', keywords: 'precios pensiones' },
      { label: 'Becas y moras', path: '/payments/benefits', icon: Percent, roles: OFFICE, minPlan: 'BASIC', keywords: 'descuentos' },
      { label: 'Reportes financieros', path: '/payments/reports', icon: BarChart3, roles: OFFICE, minPlan: 'BASIC', keywords: 'estado de cuenta morosidad' },
    ],
  },
  {
    title: 'Configuración',
    items: [
      { label: 'Años lectivos', path: '/academic-years', icon: Calendar, roles: DIRECTION, minPlan: 'BASIC' },
      { label: 'Aulas y secciones', path: '/classrooms', icon: SchoolIcon, roles: DIRECTION, minPlan: 'BASIC', keywords: 'salones grados' },
      { label: 'Criterios y escala', path: '/evaluation-criteria', icon: SlidersHorizontal, roles: DIRECTION, minPlan: 'PRO', keywords: 'evaluación calificación' },
      { label: 'Automatizaciones', path: '/automations', icon: Bot, roles: DIRECTION, minPlan: 'BASIC', keywords: 'recordatorios' },
      { label: 'Bitácora', path: '/audit-logs', icon: History, roles: DIRECTION, minPlan: 'BASIC', keywords: 'auditoría historial cambios' },
    ],
  },
];

// Menú exclusivo y directo para Apoderados (Portal Familiar)
const parentNavSections: NavSection[] = [
  {
    title: 'Portal Familiar',
    items: [
      { label: 'Inicio (Mis hijos)', path: '/dashboard', icon: Users, roles: ['PARENT'], minPlan: 'BASIC' },
      { label: 'Asistencia escolar', path: '/attendance', icon: CalendarCheck, roles: ['PARENT'], minPlan: 'BASIC' },
      { label: 'Comunicados', path: '/announcements', icon: Megaphone, roles: ['PARENT'], minPlan: 'BASIC' },
      { label: 'Horario', path: '/schedule', icon: Clock3, roles: ['PARENT'], minPlan: 'BASIC' },
      { label: 'Calendario', path: '/calendar', icon: CalendarDays, roles: ['PARENT'], minPlan: 'BASIC' },
      { label: 'Mensajes', path: '/messages', icon: MessagesSquare, roles: ['PARENT'], minPlan: 'BASIC' },
      { label: 'Entrevistas', path: '/meetings', icon: CalendarClock, roles: ['PARENT'], minPlan: 'BASIC' },
      { label: 'Mis pagos y pensiones', path: '/payments', icon: CreditCard, roles: ['PARENT'], minPlan: 'BASIC' },
      { label: 'Trámites', path: '/procedures', icon: FileText, roles: ['PARENT'], minPlan: 'BASIC' },
      { label: 'Libreta de calificaciones', path: '/grades', icon: BookOpenCheck, roles: ['PARENT'], minPlan: 'PRO', keywords: 'notas' },
      { label: 'Aula virtual / Clases', path: '/virtual-classroom', icon: GraduationCap, roles: ['PARENT'], minPlan: 'PRO', keywords: 'tareas' },
    ],
  },
];

// Menú exclusivo y seguro para Estudiantes (Cero Deudas / Cero Finanzas)
const studentNavSections: NavSection[] = [
  {
    title: 'Mochila del Alumno',
    items: [
      { label: 'Mi mochila digital', path: '/dashboard', icon: LayoutDashboard, roles: ['STUDENT', 'PARENT'], minPlan: 'BASIC' },
      { label: 'Aula virtual / Cursos', path: '/virtual-classroom', icon: GraduationCap, roles: ['STUDENT', 'PARENT'], minPlan: 'PRO', keywords: 'tareas' },
      { label: 'Mis calificaciones', path: '/grades', icon: BookOpenCheck, roles: ['STUDENT', 'PARENT'], minPlan: 'PRO', keywords: 'notas' },
      { label: 'Mi asistencia', path: '/attendance', icon: CalendarCheck, roles: ['STUDENT', 'PARENT'], minPlan: 'BASIC' },
      { label: 'Mi horario', path: '/schedule', icon: Clock3, roles: ['STUDENT'], minPlan: 'BASIC' },
      { label: 'Calendario', path: '/calendar', icon: CalendarDays, roles: ['STUDENT'], minPlan: 'BASIC' },
      { label: 'Avisos y comunicados', path: '/announcements', icon: Megaphone, roles: ['STUDENT', 'PARENT'], minPlan: 'BASIC' },
    ],
  },
];

/** Entrada del menú ya resuelta para el usuario actual */
export interface ResolvedNavItem extends NavItem {
  /** El plan del colegio no la incluye: se muestra con candado en vez de ocultarse */
  locked: boolean;
  /** Todas las rutas que la marcan como activa */
  matchPaths: string[];
}

export interface ResolvedNavSection {
  title: string;
  items: ResolvedNavItem[];
}

export type NavAudience = 'platform' | 'student' | 'parent' | 'school';

interface ResolveNavOptions {
  audience: NavAudience;
  role: string;
  planLevel: number;
  /** Quien decide la suscripción ve con candado lo que el plan no incluye */
  showLocked: boolean;
}

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
