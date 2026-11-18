import React from 'react';
import { School as SchoolIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGetActiveSchool } from '../api/useSchool';

/** Datos de identidad del colegio que van en los documentos impresos. */
export interface SchoolBranding {
  name: string;
  logoUrl?: string | null;
  modularCode?: string | null;
  documentId?: string | null;
  address?: string | null;
}

/** Identidad del colegio activo (el de la sesión o, en modo soporte, el visitado). */
export const useSchoolBranding = (): SchoolBranding | null => {
  const { data: school } = useGetActiveSchool();
  if (!school) return null;
  return {
    name: school.name,
    logoUrl: school.logoUrl,
    modularCode: school.modularCode,
    documentId: school.documentId,
    address: school.address,
  };
};

/** Logo del colegio; sin logo muestra un ícono neutro para no dejar el hueco vacío. */
export const SchoolLogo: React.FC<{
  logoUrl?: string | null;
  name?: string;
  className?: string;
  fallback?: boolean;
}> = ({ logoUrl, name, className, fallback = true }) => {
  if (logoUrl)
    return <img src={logoUrl} alt={name ? `Logo de ${name}` : ''} className={cn('object-contain', className)} />;
  if (!fallback) return null;
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded border border-border text-muted-foreground',
        className,
      )}
      aria-hidden
    >
      <SchoolIcon className="h-1/2 w-1/2" />
    </span>
  );
};

interface LetterheadProps {
  /** Por defecto, el colegio activo. Pásalo cuando el documento ya trae los datos del colegio. */
  school?: SchoolBranding | null;
  /** Título del documento (p. ej. "Recibo interno de pago"). */
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Contenido a la derecha (número de documento, fecha…). */
  aside?: React.ReactNode;
  /** centered: membrete centrado (recibos, constancias); row: logo a la izquierda y datos al lado. */
  variant?: 'row' | 'centered';
  className?: string;
}

/**
 * Membrete institucional para los documentos internos: logo, nombre, código modular, RUC y
 * dirección del colegio. Usa los colores del tema, igual que el resto de documentos.
 */
export const SchoolLetterhead: React.FC<LetterheadProps> = ({
  school: schoolProp,
  title,
  subtitle,
  aside,
  variant = 'row',
  className,
}) => {
  const active = useSchoolBranding();
  const school = schoolProp ?? active;
  const name = school?.name || 'Institución Educativa';
  const ids = [
    school?.modularCode ? `Cód. modular: ${school.modularCode}` : null,
    school?.documentId ? `RUC: ${school.documentId}` : null,
  ].filter(Boolean);

  if (variant === 'centered') {
    return (
      <div className={cn('space-y-1 border-b border-border pb-3 text-center', className)}>
        <SchoolLogo logoUrl={school?.logoUrl} name={name} fallback={false} className="mx-auto h-16 w-16" />
        <p className="text-base font-black uppercase leading-tight tracking-wide">{name}</p>
        {ids.length > 0 && <p className="text-[11px] text-muted-foreground">{ids.join(' · ')}</p>}
        {school?.address && <p className="text-[11px] text-muted-foreground">{school.address}</p>}
        {title && <p className="pt-1 text-sm font-bold uppercase">{title}</p>}
        {subtitle && <div className="text-[11px] text-muted-foreground">{subtitle}</div>}
        {aside}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center justify-between gap-4 border-b border-border pb-3', className)}>
      <div className="flex min-w-0 items-center gap-3">
        <SchoolLogo logoUrl={school?.logoUrl} name={name} className="h-14 w-14 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-black uppercase leading-tight tracking-tight">{name}</p>
          {ids.length > 0 && <p className="text-[11px] text-muted-foreground">{ids.join(' · ')}</p>}
          {school?.address && <p className="text-[11px] text-muted-foreground">{school.address}</p>}
        </div>
      </div>
      {(title || subtitle || aside) && (
        <div className="shrink-0 text-right">
          {title && <p className="text-sm font-bold uppercase">{title}</p>}
          {subtitle && <div className="text-[11px] text-muted-foreground">{subtitle}</div>}
          {aside}
        </div>
      )}
    </div>
  );
};
