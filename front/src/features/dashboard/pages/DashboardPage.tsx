import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  CreditCard,
  BookOpenCheck,
  CalendarCheck,
  Building2,
  ArrowRight,
  UserPlus,
  PlusCircle,
  Megaphone,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  Clock,
  Sparkles,
  QrCode,
  School,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useStudents } from '@/features/students/api/useStudents';
import { useClassrooms } from '@/features/classrooms/api/useClassrooms';
import { useFinancialSummary } from '@/features/payments/api/usePayments';
import { useGetAnnouncements } from '@/features/announcements/api/useAnnouncements';
import { useAttendance } from '@/features/attendance/api/useAttendance';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ActionsPanel } from '@/features/insights/components/ActionsPanel';
import { Button } from '@/components/ui/button';

import { ParentPortalPage } from '@/features/parent/pages/ParentPortalPage';
import { TeacherDashboardView } from '../components/TeacherDashboardView';
import { formatPeruShortDate, getPeruToday } from '@/lib/dateUtils';
import { useDashboardOnboarding } from '../api/useDashboardOnboarding';
import { DirectorOnboardingCard } from '../components/DirectorOnboardingCard';
import { SchoolSettingsModal } from '@/features/schools/components/SchoolSettingsModal';
import { useGetActiveSchool } from '@/features/schools/api/useSchool';
import { SubscriptionPlan } from '@/features/schools/types';
import { PLAN_HIERARCHY } from '@/layouts/navigation';

export const DashboardPage: React.FC = () => {
  const { user, impersonatedSchool } = useAuthStore();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user?.role === 'SUPER_ADMIN' && !impersonatedSchool) {
      navigate('/super-admin', { replace: true });
    }
  }, [user, impersonatedSchool, navigate]);

  if (user?.role === 'SUPER_ADMIN' && !impersonatedSchool) {
    return null;
  }

  // Si el usuario es PADRE / APODERADO o ESTUDIANTE, renderizar directamente su portal
  if (user?.role === 'PARENT' || user?.role === 'STUDENT') {
    return <ParentPortalPage />;
  }

  // Si el usuario es PROFESOR / DOCENTE, renderizar su panel docente especializado
  if (user?.role === 'TEACHER') {
    return <TeacherDashboardView />;
  }

  // Dirección / Secretaría: componente propio para que sus hooks no dependan del rol
  return <StaffDashboard />;
};

const quickActionClass =
  'flex items-center gap-3 p-4 rounded-xl border border-border bg-card text-foreground transition-all shadow-sm group';

interface QuickActionProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  onClick: () => void;
  /** Clases de color del botón y de su ícono */
  hover: string;
  iconTone: string;
}

const QuickAction: React.FC<QuickActionProps> = ({ icon: Icon, title, subtitle, onClick, hover, iconTone }) => (
  <button onClick={onClick} className={`${quickActionClass} ${hover}`}>
    <div className={`p-2.5 rounded-lg transition-colors ${iconTone}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div className="text-left">
      <span className="block font-bold text-sm leading-tight">{title}</span>
      <span className="text-xs text-muted-foreground">{subtitle}</span>
    </div>
  </button>
);

const TONES = {
  primary: {
    hover: 'hover:bg-primary/10 hover:border-primary/40',
    iconTone: 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground',
  },
  emerald: {
    hover: 'hover:bg-emerald-500/10 hover:border-emerald-500/40',
    iconTone: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white',
  },
  amber: {
    hover: 'hover:bg-amber-500/10 hover:border-amber-500/40',
    iconTone: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500 group-hover:text-white',
  },
  sky: {
    hover: 'hover:bg-sky-500/10 hover:border-sky-500/40',
    iconTone: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 group-hover:bg-sky-500 group-hover:text-white',
  },
} as const;

interface ModuleCardProps {
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  title: string;
  description: string;
  actionLabel: string;
  onClick: () => void;
  badge?: React.ReactNode;
}

const ModuleCard: React.FC<ModuleCardProps> = ({ icon: Icon, iconClass, title, description, actionLabel, onClick, badge }) => (
  <Card className="flex flex-col justify-between hover:border-primary/50 transition-colors">
    <CardHeader>
      <div className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className={`w-5 h-5 ${iconClass}`} />
          {title}
        </CardTitle>
        {badge}
      </div>
      <CardDescription className="text-xs">{description}</CardDescription>
    </CardHeader>
    <CardContent className="pt-0">
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-between text-xs font-semibold text-primary"
        onClick={onClick}
      >
        <span>{actionLabel}</span>
        <ArrowRight className="w-4 h-4" />
      </Button>
    </CardContent>
  </Card>
);

const StaffDashboard: React.FC = () => {
  const { user, impersonatedSchool } = useAuthStore();
  const navigate = useNavigate();

  const isAdministrative = user?.role === 'ADMINISTRATIVE';
  const isAdmin = user?.role === 'SCHOOL_ADMIN' || (user?.role === 'SUPER_ADMIN' && !!impersonatedSchool);
  const canManageStudents = isAdmin || isAdministrative;
  const canSeeMacroFinances = isAdmin; // Estrictamente exclusivo de la Dirección del Colegio

  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const { data: onboarding } = useDashboardOnboarding(isAdmin);
  const { data: activeSchool } = useGetActiveSchool();
  const currentPlan: SubscriptionPlan = (activeSchool?.plan as SubscriptionPlan) || 'BASIC';
  const isProPlan = (PLAN_HIERARCHY[currentPlan] || 1) >= (PLAN_HIERARCHY.PRO || 2);

  // Queries segregadas por rol para prevenir 403 y llamadas innecesarias.
  // Del listado de alumnos solo interesa el total: basta con pedir una fila.
  const { data: studentsResponse } = useStudents({ page: 1, limit: 1 }, canManageStudents);
  const totalStudentsCount = studentsResponse?.meta?.total || 0;

  const { data: classrooms = [] } = useClassrooms(isAdministrative);
  const classroomsCount = classrooms.length;

  // Asistencia de hoy (solo Dirección): las estadísticas vienen agregadas del backend
  const { data: todayAttendance } = useAttendance({ date: getPeruToday(), page: 1, limit: 1 }, isAdmin);
  const todayStats = todayAttendance?.stats;
  const todayAttended = (todayStats?.present ?? 0) + (todayStats?.late ?? 0);

  // Solo el director consulta el resumen macro financiero con montos en soles
  const { data: financialSummary } = useFinancialSummary(canSeeMacroFinances);
  const { data: announcementsData } = useGetAnnouncements({ page: 1, limit: 3 });
  const announcementsCount = announcementsData?.meta?.total ?? announcementsData?.data?.length ?? 0;

  const totalAmountDue = canSeeMacroFinances ? financialSummary?.totalExpected ?? 0 : 0;
  const paidTotal = canSeeMacroFinances ? financialSummary?.totalCollected ?? 0 : 0;
  const pendingTotal = canSeeMacroFinances ? financialSummary?.totalPending ?? 0 : 0;
  const collectionPercentage = totalAmountDue > 0 ? Math.round((paidTotal / totalAmountDue) * 100) : 0;

  return (
    <div className="space-y-6 pb-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-primary/15 via-primary/5 to-card border border-primary/20 shadow-sm">
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
            <Building2 className="w-4 h-4" />
            <span>KIPUX • Entorno Seguro</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            ¡Hola, {user?.firstName} {user?.lastNamePaternal}!
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            {isAdmin
              ? 'Panel de control ejecutivo. Supervisa matriculados, estado de cobranzas y emite avisos oficiales.'
              : 'Panel de secretaría y caja. Gestiona matrículas, cobro de pensiones en ventanilla, carnets QR y circulares.'}
          </p>
        </div>
      </div>

      {/* Guía de puesta en marcha para el director */}
      {isAdmin && onboarding && onboarding.percent < 100 && (
        <DirectorOnboardingCard
          onboarding={onboarding}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      )}

      {/* Pendientes concretos para la Dirección y Secretaría */}
      <ActionsPanel isBoardingComplete={onboarding ? onboarding.percent === 100 : true} />

      {/* Botonera de Acciones Rápidas Según el Rol */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Acciones Rápidas
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {isAdmin ? (
            <>
              <QuickAction icon={UserPlus} title="Nuevo Alumno" subtitle="Registrar matrícula" onClick={() => navigate('/students')} {...TONES.primary} />
              <QuickAction icon={DollarSign} title="Registrar Pago" subtitle="Ingreso manual" onClick={() => navigate('/payments')} {...TONES.emerald} />
              <QuickAction icon={PlusCircle} title="Cobros Masivos" subtitle="Generar por aula" onClick={() => navigate('/payments')} {...TONES.amber} />
              <QuickAction icon={Megaphone} title="Publicar Aviso" subtitle="Comunicados" onClick={() => navigate('/announcements')} {...TONES.primary} />
            </>
          ) : (
            <>
              <QuickAction icon={UserPlus} title="Matricular Alumno" subtitle="Nueva matrícula" onClick={() => navigate('/students')} {...TONES.primary} />
              <QuickAction icon={DollarSign} title="Caja Ventanilla" subtitle="Cobro de pensión" onClick={() => navigate('/payments')} {...TONES.emerald} />
              <QuickAction icon={QrCode} title="Carnets QR" subtitle="Impresión por sección" onClick={() => navigate('/students')} {...TONES.sky} />
              <QuickAction icon={Megaphone} title="Publicar Aviso" subtitle="Circular a familias" onClick={() => navigate('/announcements')} {...TONES.amber} />
            </>
          )}
        </div>
      </div>

      {/* Indicadores Principales / KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Estudiantes</CardTitle>
            <Users className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-foreground">{totalStudentsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Alumnos matriculados activos</p>
          </CardContent>
        </Card>

        {/* Indicadores Operativos Exclusivos de Secretaría y Caja (Sin montos monetarios) */}
        {isAdministrative && (
          <>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Aulas y Grados</CardTitle>
                <School className="w-4 h-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold text-foreground">{classroomsCount}</div>
                <p className="text-xs text-muted-foreground mt-1">Secciones habilitadas</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Comunicados</CardTitle>
                <Megaphone className="w-4 h-4 text-sky-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold text-foreground">{announcementsCount}</div>
                <p className="text-xs text-muted-foreground mt-1">Circulares y avisos vigentes</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Ventanilla de Caja</CardTitle>
                <CreditCard className="w-4 h-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">Atención Activa</div>
                <p className="text-xs text-muted-foreground mt-1">Cobro de pensiones y boletas</p>
              </CardContent>
            </Card>
          </>
        )}

        {/* Recaudación y pendiente (Exclusivo Dirección del Colegio) */}
        {canSeeMacroFinances && (
          <>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Recaudación Total</CardTitle>
                <CreditCard className="w-4 h-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  S/ {paidTotal.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{collectionPercentage}% cobrado de obligaciones</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Pendiente de Cobro</CardTitle>
                <Clock className="w-4 h-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                  S/ {pendingTotal.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Pensiones por regularizar</p>
              </CardContent>
            </Card>
          </>
        )}

        {/* Asistencia de hoy con datos reales (Solo Dirección) */}
        {isAdmin && (
          <Card
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate('/attendance')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Asistencia Hoy</CardTitle>
              <CalendarCheck className="w-4 h-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-extrabold text-foreground">
                {todayAttended}
                <span className="text-sm font-semibold text-muted-foreground"> / {todayStats?.total ?? 0}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {todayStats?.total
                  ? `${todayStats.late} tardanza(s) · ${todayStats.absent} falta(s)`
                  : 'Aún no hay marcaciones hoy'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Salud Financiera del Colegio (EXCLUSIVO Dirección del Colegio — NUNCA Personal Administrativo) */}
      {canSeeMacroFinances && totalAmountDue > 0 && (
        <Card className="p-6 border-border bg-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="w-4 h-4" />
                Salud de Recaudación Financiera
              </div>
              <h3 className="text-lg font-bold text-foreground">
                S/ {paidTotal.toFixed(2)}{' '}
                <span className="text-xs font-normal text-muted-foreground">
                  cobrados de S/ {totalAmountDue.toFixed(2)} en total
                </span>
              </h3>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Cobrado: S/ {paidTotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <Clock className="w-4 h-4" />
                <span>Pendiente: S/ {pendingTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="w-full h-3 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, collectionPercentage)}%` }}
            />
          </div>
        </Card>
      )}

      {/* Últimos Comunicados */}
      {announcementsData?.data && announcementsData.data.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold tracking-tight text-foreground">Avisos Escolares Recientes</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/announcements')}
              className="text-xs font-semibold text-primary"
            >
              Ver todos
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {announcementsData.data.slice(0, 3).map((announcement) => (
              <div
                key={announcement.id}
                onClick={() => navigate('/announcements')}
                className="cursor-pointer p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-primary/10 text-primary">
                    {announcement.priority}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatPeruShortDate(announcement.publishedAt)}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-foreground line-clamp-1">{announcement.title}</h4>
                <p className="text-xs text-muted-foreground line-clamp-2">{announcement.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Módulos de Acceso Rápido Segregados por Rol */}
      <div className="space-y-3">
        <h2 className="text-base font-bold tracking-tight text-foreground">Módulos del Sistema</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ModuleCard
            icon={Users}
            iconClass="text-primary"
            title="Estudiantes"
            description="Directorio matriculado y datos demográficos SIAGIE."
            actionLabel="Ver lista de alumnos"
            onClick={() => navigate('/students')}
          />

          <ModuleCard
            icon={CreditCard}
            iconClass="text-emerald-500"
            title={isAdministrative ? 'Caja y Cobranzas' : 'Cobranzas y Pagos'}
            description={
              isAdministrative
                ? 'Cobro en ventanilla, consulta de deudores y emisión de boletas.'
                : 'Control de pensiones, boletas, morosidad y transacciones.'
            }
            actionLabel="Ver módulo pagos"
            onClick={() => navigate('/payments')}
          />

          {isAdmin && (
            <ModuleCard
              icon={BookOpenCheck}
              iconClass="text-primary"
              title="Registro de Notas"
              description="Matriz evaluativa interactiva con conversión a escala CNEB."
              actionLabel={isProPlan ? 'Abrir registro notas' : 'Mejorar a Plan PRO'}
              onClick={() => navigate('/grades')}
              badge={
                !isProPlan && (
                  <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    <Sparkles className="w-3 h-3" />
                    PRO
                  </span>
                )
              }
            />
          )}

          {isAdmin && (
            <ModuleCard
              icon={CalendarCheck}
              iconClass="text-amber-500"
              title="Asistencia"
              description="Control diario por fecha y reportes de asistencia escolar."
              actionLabel="Ver asistencia"
              onClick={() => navigate('/attendance')}
            />
          )}

          {isAdministrative && (
            <ModuleCard
              icon={Megaphone}
              iconClass="text-sky-500"
              title="Comunicados Oficiales"
              description="Emisión y difusión de circulares y citaciones a las familias."
              actionLabel="Gestionar avisos"
              onClick={() => navigate('/announcements')}
            />
          )}
        </div>
      </div>

      <SchoolSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};
