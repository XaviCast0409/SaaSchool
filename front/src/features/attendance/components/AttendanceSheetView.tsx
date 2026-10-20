import React, { useState, useEffect, useMemo } from 'react';
import {
  Save,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  MessageSquare,
  QrCode,
  Search,
  X,
  AlertCircle,
  Check,
  UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAttendanceSheet, useSaveAttendanceSheet } from '../api/useAttendance';
import { AttendanceStatus, AttendanceSheetStudentItem } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface AttendanceSheetViewProps {
  classroomId: string;
  date: string;
  canWrite?: boolean;
}

const STATUS_OPTS: Array<{
  value: AttendanceStatus;
  shortLabel: string;
  fullLabel: string;
  activeClass: string;
}> = [
  {
    value: 'PRESENT',
    shortLabel: 'P',
    fullLabel: 'Presente',
    activeClass: 'bg-emerald-600 text-white font-bold shadow-sm border-emerald-600',
  },
  {
    value: 'ABSENT_UNJUSTIFIED',
    shortLabel: 'FI',
    fullLabel: 'Falta Injustificada',
    activeClass: 'bg-destructive text-destructive-foreground font-bold shadow-sm border-destructive',
  },
  {
    value: 'ABSENT_JUSTIFIED',
    shortLabel: 'FJ',
    fullLabel: 'Falta Justificada',
    activeClass: 'bg-amber-600 text-white font-bold shadow-sm border-amber-600',
  },
  {
    value: 'LATE_UNJUSTIFIED',
    shortLabel: 'TI',
    fullLabel: 'Tardanza Injustificada',
    activeClass: 'bg-amber-500 text-white font-bold shadow-sm border-amber-500',
  },
  {
    value: 'LATE_JUSTIFIED',
    shortLabel: 'TJ',
    fullLabel: 'Tardanza Justificada',
    activeClass: 'bg-sky-600 text-white font-bold shadow-sm border-sky-600',
  },
];

export const AttendanceSheetView: React.FC<AttendanceSheetViewProps> = ({
  classroomId,
  date,
  canWrite = true,
}) => {
  const { data: sheetData, isLoading, isError, refetch } = useAttendanceSheet({
    classroomId,
    date,
  });

  const { mutate: saveSheet, isPending: isSaving } = useSaveAttendanceSheet();

  // Estado local para edición rápida (enrollmentId -> { status, notes })
  const [draftState, setDraftState] = useState<
    Record<string, { status: AttendanceStatus; notes: string }>
  >({});
  const [hasChanges, setHasChanges] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [editingNoteStudent, setEditingNoteStudent] = useState<AttendanceSheetStudentItem | null>(null);
  const [noteText, setNoteText] = useState('');

  // Sincronizar datos iniciales del backend
  useEffect(() => {
    if (sheetData?.students) {
      const initial: Record<string, { status: AttendanceStatus; notes: string }> = {};
      sheetData.students.forEach((s) => {
        initial[s.enrollmentId] = {
          status: s.status || 'PRESENT',
          notes: s.notes || '',
        };
      });
      setDraftState(initial);
      setHasChanges(false);
    }
  }, [sheetData]);

  const handleStatusChange = (enrollmentId: string, status: AttendanceStatus) => {
    if (!canWrite) return;
    setDraftState((prev) => ({
      ...prev,
      [enrollmentId]: {
        ...prev[enrollmentId],
        status,
      },
    }));
    setHasChanges(true);
  };

  const handleSetAll = (status: AttendanceStatus) => {
    if (!canWrite || !sheetData?.students) return;
    const next: Record<string, { status: AttendanceStatus; notes: string }> = {};
    sheetData.students.forEach((s) => {
      next[s.enrollmentId] = {
        status,
        notes: draftState[s.enrollmentId]?.notes || s.notes || '',
      };
    });
    setDraftState(next);
    setHasChanges(true);
  };

  const handleReset = () => {
    if (!sheetData?.students) return;
    const initial: Record<string, { status: AttendanceStatus; notes: string }> = {};
    sheetData.students.forEach((s) => {
      initial[s.enrollmentId] = {
        status: s.status || 'PRESENT',
        notes: s.notes || '',
      };
    });
    setDraftState(initial);
    setHasChanges(false);
  };

  const handleOpenNoteModal = (student: AttendanceSheetStudentItem) => {
    setEditingNoteStudent(student);
    setNoteText(draftState[student.enrollmentId]?.notes || student.notes || '');
  };

  const handleSaveNote = () => {
    if (!editingNoteStudent) return;
    setDraftState((prev) => ({
      ...prev,
      [editingNoteStudent.enrollmentId]: {
        ...prev[editingNoteStudent.enrollmentId],
        notes: noteText.trim(),
      },
    }));
    setHasChanges(true);
    setEditingNoteStudent(null);
  };

  const handleSaveAll = () => {
    if (!canWrite || !sheetData?.students.length) return;

    const records = sheetData.students.map((s) => ({
      enrollmentId: s.enrollmentId,
      status: draftState[s.enrollmentId]?.status || 'PRESENT',
      notes: draftState[s.enrollmentId]?.notes?.trim() || undefined,
    }));

    saveSheet(
      {
        classroomId,
        date,
        records,
      },
      {
        onSuccess: (data) => {
          toast.success(`✅ Asistencia de ${sheetData.classroomName} guardada con éxito (${data.count} alumnos).`);
          setHasChanges(false);
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.message || 'Error al guardar la asistencia.';
          toast.error(msg);
        },
      }
    );
  };

  // Filtrado de alumnos en memoria por nombre o DNI
  const filteredStudents = useMemo(() => {
    if (!sheetData?.students) return [];
    const q = searchFilter.trim().toLowerCase();
    if (!q) return sheetData.students;
    return sheetData.students.filter(
      (s) =>
        s.studentName.toLowerCase().includes(q) ||
        s.documentId.includes(q) ||
        (s.studentCode && s.studentCode.toLowerCase().includes(q))
    );
  }, [sheetData?.students, searchFilter]);

  // Métricas dinámicas calculadas sobre el borrador actual
  const metrics = useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;
    const total = sheetData?.students.length || 0;

    if (sheetData?.students) {
      sheetData.students.forEach((s) => {
        const current = draftState[s.enrollmentId]?.status || s.status;
        if (current === 'PRESENT') present++;
        else if (current?.startsWith('ABSENT')) absent++;
        else if (current?.startsWith('LATE')) late++;
      });
    }

    return { total, present, absent, late };
  }, [sheetData?.students, draftState]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !sheetData) {
    return (
      <div className="p-8 rounded-2xl border border-destructive/30 bg-destructive/10 text-destructive text-center space-y-3">
        <AlertCircle className="w-8 h-8 mx-auto" />
        <h3 className="font-bold text-base">Error al cargar la nómina de asistencia</h3>
        <p className="text-xs">No se pudo obtener la hoja de asistencia para el aula seleccionada.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Barra Superior de Control y Resumen de la Sección */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-primary/10 text-primary border-primary/20 font-bold text-xs gap-1">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Hoja de Pase de Lista</span>
              </Badge>
              <Badge variant="outline" className="text-xs font-semibold">
                {sheetData.classroomName}
              </Badge>
              {sheetData.isComplete ? (
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[11px] font-semibold">
                  ✓ Verificada en Base de Datos
                </Badge>
              ) : (
                <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[11px] font-semibold">
                  Pendiente de Guardar Hoy
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Haz clic en el estado de cada estudiante. Los ingresos marcados en portería por lector QR se conservan automáticamente.
            </p>
          </div>

          {/* Botones Maestros de Acción Rápida */}
          {canWrite && (
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleSetAll('PRESENT')}
                className="h-8 text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 font-bold"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Todos Presentes
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleSetAll('ABSENT_UNJUSTIFIED')}
                className="h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 font-bold"
              >
                <XCircle className="w-3.5 h-3.5 mr-1" />
                Todos Falta
              </Button>
              {hasChanges && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="h-8 text-xs text-muted-foreground gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Descartar
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                onClick={handleSaveAll}
                isLoading={isSaving}
                className={`h-9 px-4 text-xs font-bold gap-1.5 shadow-sm transition-all ${
                  hasChanges
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90 animate-pulse'
                    : 'bg-primary/90 text-primary-foreground'
                }`}
              >
                <Save className="w-4 h-4" />
                <span>Guardar Asistencia ({metrics.total})</span>
              </Button>
            </div>
          )}
        </div>

        {/* Chips de Resumen Dinámico en Tiempo Real */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="font-bold text-foreground">Total: {metrics.total}</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
              {metrics.present} Presentes ({metrics.total > 0 ? Math.round((metrics.present / metrics.total) * 100) : 0}%)
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="text-destructive font-bold">
              {metrics.absent} Faltas
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="text-amber-600 dark:text-amber-400 font-bold">
              {metrics.late} Tardanzas
            </span>
          </div>

          {/* Buscador Rápido de Alumno dentro de la Sección */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar en esta aula..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="h-8 pl-8 pr-7 text-xs bg-background"
            />
            {searchFilter && (
              <button
                type="button"
                onClick={() => setSearchFilter('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Roster / Nómina Interactiva de la Sección */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-muted/50 border-b border-border text-muted-foreground font-bold uppercase text-[11px]">
                <th className="p-3 w-12 text-center">#</th>
                <th className="p-3">Apellidos y Nombres</th>
                <th className="p-3 w-40 text-center">Portería / QR</th>
                <th className="p-3 text-center min-w-[280px]">Pase de Lista (1 Clic)</th>
                <th className="p-3 w-28 text-center">Obs.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground text-sm">
                    {searchFilter
                      ? 'No hay estudiantes que coincidan con la búsqueda.'
                      : 'No hay estudiantes activos matriculados en esta sección.'}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, idx) => {
                  const currentDraft = draftState[student.enrollmentId];
                  const currentStatus = currentDraft?.status || student.status || 'PRESENT';
                  const currentNotes = currentDraft?.notes ?? student.notes;

                  return (
                    <tr
                      key={student.enrollmentId}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <td className="p-3 text-center font-bold text-muted-foreground font-mono">
                        {idx + 1}
                      </td>

                      <td className="p-3">
                        <div className="font-semibold text-foreground text-sm">
                          {student.studentName}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
                          <span>DNI: {student.documentId}</span>
                          {student.studentCode && (
                            <>
                              <span>•</span>
                              <span>Cod: {student.studentCode}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Registro de Puerta / Kiosco */}
                      <td className="p-3 text-center">
                        {student.origin === 'QR_SCAN' ? (
                          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-bold gap-1">
                            <QrCode className="w-3 h-3 text-emerald-600" />
                            <span>
                              QR{' '}
                              {student.checkInTime
                                ? new Date(student.checkInTime).toLocaleTimeString('es-PE', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    timeZone: 'America/Lima',
                                  })
                                : ''}
                            </span>
                          </Badge>
                        ) : student.checkInTime ? (
                          <Badge variant="outline" className="text-[10px] font-semibold gap-1">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span>
                              {new Date(student.checkInTime).toLocaleTimeString('es-PE', {
                                hour: '2-digit',
                                minute: '2-digit',
                                timeZone: 'America/Lima',
                              })}
                            </span>
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground/40 font-mono text-xs">—</span>
                        )}
                      </td>

                      {/* Botones de Estado Instantáneo */}
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {STATUS_OPTS.map((opt) => {
                            const isSelected = currentStatus === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                disabled={!canWrite}
                                onClick={() => handleStatusChange(student.enrollmentId, opt.value)}
                                title={opt.fullLabel}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                  isSelected
                                    ? opt.activeClass
                                    : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3 inline mr-1" />}
                                <span className="hidden sm:inline">{opt.fullLabel}</span>
                                <span className="sm:hidden">{opt.shortLabel}</span>
                              </button>
                            );
                          })}
                        </div>
                      </td>

                      {/* Observación / Justificación */}
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenNoteModal(student)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-colors ${
                            currentNotes
                              ? 'border-primary/40 bg-primary/10 text-primary font-semibold'
                              : 'border-border text-muted-foreground hover:bg-muted'
                          }`}
                          title={currentNotes || 'Agregar observación o justificación'}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span className="max-w-[70px] truncate text-[11px]">
                            {currentNotes ? 'Nota' : '+'}
                          </span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Barra Flotante si hay cambios */}
        {hasChanges && canWrite && (
          <div className="p-3 bg-primary/5 border-t border-primary/20 flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-primary">
              ⚠️ Tienes cambios en la lista listos para guardar.
            </span>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveAll}
              isLoading={isSaving}
              className="h-8 text-xs font-bold gap-1 shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Guardar Cambios</span>
            </Button>
          </div>
        )}
      </div>

      {/* Modal para Observación / Nota del Alumno */}
      {editingNoteStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-sm text-foreground">
                  Observación de Asistencia
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {editingNoteStudent.studentName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingNoteStudent(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Motivo / Justificación médica o permiso:
              </label>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Ej: Permiso médico presentado por el apoderado..."
                rows={3}
                className="w-full rounded-xl border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditingNoteStudent(null)}
              >
                Cancelar
              </Button>
              <Button type="button" size="sm" onClick={handleSaveNote}>
                Guardar Observación
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
