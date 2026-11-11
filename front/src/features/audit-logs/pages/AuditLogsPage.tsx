import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, History } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/Pagination';
import { PageHeader } from '@/components/ui/page-header';
import { Select } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { formatPeruDate, formatPeruTime } from '@/lib/dateUtils';
import { useAuditActors, useAuditCategories, useAuditLogs, type AuditLogItem } from '../api/useAuditLogs';

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Soporte',
  SCHOOL_ADMIN: 'Dirección',
  ADMINISTRATIVE: 'Secretaría',
  TEACHER: 'Docente',
  PARENT: 'Apoderado(a)',
};

const CATEGORY_STYLE: Record<string, string> = {
  NOTAS: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  ACADEMICO: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
  ASISTENCIA: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  MATRICULA: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
  PAGOS: 'bg-teal-500/10 text-teal-700 dark:text-teal-300',
  USUARIOS: 'bg-slate-500/10 text-slate-700 dark:text-slate-300',
  COLEGIO: 'bg-slate-500/10 text-slate-700 dark:text-slate-300',
  CONVIVENCIA: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
};

/** Resalta el nombre de quien hizo la acción al inicio de la frase. */
const Summary: React.FC<{ log: AuditLogItem }> = ({ log }) => {
  const prefix = `${log.actorName} (${log.actorRoleLabel})`;
  if (!log.summary.startsWith(prefix)) return <span>{log.summary}</span>;
  const rest = log.summary.slice(prefix.length);
  const [verb, ...target] = rest.split(' — ');
  return (
    <span>
      <span className="font-semibold">{log.actorName}</span>
      <span className="text-muted-foreground"> ({log.actorRoleLabel})</span>
      {verb}
      {target.length > 0 && <> — <span className="font-medium">{target.join(' — ')}</span></>}
    </span>
  );
};

const LogRow: React.FC<{ log: AuditLogItem }> = ({ log }) => {
  const [open, setOpen] = useState(false);
  const hasDetails = log.details.length > 0;
  return (
    <li className="px-4 py-3">
      <div className="flex items-start gap-3">
        <span className="w-12 shrink-0 pt-0.5 text-xs tabular-nums text-muted-foreground">{formatPeruTime(log.createdAt)}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-snug"><Summary log={log} /></p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', CATEGORY_STYLE[log.category ?? ''] ?? 'bg-muted text-muted-foreground')}>
              {log.actionLabel}
            </span>
            {log.isCorrection && (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                Corrección en periodo cerrado
              </span>
            )}
            {hasDetails && (
              <button type="button" onClick={() => setOpen(!open)} className="inline-flex items-center text-xs text-primary hover:underline">
                {open ? <ChevronDown className="mr-0.5 h-3.5 w-3.5" /> : <ChevronRight className="mr-0.5 h-3.5 w-3.5" />}
                {open ? 'Ocultar detalle' : 'Ver detalle'}
              </button>
            )}
          </div>
          {open && hasDetails && (
            <dl className="mt-2 grid gap-x-4 gap-y-1 rounded-lg bg-muted/40 p-3 text-xs sm:grid-cols-[minmax(8rem,auto)_1fr]">
              {log.details.map((d, i) => (
                <React.Fragment key={`${d.label}-${i}`}>
                  <dt className="font-medium text-muted-foreground">{d.label}</dt>
                  <dd className="text-foreground">{d.value}</dd>
                </React.Fragment>
              ))}
            </dl>
          )}
        </div>
      </div>
    </li>
  );
};

export const AuditLogsPage: React.FC = () => {
  const [category, setCategory] = useState('');
  const [actorId, setActorId] = useState('');
  const [onlyCorrections, setOnlyCorrections] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  const { data: categories = [] } = useAuditCategories();
  const { data: actors = [] } = useAuditActors();
  const { data, isLoading, isError } = useAuditLogs({
    category: category || undefined,
    actorId: actorId || undefined,
    onlyCorrections,
    from: from || undefined,
    to: to || undefined,
    page,
    limit,
  });
  const logs = data?.data ?? [];
  const meta = data?.meta ?? { total: 0, page: 1, limit, totalPages: 1 };

  // Agrupar por día para que la lectura sea cronológica
  const byDay = useMemo(() => {
    const groups: Array<{ day: string; items: AuditLogItem[] }> = [];
    for (const log of logs) {
      const day = formatPeruDate(log.createdAt, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      const last = groups[groups.length - 1];
      if (last && last.day === day) last.items.push(log);
      else groups.push({ day, items: [log] });
    }
    return groups;
  }, [logs]);

  const reset = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setPage(1); };

  return (
    <div className="max-w-5xl pb-12">
      <PageHeader
        title="Bitácora"
        description="Quién hizo cada cambio en el sistema y cuándo. Útil para revisar correcciones de notas, pagos y matrículas."
      />

      <Card className="mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-medium text-muted-foreground">
            Tema
            <Select className="mt-1 w-full" value={category} onChange={(e) => reset(setCategory)(e.target.value)}>
              <option value="">Todos los temas</option>
              {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </Select>
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            Persona
            <Select className="mt-1 w-full" value={actorId} onChange={(e) => reset(setActorId)(e.target.value)}>
              <option value="">Todas las personas</option>
              {actors.map((a) => <option key={a.id} value={a.id}>{a.name} ({ROLE_LABEL[a.role] ?? a.role})</option>)}
            </Select>
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            Desde
            <Input type="date" className="mt-1 h-9" value={from} onChange={(e) => reset(setFrom)(e.target.value)} />
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            Hasta
            <Input type="date" className="mt-1 h-9" value={to} onChange={(e) => reset(setTo)(e.target.value)} />
          </label>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyCorrections} onChange={(e) => reset(setOnlyCorrections)(e.target.checked)} />
          Solo correcciones de notas en periodos cerrados
        </label>
      </Card>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : isError ? (
        <p className="text-sm text-destructive">No se pudo cargar la bitácora.</p>
      ) : logs.length === 0 ? (
        <EmptyState icon={<History className="h-8 w-8" />} title="No hay movimientos con estos filtros" description="Prueba con otro tema, otra persona o un rango de fechas más amplio." />
      ) : (
        <Card className="overflow-hidden">
          {byDay.map((group) => (
            <section key={group.day}>
              <h2 className="border-b border-border bg-muted/40 px-4 py-2 text-xs font-semibold capitalize text-muted-foreground">{group.day}</h2>
              <ul className="divide-y divide-border">
                {group.items.map((log) => <LogRow key={log.id} log={log} />)}
              </ul>
            </section>
          ))}
          <Pagination
            currentPage={page}
            totalPages={meta.totalPages}
            totalItems={meta.total}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={(n) => { setLimit(n); setPage(1); }}
          />
        </Card>
      )}
    </div>
  );
};
