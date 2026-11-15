import React from 'react';
import { cn } from '@/lib/utils';
import logoLight from '@/assets/brand/kipux-logo-light.png';
import logoDark from '@/assets/brand/kipux-logo-dark.png';
import markLight from '@/assets/brand/kipux-mark-light.png';
import markDark from '@/assets/brand/kipux-mark-dark.png';

interface KipuxLogoProps {
  /** `full`: K + "KIPUX" + lema. `mark`: solo la K (espacios cuadrados pequeños). */
  variant?: 'full' | 'mark';
  /** Clases de tamaño: se aplican a la imagen (p. ej. `h-10`, `h-6 w-6`). */
  className?: string;
}

/**
 * Logo de la empresa (KIPUX). Muestra la versión para fondo claro o la de fondo
 * oscuro según la clase `dark` del <html>, así acompaña al cambio de tema de la app.
 */
export const KipuxLogo: React.FC<KipuxLogoProps> = ({ variant = 'full', className }) => {
  const [light, dark] = variant === 'full' ? [logoLight, logoDark] : [markLight, markDark];
  const alt = variant === 'full' ? 'KIPUX · Revolución educativa' : 'KIPUX';
  const base = cn('w-auto object-contain select-none', className);
  return (
    <>
      <img src={light} alt={alt} className={cn(base, 'dark:hidden')} draggable={false} />
      <img src={dark} alt={alt} className={cn(base, 'hidden dark:block')} draggable={false} />
    </>
  );
};
