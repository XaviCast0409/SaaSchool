import React from 'react';
import { Building2, DollarSign, Users, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatMoney } from '@/lib/format';
import type { BillingSummary } from '../../types';

interface SuperAdminKpiCardsProps {
  isLoading: boolean;
  activeSchools: number;
  totalSchools: number;
  estimatedMRR: number;
  overdueSchools: number;
  totalStudentsInPlatform: number;
  isBillingLoading: boolean;
  billing: BillingSummary | undefined;
}

export const SuperAdminKpiCards: React.FC<SuperAdminKpiCardsProps> = ({
  isLoading,
  activeSchools,
  totalSchools,
  estimatedMRR,
  overdueSchools,
  totalStudentsInPlatform,
  isBillingLoading,
  billing,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Colegios Clientes</CardTitle>
          <Building2 className="w-4 h-4 text-primary" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <div className="text-2xl font-extrabold text-foreground">
              {activeSchools}{' '}
              <span className="text-xs font-semibold text-muted-foreground">/ {totalSchools} activos</span>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-1">Instituciones conectadas</p>
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-bold uppercase text-muted-foreground">MRR Estimado (S/ mes)</CardTitle>
          <DollarSign className="w-4 h-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {formatMoney(estimatedMRR)}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {overdueSchools > 0 ? (
              <span className="text-destructive font-semibold">{overdueSchools} con plan vencido</span>
            ) : (
              'Ingresos recurrentes mensuales'
            )}
          </p>
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Alumnos en Plataforma</CardTitle>
          <Users className="w-4 h-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <div className="text-2xl font-extrabold text-foreground">{totalStudentsInPlatform}</div>
          )}
          <p className="text-xs text-muted-foreground mt-1">Matrículas activas consolidadas</p>
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Cobrado este mes</CardTitle>
          <Wallet className="w-4 h-4 text-primary" />
        </CardHeader>
        <CardContent>
          {isBillingLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <div className="text-2xl font-extrabold text-foreground">
              {formatMoney(billing?.collectedThisMonth ?? 0)}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {billing
              ? `${billing.paymentsThisMonth} ${billing.paymentsThisMonth === 1 ? 'pago' : 'pagos'} · mes anterior ${formatMoney(billing.collectedLastMonth)}`
              : 'Pagos de suscripción registrados'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
