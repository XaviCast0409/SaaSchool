import React from 'react';

export const FamilyVisual: React.FC = () => (
  <div className="flex justify-center">
    <div className="w-[260px] rounded-[36px] bg-[var(--kx-navy)] p-3 shadow-2xl">
      <div className="rounded-[28px] bg-[var(--kx-paper)] p-4 min-h-[380px]">
        <div className="mx-auto w-20 h-1.5 rounded-full bg-black/10 mb-4" />
        <p className="text-xs kx-muted">Hola, Rosa 👋</p>
        <div className="mt-2 flex gap-2">
          {['Lucas · 3.° Prim', 'Valeria · 2.° Sec'].map((child, index) => (
            <span
              key={child}
              className={`text-xs font-bold px-2.5 py-1.5 rounded-full ${index === 0 ? 'bg-[var(--kx-navy)] text-white' : 'bg-white border border-[var(--kx-line)]'}`}
            >
              {child}
            </span>
          ))}
        </div>
        <div className="mt-4 space-y-2">
          {[
            { label: 'Asistencia', detail: '98 % este mes', color: 'var(--kx-green)' },
            { label: 'Notas', detail: '1 competencia en B', color: 'var(--kx-amber)' },
            { label: 'Tareas', detail: 'Todas entregadas', color: 'var(--kx-green)' },
            { label: 'Pagos', detail: 'Al día', color: 'var(--kx-green)' },
          ].map((item, index) => (
            <div
              key={item.label}
              className="bg-white rounded-xl px-3 py-2.5 flex items-center gap-3 border border-[var(--kx-line)] kx-panel-enter"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ background: item.color, boxShadow: `0 0 8px ${item.color}` }}
              />
              <div>
                <p className="text-xs font-bold">{item.label}</p>
                <p className="text-xs kx-muted">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-xl p-3 text-xs" style={{ background: 'rgba(239,122,76,.1)' }}>
          <p className="font-bold" style={{ color: 'var(--kx-coral)' }}>
            📣 Comunicado importante
          </p>
          <p className="kx-muted mt-0.5">Jornada de padres el viernes 9:00 a. m.</p>
        </div>
      </div>
    </div>
  </div>
);
