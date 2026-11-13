import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useClassroomReportCards } from '../api';
import { ReportCardSheet, ReportPeriodSelect, defaultReportPeriod } from '../components/ReportCardView';
import { PrintPortal, usePrint } from '@/lib/print';

export const ReportCardsPrintPage: React.FC = () => {
  const [params] = useSearchParams();
  const classroomId = params.get('classroomId');
  const { data, isLoading, error } = useClassroomReportCards(classroomId);
  const [period, setPeriod] = useState<number | null>(null);
  useEffect(() => { if (data?.length && period === null) setPeriod(defaultReportPeriod(data[0])); }, [data, period]);

  const { print, isPrinting } = usePrint({
    pageSize: 'A4 portrait',
    title: 'Libretas_del_Aula',
  });

  if (!classroomId) return <p className="text-sm">Falta elegir el aula.</p>;
  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (error || !data) return <p className="text-sm text-red-600">No se pudieron generar las libretas.</p>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {data[0] && data[0].visiblePeriods.length > 0 && <ReportPeriodSelect card={data[0]} value={period} onChange={setPeriod} />}
          <p className="text-sm text-muted-foreground">{data.length} libretas · usa "Guardar como PDF" en el diálogo de impresión.</p>
        </div>
        <Button onClick={print} disabled={isPrinting}><Printer className="mr-1 h-4 w-4" />Imprimir / Guardar PDF</Button>
      </div>
      <div className="space-y-6">
        {data.map((card) => <ReportCardSheet key={card.student.fullName} card={card} periodNumber={period} />)}
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

