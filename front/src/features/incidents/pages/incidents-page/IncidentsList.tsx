import React from 'react';
import { Clock, User, School as SchoolIcon, CheckCircle2, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatPeruDateTime, formatPeruShortDate } from '@/lib/dateUtils';
import { formatEducationLevel } from '@/lib/utils';
import type { StudentIncident } from '../../types';
import { TYPE_CONFIG, SEVERITY_CONFIG } from '../../constants/incidentOptions';

interface IncidentsListProps {
  incidents: StudentIncident[];
  canManageSiseve: boolean;
  onOpenSiseveModal: (id: string) => void;
}

export const IncidentsList: React.FC<IncidentsListProps> = ({
  incidents,
  canManageSiseve,
  onOpenSiseveModal,
}) => {
  return (
    <div className="space-y-3">
      {incidents.map((inc) => {
        const typeInfo = TYPE_CONFIG[inc.type] || TYPE_CONFIG.DEMERITO;
        const severityInfo = SEVERITY_CONFIG[inc.severity] || SEVERITY_CONFIG.LOW;
        const student = inc.enrollment?.student;
        const studentName = student
          ? `${student.lastNamePaternal} ${student.lastNameMaternal || ''}, ${student.firstNames}`
          : '—';
        const classroom = inc.enrollment?.classroom;
        const classroomLabel = classroom
          ? `${classroom.grade}° "${classroom.section}" (${formatEducationLevel(classroom.educationLevel)})`
          : '';
        const isAcknowledged = Boolean(inc.acknowledgedAt);

        return (
          <div
            key={inc.id}
            className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-sm space-y-3 hover:border-primary/30 transition-all"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold border ${typeInfo.color}`}
                >
                  {typeInfo.icon}
                  <span>{typeInfo.label}</span>
                </span>
                {/* Un mérito no tiene gravedad */}
                {inc.type !== 'MERITO' && inc.type !== 'POSITIVE' && (
                  <Badge variant="outline" className={`text-xs ${severityInfo.badgeClass}`}>
                    Severidad: {severityInfo.label}
                  </Badge>
                )}

                {inc.isViolenceCase &&
                  (inc.siseveCode ? (
                    <Badge
                      variant="outline"
                      className="text-xs bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-bold"
                    >
                      SíseVe: {inc.siseveCode}
                    </Badge>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <Badge variant="destructive" className="text-xs font-bold">
                        Pendiente SíseVe
                      </Badge>
                      {canManageSiseve && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onOpenSiseveModal(inc.id)}
                          className="h-6 text-xs px-2 font-bold text-destructive hover:bg-destructive/10 border-destructive/30"
                        >
                          Registrar código SíseVe
                        </Button>
                      )}
                    </div>
                  ))}
              </div>

              <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                <Clock className="w-3.5 h-3.5" />
                {formatPeruDateTime(inc.createdAt)}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Info Alumno y Autor */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <User className="w-3.5 h-3.5 text-primary" />
                  <span>{studentName}</span>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <SchoolIcon className="w-3 h-3" />
                  <span>{classroomLabel}</span>
                </div>
                {inc.author && (
                  <p className="text-xs text-muted-foreground pt-1">
                    Por: {inc.author.firstName} {inc.author.lastNamePaternal}
                  </p>
                )}
              </div>

              {/* Descripción y Título */}
              <div className="md:col-span-2 space-y-1.5">
                <h3 className="text-sm font-bold text-foreground">{inc.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{inc.description}</p>

                {inc.actionTaken && (
                  <div className="p-2 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground">
                    <strong className="text-foreground">Acción / Medida tomada: </strong>
                    {inc.actionTaken}
                  </div>
                )}

                {inc.citationDate && (
                  <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs text-purple-700 dark:text-purple-300 flex items-center gap-2 font-semibold">
                    <CalendarClock className="w-4 h-4" />
                    <span>Citación programada: {formatPeruDateTime(inc.citationDate)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer de Acuse de Recibo */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              {isAcknowledged ? (
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Enterado por el apoderado el {formatPeruShortDate(inc.acknowledgedAt!)}</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Pendiente de acuse del padre</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
