import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Printer,
  FileSpreadsheet,
  School as SchoolIcon,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useReportCard } from '../api/useGrades';
import { getSiagieConversion } from '../types';

interface StudentOption {
  id: string; // enrollmentId
  name: string;
}

interface ReportCardModalProps {
  enrollmentId: string | null;
  isOpen: boolean;
  onClose: () => void;
  classroomStudents?: StudentOption[];
}

const LEVEL_LABELS: Record<string, string> = {
  INITIAL: 'Educación Inicial',
  PRIMARY: 'Educación Primaria',
  SECONDARY: 'Educación Secundaria',
};

export const ReportCardModal: React.FC<ReportCardModalProps> = ({
  enrollmentId,
  isOpen,
  onClose,
  classroomStudents = [],
}) => {
  const [activeEnrollmentId, setActiveEnrollmentId] = useState<string | null>(enrollmentId);
  // Por defecto activamos la vista oficial MINEDU con conclusiones descriptivas por competencia
  const [showConclusionsFormat, setShowConclusionsFormat] = useState(true);

  useEffect(() => {
    if (enrollmentId) {
      setActiveEnrollmentId(enrollmentId);
    }
  }, [enrollmentId]);

  const { data: reportCard, isLoading, isError } = useReportCard(activeEnrollmentId || '');

  if (!isOpen || !activeEnrollmentId || typeof document === 'undefined') return null;

  const handlePrint = () => {
    const originalTitle = document.title;
    const studentName = (reportCard?.student?.fullName || 'Estudiante')
      .replace(/[\\/:*?"<>|]/g, '')
      .trim();
    const year = reportCard?.academicYear || new Date().getFullYear();

    const exportTitle = `${studentName} - Libreta Anual - ${year}`;
    document.title = exportTitle;

    const restoreTitle = () => {
      document.title = originalTitle;
      window.removeEventListener('afterprint', restoreTitle);
    };

    window.addEventListener('afterprint', restoreTitle);
    window.print();

    // Fallback de seguridad para restaurar el título
    setTimeout(() => {
      document.title = originalTitle;
    }, 1500);
  };

  const currentIndex = classroomStudents.findIndex((s) => s.id === activeEnrollmentId);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < classroomStudents.length - 1;

  const handlePreviousStudent = () => {
    if (hasPrevious) {
      setActiveEnrollmentId(classroomStudents[currentIndex - 1].id);
    }
  };

  const handleNextStudent = () => {
    if (hasNext) {
      setActiveEnrollmentId(classroomStudents[currentIndex + 1].id);
    }
  };

  const tutorTeacherName =
    reportCard?.courses[0]?.teacherName || 'Docente Tutor de Aula';

  return createPortal(
    <div className="report-card-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Estilos dedicados para impresión limpia A4 oficial de MINEDU sin páginas en blanco */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 6mm 8mm 6mm;
          }
          /* Ocultar la app completa en el fondo (#root y otros portales) */
          body > *:not(.report-card-modal-backdrop) {
            display: none !important;
          }
          #root {
            display: none !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            overflow: visible !important;
            height: auto !important;
            min-height: auto !important;
          }
          .report-card-modal-backdrop {
            position: static !important;
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
            overflow: visible !important;
            height: auto !important;
            min-height: auto !important;
            max-height: none !important;
            width: 100% !important;
            max-width: none !important;
            border: none !important;
            box-shadow: none !important;
            backdrop-filter: none !important;
            transform: none !important;
          }
          .report-card-modal-dialog {
            position: static !important;
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
            overflow: visible !important;
            height: auto !important;
            min-height: auto !important;
            max-height: none !important;
            width: 100% !important;
            max-width: none !important;
            border: none !important;
            box-shadow: none !important;
            transform: none !important;
          }
          #official-report-card-print {
            position: static !important;
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #official-report-card-print * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-avoid-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          th, td {
            border: 1px solid #111111 !important;
          }
        }
      `}</style>

      <div className="report-card-modal-dialog relative w-full max-w-5xl rounded-2xl border border-border bg-card shadow-2xl overflow-y-auto max-h-[95vh] print:m-0 print:p-0 print:border-none print:shadow-none print:max-h-none print:w-full print:bg-white print:text-black">
        {/* Barra Superior de Control (Oculta al Imprimir) */}
        <div className="sticky top-0 z-20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 border-b border-border bg-card/95 backdrop-blur-sm print:hidden">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            <div>
              <h2 className="text-base font-bold text-foreground">
                Informe de Progreso de las Competencias del Estudiante (MINEDU)
              </h2>
              <p className="text-xs text-muted-foreground">
                Boleta oficial con niveles de logro (AD, A, B, C) y conclusiones descriptivas por competencia
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
            {/* Toggle Formato con Conclusiones Descriptivas */}
            <Button
              variant={showConclusionsFormat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowConclusionsFormat((prev) => !prev)}
              className="gap-1.5 text-xs font-semibold h-8"
              title="Alternar entre formato oficial con conclusiones y vista ejecutiva"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{showConclusionsFormat ? 'Con Conclusiones' : 'Solo Notas'}</span>
            </Button>

            {/* Selector de alumno dentro del aula */}
            {classroomStudents.length > 1 && (
              <div className="flex items-center gap-1 bg-background border border-input rounded-md px-1.5 h-8">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePreviousStudent}
                  disabled={!hasPrevious}
                  className="h-6 w-6 p-0"
                  title="Alumno anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <select
                  value={activeEnrollmentId}
                  onChange={(e) => setActiveEnrollmentId(e.target.value)}
                  className="text-xs font-semibold bg-transparent border-none focus:outline-none max-w-[160px] truncate cursor-pointer text-foreground"
                >
                  {classroomStudents.map((s, idx) => (
                    <option key={s.id} value={s.id} className="bg-popover text-popover-foreground">
                      {idx + 1}. {s.name}
                    </option>
                  ))}
                </select>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNextStudent}
                  disabled={!hasNext}
                  className="h-6 w-6 p-0"
                  title="Alumno siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}

            <Button
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 text-xs font-bold h-8 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / Guardar PDF</span>
            </Button>

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contenido Imprimible de la Libreta */}
        <div id="official-report-card-print" className="p-5 sm:p-7 space-y-5 print:p-2 print:space-y-3">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-28 w-full rounded-xl" />
              <Skeleton className="h-64 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          ) : isError || !reportCard ? (
            <div className="p-12 text-center text-muted-foreground space-y-2">
              <AlertTriangle className="w-10 h-10 text-destructive mx-auto" />
              <h3 className="text-base font-bold text-foreground">
                No se pudo cargar la información de la libreta
              </h3>
              <p className="text-xs">Verifica la conexión o contacta al administrador.</p>
            </div>
          ) : (
            <div className="space-y-4 text-foreground print:text-black">
              {/* Título Principal Oficial MINEDU */}
              <div className="text-center space-y-0.5 border-b border-border pb-2 print:border-black">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground print:text-black font-mono">
                  <span>SISTEMA DE GESTIÓN EDUCATIVA</span>
                  <span>Página 1 de 2</span>
                </div>
                <h1 className="text-sm sm:text-base font-black tracking-wide uppercase text-foreground print:text-black">
                  INFORME DE PROGRESO DE LAS COMPETENCIAS DEL ESTUDIANTE - {reportCard.academicYear}
                </h1>
              </div>

              {/* Membrete Oficial: Escudo del Perú + Ficha de Datos + Logo Institucional */}
              <div className="flex items-center justify-between gap-3 text-xs">
                {/* Escudo Nacional Oficial de la República del Perú */}
                <div className="flex flex-col items-center justify-center text-center w-28 shrink-0">
                  <div className="w-14 h-14 flex items-center justify-center">
                    <svg viewBox="0 0 100 100" className="w-14 h-14 text-rose-600">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="#b91c1c" strokeWidth="3" />
                      <path
                        d="M50 15 L78 35 L78 68 C78 78 50 92 50 92 C50 92 22 78 22 68 L22 35 Z"
                        fill="#b91c1c"
                        fillOpacity="0.1"
                        stroke="#b91c1c"
                        strokeWidth="2.5"
                      />
                      <path d="M50 15 L50 92" stroke="#b91c1c" strokeWidth="1.5" strokeDasharray="2,2" />
                      <text x="50" y="48" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#b91c1c">
                        PERÚ
                      </text>
                      <text x="50" y="62" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#b91c1c">
                        MINEDU
                      </text>
                    </svg>
                  </div>
                  <span className="text-[9px] font-black uppercase text-foreground print:text-black leading-tight tracking-wider mt-1">
                    REPÚBLICA DEL PERÚ
                  </span>
                  <span className="text-[8px] font-bold text-muted-foreground print:text-black">
                    MINISTERIO DE EDUCACIÓN
                  </span>
                </div>

                {/* Tabla Central con Datos Oficiales del MINEDU */}
                <div className="flex-1 rounded-lg border border-border print:border-black overflow-hidden text-[11px] print:text-[10px]">
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr className="border-b border-border print:border-black">
                        <td className="p-1.5 font-bold bg-muted/40 print:bg-gray-100 border-r border-border print:border-black w-24">
                          DRE:
                        </td>
                        <td className="p-1.5 border-r border-border print:border-black">
                          DRE LIMA METROPOLITANA
                        </td>
                        <td className="p-1.5 font-bold bg-muted/40 print:bg-gray-100 border-r border-border print:border-black w-20">
                          UGEL:
                        </td>
                        <td className="p-1.5">UGEL 03</td>
                      </tr>
                      <tr className="border-b border-border print:border-black">
                        <td className="p-1.5 font-bold bg-muted/40 print:bg-gray-100 border-r border-border print:border-black">
                          Nivel:
                        </td>
                        <td className="p-1.5 border-r border-border print:border-black">
                          {LEVEL_LABELS[reportCard.classroom.educationLevel] || reportCard.classroom.educationLevel}
                        </td>
                        <td className="p-1.5 font-bold bg-muted/40 print:bg-gray-100 border-r border-border print:border-black">
                          Cód. Modular:
                        </td>
                        <td className="p-1.5 font-mono font-bold">
                          {reportCard.school.modularCode || '—'}
                        </td>
                      </tr>
                      <tr className="border-b border-border print:border-black">
                        <td className="p-1.5 font-bold bg-muted/40 print:bg-gray-100 border-r border-border print:border-black">
                          Institución educativa:
                        </td>
                        <td colSpan={3} className="p-1.5 font-bold uppercase">
                          {reportCard.school.name}
                        </td>
                      </tr>
                      <tr className="border-b border-border print:border-black">
                        <td className="p-1.5 font-bold bg-muted/40 print:bg-gray-100 border-r border-border print:border-black">
                          Grado:
                        </td>
                        <td className="p-1.5 border-r border-border print:border-black uppercase font-bold">
                          {reportCard.classroom.grade}° GRADO
                        </td>
                        <td className="p-1.5 font-bold bg-muted/40 print:bg-gray-100 border-r border-border print:border-black">
                          Sección:
                        </td>
                        <td className="p-1.5 uppercase font-bold">"{reportCard.classroom.section}"</td>
                      </tr>
                      <tr className="border-b border-border print:border-black">
                        <td className="p-1.5 font-bold bg-muted/40 print:bg-gray-100 border-r border-border print:border-black">
                          Estudiante:
                        </td>
                        <td colSpan={3} className="p-1.5 font-bold uppercase text-xs">
                          {reportCard.student.fullName}
                        </td>
                      </tr>
                      <tr className="border-b border-border print:border-black">
                        <td className="p-1.5 font-bold bg-muted/40 print:bg-gray-100 border-r border-border print:border-black">
                          Cód. estudiante:
                        </td>
                        <td className="p-1.5 font-mono border-r border-border print:border-black">
                          {reportCard.student.studentCode || '—'}
                        </td>
                        <td className="p-1.5 font-bold bg-muted/40 print:bg-gray-100 border-r border-border print:border-black">
                          DNI:
                        </td>
                        <td className="p-1.5 font-mono font-bold">{reportCard.student.documentId}</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 font-bold bg-muted/40 print:bg-gray-100 border-r border-border print:border-black">
                          Docente o tutor:
                        </td>
                        <td colSpan={3} className="p-1.5 font-medium">
                          {tutorTeacherName}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Logo Institucional del Colegio */}
                <div className="w-24 h-24 rounded-xl border border-border flex flex-col items-center justify-center p-1 overflow-hidden shrink-0 bg-background print:border-black">
                  {reportCard.school.logoUrl ? (
                    <img
                      src={reportCard.school.logoUrl}
                      alt="Logo Institucional"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <SchoolIcon className="w-10 h-10 text-primary print:text-black" />
                  )}
                  <span className="text-[8px] font-black uppercase text-center truncate max-w-full print:text-black mt-0.5">
                    {reportCard.school.name.substring(0, 14)}
                  </span>
                </div>
              </div>

              {/* TABLA OFICIAL MINEDU: Competencias + Nivel de Logro (NL) + Conclusión Descriptiva */}
              <div className="rounded-xl border border-border overflow-hidden print:border-black">
                <table className="w-full text-left border-collapse text-xs print:text-[9px]">
                  <thead>
                    {/* Fila 1 de Encabezado */}
                    <tr className="bg-muted border-b border-border text-center font-bold print:bg-gray-100 print:border-black">
                      <th
                        rowSpan={2}
                        className="p-1.5 text-left font-bold border-r border-border min-w-[130px] w-36 print:border-black"
                      >
                        Área curricular
                      </th>
                      <th
                        rowSpan={2}
                        className="p-1.5 text-left font-bold border-r border-border min-w-[170px] print:border-black"
                      >
                        Competencias
                      </th>

                      {/* 1° Bimestre */}
                      <th colSpan={showConclusionsFormat ? 2 : 1} className="p-1 border-r border-border print:border-black">
                        PRIMER BIMESTRE
                      </th>

                      {/* 2° Bimestre */}
                      <th colSpan={showConclusionsFormat ? 2 : 1} className="p-1 border-r border-border print:border-black">
                        SEGUNDO BIMESTRE
                      </th>

                      {/* 3° Bimestre */}
                      <th colSpan={showConclusionsFormat ? 2 : 1} className="p-1 border-r border-border print:border-black">
                        TERCER BIMESTRE
                      </th>

                      {/* 4° Bimestre */}
                      <th colSpan={showConclusionsFormat ? 2 : 1} className="p-1 border-r border-border print:border-black">
                        CUARTO BIMESTRE
                      </th>

                      {/* Logro Final */}
                      <th
                        rowSpan={2}
                        className="p-1.5 text-center font-black border-l border-border w-16 bg-primary/10 text-primary print:border-black print:text-black"
                      >
                        NL Final
                      </th>
                    </tr>

                    {/* Fila 2 de Sub-encabezados */}
                    <tr className="bg-muted/70 border-b border-border text-center font-bold print:bg-gray-50 print:border-black text-[10px] print:text-[8px]">
                      {/* 1° Bimestre */}
                      <th className="p-1 border-r border-border w-8 print:border-black">NL</th>
                      {showConclusionsFormat && (
                        <th className="p-1 border-r border-border min-w-[110px] print:border-black">
                          Conclusión descriptiva
                        </th>
                      )}

                      {/* 2° Bimestre */}
                      <th className="p-1 border-r border-border w-8 print:border-black">NL</th>
                      {showConclusionsFormat && (
                        <th className="p-1 border-r border-border min-w-[110px] print:border-black">
                          Conclusión descriptiva
                        </th>
                      )}

                      {/* 3° Bimestre */}
                      <th className="p-1 border-r border-border w-8 print:border-black">NL</th>
                      {showConclusionsFormat && (
                        <th className="p-1 border-r border-border min-w-[110px] print:border-black">
                          Conclusión descriptiva
                        </th>
                      )}

                      {/* 4° Bimestre */}
                      <th className="p-1 border-r border-border w-8 print:border-black">NL</th>
                      {showConclusionsFormat && (
                        <th className="p-1 border-r border-border min-w-[110px] print:border-black">
                          Conclusión descriptiva
                        </th>
                      )}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-border print:divide-black">
                    {reportCard.courses.map((course) => {
                      // Obtenemos competencias del curso
                      const compMap = new Map<string, string>();
                      course.periods.forEach((p) => {
                        (p.competences || []).forEach((c) => {
                          if (!compMap.has(c.competenceId)) {
                            compMap.set(c.competenceId, c.competenceName);
                          }
                        });
                      });
                      const courseCompetences = Array.from(compMap.entries()).map(([id, name]) => ({
                        id,
                        name,
                      }));

                      const rowSpanTotal = Math.max(1, courseCompetences.length);

                      return (
                        <React.Fragment key={course.assignmentId}>
                          {courseCompetences.map((comp, compIdx) => {
                            // Datos de cada periodo para esta competencia
                            const periodData = [1, 2, 3, 4].map((pNum) => {
                              const p = course.periods.find((x) => x.periodNumber === pNum);
                              const cData = p?.competences?.find((x) => x.competenceId === comp.id);
                              return {
                                score: cData?.score ?? null,
                                letter: cData?.siagie?.letter ?? null,
                                conclusion: cData?.conclusion ?? null,
                              };
                            });

                            // Cálculo del promedio anual de la competencia
                            const validScores = periodData
                              .map((d) => d.score)
                              .filter((s): s is number => s !== null);
                            const compAnnualScore =
                              validScores.length > 0
                                ? Math.round(
                                    (validScores.reduce((a, b) => a + b, 0) / validScores.length) *
                                      10,
                                  ) / 10
                                : null;
                            const compAnnualSiagie =
                              compAnnualScore !== null ? getSiagieConversion(compAnnualScore) : null;

                            return (
                              <tr
                                key={comp.id}
                                className={
                                  compIdx % 2 === 0
                                    ? 'bg-card print:bg-white'
                                    : 'bg-muted/10 print:bg-gray-50'
                                }
                              >
                                {/* Área Curricular con rowSpan para agrupar todas las competencias del área */}
                                {compIdx === 0 && (
                                  <td
                                    rowSpan={rowSpanTotal}
                                    className="p-2 border-r border-border font-bold uppercase text-foreground print:text-black align-top bg-muted/20 print:bg-transparent print:border-black text-[11px] print:text-[9px]"
                                  >
                                    <div className="font-extrabold">{course.areaName}</div>
                                    <div className="text-[9px] text-muted-foreground print:text-black font-normal mt-0.5">
                                      {course.teacherName}
                                    </div>
                                  </td>
                                )}

                                {/* Competencia */}
                                <td className="p-1.5 border-r border-border text-foreground print:text-black text-[11px] print:text-[9px] print:border-black leading-tight align-top">
                                  <span>{comp.name}</span>
                                </td>

                                {/* 4 Bimestres: NL + Conclusión Descriptiva */}
                                {periodData.map((pd, pIdx) => (
                                  <React.Fragment key={pIdx}>
                                    {/* Nivel de Logro (NL) */}
                                    <td className="p-1 border-r border-border text-center font-bold text-xs print:text-[9px] print:border-black align-middle font-mono">
                                      {pd.letter ? (
                                        <span
                                          className={`font-black ${
                                            pd.letter === 'AD' || pd.letter === 'A'
                                              ? 'text-foreground print:text-black'
                                              : 'text-rose-600 print:text-black'
                                          }`}
                                        >
                                          {pd.letter}
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground print:text-gray-300">—</span>
                                      )}
                                    </td>

                                    {/* Conclusión Descriptiva */}
                                    {showConclusionsFormat && (
                                      <td className="p-1 border-r border-border text-[10px] print:text-[8px] text-muted-foreground print:text-black leading-tight align-top print:border-black">
                                        {pd.conclusion ? (
                                          <span>{pd.conclusion}</span>
                                        ) : (
                                          <span className="text-muted-foreground/40 print:text-gray-300 italic">
                                            —
                                          </span>
                                        )}
                                      </td>
                                    )}
                                  </React.Fragment>
                                ))}

                                {/* NL Final Anual de la Competencia */}
                                <td className="p-1 text-center font-black border-l border-border print:border-black align-middle bg-primary/5 print:bg-transparent">
                                  {compAnnualSiagie ? (
                                    <span
                                      className={`font-black text-xs print:text-[9px] ${
                                        compAnnualSiagie.letter === 'AD' ||
                                        compAnnualSiagie.letter === 'A'
                                          ? 'text-primary print:text-black'
                                          : 'text-rose-600 print:text-black'
                                      }`}
                                    >
                                      {compAnnualSiagie.letter}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground print:text-gray-300">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Resumen Anual y Asistencia */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 print-avoid-break">
                {/* Cuadro de Promedio General y Escala Anual */}
                <div className="p-3.5 rounded-xl border border-border bg-card flex items-center justify-between print:border-black">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground print:text-black">
                      Promedio General Anual
                    </span>
                    <div className="text-2xl font-black font-mono text-primary print:text-black">
                      {reportCard.generalAnnualAverage !== null
                        ? reportCard.generalAnnualAverage.toFixed(1)
                        : '—'}
                    </div>
                  </div>

                  {reportCard.generalAnnualSiagie && (
                    <div className="text-right">
                      <span className="text-[9px] uppercase font-bold text-muted-foreground block print:text-black">
                        Logro Oficial MINEDU
                      </span>
                      <div className="inline-flex items-center gap-1.5 mt-0.5">
                        <Badge
                          variant="outline"
                          className="text-sm font-black px-2.5 py-0.5 bg-primary/10 text-primary border-primary/30 print:border-black print:text-black"
                        >
                          {reportCard.generalAnnualSiagie.letter}
                        </Badge>
                        <span className="text-xs font-bold text-foreground print:text-black">
                          {reportCard.generalAnnualSiagie.label}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Resumen de Asistencia */}
                <div className="p-3 rounded-xl border border-border bg-muted/20 text-xs space-y-1 print:border-black print:bg-transparent">
                  <div className="flex items-center justify-between border-b border-border/80 pb-1 font-bold print:border-black text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-primary print:text-black" />
                      <span>Control de Asistencia del Año Escolar</span>
                    </span>
                    <span className="font-mono text-foreground print:text-black text-[10px]">
                      Total: {reportCard.attendanceStats.totalRegisteredDays} días
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center pt-1 font-mono text-[11px]">
                    <div className="bg-card p-1 rounded border border-border print:border-black">
                      <span className="text-[9px] text-muted-foreground block font-sans print:text-black">
                        Asistencias
                      </span>
                      <strong className="text-emerald-600 print:text-black font-black">
                        {reportCard.attendanceStats.present}
                      </strong>
                    </div>

                    <div className="bg-card p-1 rounded border border-border print:border-black">
                      <span className="text-[9px] text-muted-foreground block font-sans print:text-black">
                        Tardanzas
                      </span>
                      <strong className="text-amber-600 print:text-black font-black">
                        {reportCard.attendanceStats.lateJustified +
                          reportCard.attendanceStats.lateUnjustified}
                      </strong>
                    </div>

                    <div className="bg-card p-1 rounded border border-border print:border-black">
                      <span className="text-[9px] text-muted-foreground block font-sans print:text-black">
                        Faltas
                      </span>
                      <strong className="text-rose-600 print:text-black font-black">
                        {reportCard.attendanceStats.absentJustified +
                          reportCard.attendanceStats.absentUnjustified}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Leyenda Oficial de Calificación CNEB MINEDU */}
              <div className="p-2.5 rounded-xl border border-border/80 bg-muted/30 text-[10px] space-y-1 print:border-black print:bg-transparent print-avoid-break">
                <span className="font-bold uppercase tracking-wider block text-foreground print:text-black text-[9px]">
                  Escala de Calificación del Currículo Nacional (CNEB - Perú):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-muted-foreground print:text-black leading-tight text-[9px]">
                  <div>
                    <strong className="text-foreground print:text-black">AD:</strong> Logro
                    Destacado (18 - 20)
                  </div>
                  <div>
                    <strong className="text-foreground print:text-black">A:</strong> Logro
                    Esperado (14 - 17)
                  </div>
                  <div>
                    <strong className="text-foreground print:text-black">B:</strong> En
                    Proceso (11 - 13)
                  </div>
                  <div>
                    <strong className="text-foreground print:text-black">C:</strong> En
                    Inicio (00 - 10)
                  </div>
                </div>
              </div>

              {/* Firmas Oficiales */}
              <div className="pt-6 sm:pt-8 grid grid-cols-2 gap-8 text-center text-xs print-avoid-break">
                <div>
                  <div className="border-t border-foreground w-44 sm:w-52 mx-auto pt-1 font-bold uppercase print:border-black text-[11px]">
                    Firma del Tutor(a)
                  </div>
                  <span className="text-[9px] text-muted-foreground print:text-black block">
                    {tutorTeacherName}
                  </span>
                </div>

                <div>
                  <div className="border-t border-foreground w-44 sm:w-52 mx-auto pt-1 font-bold uppercase print:border-black text-[11px]">
                    Dirección General
                  </div>
                  <span className="text-[9px] text-muted-foreground print:text-black block">
                    Firma y Sello Institucional
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
