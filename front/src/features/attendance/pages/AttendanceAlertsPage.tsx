import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Loader2,
  UserCheck,
  CalendarPlus,
  Play,
  School,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/Pagination';
import { useAuthStore } from '@/store/useAuthStore';
import {
  useAttendanceAlerts,
  useAttendAlert,
  useCiteFamily,
  useEvaluateAlerts,
} from '../api/useAttendanceAlerts';
import {
  RISK_REASON_LABELS,
  type AttendanceAlert,
} from '../types';
import { formatPeruDate } from '@/lib/dateUtils';

const LEVEL_LABELS: Record<string, string> = {
  INITIAL: 'Inicial',
  PRIMARY: 'Primaria',
  SECONDARY: 'Secundaria',
};

export const AttendanceAlertsPage: React.FC = () => {
  const { user } = useAuthStore();
  const isSchoolAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'SCHOOL_ADMIN';

  const [activeTab, setActiveTab] = useState<'OPEN' | 'ATTENDED'>('OPEN');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // Modales
  const [attendItem, setAttendItem] = useState<AttendanceAlert | null>(null);
  const [attendNote, setAttendNote] = useState('');

  const [citeItem, setCiteItem] = useState<AttendanceAlert | null>(null);
  const [citationDate, setCitationDate] = useState('');
  const [citationNote, setCitationNote] = useState('');

  const { data, isLoading } = useAttendanceAlerts({
    status: activeTab,
    page,
    limit,
  });

  const { mutateAsync: attendAlert, isPending: isAttending } = useAttendAlert();
  const { mutateAsync: citeFamily, isPending: isCiting } = useCiteFamily();
  const { mutateAsync: evaluateAlerts, isPending: isEvaluating } = useEvaluateAlerts();

  const handleTabChange = (tab: 'OPEN' | 'ATTENDED') => {
    setActiveTab(tab);
    setPage(1);
  };

  const handleConfirmAttend = async () => {
    if (!attendItem || !attendNote.trim()) return;
    await attendAlert({ id: attendItem.id, note: attendNote.trim() });
    setAttendItem(null);
    setAttendNote('');
  };

  const handleConfirmCite = async () => {
    if (!citeItem || !citationDate) return;
    const isoCitation = new Date(citationDate).toISOString();
    await citeFamily({
      id: citeItem.id,
      citationDate: isoCitation,
      note: citationNote.trim() || undefined,
    });
    setCiteItem(null);
    setCitationDate('');
    setCitationNote('');
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

  const alerts = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1, page: 1, limit: 20 };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-sm">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground tracking-tight">
                Alerta temprana de asistencia
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Estudiantes con señales de ausentismo en los últimos 30 días. Atiéndelos a tiempo para prevenir la deserción escolar.
              </p>
            </div>
          </div>
        </div>

        {isSchoolAdmin && (
          <Button
            size="sm"
            onClick={() => evaluateAlerts()}
            disabled={isEvaluating}
            className="rounded-xl text-xs font-bold gap-1.5 shrink-0"
          >
            {isEvaluating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            <span>Evaluar ahora</span>
          </Button>
        )}
      </div>

      {/* Pestañas de Estado */}
      <div className="flex items-center gap-2 border-b border-border">
        {(
          [
            { key: 'OPEN', label: 'Abiertas' },
            { key: 'ATTENDED', label: 'Atendidas' },
          ] as const
        ).map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors -mb-px ${
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Grid de Tarjetas */}
      {isLoading ? (
        <div className="p-16 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span>Analizando alertas de asistencia...</span>
        </div>
      ) : alerts.length === 0 ? (
        <div className="p-16 text-center text-muted-foreground space-y-2 rounded-2xl border border-dashed border-border bg-card">
          <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 opacity-80" />
          <p className="text-sm font-bold text-foreground">
            {activeTab === 'OPEN'
              ? '¡Excelente! No hay alertas abiertas en este momento.'
              : 'No hay alertas atendidas en el historial.'}
          </p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {activeTab === 'OPEN'
              ? 'Ningún estudiante supera los umbrales de faltas consecutivas, ausentismo mensual o tardanzas.'
              : 'Las alertas que marques como atendidas aparecerán aquí para seguimiento.'}
          </p>
        </div>
      ) : (
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

            const { valueText, thresholdText } = formatMetric(
              item.reason,
              item.metricValue,
              item.threshold,
            );

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
                      <h3 className="font-extrabold text-base text-foreground leading-tight">
                        {studentName}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                        <School className="w-3.5 h-3.5 text-primary" />
                        <span>{classroomLabel}</span>
                      </div>
                    </div>

                    <Badge
                      variant="outline"
                      className="text-[10px] font-bold border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0"
                    >
                      {RISK_REASON_LABELS[item.reason] || item.reason}
                    </Badge>
                  </div>

                  {/* Métrica principal */}
                  <div className="flex items-baseline justify-between p-3 rounded-xl bg-muted/40 border border-border/60">
                    <div>
                      <span className="text-xl font-black text-amber-600 dark:text-amber-400">
                        {valueText}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground font-semibold">
                      {thresholdText}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>Detectada el: {triggerDateFormatted}</span>
                  </div>

                  {/* Si ya está atendida */}
                  {item.status === 'ATTENDED' && (
                    <div className="p-3 rounded-xl bg-secondary/50 border border-border text-xs space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Atendida
                        </span>
                        {item.incidentId && (
                          <Badge className="text-[10px] bg-primary/10 text-primary border border-primary/20">
                            Familia citada
                          </Badge>
                        )}
                      </div>
                      {item.attendedNote && (
                        <p className="text-muted-foreground italic text-[11px]">
                          "{item.attendedNote}"
                        </p>
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
                      onClick={() => {
                        setAttendItem(item);
                        setAttendNote('');
                      }}
                      className="flex-1 text-xs font-bold rounded-xl gap-1.5"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-primary" />
                      <span>Marcar como atendida</span>
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setCiteItem(item);
                        setCitationDate('');
                        setCitationNote('');
                      }}
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
      )}

      {/* Paginación */}
      {meta.totalPages > 1 && (
        <div className="p-3 rounded-2xl bg-card border border-border">
          <Pagination
            currentPage={meta.page}
            totalPages={meta.totalPages}
            totalItems={meta.total}
            limit={meta.limit}
            onPageChange={(p) => setPage(p)}
            onLimitChange={(l) => {
              setLimit(l);
              setPage(1);
            }}
          />
        </div>
      )}

      {/* Modal: Marcar como Atendida */}
      {attendItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-black text-foreground">
                Atender Alerta de Asistencia
              </h3>
              <button
                onClick={() => setAttendItem(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Registra una breve nota de seguimiento (llamada al apoderado, conversación con el estudiante, etc.).
            </p>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                Nota de seguimiento <span className="text-destructive">*</span>
              </label>
              <textarea
                value={attendNote}
                onChange={(e) => setAttendNote(e.target.value)}
                placeholder="Ej. Se llamó a la madre de familia; indica que el menor estuvo con descanso médico..."
                rows={3}
                className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAttendItem(null)}
                disabled={isAttending}
                className="rounded-xl text-xs font-bold"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={isAttending || attendNote.trim().length < 3}
                onClick={handleConfirmAttend}
                className="rounded-xl text-xs font-bold gap-1.5"
              >
                {isAttending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Guardar atención</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Citar a la Familia */}
      {citeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-black text-foreground">
                Citar a la Familia
              </h3>
              <button
                onClick={() => setCiteItem(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Se creará una citación oficial en la agenda del estudiante y se notificará a los apoderados por la app y notificación push.
            </p>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                Fecha y hora de la citación <span className="text-destructive">*</span>
              </label>
              <input
                type="datetime-local"
                value={citationDate}
                onChange={(e) => setCitationDate(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                Indicación o nota adicional (opcional)
              </label>
              <textarea
                value={citationNote}
                onChange={(e) => setCitationNote(e.target.value)}
                placeholder="Ej. Traer justificativos médicos o compromisos de puntualidad..."
                rows={3}
                className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCiteItem(null)}
                disabled={isCiting}
                className="rounded-xl text-xs font-bold"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={isCiting || !citationDate}
                onClick={handleConfirmCite}
                className="rounded-xl text-xs font-bold gap-1.5"
              >
                {isCiting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Emitir citación oficial</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
