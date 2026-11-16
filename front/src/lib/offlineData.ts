/**
 * Datos guardados en el dispositivo para trabajar sin señal (IndexedDB).
 * Contienen datos de menores, así que se borran al cerrar sesión.
 */

/** Pendientes de sincronizar del usuario (notas y escaneos de asistencia). */
export async function countPendingOffline(ownerId: string): Promise<number> {
  try {
    const [grades, scans] = await Promise.all([
      import('@/features/academic/offline/gradeQueue').then((m) => m.countPendingGrades(ownerId)),
      import('@/features/attendance/offline/scanQueue').then((m) => m.countQueuedScans(ownerId)),
    ]);
    return grades + scans;
  } catch {
    return 0;
  }
}

/**
 * Borra lo guardado en el dispositivo. Las copias de consulta (libretas, nómina del escáner) se borran
 * siempre; los pendientes solo si `includePending` (cierre voluntario, ya avisado). En un cierre forzado
 * (sesión vencida) los pendientes quedan, pero solo su dueño puede verlos y sincronizarlos.
 */
export async function clearOfflineData({ includePending }: { includePending: boolean }): Promise<void> {
  try {
    const [grades, scans] = await Promise.all([
      import('@/features/academic/offline/gradeQueue'),
      import('@/features/attendance/offline/scanQueue'),
    ]);
    await Promise.all([
      grades.clearGradebookCache(),
      scans.clearRoster(),
      ...(includePending ? [grades.clearPendingGrades(), scans.clearScanQueue()] : []),
    ]);
  } catch (error) {
    console.error('No se pudieron borrar los datos sin conexión del dispositivo', error);
  }
}
