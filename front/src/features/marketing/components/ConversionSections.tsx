import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronDown,
  Clock,
  MessageCircle,
  Rocket,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { useLeadModal } from './LeadModal';
import { LeadForm } from './LeadForm';
import { DEFAULT_WHATSAPP_TEXT, formatSoles, useCountUp, whatsappUrl } from '../lib/marketing';
import type { InterestPlan } from '../api/useCreateLead';

/* ------------------------------------------------------------------ Para quién */

const ROLES = [
  {
    who: 'Dirección',
    gets: 'Indicadores del colegio, cobranza, cumplimiento docente y alumnos en riesgo.',
    tone: 'var(--kx-coral)',
  },
  {
    who: 'Secretaría',
    gets: 'Matrícula, admisión, trámites, constancias, caja y padrones oficiales.',
    tone: 'var(--kx-purple)',
  },
  { who: 'Docentes', gets: 'Asistencia, notas, aula virtual, rúbricas y banco de recursos.', tone: 'var(--kx-coral)' },
  {
    who: 'Padres',
    gets: 'Asistencia, notas, pagos y mensajes de todos sus hijos en el celular.',
    tone: 'var(--kx-purple)',
  },
  {
    who: 'Alumnos',
    gets: 'Sus cursos, tareas y foros, con su propia cuenta y sin ver pagos.',
    tone: 'var(--kx-coral)',
  },
];

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

/* ------------------------------------------------------------------ Calculadora */

export const RoiCalculator: React.FC = () => {
  const { openLead } = useLeadModal();
  const [students, setStudents] = useState(300);
  const [pension, setPension] = useState(350);
  const [overdue, setOverdue] = useState(20);

  const result = useMemo(() => {
    const monthlyBilling = students * pension;
    const atRisk = monthlyBilling * (overdue / 100);
    const recovered = atRisk / 3; // supuesto: los recordatorios automáticos recuperan un tercio de la morosidad
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

/* ------------------------------------------------------------------ Precios */

const PLANS: Array<{
  id: InterestPlan;
  name: string;
  price: number;
  quota: string;
  pitch: string;
  features: string[];
  featured?: boolean;
  soon?: boolean;
}> = [
  {
    id: 'BASIC',
    name: 'Básico',
    price: 300,
    quota: 'Hasta 150 alumnos',
    pitch: 'Para ordenar la operación diaria.',
    features: [
      'Matrícula, secretaría y SIAGIE',
      'Asistencia con QR y portería',
      'Pensiones, caja y cobranza',
      'Portal familiar y comunicados',
      'Mensajería, entrevistas e incidencias',
    ],
  },
  {
    id: 'PRO',
    name: 'Pro',
    price: 350,
    quota: 'Hasta 500 alumnos',
    pitch: 'La gestión académica completa.',
    featured: true,
    features: [
      'Todo lo del plan Básico',
      'Registro de notas por competencias',
      'Reportes académicos oficiales',
      'Alerta temprana y tutoría',
      'Supervisión del aula virtual',
    ],
  },
  {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    price: 450,
    quota: 'Alumnos ilimitados',
    pitch: 'Para colegios grandes o con varias sedes.',
    soon: true,
    features: ['Todo lo del plan Pro', 'Sin límite de alumnos', 'Pensado para varias sedes'],
  },
];

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

/* ------------------------------------------------------------------ Preguntas frecuentes */

const FAQS = [
  {
    q: '¿Necesito instalar algo o comprar equipos?',
    a: 'No. KIPUX funciona en el navegador de cualquier computadora, tablet o celular. Para el kiosco de asistencia basta la cámara de un celular o un lector de códigos.',
  },
  {
    q: '¿Sirve para el SIAGIE?',
    a: 'Sí. Puedes importar las nóminas del SIAGIE, exportar la nómina de matrícula en el formato oficial y consolidar las notas por las áreas que pide el MINEDU.',
  },
  {
    q: '¿Qué pasa con la información que ya tengo en Excel?',
    a: 'Te acompañamos para cargar aulas, malla curricular, alumnos y familias. Si ya los tienes en el SIAGIE, se importan desde ahí.',
  },
  {
    q: '¿Los padres tienen que pagar o descargar una app?',
    a: 'No. Los padres y alumnos entran sin costo desde el navegador del celular y pueden recibir notificaciones al instante.',
  },
  {
    q: '¿Mis datos están seguros?',
    a: 'La información de cada colegio está separada de los demás, cada usuario ve solo lo que le corresponde según su rol y queda registro de quién cambió qué y cuándo.',
  },
  {
    q: '¿Cuánto demora empezar?',
    a: 'Depende del tamaño del colegio y de cómo tengas tus datos. Lo conversamos en la demostración y te damos un plan de arranque.',
  },
];

export const FaqSection: React.FC = () => {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="preguntas" className="py-24 sm:py-32 bg-white border-y border-[var(--kx-line)] scroll-mt-20">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 grid lg:grid-cols-[0.8fr_1.2fr] gap-12">
        <div className="kx-reveal">
          <span className="kx-eyebrow">Preguntas frecuentes</span>
          <h2 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.08]">
            Lo que todos nos <span className="kx-serif kx-grad-text">preguntan</span>.
          </h2>
          <a
            href={whatsappUrl(DEFAULT_WHATSAPP_TEXT)}
            target="_blank"
            rel="noreferrer"
            className="kx-btn kx-btn-dark mt-8 px-6 py-3.5"
          >
            <MessageCircle className="w-5 h-5" /> Pregúntanos por WhatsApp
          </a>
        </div>
        <div className="divide-y divide-[var(--kx-line)] border-y border-[var(--kx-line)] kx-reveal">
          {FAQS.map((faq, index) => {
            const isOpen = open === index;
            return (
              <div key={faq.q}>
                <button
                  className="w-full flex items-center justify-between gap-6 py-6 text-left"
                  onClick={() => setOpen(isOpen ? null : index)}
                  aria-expanded={isOpen}
                >
                  <span className="text-lg font-bold">{faq.q}</span>
                  <span
                    className={`w-9 h-9 rounded-full grid place-items-center shrink-0 transition-all duration-300 ${isOpen ? 'bg-[var(--kx-coral)] text-white rotate-180' : 'bg-[var(--kx-paper)]'}`}
                  >
                    <ChevronDown className="w-5 h-5" />
                  </span>
                </button>
                <div
                  className="grid transition-all duration-300 ease-out"
                  style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
                >
                  <p
                    className="overflow-hidden kx-muted leading-relaxed pr-12"
                    style={{ paddingBottom: isOpen ? 24 : 0 }}
                  >
                    {faq.a}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ Llamado final con formulario */

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
