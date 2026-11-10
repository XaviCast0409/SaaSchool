import React from 'react';
import { CheckCircle2, AlertCircle, CalendarCheck } from 'lucide-react';
import type { ParentChildInfo } from '../types';
import { useParentStore } from '@/store/useParentStore';

interface FamilySnapshotCardProps {
  childrenList: ParentChildInfo[];
}

export const FamilySnapshotCard: React.FC<FamilySnapshotCardProps> = ({ childrenList }) => {
  const { selectedChildId, setSelectedChildId } = useParentStore();

  if (!childrenList || childrenList.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Resumen Familiar
        </h2>
        <span className="text-xs text-muted-foreground">
          {childrenList.length} {childrenList.length === 1 ? 'estudiante a cargo' : 'estudiantes a cargo'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {childrenList.map((child) => {
          const isSelected = selectedChildId === child.id;
          const initials = `${child.firstNames?.trim()?.charAt(0) || ''}${child.lastNamePaternal?.trim()?.charAt(0) || ''}`.toUpperCase();

          const classroom = child.activeEnrollment?.classroom;
          const levelName =
            classroom?.educationLevel === 'INITIAL'
              ? 'Inicial'
              : classroom?.educationLevel === 'PRIMARY'
                ? 'Primaria'
                : 'Secundaria';
          const classroomText = classroom
            ? `${classroom.grade}° "${classroom.section}" • ${levelName}`
            : 'Sin aula asignada';

          const attendanceSummary = child.activeEnrollment?.attendanceSummary;
          const attendancePercent = attendanceSummary?.attendancePercentage ?? null;

          let attendanceClass = 'bg-muted text-muted-foreground';
          let attendanceLabel = 'Sin asistencia';
          if (attendancePercent !== null && attendanceSummary?.totalRecorded && attendanceSummary.totalRecorded > 0) {
            if (attendancePercent >= 95) {
              attendanceClass = 'bg-success/15 text-success border border-success/20';
              attendanceLabel = `Asistencia ${attendancePercent}%`;
            } else if (attendancePercent >= 85) {
              attendanceClass = 'bg-warning/15 text-warning border border-warning/20';
              attendanceLabel = `Asistencia ${attendancePercent}%`;
            } else {
              attendanceClass = 'bg-destructive/15 text-destructive border border-destructive/20';
              attendanceLabel = `Asistencia ${attendancePercent}%`;
            }
          }

          const financialSummary = child.activeEnrollment?.financialSummary;
          const pendingCount = financialSummary?.pendingCount ?? 0;
          const isFinancialUpToDate = !financialSummary?.hasPending || pendingCount === 0;

          return (
            <button
              key={child.id}
              type="button"
              onClick={() => setSelectedChildId(child.id)}
              className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer bg-card shadow-sm hover:border-primary/50 hover:shadow-md ${
                isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border'
              }`}
            >
              <div className="flex items-center gap-3.5">
                {/* Avatar con iniciales */}
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary font-bold text-base flex items-center justify-center shrink-0 border border-primary/20">
                  {initials || 'AL'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-foreground truncate">
                      {child.firstNames} {child.lastNamePaternal} {child.lastNameMaternal}
                    </h3>
                    {isSelected && (
                      <span className="shrink-0 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        Activo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {classroomText}
                  </p>
                </div>
              </div>

              {/* Píldoras de estado */}
              <div className="mt-3.5 pt-3 border-t border-border/70 flex flex-wrap items-center gap-2">
                {/* Píldora Asistencia */}
                {attendancePercent !== null && (
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${attendanceClass}`}
                  >
                    <CalendarCheck className="w-3.5 h-3.5" />
                    <span>{attendanceLabel}</span>
                  </span>
                )}

                {/* Píldora Pagos */}
                {isFinancialUpToDate ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-success/15 text-success border border-success/20">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Al día en pensiones</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-destructive/15 text-destructive border border-destructive/20">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{pendingCount} {pendingCount === 1 ? 'pensión vencida' : 'pensiones vencidas'}</span>
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
