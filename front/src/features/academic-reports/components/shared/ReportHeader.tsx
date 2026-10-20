import React from 'react';
import { School as SchoolIcon } from 'lucide-react';
import { SchoolHeaderInfo } from '../../types';

interface ReportHeaderProps {
  school?: SchoolHeaderInfo;
  title: string;
  subtitle?: string;
  tutorTeacher?: string;
  extraInfoRight?: string;
}

export const ReportHeader: React.FC<ReportHeaderProps> = ({
  school,
  title,
  subtitle,
  tutorTeacher,
  extraInfoRight,
}) => {
  const currentDate = new Date().toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const currentTime = new Date().toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div className="border-b border-border pb-3 mb-4 text-foreground">
      {/* Fila Superior: Logo + Nombre / Título / Fecha y Hora */}
      <div className="flex items-center justify-between gap-4">
        {/* Izquierda: Identidad Institucional */}
        <div className="flex items-center gap-3 min-w-[220px]">
          {school?.logoUrl ? (
            <img
              src={school.logoUrl}
              alt={school.name}
              className="h-12 w-12 object-contain rounded border border-border bg-card p-0.5"
            />
          ) : (
            <div className="h-11 w-11 rounded border border-border bg-muted flex items-center justify-center text-primary">
              <SchoolIcon className="w-6 h-6" />
            </div>
          )}
          <div>
            <h2 className="text-sm font-black tracking-tight uppercase leading-tight text-foreground">
              {school?.name || 'INSTITUCIÓN EDUCATIVA'}
            </h2>
            <p className="text-[11px] text-muted-foreground font-medium">Intranet Institucional</p>
            {school?.modularCode && (
              <p className="text-[10px] text-muted-foreground font-mono">Cód. Mod: {school.modularCode}</p>
            )}
          </div>
        </div>

        {/* Centro: Título Oficial */}
        <div className="text-center flex-1">
          <h1 className="text-base sm:text-lg font-black tracking-wide uppercase text-foreground">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-tight mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        {/* Derecha: Metadatos y Fecha de Impresión */}
        <div className="text-right text-[11px] font-mono text-muted-foreground min-w-[180px]">
          <div>Fecha: <span className="font-semibold text-foreground">{currentDate}</span></div>
          <div>Hora: <span className="font-semibold text-foreground">{currentTime}</span></div>
          {extraInfoRight && (
            <div className="text-[10px] font-sans font-bold text-primary mt-0.5">{extraInfoRight}</div>
          )}
        </div>
      </div>

      {/* Subbarra opcional: Tutor de Aula */}
      {tutorTeacher && (
        <div className="flex items-center justify-between mt-2 pt-1 border-t border-dashed border-border/70 text-xs">
          <div>
            <span className="font-bold text-muted-foreground">Tutor(a):</span>{' '}
            <span className="font-semibold uppercase text-foreground">{tutorTeacher}</span>
          </div>
        </div>
      )}
    </div>
  );
};
