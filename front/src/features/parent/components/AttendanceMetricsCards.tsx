import React from 'react';
import { CheckCircle2, Clock, AlertCircle, Percent } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

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
  const percentage = summary?.attendancePercentage ?? 100;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
      {/* 1. Tasa de Asistencia */}
      <Card className="bg-card border-border shadow-sm">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Tasa Asistencia</p>
            <p className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-300">
              {percentage}%
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Total: {summary?.totalRecorded ?? 0} días
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 2. Asistencias Puntuales */}
      <Card className="bg-card border-border shadow-sm">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Asistencias</p>
            <p className="text-xl sm:text-2xl font-black text-foreground">
              {summary?.presentCount ?? 0}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Puntual a clases</p>
          </div>
        </CardContent>
      </Card>

      {/* 3. Tardanzas */}
      <Card className="bg-card border-border shadow-sm">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Tardanzas</p>
            <p className="text-xl sm:text-2xl font-black text-amber-700 dark:text-amber-300">
              {summary?.lateCount ?? 0}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Registradas</p>
          </div>
        </CardContent>
      </Card>

      {/* 4. Faltas / Inasistencias */}
      <Card className="bg-card border-border shadow-sm">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Inasistencias</p>
            <p className="text-xl sm:text-2xl font-black text-destructive">
              {summary?.absentCount ?? 0}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Faltas registradas</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
