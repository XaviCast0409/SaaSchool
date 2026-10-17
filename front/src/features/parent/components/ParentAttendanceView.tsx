import React, { useState } from 'react';
import {
  CalendarCheck,
  Clock,
  AlertCircle,
  Filter,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
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

  const filteredRecords = records.filter((r) => {
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'PRESENT') return r.status === 'PRESENT';
    if (filterStatus === 'LATE')
      return r.status === 'LATE_JUSTIFIED' || r.status === 'LATE_UNJUSTIFIED';
    if (filterStatus === 'ABSENT')
      return r.status === 'ABSENT_JUSTIFIED' || r.status === 'ABSENT_UNJUSTIFIED';
    return true;
  });

  if (loadingChildren) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!activeChild) {
    return (
      <div className="p-8 text-center bg-card border border-border rounded-2xl space-y-2">
        <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
        <h3 className="font-bold text-sm text-foreground">Sin estudiantes asignados</h3>
        <p className="text-xs text-muted-foreground">
          No hay alumnos vinculados a tu cuenta de apoderado.
        </p>
      </div>
    );
  }

  const summary = activeChild.activeEnrollment?.attendanceSummary;

  return (
    <div className="space-y-6 pb-8 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-primary" />
            <span>Asistencia de {activeChild.firstNames}</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            {activeChild.activeEnrollment?.classroom.label || 'Sin aula'} • Año Lectivo{' '}
            {activeChild.activeEnrollment?.academicYear || 2026}
          </p>
        </div>
      </div>

      {/* Selector Multi-Hijo si tiene más de 1 */}
      <ChildSwitcher
        childrenList={children}
        selectedId={activeChild.id}
        onSelect={setSelectedChildId}
      />

      {/* Métricas del Mes del Hijo Seleccionado */}
      <AttendanceMetricsCards summary={summary} />

      {/* Filtros Rápidos */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs text-muted-foreground font-bold flex items-center gap-1 shrink-0">
          <Filter className="w-3.5 h-3.5" />
          <span>Filtrar:</span>
        </span>
        {[
          { key: 'ALL', label: 'Todos los registros' },
          { key: 'PRESENT', label: 'Solo Asistencias' },
          { key: 'LATE', label: 'Tardanzas' },
          { key: 'ABSENT', label: 'Faltas' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilterStatus(f.key)}
            className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-colors shrink-0 ${
              filterStatus === f.key
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Historial de Asistencia */}
      <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-secondary/20 flex items-center justify-between">
          <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
            Historial Diario de Asistencia ({filteredRecords.length})
          </h3>
        </div>

        {loadingRecords ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            Cargando historial de asistencias...
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">Sin registros para mostrar</p>
            <p>No se encontraron asistencias en el filtro seleccionado.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {filteredRecords.map((item) => {
              const recordDate = new Date(item.date);
              return (
                <div
                  key={item.id}
                  className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-secondary/80 border border-border/60 flex flex-col items-center justify-center text-center shrink-0">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground leading-none">
                        {recordDate.toLocaleDateString('es-PE', { month: 'short' })}
                      </span>
                      <span className="text-sm font-black text-foreground leading-none mt-0.5">
                        {recordDate.getUTCDate()}
                      </span>
                    </div>

                    <div>
                      <span className="text-xs font-bold text-foreground block">
                        {recordDate.toLocaleDateString('es-PE', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                        {item.checkInTime ? (
                          <span className="flex items-center gap-1 font-medium">
                            <Clock className="w-3 h-3 text-primary" />
                            Ingreso: {new Date(item.checkInTime).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : (
                          <span>Marcado manual</span>
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

                  <AttendanceStatusBadge status={item.status} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
