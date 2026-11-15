/**
 * Reglas puras de los leads comerciales (sin base de datos), para poder probarlas.
 */

export const LEAD_STATUSES = ['NEW', 'CONTACTED', 'DEMO_SCHEDULED', 'WON', 'LOST'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const STUDENT_RANGES = ['<150', '150-500', '>500'] as const;
export type StudentRange = (typeof STUDENT_RANGES)[number];

export const LEAD_PLANS = ['BASIC', 'PRO', 'ENTERPRISE'] as const;

/** Deja solo dígitos y quita el prefijo de Perú (51) si viene con él. */
export function normalizePeruPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  const local = digits.length === 11 && digits.startsWith('51') ? digits.slice(2) : digits;
  if (/^9\d{8}$/.test(local)) return local; // celular
  if (/^\d{7,8}$/.test(local)) return local; // fijo con o sin código de ciudad
  return null;
}

const DECISION_ROLES = ['director', 'directora', 'promotor', 'promotora', 'propietario', 'propietaria', 'gerente', 'dueño', 'dueña'];

export interface LeadScoreInput {
  role: string;
  studentRange?: string | null;
  email?: string | null;
  message?: string | null;
  interestPlan?: string | null;
}

/**
 * Prioridad del lead (0–100) para ordenar la bandeja: quién decide, tamaño del colegio,
 * si dejó correo y si escribió un mensaje concreto.
 */
export function scoreLead(input: LeadScoreInput): number {
  let score = 20;
  const role = input.role.toLowerCase();
  if (DECISION_ROLES.some((decisionRole) => role.includes(decisionRole))) score += 30;
  else if (role.includes('administr') || role.includes('subdirector')) score += 15;
  if (input.studentRange === '150-500') score += 20;
  else if (input.studentRange === '>500') score += 25;
  else if (input.studentRange === '<150') score += 10;
  if (input.email) score += 10;
  if (input.message && input.message.trim().length >= 20) score += 10;
  if (input.interestPlan === 'PRO' || input.interestPlan === 'ENTERPRISE') score += 5;
  return Math.min(score, 100);
}
