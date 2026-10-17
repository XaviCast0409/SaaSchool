import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ActiveEnrollmentInfo, AttendanceTodayStatus } from '../types';

interface ChildAttendanceCardProps {
  enrollment: ActiveEnrollmentInfo | null;
}

const getTodayStatusConfig = (status: AttendanceTodayStatus) => {
  switch (status) {
    case 'PRESENT':
      return {
        label: 'Asistió Hoy',
        icon: CheckCircle2,
        badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
        bgPill: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300',
      };
    case 'LATE_JUSTIFIED':
    case 'LATE_UNJUSTIFIED':
      return {
        label: status === 'LATE_JUSTIFIED' ? 'Tardanza Justificada' : 'Tardanza Registrada',
        icon: Clock,
        badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
        bgPill: 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300',
      };
    case 'ABSENT_JUSTIFIED':
    case 'ABSENT_UNJUSTIFIED':
      return {
        label: status === 'ABSENT_JUSTIFIED' ? 'Falta Justificada' : 'Falta Injustificada',
        icon: AlertCircle,
        badgeClass: 'bg-destructive/15 text-destructive border-destructive/30',
        bgPill: 'bg-destructive/10 border-destructive/20 text-destructive',
      };
    default:
      return {
        label: 'Sin registrar aún hoy',
        icon: HelpCircle,
        badgeClass: 'bg-muted text-muted-foreground border-border',
        bgPill: 'bg-secondary/40 border-border text-muted-foreground',
      };
  }
};

export const ChildAttendanceCard: React.FC<ChildAttendanceCardProps> = ({ enrollment }) => {
  const navigate = useNavigate();
  const summary = enrollment?.attendanceSummary;

  const todayConfig = getTodayStatusConfig(summary?.todayStatus || 'NOT_RECORDED');
  const TodayIcon = todayConfig.icon;

  const percentage = summary?.attendancePercentage ?? 100;

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border/80 shadow-sm space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground">Control de Asistencia</h3>
            <span className="text-[11px] text-muted-foreground">Registro oficial del colegio</span>
          </div>
        </div>

        <Badge variant="outline" className={`text-xs px-2.5 py-1 font-bold ${todayConfig.badgeClass}`}>
          <TodayIcon className="w-3.5 h-3.5 mr-1.5" />
          <span>{todayConfig.label}</span>
        </Badge>
      </div>

      {/* Progress & Stats */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-muted-foreground">Asistencia del Mes</span>
          <span className="text-foreground text-sm font-extrabold">{percentage}%</span>
        </div>
        <div className="w-full h-2.5 rounded-full bg-secondary overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              percentage >= 90
                ? 'bg-emerald-500'
                : percentage >= 75
                ? 'bg-amber-500'
                : 'bg-destructive'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Mini Counters */}
      <div className="grid grid-cols-3 gap-2 text-center pt-1">
        <div className="p-2.5 rounded-xl bg-secondary/30 border border-border/40">
          <span className="text-[10px] font-bold uppercase text-muted-foreground block">
            Asistencias
          </span>
          <span className="text-base font-extrabold text-foreground">
            {summary?.presentCount ?? 0}
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-secondary/30 border border-border/40">
          <span className="text-[10px] font-bold uppercase text-muted-foreground block">
            Tardanzas
          </span>
          <span className="text-base font-extrabold text-amber-600 dark:text-amber-400">
            {summary?.lateCount ?? 0}
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-secondary/30 border border-border/40">
          <span className="text-[10px] font-bold uppercase text-muted-foreground block">
            Faltas
          </span>
          <span className="text-base font-extrabold text-destructive">
            {summary?.absentCount ?? 0}
          </span>
        </div>
      </div>

      {/* Navigation button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/attendance')}
        className="w-full justify-between text-xs h-9 rounded-xl hover:bg-secondary/70 text-foreground"
      >
        <span>Ver calendario de asistencia</span>
        <ArrowRight className="w-4 h-4 text-primary" />
      </Button>
    </div>
  );
};
