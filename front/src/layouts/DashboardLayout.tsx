import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
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
  UserCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGetActiveSchool } from '@/features/schools/api/useSchool';
import { SchoolSettingsModal } from '@/features/schools/components/SchoolSettingsModal';
import { ChangePasswordModal } from '@/features/auth/components/ChangePasswordModal';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { MobilePushBanner } from '@/features/notifications/components/MobilePushBanner';
import { Toaster } from 'sonner';

export const DashboardLayout: React.FC = () => {
  const { user, logout, impersonatedSchool, setImpersonatedSchool } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const { data: school } = useGetActiveSchool();

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
      title: 'Principal',
      items: [
        {
          label: 'Dashboard',
          path: '/dashboard',
          icon: LayoutDashboard,
          roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER', 'PARENT'],
          minPlan: 'BASIC',
        },
        {
          label: 'Comunicados',
          path: '/announcements',
          icon: Megaphone,
          roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER', 'PARENT'],
          minPlan: 'BASIC',
        },
      ],
    },
    {
      title: 'Gestión Académica',
      items: [
        {
          label: userRole === 'PARENT' ? 'Libreta de Calificaciones' : 'Registro de Notas',
          path: '/grades',
          icon: BookOpenCheck,
          roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'PARENT'],
          minPlan: 'PRO',
        },
        {
          label: 'Asistencia',
          path: '/attendance',
          icon: CalendarCheck,
          roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'],
          minPlan: 'BASIC',
        },
        {
          label: 'Estudiantes',
          path: '/students',
          icon: GraduationCap,
          roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'],
          minPlan: 'BASIC',
        },
        {
          label: userRole === 'TEACHER' ? 'Mis Cursos Asignados' : 'Carga Horaria Docente',
          path: '/teacher-assignments',
          icon: UserCheck,
          roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'],
          minPlan: 'BASIC',
        },
      ],
    },
    {
      title: 'Estructura y Currículo',
      items: [
        {
          label: 'Cursos y Áreas SIAGIE',
          path: '/curricular-areas',
          icon: BookOpen,
          roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN'],
          minPlan: 'BASIC',
        },
        {
          label: 'Grados, Aulas y Tutoría',
          path: '/classrooms',
          icon: SchoolIcon,
          roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN'],
          minPlan: 'BASIC',
        },
        {
          label: 'Criterios de Calificación',
          path: '/evaluation-criteria',
          icon: SlidersHorizontal,
          roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN'],
          minPlan: 'PRO',
        },
        {
          label: 'Años Lectivos',
          path: '/academic-years',
          icon: Calendar,
          roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN'],
          minPlan: 'BASIC',
        },
      ],
    },
    {
      title: 'Administración y Finanzas',
      items: [
        {
          label:
            userRole === 'PARENT'
              ? 'Mis Pagos y Pensiones'
              : userRole === 'ADMINISTRATIVE'
              ? 'Caja y Cobranzas'
              : 'Cobranzas y Pagos',
          path: '/payments',
          icon: CreditCard,
          roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'PARENT'],
          minPlan: 'BASIC',
        },
        {
          label: 'Directorio',
          path: '/directory',
          icon: Users,
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

  const navSections = (
    isSuperAdmin && !isImpersonating
      ? superAdminNavSections
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
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-2.5">
          {isSuperAdmin && !isImpersonating ? (
            <ShieldCheck className="w-6 h-6 text-primary" />
          ) : (isImpersonating ? impersonatedSchool.logoUrl : school?.logoUrl) ? (
            <img
              src={(isImpersonating ? impersonatedSchool.logoUrl : school?.logoUrl)!}
              alt="Logo"
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
          <Button variant="ghost" size="icon" onClick={() => setIsMobileOpen(!isMobileOpen)}>
            {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`w-full md:w-64 border-r border-border bg-card flex flex-col justify-between shrink-0 transition-all md:h-screen md:sticky md:top-0 ${
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
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60">
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
        <header className="hidden md:flex items-center justify-between px-8 py-3.5 border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">
              {user?.firstName ? `Bienvenido, ${user.firstName}` : 'SaaSchool'}
            </span>
            <span>•</span>
            <span className="capitalize">{userRole.toLowerCase().replace('_', ' ')}</span>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />
          </div>
        </header>

        {/* Banner de activación de notificaciones en 2do plano para celulares */}
        <MobilePushBanner />

        <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
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

      {/* Componente Global de Notificaciones Toast */}
      <Toaster position="top-right" richColors closeButton />
    </div>
  );
};
