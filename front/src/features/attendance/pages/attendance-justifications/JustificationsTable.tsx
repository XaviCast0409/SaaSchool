import React from 'react';
import { CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { openFile } from '@/features/course-contents/utils/fileUrls';
import { formatPeruDate } from '@/lib/dateUtils';
import type { AttendanceJustification } from '../../types';

const REASON_LABELS: Record<string, string> = {
  MEDICAL: 'Salud / cita médica',
  FAMILY: 'Motivo familiar',
  BEREAVEMENT: 'Duelo',
  TRANSPORT: 'Problema de transporte',
  OTHER: 'Otro motivo',
};

const LEVEL_LABELS: Record<string, string> = {
  INITIAL: 'Inicial',
  PRIMARY: 'Primaria',
  SECONDARY: 'Secundaria',
};

const formatDate = (iso: string) => {
  return formatPeruDate(iso, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Lima',
  });
};

const formatDateTime = (iso: string) => {
  return formatPeruDate(iso, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Lima',
  });
};

interface JustificationsTableProps {
  justifications: AttendanceJustification[];
  isReviewing: boolean;
  onApprove: (item: AttendanceJustification) => void;
  onReject: (item: AttendanceJustification) => void;
}

export const JustificationsTable: React.FC<JustificationsTableProps> = ({
  justifications,
  isReviewing,
  onApprove,
  onReject,
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="bg-muted/40 border-b border-border text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Estudiante</th>
            <th className="px-4 py-3">Aula</th>
            <th className="px-4 py-3">Fechas</th>
            <th className="px-4 py-3">Motivo</th>
            <th className="px-4 py-3">Descripción</th>
            <th className="px-4 py-3 text-center">Sustento</th>
            <th className="px-4 py-3">Enviado</th>
            <th className="px-4 py-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {justifications.map((item) => {
            const student = item.enrollment?.student;
            const classroom = item.enrollment?.classroom;
            const studentName = student
              ? `${student.lastNamePaternal} ${student.lastNameMaternal}, ${student.firstNames}`
              : 'Estudiante';
            const classroomLabel = classroom
              ? `${classroom.grade}° "${classroom.section}" - ${LEVEL_LABELS[classroom.educationLevel] || classroom.educationLevel}`
              : '—';

            const fromStr = formatDate(item.dateFrom);
            const toStr = formatDate(item.dateTo);
            const datesDisplay = fromStr === toStr ? fromStr : `${fromStr} – ${toStr}`;

            return (
              <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-bold text-foreground whitespace-nowrap">{studentName}</td>
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{classroomLabel}</td>
                <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">{datesDisplay}</td>
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                  <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-secondary text-secondary-foreground">
                    {REASON_LABELS[item.reason] || item.reason}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground max-w-xs">
                  <span className="line-clamp-2" title={item.description}>
                    {item.description}
                  </span>
                  {item.reviewNote && item.status === 'REJECTED' && (
                    <span className="block text-xs text-destructive mt-0.5">Nota: {item.reviewNote}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center whitespace-nowrap">
                  {item.fileUrl ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => item.fileUrl && void openFile(item.fileUrl)}
                      className="h-7 text-xs font-bold text-primary hover:text-primary gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Ver</span>
                    </Button>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">
                  {formatDateTime(item.createdAt)}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {item.status === 'PENDING' ? (
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        disabled={isReviewing}
                        onClick={() => onApprove(item)}
                        className="h-7 px-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Aprobar</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isReviewing}
                        onClick={() => onReject(item)}
                        className="h-7 px-2.5 text-xs font-bold text-destructive hover:bg-destructive/10 border-destructive/30 rounded-lg gap-1"
                      >
                        <XCircle className="w-3 h-3" />
                        <span>Rechazar</span>
                      </Button>
                    </div>
                  ) : item.status === 'APPROVED' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      Aprobada
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-destructive/15 text-destructive">
                      Rechazada
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
