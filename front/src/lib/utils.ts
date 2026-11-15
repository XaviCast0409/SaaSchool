import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface PersonNameInput {
  firstName?: string | null;
  firstNames?: string | null;
  lastNamePaternal?: string | null;
  lastNameMaternal?: string | null;
}

export function formatFullName(
  person: PersonNameInput,
  format: 'LAST_FIRST' | 'FIRST_LAST' = 'FIRST_LAST',
): string {
  const first = (person.firstNames || person.firstName || '').trim();
  const paternal = (person.lastNamePaternal || '').trim();
  const maternal = (person.lastNameMaternal || '').trim();

  const lastNames = [paternal, maternal].filter(Boolean).join(' ');

  if (format === 'LAST_FIRST') {
    if (lastNames && first) return `${lastNames}, ${first}`;
    return lastNames || first;
  }

  return [first, lastNames].filter(Boolean).join(' ');
}

export const EDUCATION_LEVEL_LABELS: Record<string, string> = {
  INITIAL: 'Inicial',
  PRIMARY: 'Primaria',
  SECONDARY: 'Secundaria',
};

export function formatEducationLevel(level?: string | null): string {
  if (!level) return '';
  return EDUCATION_LEVEL_LABELS[level] || level;
}

export const SHIFT_LABELS: Record<string, string> = {
  MORNING: 'Mañana',
  AFTERNOON: 'Tarde',
  NIGHT: 'Noche',
};

export function formatShift(shift?: string | null): string {
  if (!shift) return '';
  return SHIFT_LABELS[shift] || shift;
}
