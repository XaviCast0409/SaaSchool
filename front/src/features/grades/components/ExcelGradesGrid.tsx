import React, { useState, useEffect } from 'react';
import { BookOpen, Check, Save, AlertCircle, ShieldAlert, Sparkles, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSyncHomeworkToMatrix } from '../api/useGrades';
import { toast } from 'sonner';

export interface StudentGradeRow {
  studentId: string;
  studentName: string;
  code: string;
  scores: Record<string, number | null>; // competenceName -> numericScore
  rawValues?: Record<string, string>; // competenceName -> raw typed text ("AD", "EXO", "18", "-")
  isExonerated?: boolean;
  incidentsSummary?: {
    total: number;
    topics: number;
    convivencia: number;
    acoso: number;
  };
}

export interface ExcelGradesGridProps {
  courseAssignmentId?: string;
  periodNumber?: number;
  educationLevel?: 'INITIAL' | 'PRIMARY' | 'SECONDARY';
}

// Convert numeric score to MINEDU SIAGIE Letter Grade
const getSiagieLetter = (score: number) => {
  if (score >= 17.5) return { letter: 'AD', variant: 'default' as const };
  if (score >= 14.0) return { letter: 'A', variant: 'secondary' as const };
  if (score >= 11.0) return { letter: 'B', variant: 'outline' as const };
  return { letter: 'C', variant: 'destructive' as const };
};

const DEFAULT_ROWS: StudentGradeRow[] = [
  {
    studentId: '1',
    studentName: 'Flores Quispe, Carlos Eduardo',
    code: '20261099238123',
    scores: {
      'Resuelve problemas de cantidad': 18.5,
      'Resuelve problemas de forma y movimiento': 15.0,
      'Gestiona datos e incertidumbre': 14.0,
    },
    rawValues: {
      'Resuelve problemas de cantidad': '18.5',
      'Resuelve problemas de forma y movimiento': '15.0',
      'Gestiona datos e incertidumbre': '14.0',
    },
    isExonerated: false,
    incidentsSummary: { total: 0, topics: 0, convivencia: 0, acoso: 0 },
  },
  {
    studentId: '2',
    studentName: 'García Rodríguez, Lucía Valeria',
    code: '20261099238124',
    scores: {
      'Resuelve problemas de cantidad': 12.5,
      'Resuelve problemas de forma y movimiento': 11.0,
      'Gestiona datos e incertidumbre': 13.5,
    },
    rawValues: {
      'Resuelve problemas de cantidad': '12.5',
      'Resuelve problemas de forma y movimiento': '11.0',
      'Gestiona datos e incertidumbre': '13.5',
    },
    isExonerated: false,
    incidentsSummary: { total: 2, topics: 1, convivencia: 1, acoso: 0 },
  },
  {
    studentId: '3',
    studentName: 'Mamani Huanca, Miguel Ángel',
    code: '20261099238125',
    scores: {
      'Resuelve problemas de cantidad': 9.0,
      'Resuelve problemas de forma y movimiento': 10.5,
      'Gestiona datos e incertidumbre': 8.5,
    },
    rawValues: {
      'Resuelve problemas de cantidad': '9.0',
      'Resuelve problemas de forma y movimiento': '10.5',
      'Gestiona datos e incertidumbre': '8.5',
    },
    isExonerated: false,
    incidentsSummary: { total: 1, topics: 0, convivencia: 1, acoso: 0 },
  },
  {
    studentId: '4',
    studentName: 'Sánchez López, Sofía Isabella',
    code: '20261099238126',
    scores: {
      'Resuelve problemas de cantidad': 19.0,
      'Resuelve problemas de forma y movimiento': 18.0,
      'Gestiona datos e incertidumbre': 17.5,
    },
    rawValues: {
      'Resuelve problemas de cantidad': '19.0',
      'Resuelve problemas de forma y movimiento': '18.0',
      'Gestiona datos e incertidumbre': '17.5',
    },
    isExonerated: false,
    incidentsSummary: { total: 0, topics: 0, convivencia: 0, acoso: 0 },
  },
];

export const ExcelGradesGrid: React.FC<ExcelGradesGridProps> = ({
  courseAssignmentId = 'assignment-demo',
  periodNumber = 1,
  educationLevel = 'SECONDARY',
}) => {
  const draftKey = `saaschool_grades_draft_${courseAssignmentId}_${periodNumber}`;

  const [gradeMode, setGradeMode] = useState<'NUMERIC' | 'LITERAL'>(
    educationLevel === 'INITIAL' || educationLevel === 'PRIMARY' ? 'LITERAL' : 'NUMERIC',
  );
  const [isSaved, setIsSaved] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [hasUnsavedServerChanges, setHasUnsavedServerChanges] = useState(false);

  const [competences] = useState([
    'Resuelve problemas de cantidad',
    'Resuelve problemas de forma y movimiento',
    'Gestiona datos e incertidumbre',
  ]);

  const [rows, setRows] = useState<StudentGradeRow[]>(DEFAULT_ROWS);
  const syncHomeworkMutation = useSyncHomeworkToMatrix();

  // Protección anti-pérdida de datos con beforeunload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedServerChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedServerChanges]);

  // Cargar borrador local si existe
  useEffect(() => {
    const saved = localStorage.getItem(draftKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRows(parsed);
          setHasDraft(true);
          return;
        }
      } catch (err) {
        console.warn('Error al leer borrador local de ExcelGradesGrid:', err);
      }
    }
  }, [draftKey]);

  const handleScoreChange = (studentId: string, comp: string, val: string) => {
    const trimmed = val.trim().toUpperCase();
    setIsSaved(false);
    setHasUnsavedServerChanges(true);

    setRows((prev) => {
      const next = prev.map((row) => {
        if (row.studentId !== studentId) return row;

        const newScores = { ...row.scores };
        const newRaw = { ...(row.rawValues || {}) };

        if (trimmed === '') {
          newScores[comp] = null;
          delete newRaw[comp];
        } else if (trimmed === 'EXO') {
          newScores[comp] = null;
          newRaw[comp] = 'EXO';
        } else if (trimmed === '-') {
          newScores[comp] = null;
          newRaw[comp] = '-';
        } else if (gradeMode === 'LITERAL') {
          if (['AD', 'A', 'B', 'C'].includes(trimmed)) {
            newRaw[comp] = trimmed;
            const map: Record<string, number> = { AD: 19, A: 15, B: 12, C: 9 };
            newScores[comp] = map[trimmed];
          } else {
            return row;
          }
        } else {
          const numeric = parseFloat(val.replace(',', '.'));
          if (isNaN(numeric) || numeric < 0 || numeric > 20) return row;
          newScores[comp] = numeric;
          newRaw[comp] = val;
        }

        return {
          ...row,
          scores: newScores,
          rawValues: newRaw,
        };
      });

      try {
        localStorage.setItem(draftKey, JSON.stringify(next));
        setHasDraft(true);
      } catch (e) {
        console.warn('Error al guardar borrador en localStorage', e);
      }

      return next;
    });
  };

  // Pegado Inteligente Masivo desde Excel (Ctrl + V)
  const handlePaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    startStudentIndex: number,
    startCompIndex: number,
  ) => {
    e.preventDefault();
    const clipboardData = e.clipboardData.getData('text');
    if (!clipboardData) return;

    const pastedRows = clipboardData
      .split(/\r\n|\n|\r/)
      .map((r) => r.split('\t'))
      .filter((r) => r.length > 0 && !(r.length === 1 && r[0].trim() === ''));

    if (pastedRows.length === 0) return;

    setRows((prev) => {
      const next = [...prev];
      let updatedAny = false;

      pastedRows.forEach((pastedRow, rOffset) => {
        const targetStudentIdx = startStudentIndex + rOffset;
        if (targetStudentIdx >= next.length) return;

        const currentStudent = { ...next[targetStudentIdx] };
        if (currentStudent.isExonerated) return;

        const newScores = { ...currentStudent.scores };
        const newRaw = { ...(currentStudent.rawValues || {}) };

        pastedRow.forEach((val, cOffset) => {
          const targetCompIdx = startCompIndex + cOffset;
          if (targetCompIdx >= competences.length) return;

          const comp = competences[targetCompIdx];
          const trimmed = val.trim().toUpperCase();

          if (trimmed === '' || trimmed === '-') {
            newScores[comp] = null;
            newRaw[comp] = trimmed === '-' ? '-' : '';
            updatedAny = true;
          } else if (trimmed === 'EXO') {
            newScores[comp] = null;
            newRaw[comp] = 'EXO';
            updatedAny = true;
          } else if (gradeMode === 'LITERAL') {
            if (['AD', 'A', 'B', 'C'].includes(trimmed)) {
              newRaw[comp] = trimmed;
              const map: Record<string, number> = { AD: 19, A: 15, B: 12, C: 9 };
              newScores[comp] = map[trimmed];
              updatedAny = true;
            }
          } else {
            const numeric = parseFloat(val.replace(',', '.'));
            if (!isNaN(numeric) && numeric >= 0 && numeric <= 20) {
              newScores[comp] = numeric;
              newRaw[comp] = String(numeric);
              updatedAny = true;
            }
          }
        });

        currentStudent.scores = newScores;
        currentStudent.rawValues = newRaw;
        next[targetStudentIdx] = currentStudent;
      });

      if (updatedAny) {
        setHasUnsavedServerChanges(true);
        setIsSaved(false);
        try {
          localStorage.setItem(draftKey, JSON.stringify(next));
          setHasDraft(true);
        } catch (err) {
          console.warn('Error guardando borrador:', err);
        }
        toast.success(`Pegado masivo desde Excel aplicado con éxito (${pastedRows.length} fila/s).`);
      }

      return next;
    });
  };

  const handleToggleExoneration = (studentId: string) => {
    setHasUnsavedServerChanges(true);
    setRows((prev) => {
      const next = prev.map((row) => {
        if (row.studentId !== studentId) return row;
        const isNowExo = !row.isExonerated;
        const newRaw = { ...(row.rawValues || {}) };
        const newScores = { ...row.scores };

        competences.forEach((comp) => {
          if (isNowExo) {
            newRaw[comp] = 'EXO';
            newScores[comp] = null;
          } else {
            if (newRaw[comp] === 'EXO') {
              delete newRaw[comp];
              newScores[comp] = null;
            }
          }
        });

        return {
          ...row,
          isExonerated: isNowExo,
          scores: newScores,
          rawValues: newRaw,
        };
      });

      try {
        localStorage.setItem(draftKey, JSON.stringify(next));
        setHasDraft(true);
      } catch (e) {
        console.warn('Error al guardar borrador', e);
      }

      return next;
    });
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem(draftKey);
    setHasDraft(false);
    setHasUnsavedServerChanges(false);
    setRows(DEFAULT_ROWS);
    toast.info('Borrador descartado.');
  };

  const handleSave = () => {
    setIsSaved(true);
    setHasUnsavedServerChanges(false);
    localStorage.removeItem(draftKey);
    setHasDraft(false);
    toast.success('Calificaciones guardadas exitosamente.');
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleImportLmsHomework = async () => {
    if (!courseAssignmentId) {
      toast.error('No se ha especificado el ID de asignación del curso.');
      return;
    }
    try {
      await syncHomeworkMutation.mutateAsync({
        courseAssignmentId,
        periodNumber,
      });
      setHasUnsavedServerChanges(false);
    } catch {
      // El hook useSyncHomeworkToMatrix maneja el toast de error
    }
  };

  return (
    <div className="space-y-4 relative">
      {/* Table Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-muted/40 rounded-xl border border-border">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <span className="font-semibold text-sm text-foreground">
            Registro de Notas Tipo Excel — Bimestre {periodNumber}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Selector de Modo */}
          <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setGradeMode('NUMERIC')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                gradeMode === 'NUMERIC'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Vigesimal (0-20)
            </button>
            <button
              type="button"
              onClick={() => setGradeMode('LITERAL')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                gradeMode === 'LITERAL'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Literal (AD, A, B, C)
            </button>
          </div>

          {/* Botón Importar Tareas LMS (Conexión 1) */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleImportLmsHomework}
            isLoading={syncHomeworkMutation.isPending}
            className="gap-1.5 h-8 text-xs font-semibold border-primary/30 text-foreground hover:bg-primary/5"
            title="Importa y promedia automáticamente las calificaciones del módulo LMS Tareas en la matriz"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>Importar Tareas LMS</span>
          </Button>

          <Button size="sm" onClick={handleSave} className="gap-2 h-8 font-bold">
            {isSaved ? <Check className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
            <span>{isSaved ? '¡Notas Guardadas!' : 'Guardar Cambios'}</span>
          </Button>
        </div>
      </div>

      {/* Banner de Borrador Local */}
      {hasDraft && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300 font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Se recuperaron notas no guardadas de tu última sesión en este dispositivo.</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDiscardDraft}
            className="text-xs h-7 border-amber-500/40 text-amber-900 dark:text-amber-200 hover:bg-amber-500/15"
          >
            Descartar borrador
          </Button>
        </div>
      )}

      {/* Grid */}
      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <Table className="min-w-[650px]">
          <TableHeader className="bg-muted/60">
            <TableRow>
              <TableHead className="w-72 font-bold text-xs uppercase">Estudiante SIAGIE</TableHead>
              {competences.map((comp, idx) => (
                <TableHead key={idx} className="font-bold text-xs uppercase text-center min-w-[160px]">
                  {comp}
                </TableHead>
              ))}
              <TableHead className="w-24 font-bold text-xs uppercase text-center">Promedio</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, rIdx) => {
              const validScores = row.isExonerated
                ? []
                : Object.values(row.scores).filter((s): s is number => s !== null && s !== undefined);
              const avg = validScores.length
                ? validScores.reduce((a, b) => a + b, 0) / validScores.length
                : null;
              const avgSiagie = avg !== null ? getSiagieLetter(avg) : null;

              return (
                <TableRow key={row.studentId} className="hover:bg-muted/20">
                  <TableCell>
                    <div className="flex items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="font-medium text-sm flex items-center gap-1.5 flex-wrap">
                          <span>{row.studentName}</span>
                          {row.isExonerated && (
                            <Badge
                              variant="outline"
                              className="text-[9px] uppercase font-bold px-1.5 py-0 bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                            >
                              EXO
                            </Badge>
                          )}
                          {/* Badge de Resumen de Incidencias / Tópico */}
                          {row.incidentsSummary && row.incidentsSummary.total > 0 && (
                            <Badge
                              variant="outline"
                              className="text-[9px] font-bold px-1.5 py-0 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 gap-1"
                              title={`Incidencias registradas en el periodo: ${row.incidentsSummary.total} (${row.incidentsSummary.topics} tópico, ${row.incidentsSummary.convivencia} convivencia, ${row.incidentsSummary.acoso} acoso)`}
                            >
                              <ShieldAlert className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                              <span>{row.incidentsSummary.total} inc.</span>
                            </Badge>
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground">{row.code}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleExoneration(row.studentId)}
                        className={`p-1 rounded text-xs transition-colors ${
                          row.isExonerated
                            ? 'text-amber-600 dark:text-amber-400 bg-amber-500/20'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`}
                        title={row.isExonerated ? 'Quitar Exoneración' : 'Marcar Alumno como Exonerado (EXO)'}
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </TableCell>

                  {competences.map((comp, cIdx) => {
                    const currentScore = row.scores[comp];
                    const rawVal = row.rawValues?.[comp] ?? '';
                    const isCellExo = rawVal === 'EXO' || row.isExonerated;
                    const displayVal = isCellExo ? 'EXO' : rawVal !== '' ? rawVal : currentScore !== null && currentScore !== undefined ? String(currentScore) : '';
                    const siagie = currentScore !== null && currentScore !== undefined ? getSiagieLetter(currentScore) : null;

                    return (
                      <TableCell key={comp} className="p-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <input
                            type="text"
                            inputMode={gradeMode === 'NUMERIC' ? 'decimal' : 'text'}
                            disabled={row.isExonerated}
                            value={displayVal}
                            placeholder="—"
                            onPaste={(e) => handlePaste(e, rIdx, cIdx)}
                            onChange={(e) => handleScoreChange(row.studentId, comp, e.target.value)}
                            className={`w-16 h-8 text-center font-mono font-semibold rounded-lg border transition-all focus:ring-2 focus:ring-primary text-sm ${
                              isCellExo
                                ? 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-400 font-extrabold'
                                : 'border-input bg-background text-foreground'
                            }`}
                          />
                          {siagie && !isCellExo && (
                            <Badge variant={siagie.variant} className="w-8 justify-center text-[10px]">
                              {siagie.letter}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    );
                  })}

                  <TableCell className="text-center font-bold">
                    {row.isExonerated ? (
                      <Badge
                        variant="outline"
                        className="text-[10px] font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                      >
                        EXO
                      </Badge>
                    ) : avg !== null ? (
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-mono font-bold text-foreground">{avg.toFixed(1)}</span>
                        {avgSiagie && (
                          <Badge variant={avgSiagie.variant} className="text-[9px] px-1 py-0 mt-0.5">
                            {avgSiagie.letter}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground font-mono text-xs">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Barra Flotante de Cambios Pendientes en Servidor */}
      {hasUnsavedServerChanges && (
        <div className="sticky bottom-4 left-0 right-0 z-40 flex items-center justify-between p-3.5 rounded-2xl bg-card border border-border shadow-2xl animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 animate-pulse" />
            <div>
              <span className="font-bold text-xs text-foreground block">
                Tienes modificaciones pendientes de guardar en la matriz
              </span>
              <span className="text-[11px] text-muted-foreground">
                Presiona "Guardar Todo" para actualizar las libretas y el consolidado oficial SIAGIE.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDiscardDraft}
              className="h-8 text-xs font-semibold"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              <span>Descartar</span>
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              className="h-8 text-xs font-bold gap-1.5 shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Guardar Todo</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
