import React, { Suspense, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { AcademicYearBanner, AcademicYearSwitcher } from '@/components/AcademicYearSwitcher';
import {
  LogOut,
  Camera,
  Moon,
  Sun,
  Menu,
  X,
  Settings,
  School as SchoolIcon,
  ShieldCheck,
  ShieldAlert,
  BellRing,
  ChevronDown,
  Lock,
  Search,
} from 'lucide-react';
import { useFinanceAccess } from '@/features/payments/api/usePayments';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGetActiveSchool } from '@/features/schools/api/useSchool';
import { PlanStatusBanner, PlanBlockedScreen } from '@/features/schools/components/PlanStatusBanner';
import { PlatformAnnouncementsBanner } from '@/features/super-admin/components/PlatformAnnouncementsBanner';
import { SchoolSettingsModal } from '@/features/schools/components/SchoolSettingsModal';
import { MyProfilePhotoModal } from '@/features/users/components/MyProfilePhotoModal';
import { UserAvatar } from '@/components/ui/user-avatar';
import { ChangePasswordModal } from '@/features/auth/components/ChangePasswordModal';
import { ConsentGate } from '@/features/legal/components/ConsentGate';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { MobilePushBanner } from '@/features/notifications/components/MobilePushBanner';
import { applyBrandColor } from '@/lib/brandColor';
import { applyTheme, useThemeStore } from '@/lib/theme';
import { roleLabel } from '@/lib/roles';
import { useUnreadMessages } from '@/features/messages/api/useMessages';
import { usePendingReportsCount } from '@/features/payment-reports/api/usePaymentReports';
import { Toaster } from 'sonner';
import { KipuxLogo } from '@/components/brand/KipuxLogo';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { PageLoader } from '@/components/ui/PageLoader';
import { CommandPalette } from '@/components/CommandPalette';
import { BannerStack } from './BannerStack';
import { MobileBottomNav } from './MobileBottomNav';
import {
  BOTTOM_NAV_PATHS,
  PLAN_HIERARCHY,
  isNavItemActive,
  resolveNav,
  type NavAudience,
  type ResolvedNavItem,
} from './navigation';

const NAV_OPEN_KEY = 'kipux:nav-open';
/** Secciones abiertas la primera vez; el resto se despliega al usarlas y se recuerda */
const DEFAULT_OPEN_SECTIONS = 2;

const readOpenSections = (): Record<string, boolean> => {
  try {
    return JSON.parse(localStorage.getItem(NAV_OPEN_KEY) || '{}') as Record<string, boolean>;
  } catch {
    return {};
  }
};

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

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
  const { theme, toggle: toggleTheme } = useThemeStore();
  const isDarkMode = theme === 'dark';
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPhotoOpen, setIsPhotoOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(readOpenSections);

  const { data: school } = useGetActiveSchool();

  useEffect(() => {
    applyBrandColor(school?.brandColor ?? null);
    return () => applyBrandColor(null);
  }, [school?.brandColor]);

  // El tema elegido se recuerda entre sesiones; las páginas públicas siguen en claro
  useLayoutEffect(() => {
    applyTheme(theme);
    return () => applyTheme(null);
  }, [theme]);

  // Ctrl+K (o ⌘K) abre el buscador desde cualquier pantalla
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsSearchOpen((value) => !value);
      } else if (event.key === 'Escape') {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isImpersonating = !!impersonatedSchool;
  // Logo del colegio activo (en modo soporte, el del colegio visitado)
  const schoolLogoUrl = school?.logoUrl ?? (isImpersonating ? impersonatedSchool.logoUrl : null);
  // Docentes, Dirección y Secretaría pueden tener foto de perfil
  const canHavePhoto = Boolean(user && ['SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'].includes(user.role));

  const currentPlan = (isImpersonating ? impersonatedSchool.plan : school?.plan) || 'BASIC';
  const currentPlanLevel = PLAN_HIERARCHY[currentPlan] || 1;
  const userRole = user?.role || 'PARENT';

  const isStudent = userRole === 'STUDENT' || Boolean(
    user?.email &&
      (user.email.toLowerCase().includes('alumno') || user.email.toLowerCase().includes('estudiante')),
  );

  const audience: NavAudience =
    isSuperAdmin && !isImpersonating ? 'platform' : isStudent ? 'student' : userRole === 'PARENT' ? 'parent' : 'school';

  // Solo la dirección decide la suscripción: ve con candado lo que el plan no incluye
  const showLocked = userRole === 'SCHOOL_ADMIN' && Boolean(school);
  const navSections = useMemo(
    () => resolveNav({ audience, role: userRole, planLevel: currentPlanLevel, showLocked }),
    [audience, userRole, currentPlanLevel, showLocked],
  );

  const activeSectionTitle = navSections.find((section) =>
    section.items.some((item) => isNavItemActive(item, location.pathname)),
  )?.title;

  const collapsible = navSections.length > 1;
  const isSectionOpen = (title: string, index: number) =>
    !collapsible || (openSections[title] ?? index < DEFAULT_OPEN_SECTIONS);

  const setSectionOpen = (title: string, open: boolean) => {
    setOpenSections((prev) => {
      const next = { ...prev, [title]: open };
      try {
        localStorage.setItem(NAV_OPEN_KEY, JSON.stringify(next));
      } catch {
        /* sin almacenamiento el menú vuelve a su estado inicial al recargar */
      }
      return next;
    });
  };

  // Al entrar a una pantalla, su sección del menú se despliega sola y el menú del celular se cierra
  useEffect(() => {
    if (activeSectionTitle) {
      setOpenSections((prev) => (prev[activeSectionTitle] ? prev : { ...prev, [activeSectionTitle]: true }));
    }
    setIsMobileOpen(false);
  }, [activeSectionTitle, location.pathname]);

  const navBadges: Record<string, number> = {
    '/payments': canSeeVouchers ? pendingReports : 0,
    '/messages': unreadMessages,
  };

  // Barra inferior del celular: los cuatro accesos más usados del rol
  const bottomNavItems = useMemo(() => {
    const available = navSections.flatMap((section) => section.items).filter((item) => !item.locked);
    return BOTTOM_NAV_PATHS[audience]
      .map((path) => available.find((item) => item.path === path))
      .filter((item): item is ResolvedNavItem => Boolean(item))
      .slice(0, 4);
  }, [navSections, audience]);
  const hasBottomNav = bottomNavItems.length >= 2;

  const canSearchStudents =
    audience === 'school' && ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'].includes(userRole);
  const displayRole = isStudent ? 'Estudiante' : roleLabel(userRole);

  const canManageSchool = isImpersonating || userRole === 'SCHOOL_ADMIN';

  // Plan vencido hace más del periodo de solo lectura: sin acceso (soporte sí entra)
  if (school?.planStatus?.access === 'BLOCKED' && !isSuperAdmin) {
    return <PlanBlockedScreen school={school} onLogout={logout} />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Top Bar */}
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between gap-2 px-4 py-3 border-b border-border bg-card print:hidden">
        <div className="flex items-center gap-2.5 min-w-0">
          {isSuperAdmin && !isImpersonating ? (
            <KipuxLogo className="h-8" />
          ) : schoolLogoUrl ? (
            <img
              src={schoolLogoUrl}
              alt={isImpersonating ? impersonatedSchool.name : (school?.name || 'Logo institucional')}
              className="w-7 h-7 object-contain rounded-md shrink-0"
            />
          ) : (
            <KipuxLogo variant="mark" className="h-7" />
          )}
          {!(isSuperAdmin && !isImpersonating) && (
            <span className="font-bold text-base truncate">
              {isImpersonating ? impersonatedSchool.name : school?.name || 'KIPUX'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" aria-label="Buscar" onClick={() => setIsSearchOpen(true)}>
            <Search className="w-5 h-5" />
          </Button>
          <NotificationBell />
          {/* Con barra inferior, el menú completo se abre desde "Más" */}
          {!hasBottomNav && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={isMobileOpen ? 'Cerrar menú lateral' : 'Abrir menú lateral'}
              onClick={() => setIsMobileOpen(!isMobileOpen)}
            >
              {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          )}
        </div>
      </div>

      {/* Fondo del menú deslizable en celulares */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-background/70 backdrop-blur-sm print:hidden"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Navigation: fijo en escritorio, panel deslizable en celulares */}
      <aside
        className={`border-r border-border bg-card flex-col justify-between shrink-0 print:hidden md:sticky md:top-0 md:z-auto md:flex md:h-screen md:w-64 md:max-w-none md:shadow-none ${
          isMobileOpen ? 'fixed inset-y-0 left-0 z-50 flex w-[86%] max-w-xs shadow-2xl animate-in slide-in-from-left duration-200' : 'hidden'
        }`}
      >
        <div className="p-4 space-y-5 flex-1 overflow-y-auto">
          {/* Cerrar (solo celular) */}
          <div className="md:hidden flex items-center justify-between">
            <span className="text-sm font-bold text-foreground">Menú</span>
            <Button variant="ghost" size="icon" aria-label="Cerrar menú" onClick={() => setIsMobileOpen(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Dynamic School Brand Header */}
          {isSuperAdmin && !isImpersonating ? (
            <div className="hidden md:flex flex-col items-start gap-1 px-1 py-1">
              <KipuxLogo className="h-11" />
              <span className="text-xs text-muted-foreground font-medium">Torre de Control SaaS</span>
            </div>
          ) : (
          <div className="hidden md:flex items-center gap-3 px-1 py-1">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
              {schoolLogoUrl ? (
                <img
                  src={schoolLogoUrl}
                  alt={isImpersonating ? impersonatedSchool.name : school?.name}
                  className="w-full h-full object-contain p-1"
                />
              ) : (
                <KipuxLogo variant="mark" className="h-7" />
              )}
            </div>
            <div className="overflow-hidden">
              <h1 className="font-bold text-sm leading-tight truncate text-foreground">
                {isImpersonating ? impersonatedSchool.name : school?.name || 'KIPUX'}
              </h1>
              <span className="text-xs text-muted-foreground font-medium block truncate">
                {isImpersonating ? 'Modo Soporte Técnico' : 'Plataforma escolar KIPUX'}
              </span>
            </div>
          </div>
          )}

          {/* User & School Context Pill */}
          {user && (
            <div className="p-3 rounded-xl bg-secondary/40 border border-border/60 space-y-1.5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {canHavePhoto ? (
                    <button
                      type="button"
                      onClick={() => setIsPhotoOpen(true)}
                      title="Cambiar mi foto de perfil"
                      aria-label="Cambiar mi foto de perfil"
                      className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <UserAvatar name={`${user.firstName} ${user.lastNamePaternal}`} src={user.avatarUrl} size="sm" />
                    </button>
                  ) : (
                    <UserAvatar name={`${user.firstName} ${user.lastNamePaternal}`} size="sm" />
                  )}
                  <span className="text-sm font-bold truncate text-foreground">
                    {user?.firstName} {user?.lastNamePaternal}
                  </span>
                </div>
                <Badge variant={user?.role === 'SCHOOL_ADMIN' || user?.role === 'SUPER_ADMIN' ? 'default' : 'secondary'} className="shrink-0 text-xs px-1.5 py-0 font-semibold">
                  {displayRole}
                </Badge>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
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
              {/* En celulares el selector de año vive aquí (en escritorio está en la cabecera) */}
              <AcademicYearSwitcher className="md:hidden pt-1" />
            </div>
          )}

          {/* Navigation Links Grouped by Domain */}
          <nav className="space-y-3" aria-label="Menú principal">
            {navSections.map((section, sectionIndex) => {
              const open = isSectionOpen(section.title, sectionIndex);
              const sectionBadge = section.items.reduce((sum, item) => sum + (navBadges[item.path] ?? 0), 0);
              return (
                <div key={section.title} className="space-y-1">
                  {collapsible ? (
                    <button
                      type="button"
                      onClick={() => setSectionOpen(section.title, !open)}
                      aria-expanded={open}
                      className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                    >
                      <span className="truncate">{section.title}</span>
                      <span className="flex items-center gap-1.5">
                        {!open && sectionBadge > 0 && (
                          <span className="h-2 w-2 rounded-full bg-primary" aria-label="Tiene pendientes" />
                        )}
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? '' : '-rotate-90'}`} />
                      </span>
                    </button>
                  ) : (
                    <div className="px-2 pt-1 pb-0.5">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {section.title}
                      </span>
                    </div>
                  )}
                  {open && (
                    <div className="space-y-0.5">
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = isNavItemActive(item, location.pathname);
                        const badge = navBadges[item.path] ?? 0;
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setIsMobileOpen(false)}
                            aria-current={isActive ? 'page' : undefined}
                            title={item.locked ? `Disponible en el plan ${item.minPlan}` : undefined}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                              isActive
                                ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25'
                                : item.locked
                                ? 'text-muted-foreground/70 hover:bg-secondary/70 hover:text-foreground'
                                : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground'
                            }`}
                          >
                            <Icon className="w-4 h-4 shrink-0" />
                            <span className="truncate">{item.label}</span>
                            {item.locked && (
                              <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                                <Lock className="h-3 w-3" />
                                {item.minPlan}
                              </span>
                            )}
                            {!item.locked && badge > 0 && (
                              <span
                                className={`ml-auto rounded-full px-1.5 py-0.5 text-xs font-bold ${
                                  isActive
                                    ? 'bg-primary-foreground text-primary'
                                    : item.path === '/payments'
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-primary text-primary-foreground'
                                }`}
                                aria-label={item.path === '/payments' ? `${badge} pagos por validar` : `${badge} mensajes sin leer`}
                              >
                                {badge > 99 ? '99+' : badge}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Controls */}
        <div className="p-4 border-t border-border space-y-2">
          {canManageSchool && (
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2 text-sm rounded-xl"
              onClick={() => {
                setIsSettingsOpen(true);
                setIsMobileOpen(false);
              }}
            >
              <Settings className="w-4 h-4 text-primary" />
              <span>Ajustes del Colegio</span>
            </Button>
          )}

          {canHavePhoto && (
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2 text-sm rounded-xl"
              onClick={() => {
                setIsPhotoOpen(true);
                setIsMobileOpen(false);
              }}
            >
              <Camera className="w-4 h-4 text-primary" />
              <span>Mi foto de perfil</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 text-sm rounded-xl"
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
            className="w-full justify-start gap-2 text-sm rounded-xl"
            onClick={toggleTheme}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
            <span>Modo {isDarkMode ? 'Claro' : 'Oscuro'}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-sm text-destructive hover:bg-destructive/10 hover:text-destructive rounded-xl"
            onClick={logout}
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop Header Bar with Context & NotificationBell */}
        <header className="hidden md:flex items-center justify-between gap-4 px-8 py-3 border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-30 print:hidden">
          <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
            <span className="font-semibold text-foreground truncate">
              {user?.firstName ? `Bienvenido, ${user.firstName}` : 'KIPUX'}
            </span>
            <span>•</span>
            <span className="shrink-0">{displayRole}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="flex h-9 w-44 items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground lg:w-60 xl:w-72"
            >
              <Search className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate text-left">{canSearchStudents ? 'Buscar pantalla o alumno…' : 'Buscar…'}</span>
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs font-medium">
                {isMac ? '⌘K' : 'Ctrl K'}
              </kbd>
            </button>
            <AcademicYearSwitcher />
            <NotificationBell />
          </div>
        </header>

        {/* Avisos sobre el contenido: los urgentes siempre visibles, el resto agrupado */}
        <BannerStack>
          {/* Modo soporte */}
          {isSuperAdmin && isImpersonating && (
            <div data-priority="high" className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2.5 text-xs flex flex-wrap items-center justify-between gap-3 text-amber-900 dark:text-amber-200">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  <strong>Modo Soporte Técnico:</strong> Visualizando la operativa de <strong>{impersonatedSchool.name}</strong>
                </span>
                <Badge variant="outline" className="text-xs bg-amber-500/10 border-amber-500/30 font-bold">
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
                className="h-7 text-xs bg-background hover:bg-muted text-foreground border-amber-500/40 font-medium"
              >
                Salir al Panel SaaS
              </Button>
            </div>
          )}

          {/* Vencimiento del plan: próximo a vencer, en gracia o en solo lectura */}
          <PlanStatusBanner school={school} role={userRole} />

          {/* Avisos de la plataforma (mantenimiento, novedades) */}
          {!isSuperAdmin && <PlatformAnnouncementsBanner />}

          {/* Año que se está viendo (si no es el vigente) */}
          <AcademicYearBanner />

          {/* Activación de notificaciones en 2do plano para celulares */}
          <MobilePushBanner />
        </BannerStack>

        <main className={`flex-1 overflow-y-auto p-4 md:p-8 space-y-6 print:p-0 print:overflow-visible ${hasBottomNav ? 'pb-24 md:pb-8' : ''}`}>
          {/* Un fallo de una pantalla no tumba el menú; al cambiar de ruta se reintenta */}
          <ErrorBoundary resetKey={location.pathname}>
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

      {hasBottomNav && (
        <MobileBottomNav items={bottomNavItems} badges={navBadges} onOpenMenu={() => setIsMobileOpen(true)} />
      )}

      <CommandPalette
        open={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        sections={navSections}
        canSearchStudents={canSearchStudents}
      />

      {/* Modal de Ajustes del Colegio */}
      {canManageSchool && (
        <SchoolSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {canHavePhoto && <MyProfilePhotoModal open={isPhotoOpen} onClose={() => setIsPhotoOpen(false)} />}

      {/* Modal Obligatorio de Cambio de Contraseña en Primer Ingreso */}
      <ChangePasswordModal />

      {/* Modal Obligatorio de Consentimiento Legal */}
      {!user?.mustChangePassword && <ConsentGate />}

      {/* Componente Global de Notificaciones Toast */}
      <Toaster position="top-right" richColors closeButton />
    </div>
  );
};
