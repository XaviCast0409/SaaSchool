import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useClassroomReportCards } from '../api';
import { useClassrooms } from '@/features/classrooms/api/useClassrooms';
import { formatEducationLevel } from '@/lib/utils';
import { ReportCardSheet, ReportPeriodSelect, defaultReportPeriod } from '../components/ReportCardView';
import { PrintPortal, usePrint } from '@/lib/print';

export const ReportCardsPrintPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const classroomId = params.get('classroomId');
  const { data: classrooms = [] } = useClassrooms();
  const { data, isLoading, error } = useClassroomReportCards(classroomId);
  const [period, setPeriod] = useState<number | null>(null);
  useEffect(() => {
    if (data?.length && period === null) setPeriod(defaultReportPeriod(data[0]));
  }, [data, period]);

  const { print, isPrinting } = usePrint({
    pageSize: 'A4 portrait',
    title: 'Libretas_del_Aula',
  });

  if (!classroomId) {
    return (
      <div className="mx-auto max-w-md space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm mt-8">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-foreground">Libretas de notas</h2>
          <p className="text-xs text-muted-foreground">
            Selecciona el aula para generar e imprimir las libretas escolares.
          </p>
        </div>
        <div>
          <label className="text-xs font-semibold block mb-1">Aula y Sección</label>
          <select
            className="w-full text-xs rounded-xl border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            onChange={(e) => {
              if (e.target.value) setParams({ classroomId: e.target.value });
            }}
            defaultValue=""
          >
            <option value="">— Selecciona un aula —</option>
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>
                {c.grade}° "{c.section}" - {formatEducationLevel(c.educationLevel)}
              </option>
            ))}
          </select>
        </div>
        <div className="pt-2 border-t border-border flex justify-end">
          <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
            <Link to="/academic-reports">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Volver a Reportes académicos</span>
            </Link>
          </Button>
        </div>
      </div>
    );
  }
  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (error || !data) return <p className="text-sm text-red-600">No se pudieron generar las libretas.</p>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {data[0] && data[0].visiblePeriods.length > 0 && (
            <ReportPeriodSelect card={data[0]} value={period} onChange={setPeriod} />
          )}
          <p className="text-sm text-muted-foreground">
            {data.length} libretas · usa "Guardar como PDF" en el diálogo de impresión.
          </p>
        </div>
        <Button onClick={print} disabled={isPrinting}>
          <Printer className="mr-1 h-4 w-4" />
          Imprimir / Guardar PDF
        </Button>
      </div>
      <div className="space-y-6">
        {data.map((card) => (
          <ReportCardSheet key={card.student.fullName} card={card} periodNumber={period} />
        ))}
      </div>

      {isPrinting && (
        <PrintPortal>
          {data.map((card, idx) => (
            <ReportCardSheet
              key={card.student.fullName}
              card={card}
              periodNumber={period}
              printable
              className={idx < data.length - 1 ? 'break-after-page' : ''}
            />
          ))}
        </PrintPortal>
      )}
    </div>
  );
};
