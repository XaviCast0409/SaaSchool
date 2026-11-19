import type { SiagieConversion } from '../types/siagie';

export function getSiagieConversion(score: number): SiagieConversion {
  const rounded = Math.round(score * 10) / 10;
  if (rounded >= 17.5) {
    return {
      letter: 'AD',
      label: 'Logro Destacado',
      variant: 'default',
      badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
      textClass: 'text-emerald-600 dark:text-emerald-400',
    };
  }
  if (rounded >= 13.5) {
    return {
      letter: 'A',
      label: 'Logro Esperado',
      variant: 'secondary',
      badgeClass: 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30',
      textClass: 'text-sky-600 dark:text-sky-400',
    };
  }
  if (rounded >= 10.5) {
    return {
      letter: 'B',
      label: 'En Proceso',
      variant: 'outline',
      badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
      textClass: 'text-amber-600 dark:text-amber-400',
    };
  }
  return {
    letter: 'C',
    label: 'En Inicio',
    variant: 'destructive',
    badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30',
    textClass: 'text-rose-600 dark:text-rose-400',
  };
}
