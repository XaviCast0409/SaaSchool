import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Save,
  RotateCcw,
  Download,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Users,
  Award,
  FileText,
  Lock,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useGradeMatrix, useSaveGradeMatrix, usePeriodLock } from '../api/useGrades';
import { getSiagieConversion } from '../types';

interface GradesMatrixGridProps {
  courseAssignmentId: string;
  periodNumber: number;
  showWithdrawn: boolean;
  showTransferred: boolean;
  onOpenReportCard?: (enrollmentId: string) => void;
}

export const GradesMatrixGrid: React.FC<GradesMatrixGridProps> = ({
  courseAssignmentId,
  periodNumber,
  showWithdrawn,
  showTransferred,
  onOpenReportCard,
}) => {
  const { data, isLoading, isError, refetch } = useGradeMatrix(courseAssignmentId, periodNumber);
  const saveMatrixMutation = useSaveGradeMatrix();
  const { data: periodLock } = usePeriodLock(data?.assignment?.classroom?.id, periodNumber);
  const isLocked = periodLock?.isLocked || false;

  // Matriz local de calificaciones: key = `${enrollmentId}_${competenceId}_${criterionId}` -> valor numérico
  const [scores, setScores] = useState<Record<string, number | null>>({});
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set());

  // Referencias para navegación rápida por teclado (tipo Excel)
  const inputsRef = useRef<Map<string, HTMLInputElement>>(new Map());

  // Inicializar estado local cuando llegan datos del servidor
  useEffect(() => {
    if (!data) return;
    const initialScores: Record<string, number | null> = {};
    data.detailedGrades.forEach((g) => {
      const key = `${g.enrollmentId}_${g.competenceId}_${g.criterionId}`;
      initialScores[key] = g.numericScore;
    });
    setScores(initialScores);
    setDirtyKeys(new Set());
  }, [data]);

  const assignment = data?.assignment;
  const criteria = useMemo(() => data?.criteria || [], [data?.criteria]);
  const competences = useMemo(
    () => assignment?.area?.competences || [],
    [assignment?.area?.competences],
  );

  // Filtrado de alumnos según estado
  const enrollments = useMemo(() => {
    const list = assignment?.classroom?.enrollments || [];
    return list.filter((e) => {
      if (!showWithdrawn && e.enrollmentState === 'WITHDRAWN') return false;
      if (!showTransferred && e.enrollmentState === 'TRANSFERRED') return false;
      return true;
    });
  }, [assignment?.classroom?.enrollments, showWithdrawn, showTransferred]);

  // Manejador de cambio en celda
  const handleScoreChange = (
    enrollmentId: string,
    competenceId: string,
    criterionId: string,
    rawValue: string,
  ) => {
    const key = `${enrollmentId}_${competenceId}_${criterionId}`;
    if (rawValue.trim() === '') {
      setScores((prev) => ({ ...prev, [key]: null }));
      setDirtyKeys((prev) => new Set(prev).add(key));
      return;
    }

    const numeric = parseFloat(rawValue);
    if (isNaN(numeric) || numeric < 0 || numeric > 20) {
      return;
    }

    setScores((prev) => ({ ...prev, [key]: numeric }));
    setDirtyKeys((prev) => new Set(prev).add(key));
  };

  // Cálculo reactivo de promedios por estudiante y competencia
  const calculatedRows = useMemo(() => {
    return enrollments.map((enrollment, index) => {
      const student = enrollment.student;
      const fullName = `${student.lastNamePaternal} ${student.lastNameMaternal || ''}, ${student.firstNames}`.trim();

      // Promedio por cada competencia
      const competenceAverages: Record<string, number | null> = {};

      competences.forEach((comp) => {
        let weightedSum = 0;
        let totalWeight = 0;

        criteria.forEach((crit) => {
          const key = `${enrollment.id}_${comp.id}_${crit.id}`;
          const val = scores[key];
          if (val !== undefined && val !== null) {
            weightedSum += val * (crit.weight || 1);
            totalWeight += crit.weight || 1;
          }
        });

        competenceAverages[comp.id] =
          totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : null;
      });

      // Promedio General del Curso en este periodo
      const validCompScores = Object.values(competenceAverages).filter(
        (s): s is number => s !== null,
      );

      const periodAverage =
        validCompScores.length > 0
          ? Math.round(
              (validCompScores.reduce((a, b) => a + b, 0) / validCompScores.length) * 10,
            ) / 10
          : null;

      return {
        orderIndex: index + 1,
        enrollmentId: enrollment.id,
        studentId: student.id,
        fullName,
        studentCode: student.studentCode,
        documentId: student.documentId,
        competenceAverages,
        periodAverage,
      };
    });
  }, [enrollments, competences, criteria, scores]);

  // Estadísticas globales del aula
  const summaryStats = useMemo(() => {
    const validScores = calculatedRows
      .map((r) => r.periodAverage)
      .filter((s): s is number => s !== null);

    const totalStudents = calculatedRows.length;
    const evaluatedStudents = validScores.length;
    const classroomAverage =
      evaluatedStudents > 0
        ? Math.round((validScores.reduce((a, b) => a + b, 0) / evaluatedStudents) * 10) / 10
        : 0;
    const passingCount = validScores.filter((s) => s >= 11).length;
    const failingCount = validScores.filter((s) => s < 11).length;
    const passingRate =
      evaluatedStudents > 0 ? Math.round((passingCount / evaluatedStudents) * 100) : 0;

    return {
      totalStudents,
      evaluatedStudents,
      classroomAverage,
      passingCount,
      failingCount,
      passingRate,
    };
  }, [calculatedRows]);

  // Navegación por teclado tipo Excel
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    colIndex: number,
  ) => {
    const totalCols = competences.length * criteria.length;
    const totalRows = enrollments.length;

    let targetRow = rowIndex;
    let targetCol = colIndex;

    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      targetRow = Math.min(totalRows - 1, rowIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      targetRow = Math.max(0, rowIndex - 1);
    } else if (
      (e.key === 'ArrowRight' && e.currentTarget.selectionEnd === e.currentTarget.value.length) ||
      e.key === 'Tab'
    ) {
      if (colIndex < totalCols - 1) {
        e.preventDefault();
        targetCol = colIndex + 1;
      }
    } else if (e.key === 'ArrowLeft' && e.currentTarget.selectionStart === 0) {
      if (colIndex > 0) {
        e.preventDefault();
        targetCol = colIndex - 1;
      }
    }

    if (targetRow !== rowIndex || targetCol !== colIndex) {
      const nextInputKey = `${targetRow}_${targetCol}`;
      const nextInput = inputsRef.current.get(nextInputKey);
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    }
  };

  // Guardado masivo
  const handleSave = () => {
    if (dirtyKeys.size === 0) return;

    const gradesPayload: Array<{
      enrollmentId: string;
      competenceId: string;
      criterionId: string;
      numericScore: number;
    }> = [];

    enrollments.forEach((enrollment) => {
      competences.forEach((comp) => {
        criteria.forEach((crit) => {
          const key = `${enrollment.id}_${comp.id}_${crit.id}`;
          const val = scores[key];
          if (val !== undefined && val !== null) {
            gradesPayload.push({
              enrollmentId: enrollment.id,
              competenceId: comp.id,
              criterionId: crit.id,
              numericScore: val,
            });
          }
        });
      });
    });

    saveMatrixMutation.mutate(
      {
        courseAssignmentId,
        periodNumber,
        grades: gradesPayload,
      },
      {
        onSuccess: () => {
          setDirtyKeys(new Set());
        },
      },
    );
  };

  // Descartar cambios locales
  const handleDiscard = () => {
    if (!data) return;
    const initialScores: Record<string, number | null> = {};
    data.detailedGrades.forEach((g) => {
      const key = `${g.enrollmentId}_${g.competenceId}_${g.criterionId}`;
      initialScores[key] = g.numericScore;
    });
    setScores(initialScores);
    setDirtyKeys(new Set());
  };

  // Exportar matriz a Excel oficial
  const handleExportExcel = () => {
    if (!assignment || calculatedRows.length === 0) return;

    const headersRow1 = ['N°', 'DNI', 'Código SIAGIE', 'Estudiante', 'Prom. Periodo', 'Nivel SIAGIE'];
    competences.forEach((comp) => {
      criteria.forEach((crit) => {
        headersRow1.push(`${comp.name} - ${crit.name}`);
      });
      headersRow1.push(`${comp.name} - PROMEDIO`);
    });

    const rowsData = calculatedRows.map((r) => {
      const siagie = r.periodAverage !== null ? getSiagieConversion(r.periodAverage) : null;
      const row: (string | number)[] = [
        r.orderIndex,
        r.documentId,
        r.studentCode || '',
        r.fullName,
        r.periodAverage ?? '',
        siagie?.letter ?? '',
      ];

      competences.forEach((comp) => {
        criteria.forEach((crit) => {
          const key = `${r.enrollmentId}_${comp.id}_${crit.id}`;
          const val = scores[key];
          row.push(val !== undefined && val !== null ? val : '');
        });
        const compAvg = r.competenceAverages[comp.id];
        row.push(compAvg !== null && compAvg !== undefined ? compAvg : '');
      });

      return row;
    });

    const worksheet = XLSX.utils.aoa_to_sheet([headersRow1, ...rowsData]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Bimestre_${periodNumber}`);

    const fileName = `Registro_Notas_${assignment.area.name.replace(/\s+/g, '_')}_${assignment.classroom.grade}${assignment.classroom.section}_Bim${periodNumber}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-8 text-center bg-card border border-destructive/20 rounded-xl space-y-3">
        <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
        <h3 className="text-base font-bold text-foreground">No se pudo cargar la matriz de calificaciones</h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Ocurrió un error al obtener las competencias o la nómina de estudiantes.
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs">
          Reintentar
        </Button>
      </div>
    );
  }

  if (competences.length === 0) {
    return (
      <div className="p-8 text-center bg-card border border-border rounded-xl space-y-3">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
        <h3 className="text-base font-bold text-foreground">Área Curricular sin Competencias</h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          El curso "{assignment?.area?.name}" aún no tiene competencias oficiales asociadas. Comunícate con la dirección académica.
        </p>
      </div>
    );
  }

  const hasUnsavedChanges = dirtyKeys.size > 0;

  return (
    <div className="space-y-4">
      {/* Barra de Acciones y KPIs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-card border border-border shadow-sm">
        {/* Indicadores Resumen */}
        <div className="flex items-center gap-4 text-xs flex-wrap">
          <div className="flex items-center gap-1.5 text-foreground font-semibold">
            <Users className="w-4 h-4 text-primary" />
            <span>{summaryStats.totalStudents} Alumnos</span>
          </div>

          <div className="flex items-center gap-1.5 text-foreground font-semibold">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span>Promedio: <strong className="font-mono text-sm">{summaryStats.classroomAverage.toFixed(1)}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
              {summaryStats.passingCount} Aprobados ({summaryStats.passingRate}%)
            </Badge>
            <Badge variant="outline" className="text-[11px] font-bold text-rose-600 dark:text-rose-400 border-rose-500/30">
              {summaryStats.failingCount} Desaprobados
            </Badge>
          </div>

          {hasUnsavedChanges && (
            <Badge variant="outline" className="text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/40 animate-pulse">
              ● {dirtyKeys.size} cambios sin guardar
            </Badge>
          )}
        </div>

        {/* Botonera de Control */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {hasUnsavedChanges && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDiscard}
              disabled={saveMatrixMutation.isPending}
              className="text-xs font-semibold gap-1.5 h-8"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Descartar</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="text-xs font-semibold gap-1.5 h-8 border-border"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel</span>
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={isLocked || !hasUnsavedChanges || saveMatrixMutation.isPending}
            className="text-xs font-bold gap-2 h-8 shadow-sm"
          >
            {saveMatrixMutation.isPending ? (
              <span className="animate-spin w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full" />
            ) : isLocked ? (
              <Lock className="w-3.5 h-3.5" />
            ) : hasUnsavedChanges ? (
              <Save className="w-3.5 h-3.5" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
            )}
            <span>
              {saveMatrixMutation.isPending
                ? 'Guardando...'
                : isLocked
                ? 'Periodo Cerrado'
                : hasUnsavedChanges
                ? 'Guardar Cambios'
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
              <strong>Periodo Cerrado por Dirección:</strong> Las actas y notas del {periodNumber}° Bimestre han sido auditadas y bloqueadas. El registro se encuentra en modo solo lectura.
            </span>
          </div>
          <Badge variant="destructive" className="text-[10px] uppercase font-bold shrink-0">
            Solo Lectura
          </Badge>
        </div>
      )}

      {/* Matriz de Calificaciones Estilo Excel / Cubicol */}
      <div className="relative rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[680px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs select-none">
            {/* Cabecera Agrupada de Doble Fila */}
            <thead className="sticky top-0 z-30 bg-muted/95 backdrop-blur-sm shadow-sm border-b border-border">
              {/* Fila 1: Competencias Generales */}
              <tr>
                <th
                  rowSpan={2}
                  className="sticky left-0 z-40 bg-muted border-r border-border px-1.5 py-2 text-center font-bold text-foreground w-[44px] min-w-[44px] max-w-[44px]"
                >
                  N°
                </th>
                <th
                  rowSpan={2}
                  className="sticky left-[44px] z-40 bg-muted border-r border-border px-3 py-2 font-bold text-foreground w-[240px] min-w-[240px] max-w-[240px]"
                >
                  Estudiante SIAGIE
                </th>
                <th
                  rowSpan={2}
                  className="sticky left-[284px] z-40 bg-secondary border-r-2 border-border shadow-[4px_0_8px_-2px_rgba(0,0,0,0.12)] px-2 py-2 text-center font-extrabold text-foreground w-[76px] min-w-[76px] max-w-[76px]"
                >
                  <div className="flex flex-col items-center">
                    <span>Prom.</span>
                    <span className="text-[10px] text-muted-foreground font-normal">Curso</span>
                  </div>
                </th>

                {competences.map((comp, compIdx) => {
                  const colSpanCount = criteria.length + 1; // criterios + promedio de competencia
                  return (
                    <th
                      key={comp.id}
                      colSpan={colSpanCount}
                      className={`text-center font-bold text-xs py-2 px-3 border-r border-border ${
                        compIdx % 2 === 0
                          ? 'bg-amber-500/15 text-amber-950 dark:text-amber-300 border-amber-500/30'
                          : 'bg-primary/10 text-primary border-primary/20'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5 truncate max-w-[420px] mx-auto">
                        <Award className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{comp.name}</span>
                      </div>
                    </th>
                  );
                })}
              </tr>

              {/* Fila 2: Sub-columnas de Criterios y Promedio */}
              <tr className="border-t border-border/60">
                {competences.map((comp) => (
                  <React.Fragment key={comp.id}>
                    {criteria.map((crit) => (
                      <th
                        key={crit.id}
                        className="py-1.5 px-2 text-center font-bold text-[11px] text-muted-foreground border-r border-border/40 min-w-[58px] bg-muted/40"
                        title={`${crit.name} (Peso: ${crit.weight})`}
                      >
                        <div className="truncate">{crit.shortName}</div>
                      </th>
                    ))}
                    <th
                      className="py-1.5 px-2 text-center font-extrabold text-[11px] text-foreground border-r border-border min-w-[55px] bg-muted/80"
                      title={`Promedio de la competencia: ${comp.name}`}
                    >
                      Prom.
                    </th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>

            {/* Cuerpo de la Matriz (Estudiantes y Celdas de Notas) */}
            <tbody className="divide-y divide-border">
              {calculatedRows.map((row, rowIndex) => {
                const siagie =
                  row.periodAverage !== null ? getSiagieConversion(row.periodAverage) : null;
                const isEven = rowIndex % 2 === 0;
                const rowBg = isEven ? 'bg-card' : 'bg-muted/15';

                let currentColumnIndex = 0;

                return (
                  <tr
                    key={row.enrollmentId}
                    className={`${rowBg} hover:bg-muted/30 transition-colors group`}
                  >
                    {/* N° Orden con fondo 100% opaco */}
                    <td
                      style={{ backgroundColor: isEven ? 'hsl(var(--card))' : 'hsl(var(--muted))' }}
                      className="sticky left-0 z-20 w-[44px] min-w-[44px] max-w-[44px] border-r border-border px-1.5 py-1.5 text-center font-bold text-muted-foreground"
                    >
                      {row.orderIndex}
                    </td>

                    {/* Nombre del Estudiante con fondo 100% opaco y ancho exacto */}
                    <td
                      style={{ backgroundColor: isEven ? 'hsl(var(--card))' : 'hsl(var(--muted))' }}
                      className="sticky left-[44px] z-20 w-[240px] min-w-[240px] max-w-[240px] border-r border-border px-3 py-1.5"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-foreground truncate text-xs" title={row.fullName}>
                          {row.fullName}
                        </span>
                        {onOpenReportCard && (
                          <button
                            type="button"
                            onClick={() => onOpenReportCard(row.enrollmentId)}
                            className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary shrink-0 opacity-50 group-hover:opacity-100 hover:!opacity-100 transition-opacity"
                            title="Ver e Imprimir Libreta PDF"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground truncate">
                        <span>DNI: {row.documentId}</span>
                        {row.studentCode && <span> • SIAGIE: {row.studentCode}</span>}
                      </div>
                    </td>

                    {/* Promedio General del Curso con fondo 100% opaco y sombra separadora */}
                    <td
                      style={{ backgroundColor: 'hsl(var(--secondary))' }}
                      className="sticky left-[284px] z-20 w-[76px] min-w-[76px] max-w-[76px] border-r-2 border-border shadow-[4px_0_8px_-2px_rgba(0,0,0,0.12)] px-2 py-1 text-center font-bold"
                    >
                      {row.periodAverage !== null ? (
                        <div className="flex flex-col items-center">
                          <span
                            className={`font-mono font-extrabold text-sm ${
                              row.periodAverage >= 11
                                ? 'text-primary font-bold'
                                : 'text-rose-600 dark:text-rose-400 font-extrabold'
                            }`}
                          >
                            {row.periodAverage < 10
                              ? `0${row.periodAverage.toFixed(1)}`
                              : row.periodAverage.toFixed(1)}
                          </span>
                          {siagie && (
                            <Badge
                              variant={siagie.variant}
                              className={`text-[9px] px-1 py-0 h-3.5 border ${siagie.badgeClass}`}
                            >
                              {siagie.letter}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground font-mono text-xs">—</span>
                      )}
                    </td>

                    {/* Celdas de Calificación por Competencia */}
                    {competences.map((comp) => {
                      const compAverage = row.competenceAverages[comp.id];

                      return (
                        <React.Fragment key={comp.id}>
                          {criteria.map((crit) => {
                            const colIdx = currentColumnIndex++;
                            const key = `${row.enrollmentId}_${comp.id}_${crit.id}`;
                            const scoreValue = scores[key];
                            const isDirty = dirtyKeys.has(key);

                            const inputRefKey = `${rowIndex}_${colIdx}`;

                            return (
                              <td
                                key={crit.id}
                                className={`p-1 border-r border-border/40 text-center ${
                                  isDirty ? 'bg-amber-500/10' : ''
                                }`}
                              >
                                <input
                                  ref={(el) => {
                                    if (el) inputsRef.current.set(inputRefKey, el);
                                    else inputsRef.current.delete(inputRefKey);
                                  }}
                                  type="text"
                                  inputMode="decimal"
                                  disabled={isLocked || saveMatrixMutation.isPending}
                                  value={scoreValue !== undefined && scoreValue !== null ? scoreValue : ''}
                                  placeholder="—"
                                  onChange={(e) =>
                                    handleScoreChange(
                                      row.enrollmentId,
                                      comp.id,
                                      crit.id,
                                      e.target.value,
                                    )
                                  }
                                  onKeyDown={(e) => handleKeyDown(e, rowIndex, colIdx)}
                                  className={`w-12 h-7 text-center font-mono font-bold text-xs rounded border bg-background transition-all focus:outline-none focus:ring-2 focus:ring-primary ${
                                    scoreValue !== null && scoreValue !== undefined && scoreValue < 11
                                      ? 'text-rose-600 dark:text-rose-400 border-rose-400/50 bg-rose-500/5'
                                      : scoreValue !== null && scoreValue !== undefined
                                      ? 'text-foreground border-input'
                                      : 'text-muted-foreground border-input/60'
                                  }`}
                                />
                              </td>
                            );
                          })}

                          {/* Promedio de esta Competencia */}
                          <td className="p-1.5 border-r border-border text-center font-extrabold bg-muted/40 min-w-[55px]">
                            {compAverage !== null && compAverage !== undefined ? (
                              <span
                                className={`font-mono text-xs ${
                                  compAverage >= 11
                                    ? 'text-primary'
                                    : 'text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                {compAverage < 10
                                  ? `0${compAverage.toFixed(1)}`
                                  : compAverage.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground font-mono text-xs">—</span>
                            )}
                          </td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
