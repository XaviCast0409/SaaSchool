import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { CheckCircle2, ClipboardCheck, Loader2, Lock, FileEdit } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatPeruShortDate, getPeruToday } from '@/lib/dateUtils';
import { useAuthStore } from '@/store/useAuthStore';
import { apiErrorMessage } from '@/features/academic/api';
import {
  INTERVENTION_LABEL,
  useCreateIntervention,
  useHeatmap,
  useInterventions,
  useRisk,
  useSetInterventionStatus,
  useSiagieData,
  type RiskRow,
} from '../api/useInsights';

const LEVEL_STYLE: Record<string, string> = {
  ALTO: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
  MEDIO: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  BAJO: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
};
const dateOnly = (iso: string) => formatPeruShortDate(iso.slice(0, 10));

// ------------------------------------------------------------------ Plan de tutoría

const TutoringModal: React.FC<{ row: RiskRow | null; onClose: () => void }> = ({ row, onClose }) => {
  const { data: list = [], isLoading } = useInterventions(row?.enrollmentId ?? null);
  const create = useCreateIntervention(row?.enrollmentId ?? null);
  const setStatus = useSetInterventionStatus();
  const [form, setForm] = useState({ type: 'ENTREVISTA_ESTUDIANTE', date: getPeruToday(), notes: '', agreements: '', followUpDate: '' });
  useEffect(() => {
    if (row) setForm({ type: 'ENTREVISTA_ESTUDIANTE', date: getPeruToday(), notes: '', agreements: '', followUpDate: '' });
  }, [row]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate(
      { type: form.type, date: form.date, notes: form.notes, agreements: form.agreements || null, followUpDate: form.followUpDate || null },
      {
        onSuccess: () => {
          toast.success('Intervención registrada');
          setForm({ ...form, notes: '', agreements: '', followUpDate: '' });
        },
        onError: (err) => toast.error(apiErrorMessage(err)),
      },
    );
  };

  return (
    <Modal open={Boolean(row)} onClose={onClose} title={`Plan de tutoría · ${row?.name ?? ''}`} description={row ? `${row.classroom} · ${row.reasons.join(' · ') || 'Sin alertas'}` : undefined} size="xl">
      <div className="grid gap-5 lg:grid-cols-2">
        <form onSubmit={submit} className="space-y-3">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" aria-hidden /> Información reservada: solo la ven la Dirección y el tutor del aula. La familia no la ve.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2 text-xs text-muted-foreground sm:col-span-1">
              Tipo
              <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {Object.entries(INTERVENTION_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
            <label className="col-span-2 text-xs text-muted-foreground sm:col-span-1">
              Fecha
              <Input type="date" className="h-9" max={getPeruToday()} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </label>
          </div>
          <label className="block text-xs text-muted-foreground">
            ¿Qué se conversó o hizo?
            <Textarea rows={4} required minLength={5} maxLength={4000} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </label>
          <label className="block text-xs text-muted-foreground">
            Acuerdos (opcional)
            <Textarea rows={2} maxLength={2000} value={form.agreements} onChange={(e) => setForm({ ...form, agreements: e.target.value })} />
          </label>
          <label className="block text-xs text-muted-foreground">
            Volver a revisar el (opcional)
            <Input type="date" className="h-9" min={getPeruToday()} value={form.followUpDate} onChange={(e) => setForm({ ...form, followUpDate: e.target.value })} />
          </label>
          <Button type="submit" disabled={create.isPending} className="gap-2">
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ClipboardCheck className="h-4 w-4" aria-hidden />} Registrar intervención
          </Button>
        </form>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Historial</h3>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : list.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay intervenciones registradas.</p>
          ) : (
            <ul className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
              {list.map((i) => (
                <li key={i.id} className="rounded-lg border border-border p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-foreground">{INTERVENTION_LABEL[i.type] ?? i.type}</p>
                    <span className="text-[11px] text-muted-foreground">
                      {dateOnly(i.date)} · {i.authorName}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-line text-xs text-foreground">{i.notes}</p>
                  {i.agreements && <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground"><strong>Acuerdos:</strong> {i.agreements}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                    {i.followUpDate && <span className="text-muted-foreground">Revisar el {dateOnly(i.followUpDate)}</span>}
                    <button
                      type="button"
                      onClick={() => setStatus.mutate({ id: i.id, status: i.status === 'OPEN' ? 'CLOSED' : 'OPEN' })}
                      className={cn('ml-auto rounded-full px-2 py-0.5 font-semibold', i.status === 'OPEN' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300' : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300')}
                      aria-label={i.status === 'OPEN' ? 'Marcar como cerrado' : 'Reabrir'}
                    >
                      {i.status === 'OPEN' ? 'En seguimiento' : 'Cerrado'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
};

// ------------------------------------------------------------------ Riesgo académico

const RiskTab: React.FC = () => {
  const [classroomId, setClassroomId] = useState<string>('');
  const [levelFilter, setLevelFilter] = useState<string>('');
  const { data, isLoading } = useRisk(classroomId || null, true);
  const [open, setOpen] = useState<RiskRow | null>(null);
  const classrooms = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of data?.rows ?? []) map.set(r.classroomId, r.classroom);
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [data]);
  const rows = (data?.rows ?? []).filter((r) => !levelFilter || r.level === levelFilter);
  const counts = { ALTO: 0, MEDIO: 0, BAJO: 0 } as Record<string, number>;
  for (const r of data?.rows ?? []) counts[r.level]++;

  return (
    <div className="space-y-3">
      <Card className="p-4 text-sm text-muted-foreground">
        Índice que combina, del <strong className="text-foreground">{data?.periodLabel ?? 'periodo actual'}</strong> y los últimos 30 días: competencias en C, competencias que bajaron de nivel, faltas sin justificar, tareas vencidas sin entregar, incidencias y tardanzas. <strong className="text-foreground">No usa pagos.</strong> Es una ayuda para priorizar, no un diagnóstico.
      </Card>
      <div className="flex flex-wrap items-center gap-2">
        {(['ALTO', 'MEDIO', 'BAJO'] as const).map((l) => (
          <button key={l} type="button" onClick={() => setLevelFilter(levelFilter === l ? '' : l)} aria-pressed={levelFilter === l} className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold', LEVEL_STYLE[l], levelFilter === l && 'ring-2 ring-primary')}>
            Riesgo {l.toLowerCase()}: {counts[l]}
          </button>
        ))}
        {classrooms.length > 1 && (
          <select className="ml-auto h-9 rounded-md border border-input bg-background px-2 text-sm" value={classroomId} onChange={(e) => setClassroomId(e.target.value)} aria-label="Filtrar por aula">
            <option value="">Todas las aulas</option>
            {classrooms.map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
        )}
      </div>
      {isLoading ? (
        <Skeleton className="h-48 w-full rounded-xl" />
      ) : rows.length === 0 ? (
        <Card className="flex items-center gap-2 p-4 text-sm text-foreground">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden /> Ningún estudiante con señales de riesgo en este filtro.
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.enrollmentId} className="flex flex-wrap items-start gap-3 p-3">
                <span className={cn('mt-0.5 w-16 shrink-0 rounded-md px-2 py-1 text-center text-[11px] font-bold', LEVEL_STYLE[r.level])}>{r.level}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {r.name} <span className="text-xs font-normal text-muted-foreground">· {r.classroom}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{r.reasons.join(' · ') || 'Señales leves'}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {r.lastIntervention ? `Última intervención: ${INTERVENTION_LABEL[r.lastIntervention.type] ?? r.lastIntervention.type} · ${dateOnly(r.lastIntervention.date)}` : 'Sin intervenciones registradas'}
                  </p>
                </div>
                <Button size="sm" variant={r.lastIntervention ? 'outline' : 'default'} className="h-8 gap-1.5 text-xs" onClick={() => setOpen(r)}>
                  <FileEdit className="h-3.5 w-3.5" aria-hidden /> Plan de tutoría
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <TutoringModal row={open} onClose={() => setOpen(null)} />
    </div>
  );
};

// ------------------------------------------------------------------ Mapa de calor

function cellColor(pctC: number, pctB: number): string {
  if (pctC >= 25) return 'bg-rose-500/70 text-white';
  if (pctC >= 10) return 'bg-rose-400/40';
  if (pctC + pctB >= 40) return 'bg-amber-400/40';
  if (pctC + pctB >= 20) return 'bg-amber-300/25';
  return 'bg-emerald-500/20';
}

const HeatmapTab: React.FC = () => {
  const [period, setPeriod] = useState<number | null>(null);
  const [level, setLevel] = useState<string>('');
  const { data, isLoading } = useHeatmap(period, level || null, true);
  if (isLoading || !data) return <Skeleton className="h-64 w-full rounded-xl" />;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={data.periodNumber} onChange={(e) => setPeriod(Number(e.target.value))} aria-label="Periodo">
          {data.periods.map((p) => (
            <option key={p.number} value={p.number}>{p.label}</option>
          ))}
        </select>
        <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={level} onChange={(e) => setLevel(e.target.value)} aria-label="Nivel">
          <option value="">Todos los niveles</option>
          <option value="INITIAL">Inicial</option>
          <option value="PRIMARY">Primaria</option>
          <option value="SECONDARY">Secundaria</option>
        </select>
        {data.provisional && <span className="text-xs text-amber-700 dark:text-amber-300">Periodo abierto: los calificativos aún pueden cambiar.</span>}
      </div>
      {data.classrooms.length === 0 ? (
        <Card className="p-4 text-sm text-muted-foreground">Aún no hay calificativos registrados para este periodo.</Card>
      ) : (
        <Card className="overflow-x-auto p-3">
          <table className="text-xs">
            <thead>
              <tr>
                <th scope="col" className="sticky left-0 bg-card px-2 py-1 text-left font-medium text-muted-foreground">Aula</th>
                {data.areas.map((a) => (
                  <th key={a} scope="col" className="min-w-[88px] px-1 py-1 text-center font-medium text-muted-foreground">{a}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.classrooms.map((c) => (
                <tr key={c.id}>
                  <th scope="row" className="sticky left-0 whitespace-nowrap bg-card px-2 py-1 text-left font-medium text-foreground">{c.label}</th>
                  {data.areas.map((a) => {
                    const t = data.cells[`${c.id}|${a}`];
                    if (!t || !t.total) return <td key={a} className="px-1 py-1"><div className="rounded-md bg-muted/40 py-2 text-center text-muted-foreground">—</div></td>;
                    const pctC = Math.round((t.C / t.total) * 100);
                    const pctB = Math.round((t.B / t.total) * 100);
                    return (
                      <td key={a} className="px-1 py-1">
                        <div className={cn('rounded-md px-1 py-1.5 text-center', cellColor(pctC, pctB))} title={`AD ${t.AD} · A ${t.A} · B ${t.B} · C ${t.C} (de ${t.total})`}>
                          <span className="block font-bold">{pctC}% C</span>
                          <span className="block text-[10px] opacity-80">{pctB}% B</span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[11px] text-muted-foreground">Porcentaje de calificativos de competencias en C y en B por aula y área. Pasa el cursor para ver el detalle.</p>
        </Card>
      )}
    </div>
  );
};

// ------------------------------------------------------------------ Datos SIAGIE

const SiagieTab: React.FC = () => {
  const { data, isLoading } = useSiagieData(true);
  const [q, setQ] = useState('');
  if (isLoading || !data) return <Skeleton className="h-48 w-full rounded-xl" />;
  const rows = data.rows.filter((r) => !q || `${r.name} ${r.classroom}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-3">
      {data.rows.length === 0 ? (
        <Card className="flex items-center gap-2 p-4 text-sm text-foreground">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden /> Todos los estudiantes matriculados tienen los datos que pide el SIAGIE.
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.totals).map(([k, v]) => (
              <span key={k} className="rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs text-amber-800 dark:text-amber-200">
                {k}: <strong>{v}</strong>
              </span>
            ))}
          </div>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar estudiante o aula" className="h-9 max-w-xs" aria-label="Buscar" />
          <Card className="overflow-hidden">
            <ul className="divide-y divide-border">
              {rows.map((r) => (
                <li key={r.studentId} className="p-3 text-sm">
                  <p className="font-medium text-foreground">
                    {r.name} <span className="text-xs font-normal text-muted-foreground">· {r.classroom}</span>
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300">{r.issues.join(' · ')}</p>
                </li>
              ))}
            </ul>
          </Card>
          <p className="text-[11px] text-muted-foreground">Corrígelos en Matrícula SIAGIE (Alumnos) antes de exportar las actas o la nómina.</p>
        </>
      )}
    </div>
  );
};

type Tab = 'risk' | 'heatmap' | 'siagie';

export const InsightsPage: React.FC = () => {
  const { user } = useAuthStore();
  const role = user?.role;
  const isAdmin = role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN';
  const tabs: Array<[Tab, string]> = [
    ...(isAdmin || role === 'TEACHER' ? ([['risk', 'Riesgo académico y tutoría']] as Array<[Tab, string]>) : []),
    ...(isAdmin ? ([['heatmap', 'Mapa de calor']] as Array<[Tab, string]>) : []),
    ...(isAdmin || role === 'ADMINISTRATIVE' ? ([['siagie', 'Datos para el SIAGIE']] as Array<[Tab, string]>) : []),
  ];
  const [params, setParams] = useSearchParams();
  const requested = params.get('tab') as Tab | null;
  const tab: Tab = tabs.some(([t]) => t === requested) ? requested! : tabs[0]?.[0] ?? 'siagie';

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Analítica y tutoría"
        description={role === 'TEACHER' ? 'Estudiantes de tus aulas de tutoría que necesitan atención, y su plan de tutoría.' : 'Detecta a tiempo a quién apoyar, dónde está fallando el aprendizaje y qué datos faltan para el SIAGIE.'}
      />
      {tabs.length > 1 && (
        <div className="mb-4 inline-flex flex-wrap rounded-lg border border-border p-0.5 text-xs">
          {tabs.map(([t, label]) => (
            <button key={t} type="button" onClick={() => setParams({ tab: t }, { replace: true })} className={cn('rounded-md px-3 py-1.5 font-semibold', tab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>
              {label}
            </button>
          ))}
        </div>
      )}
      {tab === 'risk' && <RiskTab />}
      {tab === 'heatmap' && <HeatmapTab />}
      {tab === 'siagie' && <SiagieTab />}
    </div>
  );
};
