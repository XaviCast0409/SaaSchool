import React from 'react';
import { Calendar, Clock, CalendarCheck, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AttendanceStatusBadge } from '@/features/attendance/components/AttendanceStatusBadge';
import type { AttendanceRecord } from '@/features/attendance/types';

interface ParentAttendanceHistoryProps {
  filteredRecords: AttendanceRecord[];
  loadingRecords: boolean;
  onJustify: (date: string) => void;
}

const isWithinLast30Days = (dateStr: string) => {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 30;
};

export const ParentAttendanceHistory: React.FC<ParentAttendanceHistoryProps> = ({
  filteredRecords,
  loadingRecords,
  onJustify,
}) => {
  return (
    <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
      <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
        <h3 className="font-extrabold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          <span>Registro Diario de Entrada ({filteredRecords.length})</span>
        </h3>
      </div>

      {loadingRecords ? (
        <div className="p-8 text-center text-xs text-muted-foreground">Cargando historial de asistencias...</div>
      ) : filteredRecords.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground space-y-1">
          <CalendarCheck className="w-10 h-10 mx-auto opacity-30 mb-2" />
          <p className="font-bold text-sm text-foreground">Sin registros en este filtro</p>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            No hay marcas de asistencia registradas para la categoría seleccionada.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border/60">
          {filteredRecords.map((item) => {
            const recordDate = new Date(item.date);
            const canJustify =
              (item.status === 'ABSENT_UNJUSTIFIED' || item.status === 'LATE_UNJUSTIFIED') &&
              isWithinLast30Days(item.date);

            return (
              <div
                key={item.id}
                className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-secondary/80 border border-border/60 flex flex-col items-center justify-center text-center shrink-0 shadow-sm">
                    <span className="text-xs uppercase font-bold text-muted-foreground leading-none">
                      {recordDate.toLocaleDateString('es-PE', { month: 'short', timeZone: 'UTC' })}
                    </span>
                    <span className="text-sm font-black text-foreground leading-none mt-0.5">
                      {recordDate.getUTCDate()}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <span className="text-xs sm:text-sm font-bold text-foreground block capitalize truncate">
                      {recordDate.toLocaleDateString('es-PE', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        timeZone: 'UTC',
                      })}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                      {item.checkInTime ? (
                        <span className="flex items-center gap-1 font-semibold text-foreground">
                          <Clock className="w-3 h-3 text-primary" />
                          Ingreso:{' '}
                          {new Date(item.checkInTime).toLocaleTimeString('es-PE', {
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'America/Lima',
                          })}
                        </span>
                      ) : (
                        <span>Marcado en lista</span>
                      )}
                      {item.notes && (
                        <>
                          <span>•</span>
                          <span className="italic text-muted-foreground truncate max-w-[200px]">"{item.notes}"</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <AttendanceStatusBadge status={item.status} />
                  {canJustify && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onJustify(item.date.slice(0, 10))}
                      className="h-7 text-xs font-bold rounded-lg gap-1 border-primary/30 text-primary hover:bg-primary/10"
                    >
                      <FileText className="w-3 h-3" />
                      <span>Justificar</span>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
