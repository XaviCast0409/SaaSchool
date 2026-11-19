export const DAY_MS = 86_400_000;
/** Días sin actividad para considerar que un colegio se está enfriando */
export const INACTIVE_DAYS = 14;
/** % del cupo de alumnos a partir del cual conviene ofrecer subir de plan */
export const QUOTA_WARN_PERCENT = 90;
/** Días antes del vencimiento en que el colegio aparece en "Requiere atención" */
export const EXPIRY_WARN_DAYS = 15;

export type AttentionReason = { tone: 'danger' | 'warn' | 'info'; label: string };
export const TONE_RANK: Record<AttentionReason['tone'], number> = { danger: 0, warn: 1, info: 2 };
