import { createStore, del, entries, get, set } from 'idb-keyval';
import type { GradebookData, ResultLetter } from '../types';

/**
 * Notas guardadas en el celular cuando no hay señal. Cada celda (curso + periodo + estudiante +
 * competencia + criterio) guarda solo su último valor, así no se duplica nada al sincronizar.
 */
const queueStore = createStore('saaschool-offline-grades', 'pending');
const cacheStore = createStore('saaschool-offline-gradebooks', 'gradebooks');

export interface PendingGrade {
  assignmentId: string;
  periodNumber: number;
  enrollmentId: string;
  competenceId: string;
  criterionId: string;
  numericScore: number | null;
  literalScore: ResultLetter | null;
  savedAt: string;
}

export const cellKey = (g: Pick<PendingGrade, 'assignmentId' | 'periodNumber' | 'enrollmentId' | 'competenceId' | 'criterionId'>) =>
  `${g.assignmentId}|${g.periodNumber}|${g.enrollmentId}|${g.competenceId}|${g.criterionId}`;

export async function queueGrade(g: Omit<PendingGrade, 'savedAt'>): Promise<void> {
  await set(cellKey(g), { ...g, savedAt: new Date().toISOString() }, queueStore);
}

export async function pendingFor(assignmentId: string, periodNumber: number): Promise<PendingGrade[]> {
  const all = await entries<string, PendingGrade>(queueStore);
  return all.map(([, v]) => v).filter((v) => v.assignmentId === assignmentId && v.periodNumber === periodNumber);
}

export async function allPending(): Promise<PendingGrade[]> {
  return (await entries<string, PendingGrade>(queueStore)).map(([, v]) => v);
}

/** Quita de la cola solo lo que se envió, si nadie lo cambió mientras tanto. */
export async function clearSent(sent: PendingGrade[]): Promise<void> {
  for (const g of sent) {
    const current = await get<PendingGrade>(cellKey(g), queueStore);
    if (current && current.savedAt === g.savedAt) await del(cellKey(g), queueStore);
  }
}

export async function cacheGradebook(data: GradebookData): Promise<void> {
  await set(`${data.assignment.id}|${data.periodNumber}`, { savedAt: new Date().toISOString(), data }, cacheStore);
}

export async function cachedGradebook(assignmentId: string, periodNumber: number): Promise<{ savedAt: string; data: GradebookData } | undefined> {
  return get(`${assignmentId}|${periodNumber}`, cacheStore);
}
