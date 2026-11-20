import React from 'react';
import { FileText, UserCheck, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatPeruDate } from '@/lib/dateUtils';
import { JUSTIFICATION_REASON_LABELS } from '@/features/attendance/constants';
import type { AttendanceJustification, AuthorizedPickup } from '@/features/attendance/types';

interface ParentJustificationsAndPickupsProps {
  childName: string;
  justifications: AttendanceJustification[];
  loadingJustifications: boolean;
  authorizedPickups: AuthorizedPickup[];
}

export const ParentJustificationsAndPickups: React.FC<ParentJustificationsAndPickupsProps> = ({
  childName,
  justifications,
  loadingJustifications,
  authorizedPickups,
}) => {
  return (
    <>
      {/* Sección: Mis Justificaciones */}
      <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
          <h3 className="font-extrabold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <span>Mis Justificaciones ({justifications.length})</span>
          </h3>
        </div>

        {loadingJustifications ? (
          <div className="p-8 text-center text-xs text-muted-foreground">Cargando justificaciones...</div>
        ) : justifications.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-xs">
            No tienes solicitudes de justificación registradas para este estudiante.
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {justifications.map((j) => {
              const fromStr = formatPeruDate(j.dateFrom, {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                timeZone: 'America/Lima',
              });
              const toStr = formatPeruDate(j.dateTo, {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                timeZone: 'America/Lima',
              });
              const dateDisplay = fromStr === toStr ? fromStr : `${fromStr} – ${toStr}`;

              return (
                <div
                  key={j.id}
                  className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20 transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-bold text-foreground">{dateDisplay}</span>
                      <span className="text-xs font-medium text-muted-foreground">
                        • {JUSTIFICATION_REASON_LABELS[j.reason] || j.reason}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{j.description}</p>
                    {j.reviewNote && j.status === 'REJECTED' && (
                      <p className="text-xs text-destructive font-medium">Nota del colegio: {j.reviewNote}</p>
                    )}
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {j.status === 'PENDING' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        Pendiente
                      </span>
                    )}
                    {j.status === 'APPROVED' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        Aprobada
                      </span>
                    )}
                    {j.status === 'REJECTED' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-destructive/15 text-destructive border border-destructive/20">
                        Rechazada
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sección: Personas autorizadas a recoger */}
      <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
          <h3 className="font-extrabold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-primary" />
            <span>
              Personas autorizadas a recoger a {childName} ({authorizedPickups.length})
            </span>
          </h3>
        </div>

        {authorizedPickups.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-xs">
            No hay personas adicionales autorizadas registradas para recoger al alumno.
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {authorizedPickups.map((p) => (
              <div
                key={p.id}
                className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-muted/20 transition-colors"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-foreground truncate">{p.fullName}</span>
                    <Badge
                      variant="outline"
                      className="text-xs text-emerald-600 bg-emerald-500/10 border-emerald-500/30"
                    >
                      {p.relationship}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {p.documentType}: <strong className="text-foreground">{p.documentId}</strong>
                    {p.cellphone && (
                      <span className="ml-2">
                        · Cel: <strong className="text-foreground">{p.cellphone}</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="p-3 bg-muted/30 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
          <Info className="w-3.5 h-3.5 text-primary shrink-0" />
          <span>Para agregar o quitar personas autorizadas a recoger al estudiante, comunícate con Secretaría.</span>
        </div>
      </div>
    </>
  );
};
