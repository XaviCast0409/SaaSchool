import React, { useEffect, useState } from 'react';
import { AlertTriangle, BarChart3, Check, ClipboardList, FileSpreadsheet, GraduationCap, MessageCircle, QrCode, Smartphone, Wallet } from 'lucide-react';

const AUTO_ADVANCE_MS = 7000;

const QrVisual = () => (
  <div className="grid sm:grid-cols-[1fr_1.1fr] gap-4 h-full">
    <div className="rounded-2xl bg-[var(--kx-navy)] p-5 flex flex-col items-center justify-center relative overflow-hidden min-h-[220px]">
      <div className="relative w-36 h-36 rounded-2xl border-2 border-white/30 grid place-items-center">
        <QrCode className="w-20 h-20 text-white/85" />
        <span className="absolute left-2 right-2 h-0.5 bg-[var(--kx-coral)] shadow-[0_0_14px_var(--kx-coral)]" style={{ animation: 'kx-scan 2.4s ease-in-out infinite' }} />
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
        <div key={row.name} className="kx-card !rounded-xl px-4 py-3 flex items-center justify-between kx-panel-enter" style={{ animationDelay: `${index * 0.12}s` }}>
          <div>
            <p className="text-sm font-bold">{row.name}</p>
            <p className="text-xs kx-muted">{row.time}</p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ color: row.color, background: `color-mix(in srgb, ${row.color} 12%, transparent)` }}>{row.status}</span>
        </div>
      ))}
    </div>
  </div>
);

const GradesVisual = () => {
  const rows = [
    ['Ana T.', 'AD', 'A', 'A', 'AD'],
    ['Bruno L.', 'A', 'B', 'A', 'A'],
    ['Camila R.', 'A', 'A', 'AD', 'A'],
    ['Diego V.', 'B', 'C', 'B', 'B'],
  ];
  const color = (grade: string) => ({ AD: 'var(--kx-purple)', A: 'var(--kx-green)', B: 'var(--kx-amber)', C: 'var(--kx-red)' })[grade] ?? 'var(--kx-muted)';
  return (
    <div className="kx-card !rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--kx-line)] flex items-center justify-between">
        <p className="text-sm font-bold">Comunicación · 3.° B · Bimestre II</p>
        <span className="text-xs kx-muted flex items-center gap-1"><Check className="w-3.5 h-3.5 text-[var(--kx-green)]" /> Guardado automático</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs kx-muted">
              <th className="text-left font-semibold px-4 py-2.5">Alumno</th>
              {['C1', 'C2', 'C3', 'Final'].map((h) => <th key={h} className="font-semibold px-3 py-2.5">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(([name, ...grades], rowIndex) => (
              <tr key={name} className="border-t border-[var(--kx-line)] kx-panel-enter" style={{ animationDelay: `${rowIndex * 0.1}s` }}>
                <td className="px-4 py-2.5 font-semibold">{name}</td>
                {grades.map((grade, index) => (
                  <td key={index} className="px-3 py-2.5 text-center">
                    <span className="inline-grid place-items-center w-9 h-7 rounded-lg text-xs font-extrabold" style={{ color: color(grade), background: `color-mix(in srgb, ${color(grade)} 13%, transparent)`, outline: index === 3 ? `1.5px solid ${color(grade)}` : undefined }}>{grade}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 bg-[var(--kx-paper)] text-xs kx-muted flex flex-wrap gap-x-4 gap-y-1">
        <span>Escala literal o vigesimal</span><span>Bimestres o trimestres</span><span>Libreta lista para imprimir</span>
      </div>
    </div>
  );
};

const PaymentsVisual = () => (
  <div className="grid sm:grid-cols-[1.2fr_1fr] gap-4">
    <div className="space-y-2.5">
      {[
        { family: 'Familia Quispe', concept: 'Pensión de abril', amount: 'S/ 350', state: 'Vence mañana', color: 'var(--kx-amber)' },
        { family: 'Familia Rojas', concept: 'Pensión de marzo', amount: 'S/ 350', state: 'Vencida', color: 'var(--kx-red)' },
        { family: 'Familia Salas', concept: 'Pensión de abril', amount: 'S/ 175', state: 'Media beca · pagado', color: 'var(--kx-green)' },
      ].map((row, index) => (
        <div key={row.family} className="kx-card !rounded-xl px-4 py-3 flex items-center gap-3 kx-panel-enter" style={{ animationDelay: `${index * 0.12}s` }}>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold">{row.family}</p>
            <p className="text-xs kx-muted">{row.concept} · <span style={{ color: row.color }} className="font-semibold">{row.state}</span></p>
          </div>
          <p className="text-sm font-extrabold">{row.amount}</p>
          {row.color !== 'var(--kx-green)' && (
            <span className="w-8 h-8 rounded-full grid place-items-center bg-[#25d366] text-white" title="Recordar por WhatsApp"><MessageCircle className="w-4 h-4" /></span>
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
        {[['Efectivo', 55], ['Transferencia', 35], ['Tarjeta', 10]].map(([label, pct]) => (
          <div key={label as string}>
            <div className="flex justify-between"><span>{label}</span><span>{pct} %</span></div>
            <div className="mt-1 h-1.5 rounded-full bg-white/10"><div className="h-full rounded-full bg-[var(--kx-coral)]" style={{ width: `${pct}%` }} /></div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const FamilyVisual = () => (
  <div className="flex justify-center">
    <div className="w-[260px] rounded-[36px] bg-[var(--kx-navy)] p-3 shadow-2xl">
      <div className="rounded-[28px] bg-[var(--kx-paper)] p-4 min-h-[380px]">
        <div className="mx-auto w-20 h-1.5 rounded-full bg-black/10 mb-4" />
        <p className="text-xs kx-muted">Hola, Rosa 👋</p>
        <div className="mt-2 flex gap-2">
          {['Lucas · 3.° Prim', 'Valeria · 2.° Sec'].map((child, index) => (
            <span key={child} className={`text-xs font-bold px-2.5 py-1.5 rounded-full ${index === 0 ? 'bg-[var(--kx-navy)] text-white' : 'bg-white border border-[var(--kx-line)]'}`}>{child}</span>
          ))}
        </div>
        <div className="mt-4 space-y-2">
          {[
            { label: 'Asistencia', detail: '98 % este mes', color: 'var(--kx-green)' },
            { label: 'Notas', detail: '1 competencia en B', color: 'var(--kx-amber)' },
            { label: 'Tareas', detail: 'Todas entregadas', color: 'var(--kx-green)' },
            { label: 'Pagos', detail: 'Al día', color: 'var(--kx-green)' },
          ].map((item, index) => (
            <div key={item.label} className="bg-white rounded-xl px-3 py-2.5 flex items-center gap-3 border border-[var(--kx-line)] kx-panel-enter" style={{ animationDelay: `${index * 0.1}s` }}>
              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: item.color, boxShadow: `0 0 8px ${item.color}` }} />
              <div>
                <p className="text-xs font-bold">{item.label}</p>
                <p className="text-xs kx-muted">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-xl p-3 text-xs" style={{ background: 'rgba(239,122,76,.1)' }}>
          <p className="font-bold" style={{ color: 'var(--kx-coral)' }}>📣 Comunicado importante</p>
          <p className="kx-muted mt-0.5">Jornada de padres el viernes 9:00 a. m.</p>
        </div>
      </div>
    </div>
  </div>
);

const EnrollmentVisual = () => (
  <div className="grid sm:grid-cols-2 gap-4">
    <div className="kx-card !rounded-2xl p-5">
      <p className="text-sm font-bold">Ficha única de matrícula</p>
      <div className="mt-4 space-y-3">
        {[['Alumno', 'Sofía Huamán Torres'], ['Aula', '1.° Secundaria · A'], ['Apoderado', 'Carlos Huamán (padre)'], ['Pensión', 'S/ 350 · hermanos −25 %']].map(([label, value], index) => (
          <div key={label} className="kx-panel-enter" style={{ animationDelay: `${index * 0.1}s` }}>
            <p className="text-xs kx-muted">{label}</p>
            <p className="text-sm font-semibold border-b border-dashed border-[var(--kx-line)] pb-1.5">{value}</p>
          </div>
        ))}
      </div>
    </div>
    <div className="space-y-3">
      {[
        { icon: FileSpreadsheet, title: 'Nómina SIAGIE en Excel', detail: 'Formato oficial, edad al 31 de marzo' },
        { icon: ClipboardList, title: 'Constancias al instante', detail: 'Matrícula y no adeudo con código de verificación' },
        { icon: GraduationCap, title: 'Admisión por etapas', detail: 'Postulante → entrevista → admitido → matriculado' },
      ].map(({ icon: Icon, title, detail }, index) => (
        <div key={title} className="kx-card !rounded-xl p-4 flex gap-3 kx-panel-enter" style={{ animationDelay: `${0.2 + index * 0.1}s` }}>
          <span className="w-10 h-10 rounded-xl grid place-items-center shrink-0" style={{ background: 'rgba(108,79,163,.1)', color: 'var(--kx-purple)' }}><Icon className="w-5 h-5" /></span>
          <div>
            <p className="text-sm font-bold">{title}</p>
            <p className="text-xs kx-muted">{detail}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const InsightsVisual = () => (
  <div className="kx-card !rounded-2xl p-5">
    <div className="flex items-center justify-between">
      <p className="text-sm font-bold flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-[var(--kx-coral)]" /> Alerta temprana · esta semana</p>
      <span className="text-xs kx-muted">3 alumnos para tutoría</span>
    </div>
    <div className="mt-4 space-y-3">
      {[
        { name: 'Diego V. · 3.° B', reasons: '2 competencias en C · 4 faltas sin justificar', level: 'Alto', color: 'var(--kx-red)', score: 82 },
        { name: 'Marta C. · 5.° A', reasons: '3 tareas vencidas sin entregar', level: 'Medio', color: 'var(--kx-amber)', score: 54 },
        { name: 'Iván P. · 2.° Sec', reasons: '1 competencia bajó de nivel', level: 'Bajo', color: 'var(--kx-green)', score: 28 },
      ].map((row, index) => (
        <div key={row.name} className="kx-panel-enter" style={{ animationDelay: `${index * 0.12}s` }}>
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold">{row.name}</span>
            <span className="text-xs font-bold" style={{ color: row.color }}>Riesgo {row.level}</span>
          </div>
          <p className="text-xs kx-muted mt-0.5">{row.reasons}</p>
          <div className="mt-2 h-1.5 rounded-full bg-[var(--kx-line)] overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${row.score}%`, background: row.color, transition: 'width 1s ease' }} />
          </div>
        </div>
      ))}
    </div>
    <p className="mt-4 text-xs kx-muted">La deuda de pensiones nunca se usa para evaluar al alumno.</p>
  </div>
);

const FEATURES = [
  {
    id: 'asistencia', icon: QrCode, label: 'Asistencia', title: 'Un escaneo en la puerta y todos saben que llegó.',
    text: 'Carné con QR para cada alumno. Tardanzas según tu horario, aviso al celular del padre y control de quién recoge a cada niño.',
    points: ['Kiosco con cámara o lector', 'Justificaciones desde la app', 'Alertas de ausentismo'], visual: QrVisual,
  },
  {
    id: 'notas', icon: GraduationCap, label: 'Notas', title: 'Notas por competencias, sin pelear con Excel.',
    text: 'Una matriz que el docente ya conoce, con la malla del CNEB cargada, promedios automáticos y libretas listas.',
    points: ['AD · A · B · C o vigesimal', 'Cierre de actas por Dirección', 'Guardado aunque se vaya la luz'], visual: GradesVisual,
  },
  {
    id: 'pensiones', icon: Wallet, label: 'Pensiones', title: 'Cobra a tiempo sin incomodar a nadie.',
    text: 'Cronograma anual con becas y descuentos, recordatorios automáticos y caja cuadrada al final de cada día.',
    points: ['Recordatorio por WhatsApp en 1 clic', 'Recibos numerados', 'Reportes de cobranza'], visual: PaymentsVisual,
  },
  {
    id: 'familias', icon: Smartphone, label: 'Familias', title: 'Los padres informados, sin grupos de WhatsApp.',
    text: 'Un portal para todos sus hijos: asistencia, notas, tareas y pagos en un semáforo fácil de entender.',
    points: ['Comunicados y mensajería', 'Agenda de entrevistas', 'Notificaciones al celular'], visual: FamilyVisual,
  },
  {
    id: 'matricula', icon: ClipboardList, label: 'Matrícula', title: 'Matricula en minutos y entrega al SIAGIE sin redigitar.',
    text: 'Alumno, aula y apoderado en una sola ficha. Nóminas oficiales, constancias y admisión ordenada.',
    points: ['Importa nóminas del SIAGIE', 'Becas y pensión por alumno', 'Libro de Reclamaciones virtual'], visual: EnrollmentVisual,
  },
  {
    id: 'reportes', icon: BarChart3, label: 'Reportes', title: 'Detecta a tiempo al alumno que se está quedando.',
    text: 'La alerta temprana cruza faltas, notas, tareas e incidencias y te dice por qué. Más reportes oficiales y orden de mérito.',
    points: ['Tercio y quinto superior', 'Consolidados en Excel', 'Automatizaciones semanales'], visual: InsightsVisual,
  },
] as const;

/** Funciones principales en pestañas que avanzan solas, cada una con su vista de ejemplo. */
export const FeatureTabs: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(() => setActiveIndex((index) => (index + 1) % FEATURES.length), AUTO_ADVANCE_MS);
    return () => window.clearTimeout(timer);
  }, [activeIndex, paused]);

  const feature = FEATURES[activeIndex]!;
  const Visual = feature.visual;

  return (
    <section id="funciones" className="py-24 sm:py-32 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="max-w-3xl kx-reveal">
          <span className="kx-eyebrow">Todo en un solo lugar</span>
          <h2 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.08]">
            Seis problemas de siempre, <span className="kx-serif kx-grad-text">resueltos</span> en una plataforma.
          </h2>
        </div>

        <div className="mt-12 grid lg:grid-cols-[300px_1fr] gap-8" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
          <div className="flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0 -mx-5 px-5 lg:mx-0 lg:px-0 kx-reveal" role="tablist">
            {FEATURES.map((item, index) => {
              const Icon = item.icon;
              const isActive = index === activeIndex;
              return (
                <button
                  key={item.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveIndex(index)}
                  className={`kx-tab shrink-0 text-left px-4 py-3.5 ${isActive ? 'is-active' : ''}`}
                >
                  <span className="flex items-center gap-3 font-bold">
                    <Icon className="w-5 h-5" /> {item.label}
                  </span>
                  {isActive && (
                    <span className="kx-tab-progress mt-3 hidden lg:block">
                      <span key={`${activeIndex}-${paused}`} style={{ animationDuration: `${AUTO_ADVANCE_MS}ms`, animationPlayState: paused ? 'paused' : 'running' }} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div key={feature.id} className="kx-panel-enter rounded-[28px] bg-white border border-[var(--kx-line)] p-6 sm:p-10 grid gap-8">
            <div className="lg:grid lg:grid-cols-[1.3fr_1fr] lg:gap-10 lg:items-end">
              <div>
                <h3 className="text-2xl sm:text-3xl font-extrabold leading-tight">{feature.title}</h3>
                <p className="mt-4 kx-muted text-base sm:text-lg leading-relaxed">{feature.text}</p>
              </div>
              <ul className="mt-6 lg:mt-0 space-y-3">
                {feature.points.map((point) => (
                  <li key={point} className="flex items-center gap-3 font-semibold">
                    <span className="w-6 h-6 rounded-full grid place-items-center" style={{ background: 'rgba(239,122,76,.14)', color: 'var(--kx-coral)' }}><Check className="w-4 h-4" /></span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
            <div className="min-w-0"><Visual /></div>
          </div>
        </div>
      </div>
    </section>
  );
};
