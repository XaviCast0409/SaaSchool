import React from 'react';
import {
  ShieldAlert,
  Award,
  AlertCircle,
  Stethoscope,
  CalendarClock,
  CheckCircle2,
  Clock,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useIncidents, useAcknowledgeIncident } from '../api/useIncidents';
import type { IncidentType, IncidentSeverity } from '../types';
import { formatPeruDate, formatPeruDateTime, formatPeruShortDate } from '@/lib/dateUtils';

interface ChildIncidentsCardProps {
  studentId?: string;
  studentName?: string;
}

const TYPE_CONFIG: Record<
  IncidentType,
  { label: string; icon: React.ReactNode; color: string }
> = {
  MERITO: { label: 'Mérito', icon: <Award className="w-4 h-4 text-emerald-500" />, color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  POSITIVE: { label: 'Mérito', icon: <Award className="w-4 h-4 text-emerald-500" />, color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  DEMERITO: { label: 'Falta Conductual', icon: <AlertCircle className="w-4 h-4 text-amber-500" />, color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  BEHAVIORAL: { label: 'Conductual', icon: <AlertCircle className="w-4 h-4 text-amber-500" />, color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  ATENCION_TOPICO: { label: 'Tópico de Salud', icon: <Stethoscope className="w-4 h-4 text-blue-500" />, color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  HEALTH: { label: 'Salud', icon: <Stethoscope className="w-4 h-4 text-blue-500" />, color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  CITACION_PADRES: { label: 'Citación', icon: <CalendarClock className="w-4 h-4 text-purple-500" />, color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
  CITATION: { label: 'Citación', icon: <CalendarClock className="w-4 h-4 text-purple-500" />, color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
  ACADEMIC: { label: 'Académico', icon: <AlertCircle className="w-4 h-4 text-cyan-500" />, color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20' },
};

const SEVERITY_CONFIG: Record<IncidentSeverity, { label: string; badgeClass: string }> = {
  LOW: { label: 'Baja', badgeClass: 'bg-muted text-muted-foreground' },
  MEDIUM: { label: 'Media', badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  HIGH: { label: 'Alta', badgeClass: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' },
  CRITICAL: { label: 'Urgente', badgeClass: 'bg-destructive text-destructive-foreground font-black animate-pulse' },
};

export const ChildIncidentsCard: React.FC<ChildIncidentsCardProps> = ({
  studentId,
  studentName,
}) => {
  const { data, isLoading } = useIncidents({ studentId, limit: 20 }, Boolean(studentId));
  const acknowledgeMutation = useAcknowledgeIncident();

  const incidents = data?.data || [];

  const handleAcknowledge = async (incidentId: string) => {
    try {
      await acknowledgeMutation.mutateAsync(incidentId);
      toast.success('Acuse de recibo registrado correctamente.');
    } catch {
      toast.error('Error al registrar la confirmación.');
    }
  };

  return (
    <div className="p-4 sm:p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Agenda Escolar e Incidencias
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {studentName ? `Reportes y citaciones de ${studentName}` : 'Reportes de conducta y salud'}
            </p>
          </div>
        </div>

        {incidents.length > 0 && (
          <Badge variant="outline" className="text-xs font-bold">
            {incidents.length} reporte(s)
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : incidents.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground space-y-1">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto opacity-80" />
          <p className="text-xs font-semibold text-foreground">Sin reportes registrados</p>
          <p className="text-[11px] text-muted-foreground">
            No se han reportado incidencias ni atenciones médicas recientes.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {incidents.map((inc) => {
            const typeInfo = TYPE_CONFIG[inc.type] || TYPE_CONFIG.DEMERITO;
            const severityInfo = SEVERITY_CONFIG[inc.severity] || SEVERITY_CONFIG.LOW;
            const isAcknowledged = Boolean(inc.acknowledgedAt);

            return (
              <div
                key={inc.id}
                className="p-3.5 sm:p-4 rounded-xl border border-border bg-muted/20 space-y-2.5 transition-all hover:bg-muted/30"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${typeInfo.color}`}>
                      {typeInfo.icon}
                      <span>{typeInfo.label}</span>
                    </span>
                    <Badge variant="outline" className={`text-[10px] ${severityInfo.badgeClass}`}>
                      {severityInfo.label}
                    </Badge>
                  </div>

                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatPeruDate(inc.createdAt, {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-foreground">{inc.title}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {inc.description}
                  </p>
                </div>

                {inc.actionTaken && (
                  <div className="p-2 rounded-lg bg-background border border-border text-[11px] text-muted-foreground">
                    <strong className="text-foreground">Acción tomada: </strong>
                    {inc.actionTaken}
                  </div>
                )}

                {inc.citationDate && (
                  <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-700 dark:text-purple-300 flex items-center gap-1.5 font-semibold">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      Fecha de Citación: {formatPeruDateTime(inc.citationDate)}
                    </span>
                  </div>
                )}

                {/* Acuse de Recibo */}
                <div className="pt-1.5 flex items-center justify-between gap-2 border-t border-border">
                  <span className="text-[10px] text-muted-foreground">
                    {inc.author ? `Registrado por: ${inc.author.firstName} ${inc.author.lastNamePaternal}` : ''}
                  </span>

                  {isAcknowledged ? (
                    <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        Enterado el{' '}
                        {formatPeruShortDate(inc.acknowledgedAt!)}
                      </span>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={acknowledgeMutation.isPending}
                      onClick={() => handleAcknowledge(inc.id)}
                      className="h-7 text-xs font-bold text-primary border-primary/30 hover:bg-primary/10 gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Confirmar Enterado</span>
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
