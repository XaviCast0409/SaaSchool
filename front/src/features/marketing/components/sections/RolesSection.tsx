import React from 'react';
import { Users } from 'lucide-react';
import { ROLES } from '../../constants/conversionSections';
import { useCountUp } from '../../lib/marketing';

const Stat: React.FC<{ value: number; suffix?: string; label: string }> = ({ value, suffix = '', label }) => {
  const { ref, value: current } = useCountUp(value);
  return (
    <div>
      <p className="text-5xl sm:text-6xl font-extrabold tracking-tight">
        <span ref={ref}>{current}</span>
        <span className="kx-grad-text">{suffix}</span>
      </p>
      <p className="mt-2 kx-muted font-semibold">{label}</p>
    </div>
  );
};

export const RolesSection: React.FC = () => (
  <section className="py-24 sm:py-32">
    <div className="max-w-7xl mx-auto px-5 sm:px-8">
      <div className="grid lg:grid-cols-[1fr_1fr] gap-10 items-end kx-reveal">
        <div>
          <span className="kx-eyebrow">Una plataforma, cinco miradas</span>
          <h2 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.08]">
            Cada persona ve <span className="kx-serif kx-grad-text">exactamente</span> lo que necesita.
          </h2>
        </div>
        <div className="grid grid-cols-3 gap-6">
          <Stat value={5} label="roles con su propio panel" />
          <Stat value={3} label="niveles: Inicial, Primaria y Secundaria" />
          <Stat value={100} suffix="%" label="en la nube, sin instalar" />
        </div>
      </div>
      <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {ROLES.map((role, index) => (
          <div
            key={role.who}
            className="kx-card kx-reveal p-6 relative overflow-hidden"
            style={{ transitionDelay: `${index * 70}ms` }}
          >
            <span className="absolute top-0 left-0 right-0 h-1" style={{ background: role.tone }} />
            <Users className="w-6 h-6" style={{ color: role.tone }} />
            <h3 className="mt-4 text-xl font-extrabold">{role.who}</h3>
            <p className="mt-2 text-sm kx-muted leading-relaxed">{role.gets}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);
