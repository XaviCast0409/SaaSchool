import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  CreditCard,
  BookOpenCheck,
  CalendarCheck,
  Building2,
  ArrowRight,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useStudents } from '@/features/students/api/useStudents';
import { usePayments } from '@/features/payments/api/usePayments';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const { data: students = [] } = useStudents();
  const { data: obligations = [] } = usePayments();

  const paidTotal = obligations
    .filter((o) => o.status === 'PAID')
    .reduce((acc, curr) => acc + curr.amountDue, 0);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="p-6 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 space-y-2">
        <div className="flex items-center gap-2 text-primary font-semibold text-sm">
          <Building2 className="w-4 h-4" />
          <span>SaaS B2B Multi-Tenant Activo</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          ¡Bienvenido, {user?.firstName} {user?.lastNamePaternal}!
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Estás conectado al entorno Multi-Tenant con token de autenticación asignado al colegio{' '}
          <strong className="text-foreground font-mono">{user?.schoolId}</strong>.
        </p>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Estudiantes</CardTitle>
            <Users className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{students.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Matriculados en el colegio</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Cobranzas Recaudadas</CardTitle>
            <CreditCard className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              S/ {paidTotal.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{obligations.length} obligaciones registradas</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Registro Notas</CardTitle>
            <BookOpenCheck className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">Escala AD / A / B / C</div>
            <p className="text-xs text-muted-foreground mt-1">SIAGIE Minedu evaluativo</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Asistencia</CardTitle>
            <CalendarCheck className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">5 Semanas</div>
            <p className="text-xs text-muted-foreground mt-1">Histórico diario cargado</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Navigation Cards */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold tracking-tight text-foreground">Secciones Fundamentales</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="flex flex-col justify-between hover:border-primary/50 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="w-5 h-5 text-primary" />
                Estudiantes
              </CardTitle>
              <CardDescription className="text-xs">
                Directorio con TanStack Table, búsqueda global y datos SIAGIE.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between text-xs font-semibold text-primary"
                onClick={() => navigate('/students')}
              >
                <span>Ir al directorio</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>

          <Card className="flex flex-col justify-between hover:border-primary/50 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="w-5 h-5 text-emerald-500" />
                Cobranzas y Pagos
              </CardTitle>
              <CardDescription className="text-xs">
                Control de pensiones, boletas, morosidad y transacciones.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between text-xs font-semibold text-primary"
                onClick={() => navigate('/payments')}
              >
                <span>Ver módulo pagos</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>

          <Card className="flex flex-col justify-between hover:border-primary/50 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpenCheck className="w-5 h-5 text-primary" />
                Excel de Notas
              </CardTitle>
              <CardDescription className="text-xs">
                Matriz evaluativa interactiva tipo Excel con conversion a letras.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between text-xs font-semibold text-primary"
                onClick={() => navigate('/grades')}
              >
                <span>Abrir registro notas</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>

          <Card className="flex flex-col justify-between hover:border-primary/50 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarCheck className="w-5 h-5 text-amber-500" />
                Asistencia
              </CardTitle>
              <CardDescription className="text-xs">
                Control diario por fecha con estados presente/falta/tardanza.
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
        </div>
      </div>
    </div>
  );
};
