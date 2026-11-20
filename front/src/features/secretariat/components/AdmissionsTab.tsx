import React, { useEffect, useMemo, useState } from 'react';
import { Search, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { formatPeruShortDate, formatPeruDateTime } from '@/lib/dateUtils';
import {
  ADMISSION_LABEL,
  useAdmissions,
  type AdmissionApplication,
  type AdmissionStatus,
} from '../api/useSecretariat';
import { AdmissionDetailModal } from './admissions-tab/AdmissionDetailModal';

const COLUMNS: AdmissionStatus[] = ['NEW', 'INTERVIEW', 'ADMITTED', 'ENROLLED'];
const CLOSED: AdmissionStatus[] = ['REJECTED', 'WITHDRAWN'];
const TONE: Record<AdmissionStatus, string> = {
  NEW: 'border-t-sky-500',
  INTERVIEW: 'border-t-amber-500',
  ADMITTED: 'border-t-emerald-500',
  ENROLLED: 'border-t-violet-500',
  REJECTED: 'border-t-slate-400',
  WITHDRAWN: 'border-t-slate-400',
};

export const AdmissionsTab: React.FC<{ defaultYear: number | null }> = ({ defaultYear }) => {
  const [year, setYear] = useState<number | undefined>(defaultYear ?? undefined);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [showClosed, setShowClosed] = useState(false);
  const [selected, setSelected] = useState<AdmissionApplication | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data, isLoading } = useAdmissions({ year, q: debouncedQ || undefined });
  const rows = useMemo(() => data?.rows ?? [], [data]);
  const byStatus = useMemo(() => {
    const m = new Map<AdmissionStatus, AdmissionApplication[]>();
    for (const r of rows) m.set(r.status, [...(m.get(r.status) ?? []), r]);
    return m;
  }, [rows]);
  const closedCount = CLOSED.reduce((n, s) => n + (byStatus.get(s)?.length ?? 0), 0);
  const years = data?.years.length ? data.years : defaultYear ? [defaultYear] : [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre o DNI"
            className="pl-8"
          />
        </div>
        <select
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          value={year ?? ''}
          onChange={(e) => setYear(e.target.value ? Number(e.target.value) : undefined)}
        >
          <option value="">Todos los años</option>
          {years.map((y) => (
            <option key={y} value={y}>
              Admisión {y}
            </option>
          ))}
        </select>
        {closedCount > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setShowClosed((v) => !v)}>
            {showClosed ? 'Ocultar' : 'Ver'} no admitidos y desistidos ({closedCount})
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-4">
          {COLUMNS.map((c) => (
            <Skeleton key={c} className="h-48" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<UserPlus className="h-8 w-8" />}
          title="Aún no hay postulaciones"
          description="Comparte el enlace del formulario de admisión en tus redes y en WhatsApp. Cada postulación llega aquí."
        />
      ) : (
        <div
          className={cn('grid gap-3', showClosed ? 'md:grid-cols-3 xl:grid-cols-6' : 'md:grid-cols-2 xl:grid-cols-4')}
        >
          {[...COLUMNS, ...(showClosed ? CLOSED : [])].map((status) => {
            const list = byStatus.get(status) ?? [];
            return (
              <div key={status} className={cn('rounded-lg border border-t-4 bg-muted/30 p-2', TONE[status])}>
                <p className="mb-2 flex items-center justify-between px-1 text-sm font-medium">
                  {ADMISSION_LABEL[status]}{' '}
                  <span className="rounded-full bg-background px-2 text-xs text-muted-foreground">{list.length}</span>
                </p>
                <div className="space-y-2">
                  {list.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setSelected(a)}
                      className="w-full rounded-md border bg-background p-2.5 text-left text-sm shadow-sm transition hover:border-primary"
                    >
                      <p className="font-medium leading-tight">
                        {a.studentFirstNames} {a.studentLastNamePaternal}
                      </p>
                      <p className="text-xs text-muted-foreground">{a.gradeLabel}</p>
                      {a.interviewAt && status === 'INTERVIEW' && (
                        <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                          Entrevista: {formatPeruDateTime(a.interviewAt)}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatPeruShortDate(a.createdAt)} · {a.guardianPhone}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <AdmissionDetailModal app={selected} onClose={() => setSelected(null)} />
    </div>
  );
};
