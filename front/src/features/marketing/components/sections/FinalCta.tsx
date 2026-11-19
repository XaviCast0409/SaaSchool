import React from 'react';
import { LeadForm } from '../LeadForm';

export const FinalCta: React.FC = () => (
  <section id="demo" className="kx-hero py-24 sm:py-32 scroll-mt-16 overflow-hidden">
    <div className="kx-hero-grid" />
    <div className="relative max-w-6xl mx-auto px-5 sm:px-8 grid lg:grid-cols-[1fr_1.05fr] gap-12 items-center">
      <div className="kx-reveal">
        <span className="kx-eyebrow">Empieza hoy</span>
        <h2 className="mt-4 text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.04]">
          Tu colegio, <span className="kx-serif kx-grad-text">en orden</span> desde este año escolar.
        </h2>
        <p className="mt-6 text-lg kx-on-dark leading-relaxed max-w-lg">
          Déjanos tus datos y te mostramos KIPUX con el caso de tu colegio. Por videollamada, en 20 minutos y sin
          compromiso.
        </p>
        <div className="mt-10 space-y-4">
          {[
            ['1', 'Demostración', 'Vemos juntos los módulos que más te importan.'],
            ['2', 'Configuración', 'Cargamos aulas, alumnos y familias, incluso desde el SIAGIE.'],
            ['3', 'Capacitación', 'Acompañamos a tu equipo hasta que todo funcione.'],
          ].map(([n, title, text]) => (
            <div key={n} className="flex gap-4">
              <span className="w-10 h-10 rounded-full grid place-items-center font-extrabold shrink-0 border border-white/20 text-[var(--kx-coral)]">
                {n}
              </span>
              <div>
                <p className="font-extrabold">{title}</p>
                <p className="text-sm kx-on-dark">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="kx-reveal rounded-[28px] bg-[var(--kx-paper)] text-[var(--kx-ink)] p-6 sm:p-9 shadow-2xl">
        <h3 className="text-2xl font-extrabold">Solicita tu demostración</h3>
        <p className="mt-1 kx-muted text-sm mb-6">Te respondemos por WhatsApp.</p>
        <LeadForm source="formulario-final" />
      </div>
    </div>
  </section>
);
