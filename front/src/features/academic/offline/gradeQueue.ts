import { clear, createStore, del, entries, get, set } from 'idb-keyval';
import type { GradebookData, ResultLetter } from '../types';

/**
 * Notas guardadas en el celular cuando no hay señal. Cada celda (curso + periodo + estudiante +
 * competencia + criterio) guarda solo su último valor, así no se duplica nada al sincronizar.
 *
 * Cada nota pendiente lleva el usuario que la puso (ownerId): en un equipo compartido, otro docente
 * nunca ve ni sincroniza notas ajenas con su propia sesión. Al cerrar sesión se borran las libretas
 * cacheadas (datos de menores) y, si el cierre es voluntario, también los pendientes.
 */
const queueStore = createStore('saaschool-offline-grades', 'pending');
const cacheStore = createStore('saaschool-offline-gradebooks', 'gradebooks');

export interface PendingGrade {
  /** Usuario que registró la nota (solo él puede sincronizarla). */
  ownerId: string;
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

/** Clave en IndexedDB: incluye al dueño para que dos usuarios no se pisen la misma celda. */
const storeKey = (g: Pick<PendingGrade, 'ownerId'> & Parameters<typeof cellKey>[0]) => `${g.ownerId}|${cellKey(g)}`;

export async function queueGrade(g: Omit<PendingGrade, 'savedAt'>): Promise<void> {
  await set(storeKey(g), { ...g, savedAt: new Date().toISOString() }, queueStore);
}

export async function pendingFor(ownerId: string, assignmentId: string, periodNumber: number): Promise<PendingGrade[]> {
  const all = await entries<string, PendingGrade>(queueStore);
  return all
    .map(([, v]) => v)
    .filter((v) => v.ownerId === ownerId && v.assignmentId === assignmentId && v.periodNumber === periodNumber);
}

/** Notas pendientes de sincronizar de un usuario (para avisar antes de cerrar sesión). */
export async function countPendingGrades(ownerId: string): Promise<number> {
  const all = await entries<string, PendingGrade>(queueStore);
  return all.filter(([, v]) => v.ownerId === ownerId).length;
}

/** Quita de la cola solo lo que se envió, si nadie lo cambió mientras tanto. */
export async function clearSent(sent: PendingGrade[]): Promise<void> {
  for (const g of sent) {
    const current = await get<PendingGrade>(storeKey(g), queueStore);
    if (current && current.savedAt === g.savedAt) await del(storeKey(g), queueStore);
  }
}

export async function cacheGradebook(ownerId: string, data: GradebookData): Promise<void> {
  await set(`${ownerId}|${data.assignment.id}|${data.periodNumber}`, { savedAt: new Date().toISOString(), data }, cacheStore);
}

export async function cachedGradebook(
  ownerId: string,
  assignmentId: string,
  periodNumber: number,
): Promise<{ savedAt: string; data: GradebookData } | undefined> {
  return get(`${ownerId}|${assignmentId}|${periodNumber}`, cacheStore);
}

/** Borra las libretas cacheadas (nombres y notas de estudiantes). */
export async function clearGradebookCache(): Promise<void> {
  await clear(cacheStore);
}

/** Borra todas las notas pendientes del dispositivo. */
export async function clearPendingGrades(): Promise<void> {
  await clear(queueStore);
}
