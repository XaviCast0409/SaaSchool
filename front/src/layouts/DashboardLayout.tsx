import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  GraduationCap,
  Users,
  CreditCard,
  BookOpenCheck,
  CalendarCheck,
  LayoutDashboard,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  Megaphone,
  Settings,
  School as SchoolIcon,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGetActiveSchool } from '@/features/schools/api/useSchool';
import { SchoolSettingsModal } from '@/features/schools/components/SchoolSettingsModal';
import { Toaster } from 'sonner';

export const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const { data: school } = useGetActiveSchool();

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const allNavItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'PARENT'] },
    { label: 'Comunicados', path: '/announcements', icon: Megaphone, roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'PARENT'] },
    { label: 'Directorio', path: '/directory', icon: Users, roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN'] },
    { label: 'Estudiantes', path: '/students', icon: GraduationCap, roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'PARENT'] },
    { label: 'Cobranzas y Pagos', path: '/payments', icon: CreditCard, roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'PARENT'] },
    { label: 'Registro de Notas', path: '/grades', icon: BookOpenCheck, roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'PARENT'] },
    { label: 'Asistencia', path: '/attendance', icon: CalendarCheck, roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN'] },
  ];

  const userRole = user?.role || 'PARENT';
  const navItems = allNavItems.filter((item) => item.roles.includes(userRole));
  const canManageSchool = userRole === 'SUPER_ADMIN' || userRole === 'SCHOOL_ADMIN';

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-2.5">
          {school?.logoUrl ? (
            <img src={school.logoUrl} alt={school.name} className="w-7 h-7 object-contain rounded-md" />
          ) : (
            <GraduationCap className="w-6 h-6 text-primary" />
          )}
          <span className="font-bold text-base truncate max-w-[180px]">
            {school?.name || 'SaaSchool'}
          </span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsMobileOpen(!isMobileOpen)}>
          {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`w-full md:w-64 border-r border-border bg-card flex flex-col justify-between shrink-0 transition-all ${
          isMobileOpen ? 'block' : 'hidden md:flex'
        }`}
      >
        <div className="p-4 space-y-6">
          {/* Dynamic School Brand Header */}
          <div className="hidden md:flex items-center gap-3 px-2 py-1">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden shrink-0">
              {school?.logoUrl ? (
                <img src={school.logoUrl} alt={school.name} className="w-full h-full object-contain p-1" />
              ) : (
                <GraduationCap className="w-5 h-5 text-primary" />
              )}
            </div>
            <div className="overflow-hidden">
              <h1 className="font-bold text-sm leading-tight truncate text-foreground">
                {school?.name || 'SaaSchool'}
              </h1>
              <span className="text-[10px] text-muted-foreground font-medium block truncate">
                Plataforma Escolar SaaS
              </span>
            </div>
          </div>

          {/* User & School Context Pill */}
          {user && (
            <div className="p-3 rounded-xl bg-secondary/40 border border-border/60 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold truncate text-foreground">
                  {user?.firstName} {user?.lastNamePaternal}
                </span>
                <Badge variant={user?.role === 'SCHOOL_ADMIN' ? 'default' : 'secondary'} className="text-[9px] px-1.5 py-0">
                  {user?.role || 'USER'}
                </Badge>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
                <SchoolIcon className="w-3 h-3 text-primary shrink-0" />
                <span className="truncate">{school?.name || 'Colegio'}</span>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 font-semibold'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
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
      <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        <Outlet />
      </main>

      {/* Modal de Ajustes del Colegio */}
      {canManageSchool && (
        <SchoolSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {/* Componente Global de Notificaciones Toast */}
      <Toaster position="top-right" richColors closeButton />
    </div>
  );
};
