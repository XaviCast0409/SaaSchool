import React, { useState, useCallback } from 'react';
import { School } from 'lucide-react';
import { useAttendanceSummary, useAttendanceExportData } from '../api/useAttendance';
import { useClassrooms } from '@/features/classrooms/api/useClassrooms';
import { Skeleton } from '@/components/ui/skeleton';
import { getPeruCurrentMonth } from '@/lib/dateUtils';
import { downloadAttendanceExcel, formatMonthSpanish } from './attendance-monthly-report/downloadAttendanceExcel';
import { MonthlyReportHeader } from './attendance-monthly-report/MonthlyReportHeader';
import { MonthlyReportBreakdownCards } from './attendance-monthly-report/MonthlyReportBreakdownCards';

interface AttendanceMonthlyReportProps {
  initialMonth?: string;
  initialClassroomId?: string;
  month?: string;
  classroomId?: string;
}

export const AttendanceMonthlyReport: React.FC<AttendanceMonthlyReportProps> = ({
  initialMonth = getPeruCurrentMonth(),
  initialClassroomId = '',
  month: propMonth,
  classroomId: propClassroomId,
}) => {
  const [month, setMonth] = useState(propMonth || initialMonth);
  const [classroomId, setClassroomId] = useState(propClassroomId !== undefined ? propClassroomId : initialClassroomId);

  const { data: classrooms = [] } = useClassrooms();
  const {
    data: summary,
    isLoading,
    isError,
  } = useAttendanceSummary({
    month,
    classroomId: classroomId || undefined,
  });
  const { isFetching: isExporting, refetch: fetchExport } = useAttendanceExportData({
    month,
    classroomId: classroomId || undefined,
  });

  const handleExport = useCallback(async () => {
    const result = await fetchExport();
    if (result.data && result.data.length > 0) {
      await downloadAttendanceExcel(result.data, month);
    }
  }, [fetchExport, month]);

  const totalRecords = summary?.totalRecords ?? 0;
  const canExport = !!summary && totalRecords > 0;

  return (
    <div className="space-y-6">
      <MonthlyReportHeader
        classroomId={classroomId}
        month={month}
        classrooms={classrooms}
        isExporting={isExporting}
        canExport={canExport}
        onClassroomChange={setClassroomId}
        onMonthChange={setMonth}
        onExport={handleExport}
      />

      {/* Vista de Estado */}
      {!classroomId ? (
        <div className="py-16 text-center text-muted-foreground border border-dashed border-border rounded-xl space-y-3 bg-card p-6">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <School className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base text-foreground">Selecciona una Sección Educativa</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Por favor selecciona un Aula/Sección en la barra de filtros superior para consultar las estadísticas del
              reporte mensual.
            </p>
          </div>
        </div>
      ) : isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      ) : isError || !summary || !summary.percentages || !summary.counts ? (
        <div className="p-6 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-center text-sm font-medium">
          Error al cargar el resumen de asistencia del periodo {formatMonthSpanish(month)}.
        </div>
      ) : (
        <MonthlyReportBreakdownCards
          summary={summary}
          month={month}
          isExporting={isExporting}
          onExport={handleExport}
        />
      )}
    </div>
  );
};
