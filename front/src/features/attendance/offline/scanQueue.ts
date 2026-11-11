import { createStore, get, set, del, values } from 'idb-keyval';

const queueStore = createStore('saaschool-offline', 'attendance-scans');
const rosterStore = createStore('saaschool-offline-roster', 'attendance-roster');

export interface QueuedScan {
  id: string;
  schoolId: string;
  code: string;
  scannedAt: string;
  toleranceTime?: string;
  attempts: number;
  rejected?: boolean;
  lastError?: string;
}

export interface RosterEntry {
  studentCode: string | null;
  documentId: string;
  fullName: string;
  classroom: string;
}

export async function enqueueScan(input: Omit<QueuedScan, 'id' | 'attempts'>): Promise<QueuedScan> {
  const item: QueuedScan = { ...input, id: crypto.randomUUID(), attempts: 0 };
  await set(item.id, item, queueStore);
  return item;
}

export async function listQueuedScans(schoolId: string): Promise<QueuedScan[]> {
  const all = await values<QueuedScan>(queueStore);
  return all.filter((s) => s.schoolId === schoolId).sort((a, b) => a.scannedAt.localeCompare(b.scannedAt));
}

export async function updateQueuedScan(item: QueuedScan): Promise<void> {
  await set(item.id, item, queueStore);
}

export async function removeQueuedScan(id: string): Promise<void> {
  await del(id, queueStore);
}

export async function saveRoster(schoolId: string, roster: RosterEntry[]): Promise<void> {
  await set(schoolId, { savedAt: new Date().toISOString(), roster }, rosterStore);
}

export async function findInRoster(schoolId: string, code: string): Promise<RosterEntry | null> {
  const cached = await get<{ savedAt: string; roster: RosterEntry[] }>(schoolId, rosterStore);
  const clean = code.trim();
  return cached?.roster.find((r) => r.studentCode === clean || r.documentId === clean) ?? null;
}

export async function clearRoster(): Promise<void> {
  const { clear } = await import('idb-keyval');
  await clear(rosterStore);
}
