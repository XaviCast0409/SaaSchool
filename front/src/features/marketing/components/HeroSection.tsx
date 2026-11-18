import React, { useEffect, useState } from 'react';
import { ArrowRight, BadgeCheck, Bell, CheckCircle2, GraduationCap, PlayCircle, QrCode, Wallet } from 'lucide-react';
import { useLeadModal } from './LeadModal';

const ROTATING_WORDS = ['la matrícula', 'la asistencia', 'las pensiones', 'las libretas', 'los comunicados'];

const LIVE_EVENTS = [
  {
    icon: QrCode,
    tone: 'var(--kx-green)',
    title: 'Lucas llegó a las 7:42',
    detail: 'Asistencia registrada con QR · aviso enviado a su mamá',
  },
  {
    icon: Wallet,
    tone: 'var(--kx-coral)',
    title: 'Pago recibido · S/ 350',
    detail: 'Pensión de marzo · recibo REC-000418',
  },
  {
    icon: GraduationCap,
    tone: 'var(--kx-purple)',
    title: 'Tarea calificada: AD',
    detail: 'Comunicación · 3.° B · la familia ya fue notificada',
  },
  {
    icon: Bell,
    tone: 'var(--kx-amber)',
    title: 'Recordatorio automático',
    detail: '18 familias avisadas: la pensión vence mañana',
  },
];

/** Panel de ejemplo animado: muestra en vivo lo que pasa en un colegio con KIPUX. */
const HeroMockup: React.FC = () => {
  const [eventIndex, setEventIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setEventIndex((index) => (index + 1) % LIVE_EVENTS.length), 2800);
    return () => window.clearInterval(timer);
  }, []);

  const visibleEvents = [0, 1].map((offset) => LIVE_EVENTS[(eventIndex + offset) % LIVE_EVENTS.length]!);
  const bars = [62, 78, 70, 88, 94, 81, 97];

  return (
    <div className="relative">
      <div className="kx-mock p-4 sm:p-5">
        <div className="flex items-center gap-1.5 mb-4">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff6b5e]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
          <span className="ml-3 text-xs text-[var(--kx-on-dark-2)]">Panel de Dirección · hoy</span>
          <span className="ml-auto flex items-center gap-1.5 text-xs text-[var(--kx-on-dark)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--kx-green)] kx-blink" /> En vivo
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Asistencia hoy', value: '96 %', tone: 'var(--kx-green)' },
            { label: 'Cobranza del mes', value: '87 %', tone: 'var(--kx-coral-2)' },
            { label: 'Alumnos activos', value: '412', tone: 'var(--kx-purple-2)' },
          ].map((kpi) => (
            <div key={kpi.label} className="kx-mock-card p-3">
              <p className="text-xs sm:text-xs text-[var(--kx-on-dark-2)]">{kpi.label}</p>
              <p className="mt-1 text-lg sm:text-2xl font-extrabold" style={{ color: kpi.tone }}>
                {kpi.value}
              </p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-5 gap-3 mt-3">
          <div className="kx-mock-card p-3 col-span-3">
            <p className="text-xs text-[var(--kx-on-dark-2)]">Asistencia semanal</p>
            <div className="mt-3 h-24 flex items-end gap-2">
              {bars.map((height, index) => (
                <div
                  key={index}
                  className="flex-1 rounded-t-md kx-bar-grow"
                  style={{
                    height: `${height}%`,
                    animationDelay: `${0.3 + index * 0.08}s`,
                    background:
                      index === bars.length - 1
                        ? 'linear-gradient(var(--kx-coral-2),var(--kx-coral))'
                        : 'rgba(255,255,255,.22)',
                  }}
                />
              ))}
            </div>
          </div>
          <div className="kx-mock-card p-3 col-span-2">
            <p className="text-xs text-[var(--kx-on-dark-2)]">Semáforo 3.° B</p>
            <div className="mt-3 space-y-2.5">
              {[
                { name: 'Asistencia', color: 'var(--kx-green)' },
                { name: 'Notas', color: 'var(--kx-amber)' },
                { name: 'Tareas', color: 'var(--kx-green)' },
              ].map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs text-[var(--kx-on-dark)]">
                  {item.name}
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: item.color, boxShadow: `0 0 10px ${item.color}` }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-right text-[var(--kx-on-dark-2)]">Vista ilustrativa con datos de ejemplo</p>
      </div>

      {/* Notificaciones que van apareciendo */}
      <div className="absolute -left-4 sm:-left-12 -bottom-10 w-[78%] sm:w-[70%] space-y-2.5" aria-live="polite">
        {visibleEvents.map((event, index) => {
          const Icon = event.icon;
          return (
            <div
              key={`${eventIndex}-${index}`}
              className="kx-toast p-3 flex gap-3 items-start"
              style={{
                animationDelay: `${index * 0.12}s`,
                opacity: index === 1 ? 0.85 : 1,
                transform: index === 1 ? 'scale(.96)' : undefined,
              }}
            >
              <span
                className="w-9 h-9 rounded-xl grid place-items-center shrink-0"
                style={{ background: `color-mix(in srgb, ${event.tone} 14%, transparent)`, color: event.tone }}
              >
                <Icon className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold leading-tight">{event.title}</p>
                <p className="text-xs kx-muted leading-snug mt-0.5">{event.detail}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden sm:flex absolute -right-5 -top-6 kx-toast kx-bob px-4 py-3 items-center gap-2">
        <BadgeCheck className="w-5 h-5 text-[var(--kx-purple)]" />
        <span className="text-sm font-bold">Listo para el SIAGIE</span>
      </div>
    </div>
  );
};

export const HeroSection: React.FC = () => {
  const { openLead } = useLeadModal();
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setWordIndex((index) => (index + 1) % ROTATING_WORDS.length), 2400);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="kx-hero pt-32 pb-28 sm:pt-40 sm:pb-36 overflow-hidden">
      <div className="kx-hero-grid" />
      <div
        className="kx-orb"
        style={{ width: 380, height: 380, left: '40%', top: '10%', background: 'rgba(108,79,163,.45)' }}
      />
      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 grid lg:grid-cols-[1.05fr_1fr] gap-16 lg:gap-10 items-center">
        <div>
          <div className="kx-rise inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm text-[var(--kx-on-dark)]">
            <span className="w-2 h-2 rounded-full bg-[var(--kx-coral)] kx-blink" />
            Hecho en Perú para colegios del Perú
          </div>
          <h1
            className="kx-rise mt-7 text-[2.6rem] leading-[1.05] sm:text-6xl lg:text-[4.1rem] font-extrabold tracking-tight"
            style={{ animationDelay: '80ms' }}
          >
            Deja de perseguir
            <br />
            <span className="kx-word-rotator kx-serif pr-2">
              {ROTATING_WORDS.map((word, index) => (
                <span
                  key={word}
                  className={`kx-grad-text ${index === wordIndex ? 'is-active' : index === (wordIndex - 1 + ROTATING_WORDS.length) % ROTATING_WORDS.length ? 'is-leaving' : ''}`}
                >
                  {word}.
                </span>
              ))}
            </span>
            <br />
            KIPUX lo ordena por ti.
          </h1>
          <p
            className="kx-rise mt-7 text-lg sm:text-xl text-[var(--kx-on-dark)] max-w-xl leading-relaxed"
            style={{ animationDelay: '160ms' }}
          >
            La plataforma que une matrícula, asistencia con QR, notas por competencias, pensiones y comunicación con las
            familias. Alineada al CNEB y lista para el SIAGIE.
          </p>
          <div className="kx-rise mt-9 flex flex-col sm:flex-row gap-3" style={{ animationDelay: '240ms' }}>
            <button onClick={() => openLead('hero')} className="kx-btn kx-btn-primary kx-btn-shine px-7 py-4 text-base">
              Solicitar demostración <ArrowRight className="w-5 h-5" />
            </button>
            <a href="#funciones" className="kx-btn kx-btn-ghost-dark px-7 py-4 text-base">
              <PlayCircle className="w-5 h-5" /> Ver cómo funciona
            </a>
          </div>
          <ul
            className="kx-rise mt-9 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--kx-on-dark)]"
            style={{ animationDelay: '320ms' }}
          >
            {['Sin instalar nada', 'Funciona en el celular', 'Te ayudamos a migrar tus datos'].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[var(--kx-coral)]" /> {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="kx-rise lg:pl-6 pb-16 sm:pb-10" style={{ animationDelay: '200ms' }}>
          <HeroMockup />
        </div>
      </div>
    </section>
  );
};
