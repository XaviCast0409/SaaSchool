import React from 'react';
import { Check } from 'lucide-react';

export const GradesVisual: React.FC = () => {
  const rows = [
    ['Ana T.', 'AD', 'A', 'A', 'AD'],
    ['Bruno L.', 'A', 'B', 'A', 'A'],
    ['Camila R.', 'A', 'A', 'AD', 'A'],
    ['Diego V.', 'B', 'C', 'B', 'B'],
  ];
  const color = (grade: string) =>
    ({ AD: 'var(--kx-purple)', A: 'var(--kx-green)', B: 'var(--kx-amber)', C: 'var(--kx-red)' })[grade] ??
    'var(--kx-muted)';
  return (
    <div className="kx-card !rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--kx-line)] flex items-center justify-between">
        <p className="text-sm font-bold">Comunicación · 3.° B · Bimestre II</p>
        <span className="text-xs kx-muted flex items-center gap-1">
          <Check className="w-3.5 h-3.5 text-[var(--kx-green)]" /> Guardado automático
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs kx-muted">
              <th className="text-left font-semibold px-4 py-2.5">Alumno</th>
              {['C1', 'C2', 'C3', 'Final'].map((h) => (
                <th key={h} className="font-semibold px-3 py-2.5">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([name, ...grades], rowIndex) => (
              <tr
                key={name}
                className="border-t border-[var(--kx-line)] kx-panel-enter"
                style={{ animationDelay: `${rowIndex * 0.1}s` }}
              >
                <td className="px-4 py-2.5 font-semibold">{name}</td>
                {grades.map((grade, index) => (
                  <td key={index} className="px-3 py-2.5 text-center">
                    <span
                      className="inline-grid place-items-center w-9 h-7 rounded-lg text-xs font-extrabold"
                      style={{
                        color: color(grade),
                        background: `color-mix(in srgb, ${color(grade)} 13%, transparent)`,
                        outline: index === 3 ? `1.5px solid ${color(grade)}` : undefined,
                      }}
                    >
                      {grade}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 bg-[var(--kx-paper)] text-xs kx-muted flex flex-wrap gap-x-4 gap-y-1">
        <span>Escala literal o vigesimal</span>
        <span>Bimestres o trimestres</span>
        <span>Libreta lista para imprimir</span>
      </div>
    </div>
  );
};
