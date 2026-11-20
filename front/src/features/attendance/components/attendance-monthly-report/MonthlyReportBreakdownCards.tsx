import React from 'react';
import { CheckCircle2, XCircle, Clock, BarChart3, Download, Loader2, FileSpreadsheet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { AttendanceMonthlySummary } from '../../types';
import { formatMonthSpanish } from './downloadAttendanceExcel';

interface MonthlyReportBreakdownCardsProps {
  summary: AttendanceMonthlySummary;
  month: string;
  isExporting: boolean;
  onExport: () => void;
}

export const MonthlyReportBreakdownCards: React.FC<MonthlyReportBreakdownCardsProps> = ({
  summary,
  month,
  isExporting,
  onExport,
}) => {
  const { counts, percentages, totalRecords } = summary;

  return (
    <>
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
              Tasa de Asistencia ({formatMonthSpanish(month)})
            </CardTitle>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {percentages.presentRate}%
            </div>
            <div className="mt-2 w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${percentages.presentRate}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{counts.PRESENT} registros presentes</p>
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
            <div className="text-3xl font-bold text-destructive">{percentages.absentRate}%</div>
            <div className="mt-2 w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-destructive h-full rounded-full transition-all duration-500"
                style={{ width: `${percentages.absentRate}%` }}
              />
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
            <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{percentages.lateRate}%</div>
            <div className="mt-2 w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${percentages.lateRate}%` }}
              />
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
                <CardTitle className="text-base font-bold">
                  Desglose Detallado de {formatMonthSpanish(month)}
                </CardTitle>
                <CardDescription className="text-xs">
                  Resumen de un total de <strong>{totalRecords}</strong> marcaciones registradas
                </CardDescription>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-xs font-bold"
              onClick={onExport}
              disabled={isExporting || totalRecords === 0}
            >
              {isExporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              )}
              {isExporting ? 'Generando...' : 'Exportar Acta Resumen (.xlsx)'}
            </Button>
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

            <div className="p-3 rounded-lg border border-border bg-sky-500/10">
              <span className="font-bold text-sky-600 dark:text-sky-400 block text-lg">
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
              <span className="font-bold text-destructive block text-lg">{counts.ABSENT_JUSTIFIED}</span>
              <span className="text-muted-foreground font-medium">Falta Just.</span>
            </div>

            <div className="p-3 rounded-lg border border-border bg-destructive/10">
              <span className="font-bold text-destructive block text-lg">{counts.ABSENT_UNJUSTIFIED}</span>
              <span className="text-muted-foreground font-medium">Falta Inj.</span>
            </div>
          </div>

          {totalRecords === 0 && (
            <div className="mt-2 p-3 rounded-lg border border-dashed border-border text-center text-xs text-muted-foreground">
              <Download className="w-5 h-5 mx-auto mb-1 opacity-40" />
              No hay registros de asistencia para el mes de {formatMonthSpanish(month)}. El botón de exportar se
              habilitará cuando haya datos.
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};
