import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BellRing, CheckCircle2, ChevronsLeftRight, Coffee, FileSpreadsheet, GraduationCap, MessageCircle, Moon, QrCode, Sun, Wallet } from 'lucide-react';

/* ------------------------------------------------------------------ Marquesina */

const MARQUEE_ITEMS = [
  'Asistencia con QR', 'Libretas CNEB', 'Nómina SIAGIE', 'Cobranza por WhatsApp', 'Caja diaria', 'Portal para padres',
  'Aula virtual', 'Alerta temprana', 'Agenda de entrevistas', 'Horarios sin cruces', 'Constancias al instante', 'Libro de Reclamaciones',
];

export const FeatureMarquee: React.FC = () => (
  <div className="kx-section-dark border-t border-white/10 py-5 kx-marquee overflow-hidden" aria-hidden="true">
    <div className="kx-marquee-track">
      {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, index) => (
        <span key={index} className="flex items-center gap-6 px-6 text-lg font-bold text-white/80 whitespace-nowrap">
          {item}
          <span className="w-2 h-2 rotate-45 bg-[var(--kx-coral)]" />
        </span>
      ))}
    </div>
  </div>
);

/* ------------------------------------------------------------------ Antes / después */

const ChaosSide = () => (
  <div className="absolute inset-0 kx-paper-chaos p-6 sm:p-10">
    <p className="text-xs font-extrabold tracking-[0.16em] uppercase text-[#a5502f]">Antes</p>
    <h3 className="mt-2 text-2xl sm:text-3xl font-extrabold text-[#3d2b1f] max-w-xs">Cuadernos, Excel y cien chats.</h3>
    <div className="mt-6 relative h-[260px]">
      <div className="absolute left-0 top-0 w-48 bg-[#fff6a8] p-3 rotate-[-6deg] kx-sticky-note text-sm text-[#5b4a12] font-semibold">Llamar a 23 familias por pensión 😩</div>
      <div className="absolute left-36 top-20 w-52 bg-white p-3 rotate-[4deg] kx-sticky-note">
        <div className="flex items-center gap-2 text-xs font-bold text-[#1d6f42]"><FileSpreadsheet className="w-4 h-4" /> notas_FINAL_v7(2).xlsx</div>
        <div className="mt-2 grid grid-cols-4 gap-1">{Array.from({ length: 12 }).map((_, i) => <span key={i} className="h-3 bg-[#e7efe9] rounded-sm" />)}</div>
      </div>
      <div className="absolute left-4 top-40 w-44 bg-[#ffd6c9] p-3 rotate-[2deg] kx-sticky-note text-sm text-[#7a2e14] font-semibold">¿Quién faltó el martes? 🤔</div>
      <div className="absolute left-56 top-48 bg-[#dcf8c6] px-3 py-2 rounded-xl rotate-[-3deg] kx-sticky-note text-xs text-[#33502a]">Grupo 3.° B · 147 mensajes sin leer</div>
    </div>
  </div>
);

const OrderSide = () => (
  <div className="absolute inset-0 bg-[var(--kx-navy)] p-6 sm:p-10 text-white">
    <div className="kx-orb" style={{ width: 300, height: 300, right: -60, top: -60, background: 'rgba(108,79,163,.6)' }} />
    <div className="relative sm:pl-[55%]">
      <p className="text-xs font-extrabold tracking-[0.16em] uppercase text-[var(--kx-coral)]">Con KIPUX</p>
      <h3 className="mt-2 text-2xl sm:text-3xl font-extrabold">Todo claro, en una pantalla.</h3>
      <div className="mt-6 space-y-3">
        {[
          { icon: Wallet, text: '23 recordatorios enviados solos' },
          { icon: GraduationCap, text: 'Libretas generadas con un clic' },
          { icon: QrCode, text: 'Asistencia del martes: 2 faltas, padres avisados' },
          { icon: BellRing, text: 'Comunicados con confirmación de lectura' },
        ].map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-center gap-3 rounded-xl bg-white/[.07] border border-white/10 px-4 py-3 text-sm">
            <Icon className="w-5 h-5 text-[var(--kx-coral)] shrink-0" /> {text}
            <CheckCircle2 className="w-4 h-4 ml-auto text-[var(--kx-green)] shrink-0" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const BeforeAfter: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState(50);
  const dragging = useRef(false);

  const updateFromClientX = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(96, Math.max(4, pct)));
  }, []);

  useEffect(() => {
    const onMove = (event: PointerEvent) => dragging.current && updateFromClientX(event.clientX);
    const onUp = () => { dragging.current = false; };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [updateFromClientX]);

  return (
    <section className="py-24 sm:py-32 bg-white border-y border-[var(--kx-line)]">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="text-center max-w-2xl mx-auto kx-reveal">
          <span className="kx-eyebrow">Del caos al control</span>
          <h2 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.08]">
            Arrastra y mira la <span className="kx-serif kx-grad-text">diferencia</span>.
          </h2>
        </div>
        <div
          ref={containerRef}
          className="kx-compare kx-reveal mt-12 h-[460px] sm:h-[420px] cursor-ew-resize"
          onPointerDown={(event) => { dragging.current = true; updateFromClientX(event.clientX); }}
          role="slider"
          aria-label="Comparar antes y después de KIPUX"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(position)}
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') setPosition((p) => Math.max(4, p - 5));
            if (event.key === 'ArrowRight') setPosition((p) => Math.min(96, p + 5));
          }}
        >
          <OrderSide />
          <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
            <ChaosSide />
          </div>
          <div className="kx-compare-handle" style={{ left: `${position}%` }}>
            <div className="kx-compare-knob"><ChevronsLeftRight className="w-6 h-6" /></div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ Un día con KIPUX */

const DAY = [
  { time: '7:30 a. m.', icon: Sun, title: 'Entrada sin colas', text: 'Los alumnos pasan su carné por el kiosco. Las tardanzas se marcan solas y los padres reciben el aviso.' },
  { time: '10:00 a. m.', icon: GraduationCap, title: 'El docente registra notas en clase', text: 'Desde la computadora o el celular. La libreta se arma sola con la escala del CNEB.' },
  { time: '1:00 p. m.', icon: Coffee, title: 'Secretaría cobra y cuadra caja', text: 'Recibos numerados y cierre del día por efectivo, transferencia o tarjeta, sin hojas sueltas.' },
  { time: '4:00 p. m.', icon: MessageCircle, title: 'Los padres preguntan, el sistema responde', text: 'Semáforo de cada hijo, comunicados y mensajes con horario de atención para el docente.' },
  { time: '8:00 p. m.', icon: Moon, title: 'KIPUX trabaja mientras descansas', text: 'Recordatorios de pago y de tareas por vencer salen automáticamente. Mañana todo sigue en orden.' },
];

export const DayTimeline: React.FC = () => {
  const listRef = useRef<HTMLDivElement | null>(null);
  const [fill, setFill] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const rect = listRef.current?.getBoundingClientRect();
      if (!rect) return;
      const progress = (window.innerHeight * 0.6 - rect.top) / rect.height;
      setFill(Math.min(1, Math.max(0, progress)));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <section id="como-funciona" className="kx-section-dark py-24 sm:py-32 relative overflow-hidden scroll-mt-20">
      <div className="kx-hero-grid" />
      <div className="relative max-w-6xl mx-auto px-5 sm:px-8 grid lg:grid-cols-[0.9fr_1.1fr] gap-14">
        <div className="lg:sticky lg:top-32 self-start kx-reveal">
          <span className="kx-eyebrow">Un día con KIPUX</span>
          <h2 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.08]">
            Así se siente un colegio que <span className="kx-serif kx-grad-text">fluye</span>.
          </h2>
          <p className="mt-6 text-lg kx-on-dark leading-relaxed">
            Dirección, secretaría, docentes y familias trabajan sobre la misma información. Cada uno ve solo lo que le corresponde.
          </p>
        </div>
        <div ref={listRef} className="relative pl-16">
          <div className="kx-timeline-line" />
          <div className="kx-timeline-fill" style={{ height: `${fill * 100}%` }} />
          <div className="space-y-12">
            {DAY.map(({ time, icon: Icon, title, text }, index) => {
              const reached = fill >= index / (DAY.length - 1) - 0.05;
              return (
                <div key={time} className="relative kx-reveal">
                  <span
                    className="absolute -left-16 top-0 w-12 h-12 rounded-full grid place-items-center border transition-all duration-500"
                    style={{ background: reached ? 'var(--kx-coral)' : 'var(--kx-navy-2)', borderColor: reached ? 'var(--kx-coral)' : 'rgba(255,255,255,.15)', boxShadow: reached ? '0 0 30px rgba(239,122,76,.45)' : 'none' }}
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </span>
                  <p className="text-sm font-bold text-[var(--kx-coral)]">{time}</p>
                  <h3 className="mt-1 text-xl sm:text-2xl font-extrabold">{title}</h3>
                  <p className="mt-2 kx-on-dark leading-relaxed">{text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
