import React, { useMemo, useState } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { formatSoles } from '../../lib/marketing';
import { useLeadModal } from '../LeadModal';

export const RoiCalculator: React.FC = () => {
  const { openLead } = useLeadModal();
  const [students, setStudents] = useState(300);
  const [pension, setPension] = useState(350);
  const [overdue, setOverdue] = useState(20);

  const result = useMemo(() => {
    const monthlyBilling = students * pension;
    const atRisk = monthlyBilling * (overdue / 100);
    const recovered = atRisk / 3;
    const plan = students <= 150 ? { name: 'Básico', price: 300 } : { name: 'Pro', price: 350 };
    return { atRisk, recovered, plan, multiple: recovered / plan.price };
  }, [students, pension, overdue]);

  const sliders = [
    { label: 'Alumnos', value: students, set: setStudents, min: 50, max: 500, step: 10, format: (v: number) => `${v}` },
    { label: 'Pensión mensual', value: pension, set: setPension, min: 100, max: 1200, step: 10, format: formatSoles },
    {
      label: 'Familias que pagan tarde',
      value: overdue,
      set: setOverdue,
      min: 5,
      max: 50,
      step: 1,
      format: (v: number) => `${v} %`,
    },
  ];

  return (
    <section className="py-24 sm:py-32 bg-white border-y border-[var(--kx-line)]">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 grid lg:grid-cols-2 gap-12 items-center">
        <div className="kx-reveal">
          <span className="kx-eyebrow">Calcula tu caso</span>
          <h2 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.08]">
            ¿Cuánto dinero se queda <span className="kx-serif kx-grad-text">sin cobrar</span> cada mes?
          </h2>
          <div className="mt-10 space-y-8">
            {sliders.map((slider) => (
              <div key={slider.label}>
                <div className="flex justify-between items-baseline">
                  <label className="font-bold">{slider.label}</label>
                  <span className="text-xl font-extrabold">{slider.format(slider.value)}</span>
                </div>
                <input
                  type="range"
                  className="kx-range mt-3"
                  min={slider.min}
                  max={slider.max}
                  step={slider.step}
                  value={slider.value}
                  onChange={(event) => slider.set(Number(event.target.value))}
                  aria-label={slider.label}
                  style={{
                    background: `linear-gradient(90deg, var(--kx-coral) ${((slider.value - slider.min) / (slider.max - slider.min)) * 100}%, var(--kx-line) 0)`,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="kx-reveal rounded-[28px] kx-section-dark p-8 sm:p-10 relative overflow-hidden">
          <div
            className="kx-orb"
            style={{ width: 280, height: 280, right: -80, bottom: -100, background: 'rgba(239,122,76,.45)' }}
          />
          <div className="relative">
            <p className="kx-on-dark text-sm font-semibold">Pensiones atrasadas cada mes</p>
            <p className="mt-1 text-4xl font-extrabold">{formatSoles(result.atRisk)}</p>
            <div className="my-7 h-px bg-white/10" />
            <p className="kx-on-dark text-sm font-semibold">
              Si los recordatorios automáticos recuperan solo un tercio
            </p>
            <p className="mt-1 text-5xl sm:text-6xl font-extrabold kx-grad-text">+{formatSoles(result.recovered)}</p>
            <p className="mt-1 kx-on-dark">al mes, a tiempo</p>
            <div className="mt-7 rounded-2xl bg-white/[.07] border border-white/10 p-4 flex items-center gap-4">
              <Sparkles className="w-6 h-6 text-[var(--kx-coral)] shrink-0" />
              <p className="text-sm kx-on-dark">
                Plan sugerido:{' '}
                <b className="text-white">
                  {result.plan.name} · {formatSoles(result.plan.price)}/mes
                </b>
                .
                {result.multiple >= 1 && (
                  <>
                    {' '}
                    Lo recuperado equivale a <b className="text-white">{result.multiple.toFixed(1)} veces</b> su costo.
                  </>
                )}
              </p>
            </div>
            <button
              onClick={() => openLead('calculadora')}
              className="kx-btn kx-btn-primary kx-btn-shine w-full mt-7 py-4 text-base"
            >
              Quiero ver esto en mi colegio <ArrowRight className="w-5 h-5" />
            </button>
            <p className="mt-4 text-xs text-[var(--kx-on-dark-2)]">
              Estimación referencial. El resultado real depende de cada colegio.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
