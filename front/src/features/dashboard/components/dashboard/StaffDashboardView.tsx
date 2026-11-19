import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Megaphone,
  PlusCircle,
  QrCode,
  School,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGetAnnouncements } from '@/features/announcements/api/useAnnouncements';
import { useClassrooms } from '@/features/classrooms/api/useClassrooms';
import { ActionsPanel } from '@/features/insights/components/ActionsPanel';
import { useFinancialSummary } from '@/features/payments/api/usePayments';
import { SchoolSettingsModal } from '@/features/schools/components/SchoolSettingsModal';
import { useStudents } from '@/features/students/api/useStudents';
import { formatPeruDate, formatPeruShortDate, getPeruToday } from '@/lib/dateUtils';
import { formatMoney } from '@/lib/format';
import { useAuthStore } from '@/store/useAuthStore';
import { useDashboardOnboarding } from '../../api/useDashboardOnboarding';
import { DirectorOnboardingCard } from '../DirectorOnboardingCard';
import { TodayPanel } from '../TodayPanel';
import { TONES } from '../../constants/dashboardTones';
import { QuickActionCard } from './QuickActionCard';

export const StaffDashboardView: React.FC = () => {
  const { user, impersonatedSchool } = useAuthStore();
  const navigate = useNavigate();

  const isAdministrative = user?.role === 'ADMINISTRATIVE';
  const isAdmin = user?.role === 'SCHOOL_ADMIN' || (user?.role === 'SUPER_ADMIN' && !!impersonatedSchool);
  const canManageStudents = isAdmin || isAdministrative;
  const canSeeMacroFinances = isAdmin;

  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const { data: onboarding } = useDashboardOnboarding(isAdmin);

  const { data: studentsResponse } = useStudents({ page: 1, limit: 1 }, canManageStudents);
  const totalStudentsCount = studentsResponse?.meta?.total || 0;

  const { data: classrooms = [] } = useClassrooms(isAdministrative);
  const classroomsCount = classrooms.length;

  const { data: financialSummary } = useFinancialSummary(canSeeMacroFinances);
  const { data: announcementsData } = useGetAnnouncements({ page: 1, limit: 3 });
  const announcementsCount = announcementsData?.meta?.total ?? announcementsData?.data?.length ?? 0;

  const totalAmountDue = canSeeMacroFinances ? (financialSummary?.totalExpected ?? 0) : 0;
  const paidTotal = canSeeMacroFinances ? (financialSummary?.totalCollected ?? 0) : 0;
  const pendingTotal = canSeeMacroFinances ? (financialSummary?.totalPending ?? 0) : 0;
  const collectionPercentage = totalAmountDue > 0 ? Math.round((paidTotal / totalAmountDue) * 100) : 0;

  return (
    <div className="space-y-6 pb-8">
      {/* Saludo breve */}
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Hola, {user?.firstName}</h1>
        <p className="text-sm text-muted-foreground first-letter:uppercase">
          {formatPeruDate(getPeruToday(), { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      <TodayPanel />

      {/* Guía de puesta en marcha para el director */}
      {isAdmin && onboarding && onboarding.percent < 100 && (
        <DirectorOnboardingCard onboarding={onboarding} onOpenSettings={() => setIsSettingsOpen(true)} />
      )}

      {/* Pendientes concretos para la Dirección y Secretaría */}
      <ActionsPanel isBoardingComplete={onboarding ? onboarding.percent === 100 : true} />

      {/* Botonera de Acciones Rápidas Según el Rol */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Acciones Rápidas</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {isAdmin ? (
            <>
              <QuickActionCard
                icon={UserPlus}
                title="Nuevo alumno"
                subtitle="Registrar matrícula"
                onClick={() => navigate('/students?abrir=matricula')}
                {...TONES.primary}
              />
              <QuickActionCard
                icon={DollarSign}
                title="Nuevo cobro"
                subtitle="Cobro individual"
                onClick={() => navigate('/payments?abrir=cobro')}
                {...TONES.emerald}
              />
              <QuickActionCard
                icon={PlusCircle}
                title="Generar pensiones"
                subtitle="Por aula"
                onClick={() => navigate('/payments?abrir=pensiones')}
                {...TONES.amber}
              />
              <QuickActionCard
                icon={Megaphone}
                title="Publicar aviso"
                subtitle="Comunicados"
                onClick={() => navigate('/announcements?abrir=nuevo')}
                {...TONES.primary}
              />
            </>
          ) : (
            <>
              <QuickActionCard
                icon={UserPlus}
                title="Matricular alumno"
                subtitle="Nueva matrícula"
                onClick={() => navigate('/students?abrir=matricula')}
                {...TONES.primary}
              />
              <QuickActionCard
                icon={DollarSign}
                title="Caja diaria"
                subtitle="Cobro en ventanilla"
                onClick={() => navigate('/payments/cash')}
                {...TONES.emerald}
              />
              <QuickActionCard
                icon={QrCode}
                title="Carnets QR"
                subtitle="Impresión por sección"
                onClick={() => navigate('/students?abrir=carnets')}
                {...TONES.sky}
              />
              <QuickActionCard
                icon={Megaphone}
                title="Publicar aviso"
                subtitle="Circular a familias"
                onClick={() => navigate('/announcements?abrir=nuevo')}
                {...TONES.amber}
              />
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
          </>
        )}

        {canSeeMacroFinances && (
          <>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
                  Recaudación Total
                </CardTitle>
                <CreditCard className="w-4 h-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {formatMoney(paidTotal)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{collectionPercentage}% cobrado de obligaciones</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
                  Pendiente de Cobro
                </CardTitle>
                <Clock className="w-4 h-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                  {formatMoney(pendingTotal)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Pensiones por regularizar</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {canSeeMacroFinances && totalAmountDue > 0 && (
        <Card className="p-6 border-border bg-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="w-4 h-4" />
                Salud de Recaudación Financiera
              </div>
              <h3 className="text-lg font-bold text-foreground">
                {formatMoney(paidTotal)}{' '}
                <span className="text-xs font-normal text-muted-foreground">
                  cobrados de {formatMoney(totalAmountDue)} en total
                </span>
              </h3>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Cobrado: {formatMoney(paidTotal)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <Clock className="w-4 h-4" />
                <span>Pendiente: {formatMoney(pendingTotal)}</span>
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
                  <span className="text-xs text-muted-foreground">{formatPeruShortDate(announcement.publishedAt)}</span>
                </div>
                <h4 className="font-bold text-sm text-foreground line-clamp-1">{announcement.title}</h4>
                <p className="text-xs text-muted-foreground line-clamp-2">{announcement.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <SchoolSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};
