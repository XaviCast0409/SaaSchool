import React from 'react';
import type { TercioStatRow } from '../../../types';

export interface MeritStatisticsSummaryProps {
  statistics: {
    studentCounts: {
      invictos: number;
      withFailed: number;
      withoutGrades: number;
      blankGrades: number;
      withdrawn: number;
      total: number;
    };
    tercios: {
      superior: TercioStatRow;
      medio: TercioStatRow;
      inferior: TercioStatRow;
      withoutTercio: {
        total: number;
        percent: number;
      };
    };
    classroomAverage?: number;
    gradeAverage?: number;
    maxScore: number;
    minScore: number;
  };
  scopeLabel: string; // e.g. "salón" or "Grado"
}

export const MeritStatisticsSummary: React.FC<MeritStatisticsSummaryProps> = ({ statistics, scopeLabel }) => {
  const average = statistics.classroomAverage ?? statistics.gradeAverage ?? 0;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-xs mb-4">
        {/* Cuadro: Cantidad de Alumnos */}
        <div className="md:col-span-5">
          <table className="w-full border-collapse border border-foreground/50 text-xs">
            <thead>
              <tr className="bg-muted/50 font-bold">
                <th colSpan={2} className="border border-foreground/50 p-1.5 text-center">
                  Cantidad de Alumnos
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-foreground/50 p-1.5">Invictos:</td>
                <td className="border border-foreground/50 p-1.5 text-center font-mono font-bold w-16">
                  {statistics.studentCounts.invictos}
                </td>
              </tr>
              <tr>
                <td className="border border-foreground/50 p-1.5">Con asignaturas desaprobadas:</td>
                <td className="border border-foreground/50 p-1.5 text-center font-mono font-bold w-16 text-red-600">
                  {statistics.studentCounts.withFailed}
                </td>
              </tr>
              <tr>
                <td className="border border-foreground/50 p-1.5">Con SN:</td>
                <td className="border border-foreground/50 p-1.5 text-center font-mono w-16">
                  {statistics.studentCounts.withoutGrades}
                </td>
              </tr>
              <tr>
                <td className="border border-foreground/50 p-1.5">Con notas en blanco:</td>
                <td className="border border-foreground/50 p-1.5 text-center font-mono w-16">
                  {statistics.studentCounts.blankGrades}
                </td>
              </tr>
              <tr>
                <td className="border border-foreground/50 p-1.5">Retirados:</td>
                <td className="border border-foreground/50 p-1.5 text-center font-mono w-16">
                  {statistics.studentCounts.withdrawn}
                </td>
              </tr>
              <tr className="bg-muted/30 font-bold">
                <td className="border border-foreground/50 p-1.5 text-right uppercase">Total de Alumnos:</td>
                <td className="border border-foreground/50 p-1.5 text-center font-mono">
                  {statistics.studentCounts.total}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Cuadro: Estadísticas de Tercios */}
        <div className="md:col-span-7">
          <table className="w-full border-collapse border border-foreground/50 text-xs">
            <thead>
              <tr className="bg-muted/50 font-bold">
                <th rowSpan={2} className="border border-foreground/50 p-1.5 text-left">
                  Estadísticas Tercios
                </th>
                <th rowSpan={2} className="border border-foreground/50 p-1.5 text-center w-12">
                  Total
                </th>
                <th rowSpan={2} className="border border-foreground/50 p-1.5 text-center w-14">
                  Porc.(%)
                </th>
                <th colSpan={2} className="border border-foreground/50 p-1 text-center">
                  Rango Promedio
                </th>
                <th rowSpan={2} className="border border-foreground/50 p-1.5 text-center w-14">
                  Prom.
                </th>
              </tr>
              <tr className="bg-muted/30 font-semibold text-xs">
                <th className="border border-foreground/50 p-1 w-14 text-center">Inicial</th>
                <th className="border border-foreground/50 p-1 w-14 text-center">Final</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-foreground/50 p-1.5 font-medium">Tercio Superior:</td>
                <td className="border border-foreground/50 p-1.5 text-center font-mono font-bold">
                  {statistics.tercios.superior.total}
                </td>
                <td className="border border-foreground/50 p-1.5 text-center font-mono">
                  {statistics.tercios.superior.percent}%
                </td>
                <td className="border border-foreground/50 p-1.5 text-center font-mono">
                  {statistics.tercios.superior.initialScore.toFixed(2)}
                </td>
                <td className="border border-foreground/50 p-1.5 text-center font-mono">
                  {statistics.tercios.superior.finalScore.toFixed(2)}
                </td>
                <td className="border border-foreground/50 p-1.5 text-center font-mono font-bold">
                  {statistics.tercios.superior.average.toFixed(2)}
                </td>
              </tr>
              <tr>
                <td className="border border-foreground/50 p-1.5 font-medium">Tercio Medio:</td>
                <td className="border border-foreground/50 p-1.5 text-center font-mono font-bold">
                  {statistics.tercios.medio.total}
                </td>
                <td className="border border-foreground/50 p-1.5 text-center font-mono">
                  {statistics.tercios.medio.percent}%
                </td>
                <td className="border border-foreground/50 p-1.5 text-center font-mono">
                  {statistics.tercios.medio.initialScore.toFixed(2)}
                </td>
                <td className="border border-foreground/50 p-1.5 text-center font-mono">
                  {statistics.tercios.medio.finalScore.toFixed(2)}
                </td>
                <td className="border border-foreground/50 p-1.5 text-center font-mono font-bold">
                  {statistics.tercios.medio.average.toFixed(2)}
                </td>
              </tr>
              <tr>
                <td className="border border-foreground/50 p-1.5 font-medium">Tercio Inferior:</td>
                <td className="border border-foreground/50 p-1.5 text-center font-mono font-bold">
                  {statistics.tercios.inferior.total}
                </td>
                <td className="border border-foreground/50 p-1.5 text-center font-mono">
                  {statistics.tercios.inferior.percent}%
                </td>
                <td className="border border-foreground/50 p-1.5 text-center font-mono">
                  {statistics.tercios.inferior.initialScore.toFixed(2)}
                </td>
                <td className="border border-foreground/50 p-1.5 text-center font-mono">
                  {statistics.tercios.inferior.finalScore.toFixed(2)}
                </td>
                <td className="border border-foreground/50 p-1.5 text-center font-mono font-bold">
                  {statistics.tercios.inferior.average.toFixed(2)}
                </td>
              </tr>
              <tr>
                <td className="border border-foreground/50 p-1.5 text-muted-foreground">Sin Tercio:</td>
                <td className="border border-foreground/50 p-1.5 text-center font-mono">
                  {statistics.tercios.withoutTercio.total}
                </td>
                <td className="border border-foreground/50 p-1.5 text-center font-mono">
                  {statistics.tercios.withoutTercio.percent}%
                </td>
                <td colSpan={3} className="border border-foreground/50 p-1.5 bg-muted/20"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Fila Final: Promedio del ámbito, Mayor, Menor */}
      <div className="flex items-center justify-end gap-6 text-xs font-bold pt-2 border-t border-border">
        <div>
          Promedio del {scopeLabel}:{' '}
          <span className="font-mono bg-muted/60 px-2 py-0.5 rounded border border-border">
            {average.toFixed(2)}
          </span>
        </div>
        <div>
          Mayor:{' '}
          <span className="font-mono bg-muted/60 px-2 py-0.5 rounded border border-border text-emerald-600">
            {statistics.maxScore.toFixed(2)}
          </span>
        </div>
        <div>
          Menor:{' '}
          <span className="font-mono bg-muted/60 px-2 py-0.5 rounded border border-border text-red-600">
            {statistics.minScore.toFixed(2)}
          </span>
        </div>
      </div>
    </>
  );
};
