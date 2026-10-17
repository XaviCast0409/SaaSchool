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
  BookOpen,
  Sparkles,
  QrCode,
  School,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useStudents } from '@/features/students/api/useStudents';
import { useClassrooms } from '@/features/classrooms/api/useClassrooms';
import { useParentPayments, useFinancialSummary } from '@/features/payments/api/usePayments';
import { useGetAnnouncements } from '@/features/announcements/api/useAnnouncements';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { ParentPortalPage } from '@/features/parent/pages/ParentPortalPage';

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

  // Si el usuario es PADRE / APODERADO, renderizar directamente su portal familiar
  if (user?.role === 'PARENT') {
    return <ParentPortalPage />;
  }

  const isTeacher = user?.role === 'TEACHER';
  const isParent = false;
  const isAdministrative = user?.role === 'ADMINISTRATIVE';
  const isAdmin = user?.role === 'SCHOOL_ADMIN' || (user?.role === 'SUPER_ADMIN' && !!impersonatedSchool);
  const canManageStudents = isAdmin || isAdministrative;
  const canSeeMacroFinances = isAdmin; // Estrictamente exclusivo de la Dirección del Colegio

  // Queries segregadas por rol para prevenir 403 y llamadas innecesarias
  const { data: studentsResponse } = useStudents({ page: 1, limit: 100 }, canManageStudents);
  const totalStudentsCount = studentsResponse?.meta?.total || 0;

  const { data: classrooms = [] } = useClassrooms();
  const classroomsCount = classrooms.length;

  // Solo el director consulta el resumen macro financiero con montos en soles
  const { data: financialSummary } = useFinancialSummary(canSeeMacroFinances);
  const { data: parentObligations = [] } = useParentPayments(isParent);
  const { data: announcementsData } = useGetAnnouncements({ page: 1, limit: 3 });
  const announcementsCount = announcementsData?.meta?.total ?? announcementsData?.data?.length ?? 0;

  // Cálculos financieros en montos (Exclusivo Director o Padres para sus propias pensiones)
  const totalAmountDue = canSeeMacroFinances
    ? financialSummary?.totalExpected ?? 0
    : isParent
    ? parentObligations.reduce((acc, curr) => acc + curr.amountDue, 0)
    : 0;

  const paidTotal = canSeeMacroFinances
    ? financialSummary?.totalCollected ?? 0
    : isParent
    ? parentObligations.filter((o) => o.status === 'PAID').reduce((acc, curr) => acc + curr.amountDue, 0)
    : 0;

  const pendingTotal = canSeeMacroFinances
    ? financialSummary?.totalPending ?? 0
    : isParent
    ? Math.max(0, totalAmountDue - paidTotal)
    : 0;

  const collectionPercentage = totalAmountDue > 0 ? Math.round((paidTotal / totalAmountDue) * 100) : 0;

  return (
    <div className="space-y-6 pb-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-primary/15 via-primary/5 to-card border border-primary/20 shadow-sm">
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
            <Building2 className="w-4 h-4" />
            <span>SaaS B2B Escolar • Entorno Seguro</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            ¡Hola, {user?.firstName} {user?.lastNamePaternal}!
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            {isAdmin
              ? 'Panel de control ejecutivo. Supervisa matriculados, estado de cobranzas y emite avisos oficiales.'
              : isAdministrative
              ? 'Panel de secretaría y caja. Gestiona matrículas, cobro de pensiones en ventanilla, carnets QR y circulares.'
              : isTeacher
              ? 'Panel docente para control de asistencia diario, tus cursos a cargo e ingreso de notas SIAGIE.'
              : 'Bienvenido al portal familiar. Consulta el estado de tus pensiones, libreta de notas y avisos oficiales.'}
          </p>
        </div>
      </div>

      {/* Botonera de Acciones Rápidas Según el Rol */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Acciones Rápidas
        </h2>
        {isAdmin && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => navigate('/students')}
              className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-primary/10 hover:border-primary/40 text-foreground transition-all shadow-sm group"
            >
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <UserPlus className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="block font-bold text-sm leading-tight">Nuevo Alumno</span>
                <span className="text-[11px] text-muted-foreground">Registrar matrícula</span>
              </div>
            </button>

            <button
              onClick={() => navigate('/payments')}
              className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-emerald-500/10 hover:border-emerald-500/40 text-foreground transition-all shadow-sm group"
            >
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                <DollarSign className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="block font-bold text-sm leading-tight">Registrar Pago</span>
                <span className="text-[11px] text-muted-foreground">Ingreso manual</span>
              </div>
            </button>

            <button
              onClick={() => navigate('/payments')}
              className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-amber-500/10 hover:border-amber-500/40 text-foreground transition-all shadow-sm group"
            >
              <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="block font-bold text-sm leading-tight">Cobros Masivos</span>
                <span className="text-[11px] text-muted-foreground">Generar por aula</span>
              </div>
            </button>

            <button
              onClick={() => navigate('/announcements')}
              className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-primary/10 hover:border-primary/40 text-foreground transition-all shadow-sm group"
            >
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Megaphone className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="block font-bold text-sm leading-tight">Publicar Aviso</span>
                <span className="text-[11px] text-muted-foreground">Comunicados</span>
              </div>
            </button>
          </div>
        )}

        {isAdministrative && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => navigate('/students')}
              className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-primary/10 hover:border-primary/40 text-foreground transition-all shadow-sm group"
            >
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <UserPlus className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="block font-bold text-sm leading-tight">Matricular Alumno</span>
                <span className="text-[11px] text-muted-foreground">Nueva matrícula</span>
              </div>
            </button>

            <button
              onClick={() => navigate('/payments')}
              className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-emerald-500/10 hover:border-emerald-500/40 text-foreground transition-all shadow-sm group"
            >
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                <DollarSign className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="block font-bold text-sm leading-tight">Caja Ventanilla</span>
                <span className="text-[11px] text-muted-foreground">Cobro de pensión</span>
              </div>
            </button>

            <button
              onClick={() => navigate('/students')}
              className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-sky-500/10 hover:border-sky-500/40 text-foreground transition-all shadow-sm group"
            >
              <div className="p-2.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                <QrCode className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="block font-bold text-sm leading-tight">Carnets QR</span>
                <span className="text-[11px] text-muted-foreground">Impresión por sección</span>
              </div>
            </button>

            <button
              onClick={() => navigate('/announcements')}
              className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-amber-500/10 hover:border-amber-500/40 text-foreground transition-all shadow-sm group"
            >
              <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                <Megaphone className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="block font-bold text-sm leading-tight">Publicar Aviso</span>
                <span className="text-[11px] text-muted-foreground">Circular a familias</span>
              </div>
            </button>
          </div>
        )}

        {isTeacher && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => navigate('/teacher-assignments')}
              className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-primary/10 hover:border-primary/40 text-foreground transition-all shadow-sm group"
            >
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="block font-bold text-sm leading-tight">Mis Cursos</span>
                <span className="text-[11px] text-muted-foreground">Carga asignada</span>
              </div>
            </button>

            <button
              onClick={() => navigate('/attendance')}
              className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-emerald-500/10 hover:border-emerald-500/40 text-foreground transition-all shadow-sm group"
            >
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="block font-bold text-sm leading-tight">Tomar Asistencia</span>
                <span className="text-[11px] text-muted-foreground">Control de aula</span>
              </div>
            </button>

            <button
              onClick={() => navigate('/grades')}
              className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-sky-500/10 hover:border-sky-500/40 text-foreground transition-all shadow-sm group"
            >
              <div className="p-2.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="block font-bold text-sm leading-tight">Registro Notas</span>
                <span className="text-[11px] text-muted-foreground">Calificaciones</span>
              </div>
            </button>

            <button
              onClick={() => navigate('/announcements')}
              className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-primary/10 hover:border-primary/40 text-foreground transition-all shadow-sm group"
            >
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Megaphone className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="block font-bold text-sm leading-tight">Comunicados</span>
                <span className="text-[11px] text-muted-foreground">Avisos del colegio</span>
              </div>
            </button>
          </div>
        )}

        {isParent && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => navigate('/payments')}
              className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-emerald-500/10 hover:border-emerald-500/40 text-foreground transition-all shadow-sm group"
            >
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                <CreditCard className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="block font-bold text-sm leading-tight">Mis Pensiones y Pagos</span>
                <span className="text-[11px] text-muted-foreground">Historial y deudas pendientes</span>
              </div>
            </button>

            <button
              onClick={() => navigate('/grades')}
              className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-primary/10 hover:border-primary/40 text-foreground transition-all shadow-sm group"
            >
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <BookOpenCheck className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="block font-bold text-sm leading-tight">Libreta de Calificaciones</span>
                <span className="text-[11px] text-muted-foreground">Notas y escala CNEB</span>
              </div>
            </button>

            <button
              onClick={() => navigate('/announcements')}
              className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-sky-500/10 hover:border-sky-500/40 text-foreground transition-all shadow-sm group"
            >
              <div className="p-2.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                <Megaphone className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="block font-bold text-sm leading-tight">Avisos y Circulares</span>
                <span className="text-[11px] text-muted-foreground">Comunicados institucionales</span>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Indicadores Principales / KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Estudiantes (Para Dirección y Personal Administrativo) */}
        {canManageStudents && (
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
        )}

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

        {/* Recaudación Total (Exclusivo Dirección del Colegio) */}
        {canSeeMacroFinances && (
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
        )}

        {/* Pendiente de Cobro (Exclusivo Dirección del Colegio) */}
        {canSeeMacroFinances && (
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
        )}

        {/* Asistencia (Solo Dirección y Profesores — NUNCA Administrativo ni Padres) */}
        {(isAdmin || isTeacher) && (
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Asistencia Hoy</CardTitle>
              <CalendarCheck className="w-4 h-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-extrabold text-foreground">Diario</div>
              <p className="text-xs text-muted-foreground mt-1">Panel de control por aula</p>
            </CardContent>
          </Card>
        )}

        {/* Notas SIAGIE (Solo Docentes y Padres — NUNCA Administrativo) */}
        {(isTeacher || isParent) && (
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Evaluación CNEB</CardTitle>
              <BookOpenCheck className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-extrabold text-foreground">Escala AD / A / B / C</div>
              <p className="text-xs text-muted-foreground mt-1">Matriz cualitativa MINEDU</p>
            </CardContent>
          </Card>
        )}

        {/* Portal de Padres: Pensiones */}
        {isParent && (
          <>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Tus Pensiones Pagadas</CardTitle>
                <CreditCard className="w-4 h-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  S/ {paidTotal.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Total abonado este año escolar</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Pendiente de Pago</CardTitle>
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
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary">
                    {announcement.priority}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(announcement.publishedAt).toLocaleDateString('es-PE')}
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
          {canManageStudents && (
            <Card className="flex flex-col justify-between hover:border-primary/50 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="w-5 h-5 text-primary" />
                  Estudiantes
                </CardTitle>
                <CardDescription className="text-xs">
                  Directorio matriculado y datos demográficos SIAGIE.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between text-xs font-semibold text-primary"
                  onClick={() => navigate('/students')}
                >
                  <span>Ver lista de alumnos</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          )}

          {isTeacher && (
            <Card className="flex flex-col justify-between hover:border-primary/50 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BookOpen className="w-5 h-5 text-primary" />
                  Mis Cursos Asignados
                </CardTitle>
                <CardDescription className="text-xs">
                  Aulas, áreas y carga horaria oficial asignada.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between text-xs font-semibold text-primary"
                  onClick={() => navigate('/teacher-assignments')}
                >
                  <span>Ver mis materias</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          )}

          {(canSeeMacroFinances || isAdministrative || isParent) && (
            <Card className="flex flex-col justify-between hover:border-primary/50 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCard className="w-5 h-5 text-emerald-500" />
                  {isParent ? 'Mis Pagos y Pensiones' : isAdministrative ? 'Caja y Cobranzas' : 'Cobranzas y Pagos'}
                </CardTitle>
                <CardDescription className="text-xs">
                  {isParent
                    ? 'Consulta tus recibos, cronograma y estados de pago.'
                    : isAdministrative
                    ? 'Cobro en ventanilla, consulta de deudores y emisión de boletas.'
                    : 'Control de pensiones, boletas, morosidad y transacciones.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between text-xs font-semibold text-primary"
                  onClick={() => navigate('/payments')}
                >
                  <span>{isParent ? 'Ver mis recibos' : 'Ver módulo pagos'}</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          )}

          {!isAdministrative && (isAdmin || isTeacher || isParent) && (
            <Card className="flex flex-col justify-between hover:border-primary/50 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BookOpenCheck className="w-5 h-5 text-primary" />
                  {isParent ? 'Libreta de Calificaciones' : 'Registro de Notas'}
                </CardTitle>
                <CardDescription className="text-xs">
                  {isParent
                    ? 'Consulta el avance académico y notas de tus hijos.'
                    : 'Matriz evaluativa interactiva con conversión a escala CNEB.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between text-xs font-semibold text-primary"
                  onClick={() => navigate('/grades')}
                >
                  <span>{isParent ? 'Ver libreta escolar' : 'Abrir registro notas'}</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          )}

          {(isAdmin || isTeacher) && (
            <Card className="flex flex-col justify-between hover:border-primary/50 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarCheck className="w-5 h-5 text-amber-500" />
                  Asistencia
                </CardTitle>
                <CardDescription className="text-xs">
                  Control diario por fecha y reportes de asistencia escolar.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between text-xs font-semibold text-primary"
                  onClick={() => navigate('/attendance')}
                >
                  <span>Ver asistencia</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          )}

          {(isAdministrative || isParent) && (
            <Card className="flex flex-col justify-between hover:border-primary/50 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Megaphone className="w-5 h-5 text-sky-500" />
                  {isParent ? 'Avisos y Circulares' : 'Comunicados Oficiales'}
                </CardTitle>
                <CardDescription className="text-xs">
                  {isParent
                    ? 'Comunicados oficiales emitidos por el colegio.'
                    : 'Emisión y difusión de circulares y citaciones a las familias.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between text-xs font-semibold text-primary"
                  onClick={() => navigate('/announcements')}
                >
                  <span>{isParent ? 'Leer circulares' : 'Gestionar avisos'}</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
