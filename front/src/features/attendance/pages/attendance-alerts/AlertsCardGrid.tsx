import React from 'react';
import { Calendar, CheckCircle2, School, UserCheck, CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RISK_REASON_LABELS, type AttendanceAlert } from '../../types';
import { formatPeruDate } from '@/lib/dateUtils';

const LEVEL_LABELS: Record<string, string> = {
  INITIAL: 'Inicial',
  PRIMARY: 'Primaria',
  SECONDARY: 'Secundaria',
};

const formatMetric = (reason: string, val: number, threshold: number) => {
  if (reason === 'CONSECUTIVE_ABSENCES') {
    return {
      valueText: `${val} ${val === 1 ? 'falta seguida' : 'faltas seguidas'}`,
      thresholdText: `Umbral: ${threshold} consecutivas`,
    };
  }
  if (reason === 'MONTHLY_ABSENCE_RATE') {
    return {
      valueText: `${val.toFixed(1)} %`,
      thresholdText: `Umbral: ${threshold} % en el mes`,
    };
  }
  if (reason === 'REPEATED_LATENESS') {
    return {
      valueText: `${val} ${val === 1 ? 'tardanza' : 'tardanzas'}`,
      thresholdText: `Umbral: ${threshold} en 30 días`,
    };
  }
  return { valueText: `${val}`, thresholdText: `Umbral: ${threshold}` };
};

interface AlertsCardGridProps {
  alerts: AttendanceAlert[];
  onAttend: (item: AttendanceAlert) => void;
  onCite: (item: AttendanceAlert) => void;
}

export const AlertsCardGrid: React.FC<AlertsCardGridProps> = ({ alerts, onAttend, onCite }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {alerts.map((item) => {
        const student = item.enrollment?.student;
        const classroom = item.enrollment?.classroom;
        const studentName = student
          ? `${student.lastNamePaternal} ${student.lastNameMaternal || ''}, ${student.firstNames}`.trim()
          : 'Estudiante';
        const classroomLabel = classroom
          ? `${classroom.grade}° "${classroom.section}" - ${LEVEL_LABELS[classroom.educationLevel] || classroom.educationLevel}`
          : '—';

        const { valueText, thresholdText } = formatMetric(item.reason, item.metricValue, item.threshold);

        const triggerDateFormatted = formatPeruDate(item.triggeredOn, {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          timeZone: 'America/Lima',
        });

        return (
          <div
            key={item.id}
            className="p-5 rounded-2xl border border-border bg-card shadow-sm flex flex-col justify-between space-y-4 hover:border-primary/40 transition-colors"
          >
            {/* Cabecera de la tarjeta */}
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-extrabold text-base text-foreground leading-tight">{studentName}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                    <School className="w-3.5 h-3.5 text-primary" />
                    <span>{classroomLabel}</span>
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className="text-xs font-bold border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0"
                >
                  {RISK_REASON_LABELS[item.reason] || item.reason}
                </Badge>
              </div>

              {/* Métrica principal */}
              <div className="flex items-baseline justify-between p-3 rounded-xl bg-muted/40 border border-border/60">
                <div>
                  <span className="text-xl font-black text-amber-600 dark:text-amber-400">{valueText}</span>
                </div>
                <span className="text-xs text-muted-foreground font-semibold">{thresholdText}</span>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span>Detectada el: {triggerDateFormatted}</span>
              </div>

              {/* Si ya está atendida */}
              {item.status === 'ATTENDED' && (
                <div className="p-3 rounded-xl bg-secondary/50 border border-border text-xs space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Atendida
                    </span>
                    {item.incidentId && (
                      <Badge className="text-xs bg-primary/10 text-primary border border-primary/20">
                        Familia citada
                      </Badge>
                    )}
                  </div>
                  {item.attendedNote && (
                    <p className="text-muted-foreground italic text-xs">"{item.attendedNote}"</p>
                  )}
                </div>
              )}
            </div>

            {/* Acciones para alertas abiertas */}
            {item.status === 'OPEN' && (
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAttend(item)}
                  className="flex-1 text-xs font-bold rounded-xl gap-1.5"
                >
                  <UserCheck className="w-3.5 h-3.5 text-primary" />
                  <span>Marcar como atendida</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => onCite(item)}
                  className="flex-1 text-xs font-bold rounded-xl gap-1.5"
                >
                  <CalendarPlus className="w-3.5 h-3.5" />
                  <span>Citar a la familia</span>
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
