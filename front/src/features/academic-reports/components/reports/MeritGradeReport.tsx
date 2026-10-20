import React from 'react';
import * as XLSX from 'xlsx';
import { MeritGradeReportData } from '../../types';
import { ReportHeader } from '../shared/ReportHeader';
import { ReportFooter } from '../shared/ReportFooter';
import { ReportActionToolbar } from '../shared/ReportActionToolbar';

interface MeritGradeReportProps {
  data: MeritGradeReportData;
}

const LEVEL_NAMES: Record<string, string> = {
  INITIAL: 'Inicial',
  PRIMARY: 'Primaria',
  SECONDARY: 'Secundaria',
};

export const MeritGradeReport: React.FC<MeritGradeReportProps> = ({ data }) => {
  const { school, educationLevel, grade, periodNumber, students, statistics } = data;

  const title = 'REPORTE DE ORDEN DE MÉRITO Y TERCIOS POR GRADO';
  const subtitle = `${periodNumber}° BIMESTRE ${new Date().getFullYear()}`;

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    const headers = [
      'Puesto',
      'Apellidos y Nombres',
      'Sexo',
      'Sección',
      'Promedio',
      'Puntaje',
      '# Asignaturas Aprobadas',
      '# Asignaturas Desaprobadas',
      'Conducta',
      'Tercio',
      'Quinto',
    ];

    const rows = students.map((s) => [
      s.rank,
      s.fullName,
      s.gender,
      s.section,
      s.average,
      s.points,
      s.approvedCoursesCount,
      s.failedCoursesCount > 0 ? s.failedCoursesCount : '-',
      s.conduct,
      s.tercio,
      s.quinto,
    ]);

    const ws = XLSX.utils.aoa_to_sheet([
      [`${school.name} - ${title}`],
      [`Nivel: ${LEVEL_NAMES[educationLevel] || educationLevel} | Grado: ${grade}° Grado | ${subtitle}`],
      [],
      headers,
      ...rows,
      [],
      ['Promedio del Grado:', statistics.gradeAverage.toFixed(2)],
      ['Nota Mayor:', statistics.maxScore.toFixed(2)],
      ['Nota Menor:', statistics.minScore.toFixed(2)],
    ]);

    XLSX.utils.book_append_sheet(wb, ws, 'Merito_Grado');
    XLSX.writeFile(wb, `0049_Merito_Grado_${educationLevel}_${grade}_B${periodNumber}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <ReportActionToolbar
        reportCode="0049"
        reportTitle={`Orden de Mérito y Tercios por Grado - ${grade}° ${LEVEL_NAMES[educationLevel]}`}
        orientation="portrait"
        onExportExcel={handleExportExcel}
      />

      <div className="bg-card border border-border p-4 sm:p-6 rounded-2xl shadow-sm max-w-4xl mx-auto print:border-none print:shadow-none print:p-0">
        <ReportHeader
          school={school}
          title={title}
          subtitle={subtitle}
          extraInfoRight="Asign. Oficiales"
        />

        <div className="flex items-center justify-between text-xs font-semibold mb-3 border-b border-border pb-2 text-foreground">
          <div><span className="text-muted-foreground font-bold">Nivel:</span> {LEVEL_NAMES[educationLevel] || educationLevel}</div>
          <div><span className="text-muted-foreground font-bold">Grado:</span> {grade}° Grado / Año (Consolidado General)</div>
        </div>

        {/* Tabla Principal de Mérito por Grado */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full border-collapse border border-foreground/50 text-[11px]">
            <thead>
              <tr className="bg-muted/50 font-bold text-foreground">
                <th rowSpan={2} className="border border-foreground/50 p-1.5 w-12 text-center">Puesto</th>
                <th rowSpan={2} className="border border-foreground/50 p-1.5 min-w-[200px] text-left">Apellidos y Nombres</th>
                <th rowSpan={2} className="border border-foreground/50 p-1.5 w-16 text-center">Sexo</th>
                <th rowSpan={2} className="border border-foreground/50 p-1.5 w-14 text-center">Sección</th>
                <th rowSpan={2} className="border border-foreground/50 p-1.5 w-16 text-center">Promedio</th>
                <th rowSpan={2} className="border border-foreground/50 p-1.5 w-14 text-center">Puntaje</th>
                <th colSpan={3} className="border border-foreground/50 p-1 text-center">#Asignaturas</th>
                <th rowSpan={2} className="border border-foreground/50 p-1.5 w-16 text-center">Conducta</th>
                <th rowSpan={2} className="border border-foreground/50 p-1.5 w-16 text-center">Tercio</th>
                <th rowSpan={2} className="border border-foreground/50 p-1.5 w-16 text-center">Quinto</th>
              </tr>
              <tr className="bg-muted/30 font-semibold text-foreground text-[10px]">
                <th className="border border-foreground/50 p-1 w-10 text-center">Aprob.</th>
                <th className="border border-foreground/50 p-1 w-10 text-center">Desap.</th>
                <th className="border border-foreground/50 p-1 w-8 text-center">SN</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={`${student.enrollmentId}-${student.rank}`} className="hover:bg-muted/30 transition-colors">
                  <td className="border border-foreground/50 p-1.5 text-center font-mono font-bold text-foreground">{student.rank}</td>
                  <td className="border border-foreground/50 p-1.5 font-medium uppercase">{student.fullName}</td>
                  <td className="border border-foreground/50 p-1.5 text-center text-muted-foreground">{student.gender}</td>
                  <td className="border border-foreground/50 p-1.5 text-center font-bold text-foreground">{student.section}</td>
                  <td className="border border-foreground/50 p-1.5 text-center font-mono font-bold text-foreground">{student.average}</td>
                  <td className="border border-foreground/50 p-1.5 text-center font-mono">{student.points}</td>
                  <td className="border border-foreground/50 p-1.5 text-center font-mono">{student.approvedCoursesCount}</td>
                  <td className={`border border-foreground/50 p-1.5 text-center font-mono ${student.failedCoursesCount > 0 ? 'text-red-600 font-bold' : ''}`}>
                    {student.failedCoursesCount > 0 ? student.failedCoursesCount : ''}
                  </td>
                  <td className="border border-foreground/50 p-1.5 text-center font-mono text-muted-foreground">
                    {student.hasNoGrades ? '1' : ''}
                  </td>
                  <td className="border border-foreground/50 p-1.5 text-center font-mono font-bold">{student.conduct}</td>
                  <td className="border border-foreground/50 p-1.5 text-center font-semibold uppercase">{student.tercio}</td>
                  <td className="border border-foreground/50 p-1.5 text-center font-semibold text-primary">{student.quinto}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Tablas Resumen Inferiores */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-xs mb-4">
          {/* Cuadro: Cantidad de Alumnos */}
          <div className="md:col-span-5">
            <table className="w-full border-collapse border border-foreground/50 text-[11px]">
              <thead>
                <tr className="bg-muted/50 font-bold">
                  <th colSpan={2} className="border border-foreground/50 p-1.5 text-center">Cantidad de Alumnos</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-foreground/50 p-1.5">Invictos:</td>
                  <td className="border border-foreground/50 p-1.5 text-center font-mono font-bold w-16">{statistics.studentCounts.invictos}</td>
                </tr>
                <tr>
                  <td className="border border-foreground/50 p-1.5">Con asignaturas desaprobadas:</td>
                  <td className="border border-foreground/50 p-1.5 text-center font-mono font-bold w-16 text-red-600">{statistics.studentCounts.withFailed}</td>
                </tr>
                <tr>
                  <td className="border border-foreground/50 p-1.5">Con SN:</td>
                  <td className="border border-foreground/50 p-1.5 text-center font-mono w-16">{statistics.studentCounts.withoutGrades}</td>
                </tr>
                <tr>
                  <td className="border border-foreground/50 p-1.5">Con notas en blanco:</td>
                  <td className="border border-foreground/50 p-1.5 text-center font-mono w-16">{statistics.studentCounts.blankGrades}</td>
                </tr>
                <tr>
                  <td className="border border-foreground/50 p-1.5">Retirados:</td>
                  <td className="border border-foreground/50 p-1.5 text-center font-mono w-16">{statistics.studentCounts.withdrawn}</td>
                </tr>
                <tr className="bg-muted/30 font-bold">
                  <td className="border border-foreground/50 p-1.5 text-right uppercase">Total de Alumnos:</td>
                  <td className="border border-foreground/50 p-1.5 text-center font-mono">{statistics.studentCounts.total}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Cuadro: Estadísticas de Tercios */}
          <div className="md:col-span-7">
            <table className="w-full border-collapse border border-foreground/50 text-[11px]">
              <thead>
                <tr className="bg-muted/50 font-bold">
                  <th rowSpan={2} className="border border-foreground/50 p-1.5 text-left">Estadísticas Tercios</th>
                  <th rowSpan={2} className="border border-foreground/50 p-1.5 text-center w-12">Total</th>
                  <th rowSpan={2} className="border border-foreground/50 p-1.5 text-center w-14">Porc.(%)</th>
                  <th colSpan={2} className="border border-foreground/50 p-1 text-center">Rango Promedio</th>
                  <th rowSpan={2} className="border border-foreground/50 p-1.5 text-center w-14">Prom.</th>
                </tr>
                <tr className="bg-muted/30 font-semibold text-[10px]">
                  <th className="border border-foreground/50 p-1 w-14 text-center">Inicial</th>
                  <th className="border border-foreground/50 p-1 w-14 text-center">Final</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-foreground/50 p-1.5 font-medium">Tercio Superior:</td>
                  <td className="border border-foreground/50 p-1.5 text-center font-mono font-bold">{statistics.tercios.superior.total}</td>
                  <td className="border border-foreground/50 p-1.5 text-center font-mono">{statistics.tercios.superior.percent}%</td>
                  <td className="border border-foreground/50 p-1.5 text-center font-mono">{statistics.tercios.superior.initialScore.toFixed(2)}</td>
                  <td className="border border-foreground/50 p-1.5 text-center font-mono">{statistics.tercios.superior.finalScore.toFixed(2)}</td>
                  <td className="border border-foreground/50 p-1.5 text-center font-mono font-bold">{statistics.tercios.superior.average.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="border border-foreground/50 p-1.5 font-medium">Tercio Medio:</td>
                  <td className="border border-foreground/50 p-1.5 text-center font-mono font-bold">{statistics.tercios.medio.total}</td>
                  <td className="border border-foreground/50 p-1.5 text-center font-mono">{statistics.tercios.medio.percent}%</td>
                  <td className="border border-foreground/50 p-1.5 text-center font-mono">{statistics.tercios.medio.initialScore.toFixed(2)}</td>
                  <td className="border border-foreground/50 p-1.5 text-center font-mono">{statistics.tercios.medio.finalScore.toFixed(2)}</td>
                  <td className="border border-foreground/50 p-1.5 text-center font-mono font-bold">{statistics.tercios.medio.average.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="border border-foreground/50 p-1.5 font-medium">Tercio Inferior:</td>
                  <td className="border border-foreground/50 p-1.5 text-center font-mono font-bold">{statistics.tercios.inferior.total}</td>
                  <td className="border border-foreground/50 p-1.5 text-center font-mono">{statistics.tercios.inferior.percent}%</td>
                  <td className="border border-foreground/50 p-1.5 text-center font-mono">{statistics.tercios.inferior.initialScore.toFixed(2)}</td>
                  <td className="border border-foreground/50 p-1.5 text-center font-mono">{statistics.tercios.inferior.finalScore.toFixed(2)}</td>
                  <td className="border border-foreground/50 p-1.5 text-center font-mono font-bold">{statistics.tercios.inferior.average.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="border border-foreground/50 p-1.5 text-muted-foreground">Sin Tercio:</td>
                  <td className="border border-foreground/50 p-1.5 text-center font-mono">{statistics.tercios.withoutTercio.total}</td>
                  <td className="border border-foreground/50 p-1.5 text-center font-mono">{statistics.tercios.withoutTercio.percent}%</td>
                  <td colSpan={3} className="border border-foreground/50 p-1.5 bg-muted/20"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Fila Final: Promedio del grado, Mayor, Menor */}
        <div className="flex items-center justify-end gap-6 text-xs font-bold pt-2 border-t border-border">
          <div>Promedio del grado: <span className="font-mono bg-muted/60 px-2 py-0.5 rounded border border-border">{statistics.gradeAverage.toFixed(2)}</span></div>
          <div>Mayor: <span className="font-mono bg-muted/60 px-2 py-0.5 rounded border border-border text-emerald-600">{statistics.maxScore.toFixed(2)}</span></div>
          <div>Menor: <span className="font-mono bg-muted/60 px-2 py-0.5 rounded border border-border text-red-600">{statistics.minScore.toFixed(2)}</span></div>
        </div>

        <ReportFooter reportCode="0049" />
      </div>
    </div>
  );
};
