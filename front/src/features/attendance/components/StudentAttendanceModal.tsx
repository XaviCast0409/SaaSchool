import React from 'react';
import {
  X,
  User,
  AlertTriangle,
  Calendar as CalendarIcon,
  MessageSquare,
  Award,
} from 'lucide-react';
import { useStudentAttendanceDetail } from '../api/useAttendance';
import { AttendanceStatusBadge } from './AttendanceStatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';


interface StudentAttendanceModalProps {
  enrollmentId: string;
  month: string;
  onClose: () => void;
}



export const StudentAttendanceModal: React.FC<StudentAttendanceModalProps> = ({
  enrollmentId,
  month,
  onClose,
}) => {
  const { data: detail, isLoading, isError } = useStudentAttendanceDetail(enrollmentId, month);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4 bg-muted/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-foreground leading-tight">
                Expediente Individual de Asistencia
              </h2>
              <p className="text-xs text-muted-foreground">
                Resumen analítico y récord mensual del alumno ({month})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {isLoading ? (
            <div className="space-y-4 py-8">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-40 w-full rounded-xl" />
            </div>
          ) : isError || !detail ? (
            <div className="py-12 text-center text-destructive text-sm font-medium">
              Error al cargar el expediente individual del alumno.
            </div>
          ) : (
            <>
              {/* Profile Card */}
              <div className="p-4 rounded-xl border border-border bg-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                <div>
                  <h3 className="text-lg font-bold text-foreground">{detail.studentName}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground font-mono">
                    <span className="bg-muted px-2 py-0.5 rounded">Doc: {detail.documentId}</span>
                    {detail.studentCode && (
                      <span className="bg-muted px-2 py-0.5 rounded">SIAGIE: {detail.studentCode}</span>
                    )}
                    <span className="bg-primary/10 text-primary font-sans font-semibold px-2 py-0.5 rounded">
                      {detail.grade} {detail.section} ({detail.educationLevel})
                    </span>
                  </div>
                </div>

                {/* Risk Badge */}
                {detail.riskLevel === 'CRITICAL' ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-bold shrink-0">
                    <AlertTriangle className="w-4 h-4 animate-bounce" />
                    <div>
                      <div>Riesgo Crítico de Inasistencia</div>
                      <div className="text-[10px] font-normal opacity-90">
                        {detail.consecutiveAbsences} faltas consecutivas
                      </div>
                    </div>
                  </div>
                ) : detail.riskLevel === 'WARNING' ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-bold shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                    <div>
                      <div>Advertencia de Faltas</div>
                      <div className="text-[10px] font-normal opacity-90">
                        {detail.counts.ABSENT_UNJUSTIFIED} inasistencias en el mes
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold shrink-0">
                    <Award className="w-4 h-4" />
                    <div>
                      <div>Asistencia Óptima</div>
                      <div className="text-[10px] font-normal opacity-90">
                        {detail.attendanceRate}% de permanencia
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Stat Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl border border-border bg-emerald-500/5 text-center">
                  <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 block">
                    {detail.counts.PRESENT}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">Presentes</span>
                </div>
                <div className="p-3 rounded-xl border border-border bg-destructive/5 text-center">
                  <span className="text-2xl font-bold text-destructive block">
                    {detail.counts.ABSENT_UNJUSTIFIED}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">Faltas Injust.</span>
                </div>
                <div className="p-3 rounded-xl border border-border bg-amber-500/5 text-center">
                  <span className="text-2xl font-bold text-amber-600 dark:text-amber-400 block">
                    {detail.counts.ABSENT_JUSTIFIED}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">Faltas Just.</span>
                </div>
                <div className="p-3 rounded-xl border border-border bg-sky-500/5 text-center">
                  <span className="text-2xl font-bold text-sky-600 dark:text-sky-400 block">
                    {detail.counts.LATE_UNJUSTIFIED + detail.counts.LATE_JUSTIFIED}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">Tardanzas</span>
                </div>
              </div>

              {/* Récord por Registro Histórico */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                  <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                  Récord Diario del Mes ({month})
                </h4>

                {detail.records.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                    No hay marcaciones de asistencia registradas para este estudiante en el mes {month}.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {detail.records.map((r) => {
                      return (
                        <div
                          key={r.id}
                          className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-foreground bg-muted px-2 py-0.5 rounded">
                              {r.date}
                            </span>
                            <AttendanceStatusBadge status={r.status} />
                          </div>

                          {r.notes ? (
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/50 px-2 py-1 rounded max-w-[220px] truncate">
                              <MessageSquare className="w-3 h-3 text-primary shrink-0" />
                              <span className="truncate">{r.notes}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/50">Sin observaciones</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/20 flex justify-end shrink-0">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cerrar Expediente
          </Button>
        </div>
      </div>
    </div>
  );
};
