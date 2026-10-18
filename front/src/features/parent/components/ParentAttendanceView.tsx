import React, { useState, useMemo } from 'react';
import {
  CalendarCheck,
  Clock,
  AlertCircle,
  Filter,
  Calendar,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useParentStore } from '@/store/useParentStore';
import { useGetMyChildren } from '@/features/students/api/useStudents';
import { useAttendanceByEnrollment } from '@/features/attendance/api/useAttendance';
import { AttendanceStatusBadge } from '@/features/attendance/components/AttendanceStatusBadge';
import { ChildSwitcher } from './ChildSwitcher';
import { AttendanceMetricsCards } from './AttendanceMetricsCards';

export const ParentAttendanceView: React.FC = () => {
  const { selectedChildId, setSelectedChildId } = useParentStore();
  const { data: children = [], isLoading: loadingChildren } = useGetMyChildren();
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const activeChild =
    children.find((c) => c.id === selectedChildId) || children[0] || null;
  const enrollmentId = activeChild?.activeEnrollment?.id;

  const { data: records = [], isLoading: loadingRecords } =
    useAttendanceByEnrollment(enrollmentId);

  // Conteo por estado para los chips de filtro
  const counts = useMemo(() => {
    let present = 0;
    let late = 0;
    let absent = 0;
    records.forEach((r) => {
      if (r.status === 'PRESENT') present++;
      else if (r.status.startsWith('LATE')) late++;
      else if (r.status.startsWith('ABSENT')) absent++;
    });
    return { all: records.length, present, late, absent };
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (filterStatus === 'ALL') return true;
      if (filterStatus === 'PRESENT') return r.status === 'PRESENT';
      if (filterStatus === 'LATE')
        return r.status === 'LATE_JUSTIFIED' || r.status === 'LATE_UNJUSTIFIED';
      if (filterStatus === 'ABSENT')
        return r.status === 'ABSENT_JUSTIFIED' || r.status === 'ABSENT_UNJUSTIFIED';
      return true;
    });
  }, [records, filterStatus]);

  if (loadingChildren) {
    return (
      <div className="space-y-4 p-4 animate-in fade-in duration-150">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!activeChild) {
    return (
      <div className="p-8 text-center bg-card border border-border rounded-2xl space-y-2 shadow-sm">
        <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
        <h3 className="font-bold text-sm text-foreground">Sin estudiantes asignados</h3>
        <p className="text-xs text-muted-foreground">
          No hay alumnos vinculados a tu cuenta de usuario.
        </p>
      </div>
    );
  }

  const summary = activeChild.activeEnrollment?.attendanceSummary;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-150">
      {/* 1. Header Principal */}
      <div className="p-5 sm:p-7 rounded-2xl bg-card border border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-primary/10 text-primary border-primary/20 gap-1 text-[11px] font-bold">
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>Control de Asistencia</span>
            </Badge>
            <Badge variant="outline" className="text-[11px] font-bold">
              {activeChild.activeEnrollment?.classroom.label || 'Sin aula'} • Año Lectivo{' '}
              {activeChild.activeEnrollment?.academicYear || 2026}
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            Asistencia de {activeChild.firstNames}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Monitoreo diario de puntualidad y registro oficial de ingreso escolar.
          </p>
        </div>
      </div>

      {/* 2. Selector Multi-Hijo si aplica */}
      {children.length > 1 && (
        <ChildSwitcher
          childrenList={children}
          selectedId={activeChild.id}
          onSelect={setSelectedChildId}
        />
      )}

      {/* 3. Métricas de Asistencia Clave */}
      <AttendanceMetricsCards summary={summary} />

      {/* 4. Barra de Filtros Rápidos */}
      <div className="flex items-center gap-1.5 bg-card p-3 rounded-2xl border border-border overflow-x-auto no-scrollbar">
        <span className="text-xs text-muted-foreground font-bold flex items-center gap-1 shrink-0 mr-1 hidden sm:flex">
          <Filter className="w-3.5 h-3.5" />
          <span>Filtro:</span>
        </span>
        {[
          { key: 'ALL', label: 'Todos los registros', count: counts.all },
          { key: 'PRESENT', label: 'Asistencias', count: counts.present },
          { key: 'LATE', label: 'Tardanzas', count: counts.late },
          { key: 'ABSENT', label: 'Inasistencias', count: counts.absent },
        ].map((f) => (
          <Button
            key={f.key}
            size="sm"
            variant={filterStatus === f.key ? 'default' : 'ghost'}
            onClick={() => setFilterStatus(f.key)}
            className="h-8 text-xs font-bold rounded-xl shrink-0 gap-1.5"
          >
            <span>{f.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0 rounded-full font-bold ${
                filterStatus === f.key
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {f.count}
            </span>
          </Button>
        ))}
      </div>

      {/* 5. Historial Diario de Asistencia */}
      <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
          <h3 className="font-extrabold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span>Registro Diario de Entrada ({filteredRecords.length})</span>
          </h3>
        </div>

        {loadingRecords ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            Cargando historial de asistencias...
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground space-y-1">
            <CalendarCheck className="w-10 h-10 mx-auto opacity-30 mb-2" />
            <p className="font-bold text-sm text-foreground">Sin registros en este filtro</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              No hay marcas de asistencia registradas para la categoría seleccionada.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {filteredRecords.map((item) => {
              const recordDate = new Date(item.date);
              return (
                <div
                  key={item.id}
                  className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-secondary/80 border border-border/60 flex flex-col items-center justify-center text-center shrink-0 shadow-sm">
                      <span className="text-[9px] uppercase font-bold text-muted-foreground leading-none">
                        {recordDate.toLocaleDateString('es-PE', { month: 'short' })}
                      </span>
                      <span className="text-sm font-black text-foreground leading-none mt-0.5">
                        {recordDate.getUTCDate()}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <span className="text-xs sm:text-sm font-bold text-foreground block capitalize truncate">
                        {recordDate.toLocaleDateString('es-PE', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
                        {item.checkInTime ? (
                          <span className="flex items-center gap-1 font-semibold text-foreground">
                            <Clock className="w-3 h-3 text-primary" />
                            Ingreso: {new Date(item.checkInTime).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : (
                          <span>Marcado en lista</span>
                        )}
                        {item.notes && (
                          <>
                            <span>•</span>
                            <span className="italic text-muted-foreground truncate max-w-[200px]">
                              "{item.notes}"
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <AttendanceStatusBadge status={item.status} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
