import React from 'react';
import { CheckCircle2, XCircle, Clock, BarChart3 } from 'lucide-react';
import { useAttendanceSummary } from '../api/useAttendance';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface AttendanceMonthlyReportProps {
  month: string;
  classroomId?: string;
}

export const AttendanceMonthlyReport: React.FC<AttendanceMonthlyReportProps> = ({
  month,
  classroomId,
}) => {
  const { data: summary, isLoading, isError } = useAttendanceSummary({ month, classroomId });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !summary) {
    return (
      <div className="p-6 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-center text-sm font-medium">
        Error al cargar el resumen de asistencia del periodo {month}.
      </div>
    );
  }

  const { counts, percentages, totalRecords } = summary;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
              Tasa de Asistencia
            </CardTitle>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {percentages.presentRate}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {counts.PRESENT} registros presentes
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
              Tasa de Inasistencia
            </CardTitle>
            <XCircle className="w-4 h-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">
              {percentages.absentRate}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {counts.ABSENT_JUSTIFIED + counts.ABSENT_UNJUSTIFIED} faltas registradas
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
              Tasa de Tardanza
            </CardTitle>
            <Clock className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
              {percentages.lateRate}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {counts.LATE_JUSTIFIED + counts.LATE_UNJUSTIFIED} tardanzas a clase
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown Card */}
      <Card className="bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              <div>
                <CardTitle className="text-base font-bold">Desglose Detallado del Mes ({month})</CardTitle>
                <CardDescription className="text-xs">
                  Resumen de un total de <strong>{totalRecords}</strong> marcaciones registradas
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Bar Visual Breakdown */}
          <div className="w-full h-3 rounded-full bg-muted overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full transition-all"
              style={{ width: `${percentages.presentRate}%` }}
              title={`Presente: ${percentages.presentRate}%`}
            />
            <div
              className="bg-amber-500 h-full transition-all"
              style={{ width: `${percentages.lateRate}%` }}
              title={`Tardanza: ${percentages.lateRate}%`}
            />
            <div
              className="bg-destructive h-full transition-all"
              style={{ width: `${percentages.absentRate}%` }}
              title={`Falta: ${percentages.absentRate}%`}
            />
          </div>

          {/* Counts Table Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 text-center text-xs">
            <div className="p-3 rounded-lg border border-border bg-emerald-500/10">
              <span className="font-bold text-emerald-600 dark:text-emerald-400 block text-lg">
                {counts.PRESENT}
              </span>
              <span className="text-muted-foreground font-medium">Presente</span>
            </div>

            <div className="p-3 rounded-lg border border-border bg-amber-500/10">
              <span className="font-bold text-amber-600 dark:text-amber-400 block text-lg">
                {counts.LATE_JUSTIFIED}
              </span>
              <span className="text-muted-foreground font-medium">Tardanza Just.</span>
            </div>

            <div className="p-3 rounded-lg border border-border bg-amber-500/10">
              <span className="font-bold text-amber-600 dark:text-amber-400 block text-lg">
                {counts.LATE_UNJUSTIFIED}
              </span>
              <span className="text-muted-foreground font-medium">Tardanza Inj.</span>
            </div>

            <div className="p-3 rounded-lg border border-border bg-destructive/10">
              <span className="font-bold text-destructive block text-lg">
                {counts.ABSENT_JUSTIFIED}
              </span>
              <span className="text-muted-foreground font-medium">Falta Just.</span>
            </div>

            <div className="p-3 rounded-lg border border-border bg-destructive/10">
              <span className="font-bold text-destructive block text-lg">
                {counts.ABSENT_UNJUSTIFIED}
              </span>
              <span className="text-muted-foreground font-medium">Falta Inj.</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
