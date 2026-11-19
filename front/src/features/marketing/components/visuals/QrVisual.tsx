import React from 'react';
import { QrCode } from 'lucide-react';

export const QrVisual: React.FC = () => (
  <div className="grid sm:grid-cols-[1fr_1.1fr] gap-4 h-full">
    <div className="rounded-2xl bg-[var(--kx-navy)] p-5 flex flex-col items-center justify-center relative overflow-hidden min-h-[220px]">
      <div className="relative w-36 h-36 rounded-2xl border-2 border-white/30 grid place-items-center">
        <QrCode className="w-20 h-20 text-white/85" />
        <span
          className="absolute left-2 right-2 h-0.5 bg-[var(--kx-coral)] shadow-[0_0_14px_var(--kx-coral)]"
          style={{ animation: 'kx-scan 2.4s ease-in-out infinite' }}
        />
      </div>
      <p className="mt-4 text-sm text-white font-bold">Kiosco de entrada</p>
      <p className="text-xs text-[var(--kx-on-dark-2)]">Cámara o lector de códigos</p>
    </div>
    <div className="space-y-2.5">
      {[
        { name: 'Valeria S.', time: '7:38', status: 'Puntual', color: 'var(--kx-green)' },
        { name: 'Mateo P.', time: '7:41', status: 'Puntual', color: 'var(--kx-green)' },
        { name: 'Gabriel M.', time: '8:06', status: 'Tardanza', color: 'var(--kx-amber)' },
        { name: 'Lucía R.', time: '—', status: 'Falta · aviso enviado', color: 'var(--kx-red)' },
      ].map((row, index) => (
        <div
          key={row.name}
          className="kx-card !rounded-xl px-4 py-3 flex items-center justify-between kx-panel-enter"
          style={{ animationDelay: `${index * 0.12}s` }}
        >
          <div>
            <p className="text-sm font-bold">{row.name}</p>
            <p className="text-xs kx-muted">{row.time}</p>
          </div>
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ color: row.color, background: `color-mix(in srgb, ${row.color} 12%, transparent)` }}
          >
            {row.status}
          </span>
        </div>
      ))}
    </div>
  </div>
);
