import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Wallet,
  Percent,
  BarChart3,
  GraduationCap,
  Users,
  CreditCard,
  BookOpenCheck,
  BookOpen,
  CalendarCheck,
  Calendar,
  LayoutDashboard,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  Megaphone,
  Settings,
  School as SchoolIcon,
  ShieldCheck,
  ShieldAlert,
  SlidersHorizontal,
  Laptop,
  FileSpreadsheet,
  History,
  FileCheck2,
  AlertTriangle,
  ClipboardCheck,
  ClipboardList,
  Bot,
  BellRing,
  MessagesSquare,
  CalendarClock,
  CalendarDays,
  Clock3,
  DoorOpen,
  Activity,
  Library,
} from 'lucide-react';
import { useFinanceAccess } from '@/features/payments/api/usePayments';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGetActiveSchool } from '@/features/schools/api/useSchool';
import { SchoolSettingsModal } from '@/features/schools/components/SchoolSettingsModal';
import { ChangePasswordModal } from '@/features/auth/components/ChangePasswordModal';
import { ConsentGate } from '@/features/legal/components/ConsentGate';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { MobilePushBanner } from '@/features/notifications/components/MobilePushBanner';
import { applyBrandColor } from '@/lib/brandColor';
import { useUnreadMessages } from '@/features/messages/api/useMessages';
import { usePendingReportsCount } from '@/features/payment-reports/api/usePaymentReports';
import { Toaster } from 'sonner';

export const DashboardLayout: React.FC = () => {
  const { user, logout, impersonatedSchool, setImpersonatedSchool } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const canMessage = Boolean(user && user.role !== 'STUDENT' && !(user.role === 'SUPER_ADMIN' && !impersonatedSchool));
  const { data: unreadMessages = 0 } = useUnreadMessages(canMessage);
  const isTreasury = Boolean(user && ['SCHOOL_ADMIN', 'ADMINISTRATIVE'].includes(user.role)) || Boolean(user?.role === 'SUPER_ADMIN' && impersonatedSchool);
  // El contador de vouchers por validar solo aplica a quien puede validarlos o verlos (no al cajero)
  const { data: financeAccess } = useFinanceAccess(isTreasury);
  const canSeeVouchers = isTreasury && Boolean(financeAccess?.can.manage || financeAccess?.can.view);
  const { data: pendingReports = 0 } = usePendingReportsCount(canSeeVouchers);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const { data: school } = useGetActiveSchool();

  useEffect(() => {
    applyBrandColor(school?.brandColor ?? null);
    return () => applyBrandColor(null);
  }, [school?.brandColor]);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isImpersonating = !!impersonatedSchool;

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const PLAN_HIERARCHY: Record<string, number> = {
    BASIC: 1,
    PRO: 2,
    ENTERPRISE: 3,
  };

  const currentPlan = (isImpersonating ? impersonatedSchool.plan : school?.plan) || 'BASIC';
  const currentPlanLevel = PLAN_HIERARCHY[currentPlan] || 1;
  const userRole = user?.role || 'PARENT';

  interface NavItem {
    label: string;
    path: string;
    icon: React.ComponentType<{ className?: string }>;
    roles: string[];
    minPlan: string;
  }

  interface NavSection {
    title: string;
    items: NavItem[];
  }

  // SuperAdmin en modo SaaS puro: solo herramientas de negocio de plataforma
  const superAdminNavSections: NavSection[] = [
    {
      title: 'Plataforma SaaS',
      items: [
        { label: 'Torre de Control SaaS', path: '/super-admin', icon: ShieldCheck, roles: ['SUPER_ADMIN'], minPlan: 'BASIC' },
      ],
    },
  ];

  // Menú estructurado por áreas de gestión
  const schoolNavSections: NavSection[] = [
    {
      title: 'Operación Diaria',
      items: [
        {
          label: 'Dashboard',
          path: '/dashboard',
          icon: LayoutDashboard,
          roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'],
          minPlan: 'BASIC',
        },
        {
          label: 'Asistencia y Kiosco QR',
          path: '/attendance',
          icon: CalendarCheck,
          roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'],
          minPlan: 'BASIC',
        },
        {
          label: 'Portería (salidas)',
          path: '/gate',
          icon: DoorOpen,
          roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'],
          minPlan: 'BASIC',
        },
        {
          label: 'Justificaciones',
          path: '/attendance-justifications',
          icon: FileCheck2,
          roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'],
          minPlan: 'BASIC',
        },
        {
          label: 'Alertas de asistencia',
          path: '/attendance-alerts',
          icon: AlertTriangle,
          roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'],
          minPlan: 'BASIC',
        },
        {
          label: 'Asistencia por curso',
          path: '/course-attendance',
          icon: ClipboardCheck,
          roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'],
          minPlan: 'BASIC',
        },
        {
          label: 'Muro de Comunicados',
          path: '/announcements',
          icon: Megaphone,
          roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'],
          minPlan: 'BASIC',
        },
        {
          label: 'Mensajes',
          path: '/messages',
          icon: MessagesSquare,
          roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'],
          minPlan: 'BASIC',
        },
        {
          label: 'Entrevistas',
          path: '/meetings',
          icon: CalendarClock,
          roles: ['SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'],
          minPlan: 'BASIC',
        },
        {
          label: 'Calendario escolar',
          path: '/calendar',
          icon: CalendarDays,
          roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'],
          minPlan: 'BASIC',
        },
        {
          label: 'Horario de clases',
          path: '/schedule',
          icon: Clock3,
          roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'],
          minPlan: 'BASIC',
        },
        {
          label: 'Directorio y Familias',
          path: '/directory',
          icon: Users,
          roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN'],
          minPlan: 'BASIC',
        },
        {
          label: 'Agenda e Incidencias',
          path: '/incidents',
          icon: ShieldAlert,
          roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'],
          minPlan: 'BASIC',
        },
      ],
    },
    {
      title: 'Académico',
      items: [
        {
          label: 'Inicio académico',
          path: '/academic',
          icon: GraduationCap,
          roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN'],
          minPlan: 'BASIC',
        },
        {
          label: 'Plan de estudios',
          path: '/academic/study-plan',
          icon: BookOpen,
          roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN'],
          minPlan: 'BASIC',
        },
        {
          label: 'Carga docente',
          path: '/academic/teaching-load',
          icon: Users,
          roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN'],
          minPlan: 'BASIC',
        },
        {
          label: 'Mis cursos',
          path: '/my-courses',
          icon: BookOpen,
          roles: ['TEACHER'],
          minPlan: 'BASIC',
        },
        {
          label: 'Recursos docentes',
          path: '/teacher-resources',
          icon: Library,
          roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'],
          minPlan: 'BASIC',
        },
        {
          label: 'Analítica y tutoría',
          path: '/insights',
          icon: Activity,
          roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'],
          minPlan: 'PRO',
        },
        {
          label: 'Avance y cierre',
          path: '/academic/progress',
          icon: ClipboardList,
          roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN'],
          minPlan: 'PRO',
        },
        {
          label: 'Reportes académicos',
          path: '/academic/reports',
          icon: FileSpreadsheet,
          roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'],
          minPlan: 'PRO',
        },
        {
          label: 'Matrícula SIAGIE (Alumnos)',
          path: '/students',
          icon: GraduationCap,
          roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'],
          minPlan: 'BASIC',
        },
        {
          label: 'Aula Virtual (Supervisión)',
          path: '/virtual-classroom-supervision',
          icon: Laptop,
          roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'],
          minPlan: 'PRO',
        },
        {
          label: 'Otros reportes',
          path: '/academic-reports',
          icon: FileSpreadsheet,
          roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'],
          minPlan: 'PRO',
        },
        {
          label: 'Bitácora',
          path: '/audit-logs',
          icon: History,
          roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN'],
          minPlan: 'BASIC',
        },
      ],
    },
    {
      title: 'Tesorería y Caja',
      items: [
        {
          label: 'Cobranzas y Pensiones',
          path: '/payments',
          icon: CreditCard,
          roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'],
          minPlan: 'BASIC',
        },
        {
          label: 'Caja diaria',
          path: '/payments/cash',
          icon: Wallet,
          roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'],
          minPlan: 'BASIC',
        },
        {
          label: 'Becas y moras',
          path: '/payments/benefits',
          icon: Percent,
          roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'],
          minPlan: 'BASIC',
        },
        {
          label: 'Reportes financieros',
          path: '/payments/reports',
          icon: BarChart3,
          roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'],
          minPlan: 'BASIC',
        },
      ],
    },
    {
      title: 'Configuración Escolar',
      items: [
        {
          label: 'Años Lectivos',
          path: '/academic-years',
          icon: Calendar,
          roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN'],
          minPlan: 'BASIC',
        },
        {
          label: 'Aulas y Secciones',
          path: '/classrooms',
          icon: SchoolIcon,
          roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN'],
          minPlan: 'BASIC',
        },
        {
          label: 'Criterios y escala',
          path: '/evaluation-criteria',
          icon: SlidersHorizontal,
          roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN'],
          minPlan: 'PRO',
        },
        {
          label: 'Automatizaciones',
          path: '/automations',
          icon: Bot,
          roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN'],
          minPlan: 'BASIC',
        },
      ],
    },
  ];

  // Menú exclusivo y directo para Apoderados (Portal Familiar)
  const parentNavSections: NavSection[] = [
    {
      title: 'Portal Familiar',
      items: [
        {
          label: 'Inicio (Mis Hijos)',
          path: '/dashboard',
          icon: Users,
          roles: ['PARENT'],
          minPlan: 'BASIC',
        },
        {
          label: 'Asistencia Escolar',
          path: '/attendance',
          icon: CalendarCheck,
          roles: ['PARENT'],
          minPlan: 'BASIC',
        },
        {
          label: 'Comunicados',
          path: '/announcements',
          icon: Megaphone,
          roles: ['PARENT'],
          minPlan: 'BASIC',
        },
        {
          label: 'Horario',
          path: '/schedule',
          icon: Clock3,
          roles: ['PARENT'],
          minPlan: 'BASIC',
        },
        {
          label: 'Calendario',
          path: '/calendar',
          icon: CalendarDays,
          roles: ['PARENT'],
          minPlan: 'BASIC',
        },
        {
          label: 'Mensajes',
          path: '/messages',
          icon: MessagesSquare,
          roles: ['PARENT'],
          minPlan: 'BASIC',
        },
        {
          label: 'Entrevistas',
          path: '/meetings',
          icon: CalendarClock,
          roles: ['PARENT'],
          minPlan: 'BASIC',
        },
        {
          label: 'Mis Pagos y Pensiones',
          path: '/payments',
          icon: CreditCard,
          roles: ['PARENT'],
          minPlan: 'BASIC',
        },
        {
          label: 'Libreta de Calificaciones',
          path: '/grades',
          icon: BookOpenCheck,
          roles: ['PARENT'],
          minPlan: 'PRO',
        },
        {
          label: 'Aula Virtual / Clases',
          path: '/virtual-classroom',
          icon: GraduationCap,
          roles: ['PARENT'],
          minPlan: 'PRO',
        },
      ],
    },
  ];

  const isStudent = userRole === 'STUDENT' || Boolean(
    user?.email &&
      (user.email.toLowerCase().includes('alumno') || user.email.toLowerCase().includes('estudiante')),
  );

  // Menú exclusivo y seguro para Estudiantes (Cero Deudas / Cero Finanzas)
  const studentNavSections: NavSection[] = [
    {
      title: 'Mochila del Alumno',
      items: [
        {
          label: 'Mi Mochila Digital',
          path: '/dashboard',
          icon: LayoutDashboard,
          roles: ['STUDENT', 'PARENT'],
          minPlan: 'BASIC',
        },
        {
          label: 'Aula Virtual / Cursos',
          path: '/virtual-classroom',
          icon: GraduationCap,
          roles: ['STUDENT', 'PARENT'],
          minPlan: 'PRO',
        },
        {
          label: 'Mis Calificaciones',
          path: '/grades',
          icon: BookOpenCheck,
          roles: ['STUDENT', 'PARENT'],
          minPlan: 'PRO',
        },
        {
          label: 'Mi Asistencia',
          path: '/attendance',
          icon: CalendarCheck,
          roles: ['STUDENT', 'PARENT'],
          minPlan: 'BASIC',
        },
        {
          label: 'Mi horario',
          path: '/schedule',
          icon: Clock3,
          roles: ['STUDENT'],
          minPlan: 'BASIC',
        },
        {
          label: 'Calendario',
          path: '/calendar',
          icon: CalendarDays,
          roles: ['STUDENT'],
          minPlan: 'BASIC',
        },
        {
          label: 'Avisos y Comunicados',
          path: '/announcements',
          icon: Megaphone,
          roles: ['STUDENT', 'PARENT'],
          minPlan: 'BASIC',
        },
      ],
    },
  ];

  const navSections = (
    isSuperAdmin && !isImpersonating
      ? superAdminNavSections
      : isStudent
      ? studentNavSections
      : userRole === 'PARENT'
      ? parentNavSections
      : schoolNavSections
  )
    .map((section) => ({
      title: section.title,
      items: section.items.filter((item) => {
        const hasRole = item.roles.includes(userRole);
        const requiredLevel = PLAN_HIERARCHY[item.minPlan] || 1;
        const hasPlan = userRole === 'SUPER_ADMIN' || currentPlanLevel >= requiredLevel;
        return hasRole && hasPlan;
      }),
    }))
    .filter((section) => section.items.length > 0);

  const canManageSchool = isImpersonating || userRole === 'SCHOOL_ADMIN';

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card print:hidden">
        <div className="flex items-center gap-2.5">
          {isSuperAdmin && !isImpersonating ? (
            <ShieldCheck className="w-6 h-6 text-primary" />
          ) : (isImpersonating ? impersonatedSchool.logoUrl : school?.logoUrl) ? (
            <img
              src={(isImpersonating ? impersonatedSchool.logoUrl : school?.logoUrl)!}
              alt={isImpersonating ? impersonatedSchool.name : (school?.name || 'Logo institucional')}
              className="w-7 h-7 object-contain rounded-md"
            />
          ) : (
            <GraduationCap className="w-6 h-6 text-primary" />
          )}
          <span className="font-bold text-base truncate max-w-[180px]">
            {isSuperAdmin && !isImpersonating
              ? 'SaaSchool Platform'
              : isImpersonating
              ? impersonatedSchool.name
              : school?.name || 'SaaSchool'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <NotificationBell />
          <Button
            variant="ghost"
            size="icon"
            aria-label={isMobileOpen ? 'Cerrar menú lateral' : 'Abrir menú lateral'}
            onClick={() => setIsMobileOpen(!isMobileOpen)}
          >
            {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`w-full md:w-64 border-r border-border bg-card flex flex-col justify-between shrink-0 transition-all md:h-screen md:sticky md:top-0 print:hidden ${
          isMobileOpen ? 'block' : 'hidden md:flex'
        }`}
      >
        <div className="p-4 space-y-5 flex-1 overflow-y-auto">
          {/* Dynamic School Brand Header */}
          <div className="hidden md:flex items-center gap-3 px-1 py-1">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
              {isSuperAdmin && !isImpersonating ? (
                <ShieldCheck className="w-5 h-5 text-primary" />
              ) : (isImpersonating ? impersonatedSchool.logoUrl : school?.logoUrl) ? (
                <img
                  src={(isImpersonating ? impersonatedSchool.logoUrl : school?.logoUrl)!}
                  alt={isImpersonating ? impersonatedSchool.name : school?.name}
                  className="w-full h-full object-contain p-1"
                />
              ) : (
                <GraduationCap className="w-5 h-5 text-primary" />
              )}
            </div>
            <div className="overflow-hidden">
              <h1 className="font-bold text-sm leading-tight truncate text-foreground">
                {isSuperAdmin && !isImpersonating
                  ? 'SaaSchool Platform'
                  : isImpersonating
                  ? impersonatedSchool.name
                  : school?.name || 'SaaSchool'}
              </h1>
              <span className="text-[10px] text-muted-foreground font-medium block truncate">
                {isSuperAdmin && !isImpersonating
                  ? 'Torre de Control SaaS'
                  : isImpersonating
                  ? 'Modo Soporte Técnico'
                  : 'Plataforma Escolar SaaS'}
              </span>
            </div>
          </div>

          {/* User & School Context Pill */}
          {user && (
            <div className="p-3 rounded-xl bg-secondary/40 border border-border/60 space-y-1.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold truncate text-foreground">
                  {user?.firstName} {user?.lastNamePaternal}
                </span>
                <Badge variant={user?.role === 'SCHOOL_ADMIN' || user?.role === 'SUPER_ADMIN' ? 'default' : 'secondary'} className="text-[9px] px-1.5 py-0 font-bold">
                  {user?.role || 'USER'}
                </Badge>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
                {isSuperAdmin && !isImpersonating ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="truncate font-semibold text-primary">Plataforma Global</span>
                  </>
                ) : (
                  <>
                    <SchoolIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="truncate font-medium">{isImpersonating ? impersonatedSchool.name : school?.name || 'Colegio'}</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Navigation Links Grouped by Domain */}
          <nav className="space-y-4">
            {navSections.map((section) => (
              <div key={section.title} className="space-y-1">
                <div className="px-2 pt-1 pb-0.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {section.title}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsMobileOpen(false)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25'
                            : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                        {item.path === '/payments' && canSeeVouchers && pendingReports > 0 && (
                          <span
                            className={`ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-bold ${isActive ? 'bg-primary-foreground text-primary' : 'bg-amber-500 text-white'}`}
                            aria-label={`${pendingReports} pagos por validar`}
                          >
                            {pendingReports}
                          </span>
                        )}
                        {item.path === '/messages' && unreadMessages > 0 && (
                          <span
                            className={`ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-bold ${isActive ? 'bg-primary-foreground text-primary' : 'bg-primary text-primary-foreground'}`}
                            aria-label={`${unreadMessages} mensajes sin leer`}
                          >
                            {unreadMessages > 99 ? '99+' : unreadMessages}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer Controls */}
        <div className="p-4 border-t border-border space-y-2">
          {canManageSchool && (
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2 text-xs rounded-xl"
              onClick={() => setIsSettingsOpen(true)}
            >
              <Settings className="w-4 h-4 text-primary" />
              <span>Ajustes del Colegio</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 text-xs rounded-xl"
            onClick={() => {
              navigate('/notification-preferences');
              setIsMobileOpen(false);
            }}
          >
            <BellRing className="w-4 h-4 text-primary" />
            <span>Mis notificaciones</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 text-xs rounded-xl"
            onClick={toggleTheme}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
            <span>Modo {isDarkMode ? 'Claro' : 'Oscuro'}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive rounded-xl"
            onClick={logout}
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Support Mode Top Banner */}
        {isSuperAdmin && isImpersonating && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2.5 text-xs flex flex-wrap items-center justify-between gap-3 text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong>Modo Soporte Técnico:</strong> Visualizando la operativa de <strong>{impersonatedSchool.name}</strong>
              </span>
              <Badge variant="outline" className="text-[10px] bg-amber-500/10 border-amber-500/30 font-bold">
                Plan {impersonatedSchool.plan}
              </Badge>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setImpersonatedSchool(null);
                navigate('/super-admin');
              }}
              className="h-6 text-xs bg-background hover:bg-muted text-foreground border-amber-500/40 font-medium"
            >
              Salir al Panel SaaS
            </Button>
          </div>
        )}

        {/* Desktop Header Bar with Context & NotificationBell */}
        <header className="hidden md:flex items-center justify-between px-8 py-3.5 border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-30 print:hidden">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">
              {user?.firstName ? `Bienvenido, ${user.firstName}` : 'SaaSchool'}
            </span>
            <span>•</span>
            <span className="capitalize">{isStudent ? 'Estudiante' : userRole.toLowerCase().replace('_', ' ')}</span>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />
          </div>
        </header>

        {/* Banner de activación de notificaciones en 2do plano para celulares */}
        <MobilePushBanner />

        <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 print:p-0 print:overflow-visible">
          <Outlet />
        </main>
      </div>

      {/* Modal de Ajustes del Colegio */}
      {canManageSchool && (
        <SchoolSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {/* Modal Obligatorio de Cambio de Contraseña en Primer Ingreso */}
      <ChangePasswordModal />

      {/* Modal Obligatorio de Consentimiento Legal */}
      {!user?.mustChangePassword && <ConsentGate />}

      {/* Componente Global de Notificaciones Toast */}
      <Toaster position="top-right" richColors closeButton />
    </div>
  );
};
