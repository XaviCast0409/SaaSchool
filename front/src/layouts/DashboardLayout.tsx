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
  School as SchoolIcon,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Estudiantes', path: '/students', icon: Users },
    { label: 'Cobranzas y Pagos', path: '/payments', icon: CreditCard },
    { label: 'Registro de Notas', path: '/grades', icon: BookOpenCheck },
    { label: 'Asistencia', path: '/attendance', icon: CalendarCheck },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-primary" />
          <span className="font-bold text-lg">SaaSchool</span>
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
          {/* Brand Header */}
          <div className="hidden md:flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-md shadow-primary/20">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-none">SaaSchool</h1>
              <span className="text-[10px] text-muted-foreground font-medium">B2B SaaS Educativo</span>
            </div>
          </div>

          {/* User & School Context Pill */}
          {user && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border/60 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                <SchoolIcon className="w-3.5 h-3.5 text-primary" />
                <span className="truncate">Colegio ID: {user?.schoolId ? user.schoolId.slice(0, 8) : '—'}...</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold truncate text-foreground">
                  {user?.firstName} {user?.lastNamePaternal}
                </span>
                <Badge variant={user?.role === 'SCHOOL_ADMIN' ? 'default' : 'secondary'} className="text-[9px] px-1.5 py-0">
                  {user?.role || 'USER'}
                </Badge>
              </div>
            </div>
          )}

          {/* Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
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
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 text-xs"
            onClick={toggleTheme}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
            <span>Modo {isDarkMode ? 'Claro' : 'Oscuro'}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
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
    </div>
  );
};
