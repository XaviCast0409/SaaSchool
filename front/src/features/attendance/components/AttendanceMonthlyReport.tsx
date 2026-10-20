import React, { useState, useCallback } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
  Download,
  Loader2,
  FileSpreadsheet,
  School,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAttendanceSummary, useAttendanceExportData } from '../api/useAttendance';
import { useClassrooms } from '@/features/classrooms/api/useClassrooms';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import type { AttendanceExportRow } from '../types';
import * as XLSX from 'xlsx';
import { getPeruCurrentMonth } from '@/lib/dateUtils';

interface AttendanceMonthlyReportProps {
  initialMonth?: string;
  initialClassroomId?: string;
  month?: string;
  classroomId?: string;
}

const SPANISH_MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

function formatMonthSpanish(monthStr: string): string {
  const [y, m] = monthStr.split('-').map(Number);
  if (!y || !m) return monthStr;
  return `${SPANISH_MONTHS[m - 1].toUpperCase()} ${y}`;
}

function navigateMonth(currentMonthStr: string, delta: number): string {
  const [y, m] = currentMonthStr.split('-').map(Number);
  const date = new Date(y, m - 1 + delta, 1);
  const nextY = date.getFullYear();
  const nextM = String(date.getMonth() + 1).padStart(2, '0');
  return `${nextY}-${nextM}`;
}

/** Genera y descarga el Acta Mensual de Asistencia en formato Excel (.xlsx) Profesional */
function downloadExcel(rows: AttendanceExportRow[], monthStr: string): void {
  const periodText = formatMonthSpanish(monthStr);

  const title1 = ['REPUBLICA DEL PERU - MINISTERIO DE EDUCACION'];
  const title2 = ['ACTA OFICIAL CONSOLIDADA DE ASISTENCIA Y PERMANENCIA ESCOLAR'];
  const title3 = [`PERIODO LECTIVO: ${periodText}`];
  const blankRow: string[] = [];

  const headers = [
    'N°',
    'APELLIDOS Y NOMBRES DEL ESTUDIANTE',
    'DOC. IDENTIDAD',
    'GRADO',
    'SECCION',
    'PRES. (P)',
    'TARD. JUST. (TJ)',
    'TARD. INJ. (TI)',
    'FAL. JUST. (FJ)',
    'FAL. INJ. (FI)',
    '% ASISTENCIA',
    'ESTADO FINAL',
  ];

  const dataRows = rows.map((row, index) => {
    let evalStatus = 'REGULAR';
    if (row.attendanceRate < 80) evalStatus = 'OBSERVADO (RIESGO)';
    else if (row.counts.ABSENT_UNJUSTIFIED >= 3) evalStatus = 'ALERTA DE FALTAS';

    return [
      index + 1,
      row.studentName.toUpperCase(),
      row.documentId,
      row.grade,
      row.section,
      row.counts.PRESENT,
      row.counts.LATE_JUSTIFIED,
      row.counts.LATE_UNJUSTIFIED,
      row.counts.ABSENT_JUSTIFIED,
      row.counts.ABSENT_UNJUSTIFIED,
      `${row.attendanceRate}%`,
      evalStatus,
    ];
  });

  const legend1 = ['', 'LEYENDA OFICIAL SIAGIE MINEDU:'];
  const legend2 = ['', 'P: Presente | FI: Falta Injustificada | FJ: Falta Justificada | TI: Tardanza Injustificada | TJ: Tardanza Justificada'];
  const sig1 = ['', '', '', '_____________________________________'];
  const sig2 = ['', '', '', 'Firma y Sello del Director(a) de la I.E.'];

  const worksheetData = [
    title1,
    title2,
    title3,
    blankRow,
    headers,
    ...dataRows,
    blankRow,
    legend1,
    legend2,
    blankRow,
    blankRow,
    sig1,
    sig2,
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  worksheet['!cols'] = [
    { wch: 5 },  // N°
    { wch: 38 }, // Nombre Alumno
    { wch: 15 }, // DNI
    { wch: 8 },  // Grado
    { wch: 9 },  // Sección
    { wch: 10 }, // Presentes
    { wch: 14 }, // Tardanza Just
    { wch: 14 }, // Tardanza Inj
    { wch: 14 }, // Falta Just
    { wch: 14 }, // Falta Inj
    { wch: 14 }, // % Asistencia
    { wch: 22 }, // Estado
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Acta_${periodText.replace(/\s+/g, '_')}`);

  XLSX.writeFile(workbook, `Acta_Resumen_Asistencia_${monthStr}.xlsx`);
}

export const AttendanceMonthlyReport: React.FC<AttendanceMonthlyReportProps> = ({
  initialMonth = getPeruCurrentMonth(),
  initialClassroomId = '',
  month: propMonth,
  classroomId: propClassroomId,
}) => {
  const [month, setMonth] = useState(propMonth || initialMonth);
  const [classroomId, setClassroomId] = useState(
    propClassroomId !== undefined ? propClassroomId : initialClassroomId
  );

  const { data: classrooms = [] } = useClassrooms();
  const { data: summary, isLoading, isError } = useAttendanceSummary({
    month,
    classroomId: classroomId || undefined,
  });
  const {
    isFetching: isExporting,
    refetch: fetchExport,
  } = useAttendanceExportData({ month, classroomId: classroomId || undefined });

  const handleExport = useCallback(async () => {
    const result = await fetchExport();
    if (result.data && result.data.length > 0) {
      downloadExcel(result.data, month);
    }
  }, [fetchExport, month]);

  const counts = summary?.counts;
  const percentages = summary?.percentages;
  const totalRecords = summary?.totalRecords ?? 0;

  return (
    <div className="space-y-6">
      {/* Barra de Filtros de Aula y Mes para Reportes & KPIs */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Selector de Aula */}
          <div className="flex items-center gap-1.5 bg-background px-3 py-1.5 rounded-lg border border-input text-xs font-semibold">
            <School className="w-4 h-4 text-muted-foreground" />
            <select
              value={classroomId}
              onChange={(e) => setClassroomId(e.target.value)}
              className="bg-transparent border-none focus:outline-none text-foreground font-semibold cursor-pointer"
            >
              <option value="">— Selecciona un Aula / Sección —</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.grade}° {c.section} ({c.educationLevel === 'PRIMARY' ? 'Primaria' : c.educationLevel === 'SECONDARY' ? 'Secundaria' : 'Inicial'})
                </option>
              ))}
            </select>
          </div>

          {/* Navegación por Mes (Anterior / Siguiente) */}
          <div className="flex items-center gap-1 bg-background p-1 rounded-lg border border-input text-xs font-semibold">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              title="Mes Anterior"
              onClick={() => setMonth((m) => navigateMonth(m, -1))}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>

            <div className="flex items-center gap-1 px-1">
              <CalendarIcon className="w-3.5 h-3.5 text-primary" />
              <Input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="h-6 border-none bg-transparent text-xs font-bold focus-visible:ring-0 w-32 p-0 cursor-pointer"
              />
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              title="Mes Siguiente"
              onClick={() => setMonth((m) => navigateMonth(m, 1))}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Botón Exportar Acta Resumen (.xlsx) */}
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-xs font-bold w-full lg:w-auto"
          onClick={handleExport}
          disabled={!classroomId || isExporting || !summary || totalRecords === 0}
        >
          {isExporting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
          )}
          <span>{isExporting ? 'Generando...' : 'Exportar Acta Resumen (.xlsx)'}</span>
        </Button>
      </div>

      {/* Vista de Estado */}
      {!classroomId ? (
        <div className="py-16 text-center text-muted-foreground border border-dashed border-border rounded-xl space-y-3 bg-card p-6">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <School className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base text-foreground">Selecciona una Sección Educativa</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Por favor selecciona un Aula/Sección en la barra de filtros superior para consultar las estadísticas del reporte mensual.
            </p>
          </div>
        </div>
      ) : isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      ) : isError || !summary || !percentages || !counts ? (
        <div className="p-6 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-center text-sm font-medium">
          Error al cargar el resumen de asistencia del periodo {formatMonthSpanish(month)}.
        </div>
      ) : (
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
            <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
              {percentages.lateRate}%
            </div>
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
              onClick={handleExport}
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

          {totalRecords === 0 && (
            <div className="mt-2 p-3 rounded-lg border border-dashed border-border text-center text-xs text-muted-foreground">
              <Download className="w-5 h-5 mx-auto mb-1 opacity-40" />
              No hay registros de asistencia para el mes de {formatMonthSpanish(month)}. El botón de exportar se habilitará cuando haya datos.
            </div>
          )}
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
};
