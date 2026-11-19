import React from 'react';
import { MessageCircle } from 'lucide-react';

export const PaymentsVisual: React.FC = () => (
  <div className="grid sm:grid-cols-[1.2fr_1fr] gap-4">
    <div className="space-y-2.5">
      {[
        {
          family: 'Familia Quispe',
          concept: 'Pensión de abril',
          amount: 'S/ 350',
          state: 'Vence mañana',
          color: 'var(--kx-amber)',
        },
        {
          family: 'Familia Rojas',
          concept: 'Pensión de marzo',
          amount: 'S/ 350',
          state: 'Vencida',
          color: 'var(--kx-red)',
        },
        {
          family: 'Familia Salas',
          concept: 'Pensión de abril',
          amount: 'S/ 175',
          state: 'Media beca · pagado',
          color: 'var(--kx-green)',
        },
      ].map((row, index) => (
        <div
          key={row.family}
          className="kx-card !rounded-xl px-4 py-3 flex items-center gap-3 kx-panel-enter"
          style={{ animationDelay: `${index * 0.12}s` }}
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold">{row.family}</p>
            <p className="text-xs kx-muted">
              {row.concept} ·{' '}
              <span style={{ color: row.color }} className="font-semibold">
                {row.state}
              </span>
            </p>
          </div>
          <p className="text-sm font-extrabold">{row.amount}</p>
          {row.color !== 'var(--kx-green)' && (
            <span
              className="w-8 h-8 rounded-full grid place-items-center bg-[#25d366] text-white"
              title="Recordar por WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
            </span>
          )}
        </div>
      ))}
    </div>
    <div className="rounded-2xl bg-[var(--kx-navy)] text-white p-5 flex flex-col justify-between min-h-[200px]">
      <div>
        <p className="text-xs text-[var(--kx-on-dark-2)]">Cierre de caja · hoy</p>
        <p className="mt-1 text-3xl font-extrabold">S/ 4,550</p>
      </div>
      <div className="space-y-2 text-xs text-[var(--kx-on-dark)]">
        {[
          ['Efectivo', 55],
          ['Transferencia', 35],
          ['Tarjeta', 10],
        ].map(([label, pct]) => (
          <div key={label as string}>
            <div className="flex justify-between">
              <span>{label}</span>
              <span>{pct} %</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-white/10">
              <div className="h-full rounded-full bg-[var(--kx-coral)]" style={{ width: `${pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);
