import React from 'react';
import { AlertTriangle } from 'lucide-react';

export const InsightsVisual: React.FC = () => (
  <div className="kx-card !rounded-2xl p-5">
    <div className="flex items-center justify-between">
      <p className="text-sm font-bold flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-[var(--kx-coral)]" /> Alerta temprana · esta semana
      </p>
      <span className="text-xs kx-muted">3 alumnos para tutoría</span>
    </div>
    <div className="mt-4 space-y-3">
      {[
        {
          name: 'Diego V. · 3.° B',
          reasons: '2 competencias en C · 4 faltas sin justificar',
          level: 'Alto',
          color: 'var(--kx-red)',
          score: 82,
        },
        {
          name: 'Marta C. · 5.° A',
          reasons: '3 tareas vencidas sin entregar',
          level: 'Medio',
          color: 'var(--kx-amber)',
          score: 54,
        },
        {
          name: 'Iván P. · 2.° Sec',
          reasons: '1 competencia bajó de nivel',
          level: 'Bajo',
          color: 'var(--kx-green)',
          score: 28,
        },
      ].map((row, index) => (
        <div key={row.name} className="kx-panel-enter" style={{ animationDelay: `${index * 0.12}s` }}>
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold">{row.name}</span>
            <span className="text-xs font-bold" style={{ color: row.color }}>
              Riesgo {row.level}
            </span>
          </div>
          <p className="text-xs kx-muted mt-0.5">{row.reasons}</p>
          <div className="mt-2 h-1.5 rounded-full bg-[var(--kx-line)] overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${row.score}%`, background: row.color, transition: 'width 1s ease' }}
            />
          </div>
        </div>
      ))}
    </div>
    <p className="mt-4 text-xs kx-muted">La deuda de pensiones nunca se usa para evaluar al alumno.</p>
  </div>
);
