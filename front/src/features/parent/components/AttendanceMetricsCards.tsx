import React from 'react';

interface AttendanceMetricsCardsProps {
  summary?: {
    attendancePercentage: number;
    totalRecorded: number;
    presentCount: number;
    lateCount: number;
    absentCount: number;
  };
}

export const AttendanceMetricsCards: React.FC<AttendanceMetricsCardsProps> = ({ summary }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
        <span className="text-[10px] font-bold uppercase text-muted-foreground block">
          Tasa Asistencia
        </span>
        <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
          {summary?.attendancePercentage ?? 100}%
        </span>
        <span className="text-[10px] text-muted-foreground">Total: {summary?.totalRecorded ?? 0} días</span>
      </div>

      <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
        <span className="text-[10px] font-bold uppercase text-muted-foreground block">
          Asistencias
        </span>
        <span className="text-xl font-black text-foreground mt-1 block">
          {summary?.presentCount ?? 0}
        </span>
        <span className="text-[10px] text-muted-foreground">Puntual</span>
      </div>

      <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
        <span className="text-[10px] font-bold uppercase text-muted-foreground block">
          Tardanzas
        </span>
        <span className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1 block">
          {summary?.lateCount ?? 0}
        </span>
        <span className="text-[10px] text-muted-foreground">Registradas</span>
      </div>

      <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
        <span className="text-[10px] font-bold uppercase text-muted-foreground block">
          Faltas
        </span>
        <span className="text-xl font-black text-destructive mt-1 block">
          {summary?.absentCount ?? 0}
        </span>
        <span className="text-[10px] text-muted-foreground">Inasistencias</span>
      </div>
    </div>
  );
};
