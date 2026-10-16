import React, { useState, useEffect, useMemo } from 'react';
import {
  Save,
  RotateCcw,
  Sparkles,
  Users,
  CheckCircle2,
  AlertCircle,
  FileText,
  HelpCircle,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import {
  useCompetenceConclusions,
  useSaveCompetenceConclusions,
  usePeriodLock,
} from '../api/useGrades';
import { PredefinedCommentsModal } from './PredefinedCommentsModal';

interface CompetenceCommentsViewProps {
  courseAssignmentId: string;
  periodNumber: number;
  showWithdrawn: boolean;
  showTransferred: boolean;
  onOpenReportCard?: (enrollmentId: string) => void;
}

export const CompetenceCommentsView: React.FC<CompetenceCommentsViewProps> = ({
  courseAssignmentId,
  periodNumber,
  showWithdrawn: _showWithdrawn,
  showTransferred: _showTransferred,
  onOpenReportCard,
}) => {
  const [selectedCompetenceId, setSelectedCompetenceId] = useState<string>('');
  const [conclusions, setConclusions] = useState<Record<string, string>>({});
  const [dirtyEnrollmentIds, setDirtyEnrollmentIds] = useState<Set<string>>(new Set());

  // Modal de comentarios predefinidos
  const [modalStudent, setModalStudent] = useState<{
    enrollmentId: string;
    studentName: string;
    currentScoreLetter: 'AD' | 'A' | 'B' | 'C' | null;
  } | null>(null);

  const { data, isLoading, isError } = useCompetenceConclusions(
    courseAssignmentId,
    periodNumber,
    selectedCompetenceId || undefined,
  );

  const saveMutation = useSaveCompetenceConclusions();
  const { data: periodLock } = usePeriodLock(data?.assignment?.classroom?.id, periodNumber);
  const isLocked = periodLock?.isLocked || false;

  const competences = useMemo(
    () => data?.assignment?.competences || [],
    [data?.assignment?.competences],
  );

  // Resetear la competencia al cambiar de curso o periodo
  useEffect(() => {
    setSelectedCompetenceId('');
  }, [courseAssignmentId, periodNumber]);

  // Inicializar la competencia seleccionada solo cuando aún no hay ninguna activa
  useEffect(() => {
    if (data?.selectedCompetence && !selectedCompetenceId) {
      setSelectedCompetenceId(data.selectedCompetence.id);
    }
  }, [data?.selectedCompetence, selectedCompetenceId]);

  // Si la competencia seleccionada ya no existe en el curso actual, volver a la primera
  useEffect(() => {
    if (competences.length > 0 && selectedCompetenceId) {
      const exists = competences.some((c) => c.id === selectedCompetenceId);
      if (!exists) {
        setSelectedCompetenceId(competences[0].id);
      }
    }
  }, [competences, selectedCompetenceId]);

  // Inicializar mapa local de conclusiones
  useEffect(() => {
    if (!data?.students) return;
    const initialMap: Record<string, string> = {};
    data.students.forEach((st) => {
      initialMap[st.enrollmentId] = st.conclusion || '';
    });
    setConclusions(initialMap);
    setDirtyEnrollmentIds(new Set());
  }, [data?.students, selectedCompetenceId]);

  const students = useMemo(() => {
    return data?.students || [];
  }, [data?.students]);

  const handleTextChange = (enrollmentId: string, value: string) => {
    setConclusions((prev) => ({
      ...prev,
      [enrollmentId]: value,
    }));
    setDirtyEnrollmentIds((prev) => {
      const next = new Set(prev);
      next.add(enrollmentId);
      return next;
    });
  };

  const handleSelectPredefined = (text: string) => {
    if (!modalStudent) return;
    const current = conclusions[modalStudent.enrollmentId] || '';
    const updated = current ? `${current.trim()} ${text.trim()}` : text.trim();
    handleTextChange(modalStudent.enrollmentId, updated);
  };

  const handleSave = () => {
    if (!selectedCompetenceId) return;

    const payloadConclusions = Array.from(dirtyEnrollmentIds).map((enrollmentId) => ({
      enrollmentId,
      conclusion: (conclusions[enrollmentId] || '').trim(),
    }));

    if (payloadConclusions.length === 0) return;

    saveMutation.mutate({
      courseAssignmentId,
      competenceId: selectedCompetenceId,
      periodNumber,
      conclusions: payloadConclusions,
    });
  };

  const handleDiscard = () => {
    if (!data?.students) return;
    const initialMap: Record<string, string> = {};
    data.students.forEach((st) => {
      initialMap[st.enrollmentId] = st.conclusion || '';
    });
    setConclusions(initialMap);
    setDirtyEnrollmentIds(new Set());
  };

  const hasUnsavedChanges = dirtyEnrollmentIds.size > 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card className="p-8 text-center text-muted-foreground border-dashed border-border bg-card">
        <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-2" />
        <h4 className="text-sm font-bold text-foreground">
          No se pudieron cargar las conclusiones
        </h4>
        <p className="text-xs mt-1">Verifica la conexión o permisos para este curso.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Barra de Selección de Competencia y Estado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-3 flex-1 flex-wrap">
          <div className="space-y-1 min-w-[260px] flex-1 max-w-md">
            <label className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground block">
              Competencia a Evaluar:
            </label>
            <select
              value={selectedCompetenceId}
              onChange={(e) => {
                if (hasUnsavedChanges) {
                  const confirmLeave = window.confirm(
                    'Tienes cambios sin guardar en esta competencia. ¿Deseas cambiar de competencia y descartar los cambios?',
                  );
                  if (!confirmLeave) return;
                }
                setSelectedCompetenceId(e.target.value);
              }}
              className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              {competences.map((c, idx) => (
                <option key={c.id} value={c.id}>
                  {idx + 1}. {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground block">
              Docente Responsable:
            </span>
            <div className="text-xs font-bold text-foreground bg-muted/30 px-3 py-2 rounded-lg border border-border">
              Prof. {data.assignment.teacher.firstName} {data.assignment.teacher.lastNamePaternal}
            </div>
          </div>
        </div>

        {/* Botonera de Acción */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          {hasUnsavedChanges && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDiscard}
              disabled={saveMutation.isPending}
              className="text-xs font-semibold gap-1.5 h-8"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Descartar</span>
            </Button>
          )}

          <Button
            size="sm"
            onClick={handleSave}
            disabled={isLocked || !hasUnsavedChanges || saveMutation.isPending}
            className="text-xs font-bold gap-2 h-8 shadow-sm"
          >
            {saveMutation.isPending ? (
              <span className="animate-spin w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full" />
            ) : isLocked ? (
              <Lock className="w-3.5 h-3.5" />
            ) : hasUnsavedChanges ? (
              <Save className="w-3.5 h-3.5" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
            )}
            <span>
              {saveMutation.isPending
                ? 'Guardando...'
                : isLocked
                ? 'Periodo Cerrado'
                : hasUnsavedChanges
                ? `Guardar (${dirtyEnrollmentIds.size})`
                : 'Al Día'}
            </span>
          </Button>
        </div>
      </div>

      {/* Banner de Periodo Bloqueado por Dirección */}
      {isLocked && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-xs text-rose-700 dark:text-rose-400 font-medium shadow-sm">
          <div className="flex items-center gap-2.5">
            <Lock className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>
              <strong>Periodo Cerrado por Dirección:</strong> Las actas y conclusiones del {periodNumber}° Bimestre han sido auditadas y bloqueadas. El registro se encuentra en modo solo lectura.
            </span>
          </div>
          <Badge variant="destructive" className="text-[10px] uppercase font-bold shrink-0">
            Solo Lectura
          </Badge>
        </div>
      )}

      {/* Descripción o Desempeño de la Competencia */}
      {data.selectedCompetence.description && (
        <div className="px-4 py-2.5 rounded-xl border border-border/80 bg-muted/20 text-xs text-muted-foreground flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-primary shrink-0" />
          <span>{data.selectedCompetence.description}</span>
        </div>
      )}

      {/* Lista de Alumnos para Ingreso de Conclusiones */}
      <div className="space-y-3">
        {students.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground border-dashed border-border bg-card">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">No hay estudiantes activos en esta aula.</p>
          </Card>
        ) : (
          students.map((st) => {
            const currentText = conclusions[st.enrollmentId] ?? st.conclusion ?? '';
            const isDirty = dirtyEnrollmentIds.has(st.enrollmentId);

            return (
              <div
                key={st.enrollmentId}
                className={`p-4 rounded-xl border transition-all ${
                  isDirty
                    ? 'border-primary/40 bg-card shadow-sm ring-1 ring-primary/20'
                    : 'border-border bg-card hover:border-border/80'
                }`}
              >
                {/* Cabecera del Estudiante (Nombre, Calificación, Botón de Frases) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[11px] font-bold text-muted-foreground shrink-0">
                      {st.orderIndex}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-bold text-foreground">
                          {st.fullName}
                        </h4>
                        {onOpenReportCard && (
                          <button
                            type="button"
                            onClick={() => onOpenReportCard(st.enrollmentId)}
                            className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                            title="Ver Libreta del Estudiante"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground block">
                        DNI: {st.documentId} {st.studentCode ? `• SIAGIE: ${st.studentCode}` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                    {/* Nota Actual en la Competencia */}
                    <div className="flex items-center gap-1.5 bg-muted/30 px-2.5 py-1 rounded-lg border border-border">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">
                        Nota:
                      </span>
                      {st.score !== null ? (
                        <div className="flex items-center gap-1 font-mono font-bold text-xs">
                          <span
                            className={
                              st.score >= 11
                                ? 'text-foreground'
                                : 'text-rose-600 font-extrabold'
                            }
                          >
                            {st.score < 10 ? `0${st.score.toFixed(1)}` : st.score.toFixed(1)}
                          </span>
                          {st.letter && (
                            <Badge
                              variant="outline"
                              className={`text-[9px] px-1 py-0 h-4 border font-black ${
                                st.letter === 'AD'
                                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                                  : st.letter === 'A'
                                  ? 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30'
                                  : st.letter === 'B'
                                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
                                  : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30'
                              }`}
                            >
                              {st.letter}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs font-mono">—</span>
                      )}
                    </div>

                    {/* Botón Comentarios Predefinidos */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isLocked || saveMutation.isPending}
                      onClick={() =>
                        setModalStudent({
                          enrollmentId: st.enrollmentId,
                          studentName: st.fullName,
                          currentScoreLetter: st.letter,
                        })
                      }
                      className="h-7 text-xs font-semibold gap-1.5 text-primary border-primary/30 hover:bg-primary/10"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Comentarios Predefinidos</span>
                    </Button>
                  </div>
                </div>

                {/* Textarea para la Conclusión Descriptiva */}
                <div className="pt-2.5">
                  <textarea
                    rows={3}
                    disabled={isLocked || saveMutation.isPending}
                    value={currentText}
                    onChange={(e) => handleTextChange(st.enrollmentId, e.target.value)}
                    placeholder="Escribe la conclusión descriptiva de la competencia (evidencias de aprendizaje, avances, dificultades o recomendaciones)..."
                    className="w-full text-xs p-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary transition-all resize-y min-h-[70px]"
                  />
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 px-1">
                    <span>
                      {isDirty && (
                        <strong className="text-amber-600 dark:text-amber-400 font-bold">
                          ● Modificado sin guardar
                        </strong>
                      )}
                    </span>
                    <span>{currentText.length} caracteres</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de Frases Predefinidas */}
      <PredefinedCommentsModal
        isOpen={Boolean(modalStudent)}
        onClose={() => setModalStudent(null)}
        onSelectComment={handleSelectPredefined}
        studentName={modalStudent?.studentName}
        currentScoreLetter={modalStudent?.currentScoreLetter}
      />
    </div>
  );
};
