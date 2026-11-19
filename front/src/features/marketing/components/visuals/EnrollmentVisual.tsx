import React from 'react';
import { ClipboardList, FileSpreadsheet, GraduationCap } from 'lucide-react';

export const EnrollmentVisual: React.FC = () => (
  <div className="grid sm:grid-cols-2 gap-4">
    <div className="kx-card !rounded-2xl p-5">
      <p className="text-sm font-bold">Ficha única de matrícula</p>
      <div className="mt-4 space-y-3">
        {[
          ['Alumno', 'Sofía Huamán Torres'],
          ['Aula', '1.° Secundaria · A'],
          ['Apoderado', 'Carlos Huamán (padre)'],
          ['Pensión', 'S/ 350 · hermanos −25 %'],
        ].map(([label, value], index) => (
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
        {
          icon: ClipboardList,
          title: 'Constancias al instante',
          detail: 'Matrícula y no adeudo con código de verificación',
        },
        {
          icon: GraduationCap,
          title: 'Admisión por etapas',
          detail: 'Postulante → entrevista → admitido → matriculado',
        },
      ].map(({ icon: Icon, title, detail }, index) => (
        <div
          key={title}
          className="kx-card !rounded-xl p-4 flex gap-3 kx-panel-enter"
          style={{ animationDelay: `${0.2 + index * 0.1}s` }}
        >
          <span
            className="w-10 h-10 rounded-xl grid place-items-center shrink-0"
            style={{ background: 'rgba(108,79,163,.1)', color: 'var(--kx-purple)' }}
          >
            <Icon className="w-5 h-5" />
          </span>
          <div>
            <p className="text-sm font-bold">{title}</p>
            <p className="text-xs kx-muted">{detail}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);
