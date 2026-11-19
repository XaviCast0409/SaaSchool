import React from 'react';
import { Check, Clock, Rocket, ShieldCheck } from 'lucide-react';
import { PLANS } from '../../constants/conversionSections';
import { useLeadModal } from '../LeadModal';

export const PricingSection: React.FC = () => {
  const { openLead } = useLeadModal();
  return (
    <section id="precios" className="py-24 sm:py-32 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="text-center max-w-2xl mx-auto kx-reveal">
          <span className="kx-eyebrow">Precios claros</span>
          <h2 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.08]">
            Un precio justo, <span className="kx-serif kx-grad-text">sin sorpresas</span>.
          </h2>
          <p className="mt-5 text-lg kx-muted">
            Un precio mensual por colegio, sin cobros por usuario. Docentes, padres y alumnos entran sin costo extra.
          </p>
        </div>
        <div className="mt-14 grid md:grid-cols-3 gap-5 items-stretch">
          {PLANS.map((plan, index) => (
            <div
              key={plan.id}
              className={`kx-card kx-reveal p-8 flex flex-col relative ${plan.featured ? 'kx-plan-featured md:-translate-y-3' : ''} ${plan.soon ? 'kx-plan-soon' : ''}`}
              style={{ transitionDelay: `${index * 90}ms` }}
            >
              {plan.featured && (
                <span
                  className="absolute -top-3.5 left-8 text-xs font-extrabold tracking-wider px-3 py-1.5 rounded-full text-white"
                  style={{ background: 'linear-gradient(90deg,var(--kx-purple),var(--kx-coral))' }}
                >
                  MÁS ELEGIDO
                </span>
              )}
              {plan.soon && (
                <span className="absolute -top-3.5 left-8 text-xs font-extrabold tracking-wider px-3 py-1.5 rounded-full text-white bg-[var(--kx-coral)]">
                  PRÓXIMAMENTE
                </span>
              )}
              <h3 className="text-xl font-extrabold">{plan.name}</h3>
              <p className={`mt-1 text-sm ${plan.featured ? 'kx-on-dark' : 'kx-muted'}`}>{plan.pitch}</p>
              <p className="mt-6 flex items-baseline gap-1.5">
                <span className="text-5xl font-extrabold tracking-tight">S/ {plan.price}</span>
                <span className={plan.featured ? 'kx-on-dark' : 'kx-muted'}>/ mes</span>
              </p>
              <p className="mt-1 text-sm font-bold text-[var(--kx-coral)]">{plan.quota}</p>
              <ul className="mt-7 space-y-3 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-3 text-sm">
                    <Check
                      className={`w-5 h-5 shrink-0 ${plan.featured ? 'text-[var(--kx-coral)]' : 'text-[var(--kx-purple)]'}`}
                    />{' '}
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => openLead(`precios-${plan.id.toLowerCase()}`, plan.id)}
                className={`kx-btn mt-8 py-3.5 ${plan.featured ? 'kx-btn-primary kx-btn-shine' : 'kx-btn-dark'}`}
              >
                {plan.soon ? 'Avísenme cuando esté listo' : 'Solicitar demostración'}
              </button>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm kx-muted kx-reveal">
          <span className="flex items-center gap-2">
            <Rocket className="w-4 h-4 text-[var(--kx-coral)]" /> Te ayudamos con la configuración inicial
          </span>
          <span className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[var(--kx-coral)]" /> Capacitación para tu equipo
          </span>
          <span className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[var(--kx-coral)]" /> Tus datos separados de otros colegios
          </span>
        </div>
      </div>
    </section>
  );
};
