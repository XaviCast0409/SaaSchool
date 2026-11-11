import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import {
  listQueuedScans,
  removeQueuedScan,
  updateQueuedScan,
  type QueuedScan,
} from './scanQueue';

interface BatchScanResult {
  clientId: string;
  ok: boolean;
  alreadyRegistered?: boolean;
  status?: string;
  studentName?: string;
  httpStatus?: number;
  error?: string;
}

export function useOfflineScanQueue(schoolId: string | undefined) {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<QueuedScan[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const isSyncingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!schoolId) {
      setItems([]);
      return;
    }
    const all = await listQueuedScans(schoolId);
    setItems(all);
  }, [schoolId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const syncNow = useCallback(async () => {
    if (!schoolId || isSyncingRef.current || !navigator.onLine) return;
    const all = await listQueuedScans(schoolId);
    const toProcess = all.filter((s) => !s.rejected).slice(0, 200);
    if (toProcess.length === 0) return;

    isSyncingRef.current = true;
    setIsSyncing(true);

    try {
      const res = await api.post<{ status: string; data: { results: BatchScanResult[] } }>(
        '/attendance/scan/batch',
        {
          items: toProcess.map((s) => ({
            clientId: s.id,
            code: s.code,
            scannedAt: s.scannedAt,
            toleranceTime: s.toleranceTime,
          })),
        },
      );

      const results = res.data?.data?.results || [];
      for (const item of toProcess) {
        const result = results.find((r) => r.clientId === item.id);
        if (!result) continue;

        if (result.ok) {
          await removeQueuedScan(item.id);
        } else if (result.httpStatus && result.httpStatus >= 400 && result.httpStatus < 500) {
          await updateQueuedScan({
            ...item,
            rejected: true,
            lastError: result.error || 'Rechazado por el servidor',
          });
        } else {
          await updateQueuedScan({
            ...item,
            attempts: item.attempts + 1,
            lastError: result.error,
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-sheet'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-summary'] });
    } catch (err: any) {
      for (const item of toProcess) {
        await updateQueuedScan({
          ...item,
          attempts: item.attempts + 1,
          lastError: err?.message || 'Error de conexión',
        });
      }
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
      await refresh();
    }
  }, [schoolId, refresh, queryClient]);

  const discardRejected = useCallback(
    async (id: string) => {
      await removeQueuedScan(id);
      await refresh();
    },
    [refresh],
  );

  // Auto-sync al montar, en 'online' y periódicamente
  useEffect(() => {
    void syncNow();

    const handleOnline = () => {
      void syncNow();
    };

    window.addEventListener('online', handleOnline);

    const interval = setInterval(() => {
      const hasPending = items.some((s) => !s.rejected);
      if (hasPending && navigator.onLine) {
        void syncNow();
      }
    }, 30_000);

    return () => {
      window.removeEventListener('online', handleOnline);
      clearInterval(interval);
    };
  }, [syncNow, items]);

  const pending = items.filter((s) => !s.rejected);
  const rejected = items.filter((s) => s.rejected);

  return {
    pending,
    rejected,
    isSyncing,
    syncNow,
    refresh,
    discardRejected,
  };
}
