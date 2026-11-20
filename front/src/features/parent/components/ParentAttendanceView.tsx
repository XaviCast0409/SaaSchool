import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarCheck, AlertCircle, Filter, FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useParentStore } from '@/store/useParentStore';
import { useGetMyChildren } from '@/features/students/api/useStudents';
import { useAttendanceByEnrollment } from '@/features/attendance/api/useAttendance';
import { useJustifications } from '@/features/attendance/api/useJustifications';
import { usePickups } from '@/features/attendance/api/usePickups';
import { JustifyAbsenceModal } from '@/features/attendance/components/JustifyAbsenceModal';
import { ChildSwitcher } from './ChildSwitcher';
import { AttendanceMetricsCards } from './AttendanceMetricsCards';
import { ParentAttendanceHistory } from './parent-attendance/ParentAttendanceHistory';
import { ParentJustificationsAndPickups } from './parent-attendance/ParentJustificationsAndPickups';

export const ParentAttendanceView: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedChildId, setSelectedChildId } = useParentStore();
  const { data: children = [], isLoading: loadingChildren } = useGetMyChildren();
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDefaultDate, setModalDefaultDate] = useState<string | undefined>(undefined);

  const activeChild = children.find((c) => c.id === selectedChildId) || children[0] || null;
  const enrollmentId = activeChild?.activeEnrollment?.id;

  const { data: records = [], isLoading: loadingRecords } = useAttendanceByEnrollment(enrollmentId);

  const { data: justificationsData, isLoading: loadingJustifications } = useJustifications(
    enrollmentId ? { enrollmentId } : {},
  );

  const { data: authorizedPickups = [] } = usePickups(activeChild?.id);

  // Detección de parámetros en URL para auto-abrir modal de justificación
  useEffect(() => {
    const justifyEnrollmentId = searchParams.get('justify');
    const justifyDate = searchParams.get('date');
    if (justifyEnrollmentId) {
      const targetChild = children.find((c) => c.activeEnrollment?.id === justifyEnrollmentId);
      if (targetChild && targetChild.id !== activeChild?.id) {
        setSelectedChildId(targetChild.id);
      }
      setModalDefaultDate(justifyDate || undefined);
      setModalOpen(true);
    }
  }, [searchParams, children, activeChild?.id, setSelectedChildId]);

  const handleCloseModal = () => {
    setModalOpen(false);
    setModalDefaultDate(undefined);
    if (searchParams.has('justify') || searchParams.has('date')) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('justify');
      nextParams.delete('date');
      setSearchParams(nextParams, { replace: true });
    }
  };

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
      if (filterStatus === 'LATE') return r.status === 'LATE_JUSTIFIED' || r.status === 'LATE_UNJUSTIFIED';
      if (filterStatus === 'ABSENT') return r.status === 'ABSENT_JUSTIFIED' || r.status === 'ABSENT_UNJUSTIFIED';
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
        <p className="text-xs text-muted-foreground">No hay alumnos vinculados a tu cuenta de usuario.</p>
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
            <Badge className="bg-primary/10 text-primary border-primary/20 gap-1 text-xs font-bold">
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>Control de Asistencia</span>
            </Badge>
            <Badge variant="outline" className="text-xs font-bold">
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

        <Button
          size="sm"
          onClick={() => {
            setModalDefaultDate(undefined);
            setModalOpen(true);
          }}
          className="rounded-xl text-xs font-bold gap-1.5 shrink-0"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Justificar una inasistencia</span>
        </Button>
      </div>

      {/* 2. Selector Multi-Hijo si aplica */}
      {children.length > 1 && (
        <ChildSwitcher childrenList={children} selectedId={activeChild.id} onSelect={setSelectedChildId} />
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
              className={`text-xs px-1.5 py-0 rounded-full font-bold ${
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
      <ParentAttendanceHistory
        filteredRecords={filteredRecords}
        loadingRecords={loadingRecords}
        onJustify={(date) => {
          setModalDefaultDate(date);
          setModalOpen(true);
        }}
      />

      {/* 6 y 7. Mis Justificaciones y Autorizados */}
      <ParentJustificationsAndPickups
        childName={activeChild.firstNames}
        justifications={justificationsData?.data ?? []}
        loadingJustifications={loadingJustifications}
        authorizedPickups={authorizedPickups}
      />

      {/* Modal para justificar inasistencia */}
      <JustifyAbsenceModal
        open={modalOpen}
        onClose={handleCloseModal}
        enrollmentId={enrollmentId || ''}
        studentName={activeChild.firstNames}
        defaultDate={modalDefaultDate}
      />
    </div>
  );
};
