import React, { useState, useMemo } from 'react';
import {
  X,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  Award,
  Search,
  Lock,
  Unlock,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useSiagieSummary, usePeriodLock, useTogglePeriodLock } from '../api/useGrades';
import { getSiagieConversion } from '../types';

interface SiagieConsolidatedModalProps {
  isOpen: boolean;
  onClose: () => void;
  classroomId: string;
  classroomLabel: string;
  periodNumber: number;
}

const LEVEL_LABELS: Record<string, string> = {
  INITIAL: 'Educación Inicial',
  PRIMARY: 'Educación Primaria',
  SECONDARY: 'Educación Secundaria',
};

export const SiagieConsolidatedModal: React.FC<SiagieConsolidatedModalProps> = ({
  isOpen,
  onClose,
  classroomId,
  classroomLabel,
  periodNumber,
}) => {
  const [activeTab, setActiveTab] = useState<'audit' | 'matrix'>('audit');
  const [searchStudent, setSearchStudent] = useState('');
  const [showCompetencesDetail, setShowCompetencesDetail] = useState(false);

  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const { data, isLoading, isError } = useSiagieSummary(classroomId, periodNumber, {
    enabled: isOpen && Boolean(classroomId),
  });
  const { data: periodLock } = usePeriodLock(classroomId, periodNumber, {
    enabled: isOpen && Boolean(classroomId),
  });
  const toggleLockMutation = useTogglePeriodLock();

  const handleConfirmToggleLock = () => {
    const isCurrentlyLocked = periodLock?.isLocked || false;
    toggleLockMutation.mutate(
      {
        periodNumber,
        classroomId,
        isLocked: !isCurrentlyLocked,
        reason: isCurrentlyLocked ? 'Reapertura para rectificación' : 'Cierre de actas para SIAGIE',
      },
      {
        onSettled: () => {
          setIsConfirmDialogOpen(false);
        },
      },
    );
  };

  const courses = useMemo(() => data?.courses || [], [data?.courses]);
  const matrix = data?.matrix;

  // Filtrado de estudiantes en la matriz
  const filteredStudents = useMemo(() => {
    if (!matrix?.students) return [];
    if (!searchStudent.trim()) return matrix.students;
    const q = searchStudent.toLowerCase();
    return matrix.students.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.documentId.includes(q) ||
        (s.studentCode && s.studentCode.toLowerCase().includes(q)),
    );
  }, [matrix?.students, searchStudent]);

  // Métricas de auditoría
  const auditStats = useMemo(() => {
    const totalCourses = courses.length;
    const completedCourses = courses.filter((c) => c.isComplete).length;
    const inProgressCourses = courses.filter((c) => !c.isComplete && c.percentage > 0).length;
    const pendingCourses = courses.filter((c) => c.percentage === 0).length;

    return {
      totalCourses,
      completedCourses,
      inProgressCourses,
      pendingCourses,
      overallPercentage: data?.overallPercentage || 0,
      totalStudents: data?.totalStudents || 0,
    };
  }, [courses, data]);

  if (!isOpen) return null;

  // Exportar Plantilla Oficial SIAGIE a Excel (.xlsx)
  const handleExportExcel = () => {
    if (!data || !matrix) return;

    // 1. Hoja Consolidada SIAGIE
    const sheetData: any[][] = [];

    // Membrete Institucional
    sheetData.push([`SISTEMA DE GESTIÓN EDUCATIVA - CONSOLIDADO OFICIAL SIAGIE (MINEDU)`]);
    sheetData.push([
      `INSTITUCIÓN EDUCATIVA: ${data.school?.name || 'SaaSchool'}`,
      `CÓD. MODULAR: ${data.school?.modularCode || '—'}`,
      `RUC: ${data.school?.documentId || '—'}`,
    ]);
    sheetData.push([
      `NIVEL: ${LEVEL_LABELS[data.educationLevel] || data.educationLevel}`,
      `GRADO Y SECCIÓN: ${data.grade}° "${data.section}"`,
      `PERIODO EVALUADO: ${data.periodNumber}° BIMESTRE`,
      `FECHA DE EMISIÓN: ${new Date().toLocaleDateString('es-PE')}`,
    ]);
    sheetData.push([]); // Espacio

    // Fila 1 de Encabezados (Áreas Curriculares)
    const headerRow1: string[] = ['N°', 'DNI', 'CÓDIGO SIAGIE', 'APELLIDOS Y NOMBRES'];
    // Fila 2 de Encabezados (Competencias y Promedios)
    const headerRow2: string[] = ['', '', '', ''];

    matrix.courses.forEach((c) => {
      if (showCompetencesDetail && c.competences.length > 0) {
        c.competences.forEach((comp, idx) => {
          headerRow1.push(idx === 0 ? c.name.toUpperCase() : '');
          headerRow2.push(`C${idx + 1}: ${comp.name}`);
        });
      }
      headerRow1.push(showCompetencesDetail ? '' : c.name.toUpperCase());
      headerRow2.push(showCompetencesDetail ? `PROM. ${c.name}` : `NOTA`);
    });

    headerRow1.push('PROMEDIO');
    headerRow2.push('PROMEDIO GENERAL');

    headerRow1.push('LOGRO');
    headerRow2.push('ESCALA SIAGIE');

    sheetData.push(headerRow1);
    sheetData.push(headerRow2);

    // Filas de Datos de Estudiantes
    matrix.students.forEach((st) => {
      const row: any[] = [st.orderIndex, st.documentId, st.studentCode || '—', st.fullName];

      matrix.courses.forEach((c) => {
        const gradeInfo = st.courseGrades[c.id];

        if (showCompetencesDetail && c.competences.length > 0) {
          c.competences.forEach((comp) => {
            const compGrade = gradeInfo?.competences?.[comp.id];
            row.push(compGrade?.letter || '—');
          });
        }

        row.push(gradeInfo?.letter || (gradeInfo?.periodScore !== null ? gradeInfo?.periodScore : '—'));
      });

      row.push(st.generalScore !== null ? st.generalScore.toFixed(1) : '—');
      row.push(st.generalLetter || '—');

      sheetData.push(row);
    });

    const worksheetSiagie = XLSX.utils.aoa_to_sheet(sheetData);

    // Ancho de columnas
    worksheetSiagie['!cols'] = [
      { wch: 5 },  // N°
      { wch: 12 }, // DNI
      { wch: 14 }, // Código
      { wch: 34 }, // Nombre
    ];

    // 2. Hoja de Auditoría Docente
    const auditSheetData: any[][] = [];
    auditSheetData.push([`AUDITORÍA DE AVANCE DE CALIFICACIONES - SIAGIE`]);
    auditSheetData.push([`AULA: ${data.grade}° "${data.section}" • ${data.periodNumber}° BIMESTRE`]);
    auditSheetData.push([]);
    auditSheetData.push([
      'ÁREA CURRICULAR',
      'CÓDIGO OFICIAL',
      'DOCENTE RESPONSABLE',
      'COMPETENCIAS',
      'NOTAS REGISTRADAS',
      'NOTAS ESPERADAS',
      'AVANCE (%)',
      'ESTADO',
    ]);

    courses.forEach((c) => {
      auditSheetData.push([
        c.areaName,
        c.officialCode || '—',
        c.teacherName,
        c.competenceCount,
        c.filledGradesCount,
        c.totalExpectedGrades,
        `${c.percentage}%`,
        c.isComplete ? 'COMPLETO' : c.percentage > 0 ? 'EN AVANCE' : 'PENDIENTE',
      ]);
    });

    const worksheetAudit = XLSX.utils.aoa_to_sheet(auditSheetData);
    worksheetAudit['!cols'] = [
      { wch: 28 },
      { wch: 14 },
      { wch: 30 },
      { wch: 14 },
      { wch: 18 },
      { wch: 18 },
      { wch: 14 },
      { wch: 16 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheetSiagie, 'CONSOLIDADO_SIAGIE');
    XLSX.utils.book_append_sheet(workbook, worksheetAudit, 'AUDITORIA_DOCENTES');

    const fileName = `SIAGIE_Consolidado_${data.grade}${data.section}_Bimestre${periodNumber}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl rounded-2xl border border-border bg-card shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Cabecera del Modal */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 sm:p-5 border-b border-border bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-foreground">
                  Consolidado Oficial SIAGIE (MINEDU)
                </h2>
                <Badge variant="outline" className="text-[11px] font-bold border-primary/30 text-primary bg-primary/5">
                  {classroomLabel || `Aula`} • {periodNumber}° Bimestre
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Auditoría de avance por docente, notas literales AD/A/B/C y exportación oficial para el sistema SIAGIE.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
            <Button
              size="sm"
              onClick={handleExportExcel}
              disabled={isLoading || !data}
              className="gap-2 text-xs font-bold h-8 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar Excel SIAGIE</span>
            </Button>

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de Pestañas y Controles */}
        <div className="flex items-center justify-between px-5 pt-3 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('audit')}
              className={`pb-2.5 text-xs font-bold transition-colors border-b-2 ${
                activeTab === 'audit'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Auditoría de Avance Docente ({auditStats.completedCourses}/{auditStats.totalCourses})
            </button>
            <button
              onClick={() => setActiveTab('matrix')}
              className={`pb-2.5 text-xs font-bold transition-colors border-b-2 ${
                activeTab === 'matrix'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Consolidado de Calificaciones ({matrix?.students?.length || 0} Alumnos)
            </button>
          </div>

          {activeTab === 'matrix' && (
            <div className="flex items-center gap-2 pb-2">
              <Button
                variant={showCompetencesDetail ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowCompetencesDetail((prev) => !prev)}
                className="h-7 text-[11px] font-semibold"
              >
                {showCompetencesDetail ? 'Ver por Áreas' : 'Desglosar Competencias'}
              </Button>
            </div>
          )}
        </div>

        {/* Cuerpo del Modal */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>
          ) : isError || !data ? (
            <div className="p-12 text-center text-muted-foreground space-y-2">
              <AlertTriangle className="w-10 h-10 text-destructive mx-auto" />
              <h3 className="text-base font-bold text-foreground">
                No se pudo cargar la información del aula
              </h3>
              <p className="text-xs">Verifica si el aula seleccionada tiene cursos asignados.</p>
            </div>
          ) : activeTab === 'audit' ? (
            /* TAB 1: AUDITORÍA DE LLENADO */
            <div className="space-y-5">
              {/* Panel de Cierre y Bloqueo de Bimestre (Acción de la Dirección) */}
              <div
                className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all shadow-sm ${
                  periodLock?.isLocked
                    ? 'bg-rose-500/10 border-rose-500/30'
                    : auditStats.overallPercentage === 100
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-primary/5 border-primary/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      periodLock?.isLocked
                        ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                        : auditStats.overallPercentage === 100
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                        : 'bg-primary/20 text-primary'
                    }`}
                  >
                    {periodLock?.isLocked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-foreground">
                        {periodLock?.isLocked
                          ? `Actas del ${periodNumber}° Bimestre CERRADAS y Bloqueadas`
                          : `Registro del ${periodNumber}° Bimestre ABIERTO`}
                      </h4>
                      <Badge
                        variant={periodLock?.isLocked ? 'destructive' : 'secondary'}
                        className="text-[10px] font-bold uppercase tracking-wider"
                      >
                        {periodLock?.isLocked ? 'Solo Lectura' : 'En Edición Docente'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {periodLock?.isLocked
                        ? `Cerrado el ${
                            periodLock.lockedAt
                              ? new Date(periodLock.lockedAt).toLocaleDateString('es-PE', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : ''
                          } por ${periodLock.lockedBy || 'Dirección'}. Los docentes tienen bloqueada la edición de notas.`
                        : auditStats.overallPercentage === 100
                        ? '¡Excelente! Todos los cursos han completado el 100% de notas. Puedes cerrar el periodo para fijar las calificaciones oficiales y enviarlas al SIAGIE.'
                        : `El aula tiene un ${auditStats.overallPercentage}% de avance. Puedes auditar las materias pendientes abajo antes de ejecutar el cierre definitivo.`}
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant={periodLock?.isLocked ? 'outline' : 'default'}
                  onClick={() => setIsConfirmDialogOpen(true)}
                  disabled={toggleLockMutation.isPending}
                  className={`shrink-0 gap-2 text-xs font-bold shadow-sm ${
                    periodLock?.isLocked
                      ? 'border-rose-500/30 hover:bg-rose-500/10 text-foreground'
                      : 'bg-primary hover:bg-primary/90'
                  }`}
                >
                  {periodLock?.isLocked ? (
                    <>
                      <Unlock className="w-4 h-4 text-primary" />
                      <span>Reabrir Bimestre (Permitir Rectificación)</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Cerrar y Bloquear Calificaciones</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Tarjetas de Métricas de Auditoría */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl border border-border bg-card">
                  <span className="text-[11px] font-bold text-muted-foreground block uppercase">
                    Avance Global del Aula
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black font-mono text-primary">
                      {auditStats.overallPercentage}%
                    </span>
                    <span className="text-xs text-muted-foreground">completado</span>
                  </div>
                  <div className="w-full bg-secondary h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-300"
                      style={{ width: `${auditStats.overallPercentage}%` }}
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-card">
                  <span className="text-[11px] font-bold text-muted-foreground block uppercase">
                    Cursos 100% Listos
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                      {auditStats.completedCourses}
                    </span>
                    <span className="text-xs text-muted-foreground">de {auditStats.totalCourses}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 block">
                    Listos para emitir a SIAGIE
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-card">
                  <span className="text-[11px] font-bold text-muted-foreground block uppercase">
                    Cursos en Proceso
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
                      {auditStats.inProgressCourses}
                    </span>
                    <span className="text-xs text-muted-foreground">en digitación</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 block">
                    Faltan algunas competencias
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-card">
                  <span className="text-[11px] font-bold text-muted-foreground block uppercase">
                    Total de Estudiantes
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black font-mono text-foreground">
                      {auditStats.totalStudents}
                    </span>
                    <span className="text-xs text-muted-foreground">matriculados</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 block">
                    Matrícula activa
                  </span>
                </div>
              </div>

              {/* Tabla de Cursos del Aula y Estado de Docentes */}
              <div className="rounded-xl border border-border overflow-hidden bg-card">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-muted border-b border-border font-bold">
                      <th className="p-3">Área Curricular / Asignatura</th>
                      <th className="p-3">Docente Responsable</th>
                      <th className="p-3 text-center">Competencias</th>
                      <th className="p-3 text-center">Notas Registradas</th>
                      <th className="p-3 text-center w-36">Progreso</th>
                      <th className="p-3 text-center w-28">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {courses.map((c) => (
                      <tr key={c.assignmentId} className="hover:bg-muted/10 transition-colors">
                        <td className="p-3 font-semibold text-foreground">
                          <div className="font-bold">{c.areaName}</div>
                          {c.officialCode && (
                            <div className="text-[10px] font-mono text-muted-foreground">
                              Cód: {c.officialCode}
                            </div>
                          )}
                        </td>
                        <td className="p-3 font-medium text-foreground">
                          {c.teacherName}
                        </td>
                        <td className="p-3 text-center font-mono font-bold">
                          {c.competenceCount}
                        </td>
                        <td className="p-3 text-center font-mono">
                          <span className="font-bold text-foreground">{c.filledGradesCount}</span>
                          <span className="text-muted-foreground"> / {c.totalExpectedGrades}</span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-secondary h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  c.isComplete
                                    ? 'bg-emerald-500'
                                    : c.percentage > 0
                                    ? 'bg-amber-500'
                                    : 'bg-muted'
                                }`}
                                style={{ width: `${c.percentage}%` }}
                              />
                            </div>
                            <span className="font-mono font-bold text-[11px] w-9 text-right">
                              {c.percentage}%
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          {c.isComplete ? (
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                              Completo
                            </Badge>
                          ) : c.percentage > 0 ? (
                            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px] font-bold">
                              En Avance
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground text-[10px] font-bold">
                              Pendiente
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* TAB 2: MATRIZ CONSOLIDADA DE CALIFICACIONES */
            <div className="space-y-4">
              {/* Barra de Filtro de Alumno */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[240px] max-w-sm">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchStudent}
                    onChange={(e) => setSearchStudent(e.target.value)}
                    placeholder="Buscar estudiante por nombre o DNI..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Award className="w-3.5 h-3.5 text-primary" />
                  <span>Calificaciones en escala oficial MINEDU (AD / A / B / C)</span>
                </div>
              </div>

              {/* Matriz Scrollable de Calificaciones */}
              <div className="rounded-xl border border-border overflow-x-auto bg-card">
                <table className="w-full text-left border-collapse text-xs min-w-[700px]">
                  <thead>
                    <tr className="bg-muted border-b border-border font-bold">
                      <th className="p-2 border-r border-border text-center w-10">N°</th>
                      <th className="p-2 border-r border-border w-28">DNI</th>
                      <th className="p-2 border-r border-border min-w-[180px]">Apellidos y Nombres</th>
                      {matrix?.courses.map((course) => {
                        if (showCompetencesDetail && course.competences.length > 0) {
                          return (
                            <React.Fragment key={course.id}>
                              {course.competences.map((comp, cIdx) => (
                                <th
                                  key={comp.id}
                                  className="p-1.5 border-r border-border text-center min-w-[65px] font-mono text-[10px]"
                                  title={`${course.name} - ${comp.name}`}
                                >
                                  {course.name.substring(0, 3)}. C{cIdx + 1}
                                </th>
                              ))}
                              <th className="p-1.5 border-r border-border text-center min-w-[60px] bg-secondary/50 font-bold">
                                Prom
                              </th>
                            </React.Fragment>
                          );
                        }

                        return (
                          <th
                            key={course.id}
                            className="p-2 border-r border-border text-center min-w-[80px]"
                            title={course.name}
                          >
                            <span className="truncate block max-w-[90px] mx-auto">{course.name}</span>
                          </th>
                        );
                      })}
                      <th className="p-2 text-center w-20 bg-primary/10 text-primary font-extrabold">
                        Promedio
                      </th>
                      <th className="p-2 text-center w-16 bg-primary/10 text-primary font-extrabold">
                        Logro
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredStudents.map((st, idx) => {
                      const genSiagie =
                        st.generalScore !== null ? getSiagieConversion(st.generalScore) : null;

                      return (
                        <tr
                          key={st.enrollmentId}
                          className={idx % 2 === 0 ? 'bg-card' : 'bg-muted/10'}
                        >
                          <td className="p-2 border-r border-border text-center font-bold text-muted-foreground">
                            {st.orderIndex}
                          </td>
                          <td className="p-2 border-r border-border font-mono text-[11px]">
                            {st.documentId}
                          </td>
                          <td className="p-2 border-r border-border font-semibold text-foreground truncate">
                            {st.fullName}
                          </td>

                          {matrix?.courses.map((course) => {
                            const gradeData = st.courseGrades[course.id];

                            if (showCompetencesDetail && course.competences.length > 0) {
                              return (
                                <React.Fragment key={course.id}>
                                  {course.competences.map((comp) => {
                                    const cGrade = gradeData?.competences?.[comp.id];
                                    return (
                                      <td
                                        key={comp.id}
                                        className="p-1.5 border-r border-border text-center font-mono font-bold text-xs"
                                      >
                                        {cGrade?.letter ? (
                                          <span
                                            className={
                                              cGrade.letter === 'AD' || cGrade.letter === 'A'
                                                ? 'text-foreground'
                                                : 'text-rose-600 font-extrabold'
                                            }
                                          >
                                            {cGrade.letter}
                                          </span>
                                        ) : (
                                          <span className="text-muted-foreground">—</span>
                                        )}
                                      </td>
                                    );
                                  })}

                                  {/* Promedio del Área */}
                                  <td className="p-1.5 border-r border-border text-center font-mono font-black text-xs bg-muted/20">
                                    {gradeData?.letter ? (
                                      <span
                                        className={
                                          gradeData.letter === 'AD' || gradeData.letter === 'A'
                                            ? 'text-primary font-bold'
                                            : 'text-rose-600 font-extrabold'
                                        }
                                      >
                                        {gradeData.letter}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </td>
                                </React.Fragment>
                              );
                            }

                            return (
                              <td
                                key={course.id}
                                className="p-2 border-r border-border text-center font-mono font-bold text-xs"
                              >
                                {gradeData?.letter ? (
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] px-1.5 py-0 font-black border ${
                                      gradeData.letter === 'AD'
                                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                                        : gradeData.letter === 'A'
                                        ? 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30'
                                        : gradeData.letter === 'B'
                                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
                                        : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30'
                                    }`}
                                  >
                                    {gradeData.letter}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground font-mono text-xs">—</span>
                                )}
                              </td>
                            );
                          })}

                          {/* Promedio General */}
                          <td className="p-2 border-r border-border text-center font-mono font-black text-xs bg-primary/5">
                            {st.generalScore !== null ? st.generalScore.toFixed(1) : '—'}
                          </td>

                          {/* Logro SIAGIE */}
                          <td className="p-2 text-center font-black">
                            {st.generalLetter ? (
                              <Badge
                                variant={genSiagie?.variant || 'outline'}
                                className={`text-[10px] px-1.5 py-0 border font-extrabold ${genSiagie?.badgeClass || ''}`}
                              >
                                {st.generalLetter}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Leyenda Oficial CNEB */}
              <div className="p-2.5 rounded-xl border border-border bg-muted/20 text-[10px] text-muted-foreground flex items-center justify-between flex-wrap gap-2">
                <span className="font-bold text-foreground">Escala MINEDU SIAGIE:</span>
                <span className="flex items-center gap-1.5">
                  <strong className="text-emerald-600">AD:</strong> Logro Destacado (18-20)
                </span>
                <span className="flex items-center gap-1.5">
                  <strong className="text-blue-600">A:</strong> Logro Esperado (14-17)
                </span>
                <span className="flex items-center gap-1.5">
                  <strong className="text-amber-600">B:</strong> En Proceso (11-13)
                </span>
                <span className="flex items-center gap-1.5">
                  <strong className="text-rose-600">C:</strong> En Inicio (00-10)
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Diálogo de Confirmación con Estilos Web del SaaS */}
      <ConfirmDialog
        isOpen={isConfirmDialogOpen}
        onClose={() => setIsConfirmDialogOpen(false)}
        onConfirm={handleConfirmToggleLock}
        isLoading={toggleLockMutation.isPending}
        title={
          periodLock?.isLocked
            ? `Reabrir ${periodNumber}° Bimestre`
            : `Cerrar y Bloquear ${periodNumber}° Bimestre`
        }
        description={
          periodLock?.isLocked
            ? `¿Deseas reabrir el ${periodNumber}° Bimestre para el aula ${classroomLabel || ''}?`
            : `¿Estás seguro de cerrar y bloquear las calificaciones del ${periodNumber}° Bimestre para el aula ${classroomLabel || ''}?`
        }
        confirmText={
          periodLock?.isLocked ? 'Reabrir Bimestre' : 'Cerrar y Bloquear Calificaciones'
        }
        cancelText="Volver Atrás"
        variant={periodLock?.isLocked ? 'info' : 'warning'}
        icon={
          periodLock?.isLocked ? (
            <Unlock className="w-6 h-6 text-primary" />
          ) : (
            <Lock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          )
        }
        details={
          <div className="space-y-2">
            {periodLock?.isLocked ? (
              <>
                <div className="flex items-start gap-2">
                  <span className="text-sm">🔓</span>
                  <p className="text-foreground font-semibold">
                    Se habilitará nuevamente la edición de notas y conclusiones para los docentes del aula.
                  </p>
                </div>
                <div className="flex items-start gap-2 text-muted-foreground">
                  <span className="text-sm">⚠️</span>
                  <p>
                    Recuerda volver a cerrar el periodo una vez subsanadas las calificaciones para mantener la coherencia con el SIAGIE.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-2">
                  <span className="text-sm">🔒</span>
                  <p className="text-foreground font-semibold">
                    Los docentes no podrán modificar calificaciones ni conclusiones de este bimestre (modo solo lectura).
                  </p>
                </div>
                <div className="flex items-start gap-2 text-muted-foreground">
                  <span className="text-sm">📋</span>
                  <p>
                    Las actas quedarán consolidadas y listas para la exportación oficial al sistema SIAGIE del MINEDU.
                  </p>
                </div>
                <div className="flex items-start gap-2 text-muted-foreground">
                  <span className="text-sm">🛡️</span>
                  <p>
                    Solo la Dirección del colegio podrá reabrir este periodo si se aprueba una rectificación posterior.
                  </p>
                </div>
              </>
            )}
          </div>
        }
      />
    </div>
  );
};
