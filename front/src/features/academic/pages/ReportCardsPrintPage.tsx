import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useClassroomReportCards } from '../api';
import { ReportCardSheet } from '../components/ReportCardView';

export const ReportCardsPrintPage: React.FC = () => {
  const [params] = useSearchParams();
  const classroomId = params.get('classroomId');
  const { data, isLoading, error } = useClassroomReportCards(classroomId);
  if (!classroomId) return <p className="text-sm">Falta elegir el aula.</p>;
  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (error || !data) return <p className="text-sm text-red-600">No se pudieron generar las libretas.</p>;
  return (
    <div>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <p className="text-sm text-muted-foreground">{data.length} libretas · usa "Guardar como PDF" en el diálogo de impresión.</p>
        <Button onClick={() => window.print()}><Printer className="mr-1 h-4 w-4" />Imprimir / Guardar PDF</Button>
      </div>
      <div className="space-y-6 print:space-y-0">
        {data.map((card) => <ReportCardSheet key={card.student.fullName} card={card} printable />)}
      </div>
    </div>
  );
};
