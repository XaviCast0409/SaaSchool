/**
 * Reglas puras del semáforo por hijo y de las insignias del alumno (sin base de datos).
 */

export type Light = 'GREEN' | 'YELLOW' | 'RED' | 'GRAY';

export interface LightResult {
  light: Light;
  label: string;
  detail: string;
}

const PRESENT = new Set(['PRESENT', 'LATE_JUSTIFIED', 'LATE_UNJUSTIFIED', 'ABSENT_JUSTIFIED']);

/** Asistencia de los últimos 30 días: faltas justificadas no penalizan. ≥95 % verde, ≥85 % amarillo. */
export function attendanceLight(statuses: string[]): LightResult {
  if (statuses.length === 0) return { light: 'GRAY', label: 'Asistencia', detail: 'Sin registros este mes' };
  const ok = statuses.filter((s) => PRESENT.has(s)).length;
  const pct = Math.round((ok / statuses.length) * 100);
  const unjustified = statuses.filter((s) => s === 'ABSENT_UNJUSTIFIED').length;
  const light: Light = pct >= 95 ? 'GREEN' : pct >= 85 ? 'YELLOW' : 'RED';
  return { light, label: 'Asistencia', detail: `${pct} % · ${unjustified} falta${unjustified === 1 ? '' : 's'} sin justificar` };
}

/** Notas publicadas (último periodo cerrado): alguna C = rojo, alguna B = amarillo. */
export function gradesLight(letters: string[], periodLabel: string | null): LightResult {
  const valid = letters.filter((l) => ['AD', 'A', 'B', 'C'].includes(l));
  if (!periodLabel || valid.length === 0) return { light: 'GRAY', label: 'Notas', detail: 'Aún sin notas publicadas' };
  const c = valid.filter((l) => l === 'C').length;
  const b = valid.filter((l) => l === 'B').length;
  if (c) return { light: 'RED', label: 'Notas', detail: `${c} competencia${c > 1 ? 's' : ''} en C · ${periodLabel}` };
  if (b) return { light: 'YELLOW', label: 'Notas', detail: `${b} competencia${b > 1 ? 's' : ''} en B · ${periodLabel}` };
  return { light: 'GREEN', label: 'Notas', detail: `Todo en A o AD · ${periodLabel}` };
}

/** Tareas vencidas sin entregar (últimos 30 días): 0 verde, 1–2 amarillo, 3+ rojo. */
export function homeworkLight(overdueMissing: number, dueSoon: number): LightResult {
  const soon = dueSoon ? ` · ${dueSoon} por entregar esta semana` : '';
  if (overdueMissing === 0) return { light: 'GREEN', label: 'Tareas', detail: `Todas entregadas${soon}` };
  return { light: overdueMissing >= 3 ? 'RED' : 'YELLOW', label: 'Tareas', detail: `${overdueMissing} sin entregar${soon}` };
}

/** Pagos: vencido = rojo, vence en 7 días = amarillo. Solo informativo (Ley 27665: no condiciona nada). */
export function paymentsLight(overdueAmount: number, dueSoonAmount: number): LightResult {
  if (overdueAmount > 0) return { light: 'RED', label: 'Pagos', detail: `S/ ${overdueAmount.toFixed(2)} vencido` };
  if (dueSoonAmount > 0) return { light: 'YELLOW', label: 'Pagos', detail: `S/ ${dueSoonAmount.toFixed(2)} vence esta semana` };
  return { light: 'GREEN', label: 'Pagos', detail: 'Al día' };
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  emoji: string;
  earned: boolean;
  progress?: string;
}

/**
 * Insignias del alumno. Son personales: solo las ven el alumno y su familia (sin rankings).
 * `monthStatuses` y `recentStatuses` van en orden cronológico (del más antiguo al más reciente).
 */
export function computeBadges(input: {
  monthStatuses: string[];
  recentStatuses: string[];
  homeworkDue30: number;
  homeworkOnTime30: number;
}): Badge[] {
  const { monthStatuses, recentStatuses, homeworkDue30, homeworkOnTime30 } = input;
  const punctual = monthStatuses.length >= 8 && monthStatuses.every((s) => s === 'PRESENT');
  const noUnjustified = monthStatuses.length >= 8 && !monthStatuses.includes('ABSENT_UNJUSTIFIED');

  let streak = 0;
  for (let i = recentStatuses.length - 1; i >= 0; i--) {
    if (['PRESENT', 'LATE_JUSTIFIED', 'LATE_UNJUSTIFIED'].includes(recentStatuses[i])) streak++;
    else break;
  }

  return [
    {
      id: 'punctual',
      title: 'Puntualidad del mes',
      description: 'Llegaste a tiempo todos los días de este mes.',
      emoji: '⏰',
      earned: punctual,
      progress: punctual ? undefined : `${monthStatuses.filter((s) => s === 'PRESENT').length}/${monthStatuses.length} días a tiempo`,
    },
    {
      id: 'streak',
      title: streak >= 20 ? 'Racha imparable' : 'Racha de asistencia',
      description: '10 días seguidos o más sin faltar.',
      emoji: '🔥',
      earned: streak >= 10,
      progress: `${streak} día${streak === 1 ? '' : 's'} seguido${streak === 1 ? '' : 's'}`,
    },
    {
      id: 'homework',
      title: 'Tareas al día',
      description: 'Entregaste a tiempo todas las tareas del último mes (mínimo 3).',
      emoji: '📚',
      earned: homeworkDue30 >= 3 && homeworkOnTime30 === homeworkDue30,
      progress: homeworkDue30 ? `${homeworkOnTime30}/${homeworkDue30} a tiempo` : 'Sin tareas este mes',
    },
    {
      id: 'attendance',
      title: 'Mes sin faltas',
      description: 'Ninguna falta sin justificar en el mes.',
      emoji: '🌟',
      earned: noUnjustified,
    },
  ];
}
