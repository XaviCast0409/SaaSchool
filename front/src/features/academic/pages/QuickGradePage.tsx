import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Check, CloudOff, Loader2, RefreshCw, Search, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { api } from '@/lib/axios';
import { useGradebook } from '../api';
import { cacheGradebook, cachedGradebook, cellKey, clearSent, pendingFor, queueGrade, type PendingGrade } from '../offline/gradeQueue';
import { classroomLabel, type GradebookData, type ResultLetter } from '../types';

const LETTERS: ResultLetter[] = ['AD', 'A', 'B', 'C'];
const LETTER_STYLE: Record<string, string> = {
  AD: 'border-emerald-600 bg-emerald-600 text-white',
  A: 'border-sky-600 bg-sky-600 text-white',
  B: 'border-amber-500 bg-amber-500 text-white',
  C: 'border-rose-600 bg-rose-600 text-white',
};

type Mode = 'letters' | 'numbers';

/**
 * Registro rápido de notas desde el celular: un criterio a la vez, botones grandes AD/A/B/C (o nota
 * de 0 a 20) por estudiante. Sin señal, las notas se guardan en el teléfono y se envían solas al volver.
 */
export const QuickGradePage: React.FC = () => {
  const { assignmentId } = useParams();
  const [params] = useSearchParams();
  const period = Number(params.get('period') ?? 1) || 1;
  const qc = useQueryClient();
  const { data: live, isLoading, error } = useGradebook(assignmentId, period);
  const [offlineData, setOfflineData] = useState<{ savedAt: string; data: GradebookData } | null>(null);
  const data = live ?? offlineData?.data ?? null;

  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [pending, setPending] = useState<PendingGrade[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [competenceId, setCompetenceId] = useState<string | null>(null);
  const [criterionId, setCriterionId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('letters');
  const [q, setQ] = useState('');
  const [local, setLocal] = useState<Record<string, { numericScore: number | null; literalScore: ResultLetter | null }>>({});

  // Guardar la libreta en el teléfono para abrirla sin señal
  useEffect(() => {
    if (live) void cacheGradebook(live);
  }, [live]);
  useEffect(() => {
    if (!live && assignmentId && (error || !navigator.onLine)) void cachedGradebook(assignmentId, period).then((c) => c && setOfflineData(c));
  }, [live, error, assignmentId, period]);

  useEffect(() => {
    if (data && (!competenceId || !data.competences.some((c) => c.id === competenceId))) setCompetenceId(data.competences[0]?.id ?? null);
    if (data && (!criterionId || !data.criteria.some((c) => c.id === criterionId))) setCriterionId(data.criteria[0]?.id ?? null);
    if (data && data.assignment.classroom.educationLevel === 'SECONDARY' && data.scores.some((s) => s.numericScore !== null)) setMode('numbers');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.assignment.id, data?.periodNumber]);

  const refreshPending = useCallback(async () => {
    if (assignmentId) setPending(await pendingFor(assignmentId, period));
  }, [assignmentId, period]);

  const sync = useCallback(async () => {
    if (!assignmentId || !navigator.onLine) return;
    const items = await pendingFor(assignmentId, period);
    if (!items.length) return;
    setSyncing(true);
    try {
      await api.put(`/academic/gradebook/${assignmentId}/scores`, {
        periodNumber: period,
        items: items.map(({ enrollmentId, competenceId: c, criterionId: k, numericScore, literalScore }) => ({ enrollmentId, competenceId: c, criterionId: k, numericScore, literalScore })),
      });
      await clearSent(items);
      await qc.invalidateQueries({ queryKey: ['academic', 'gradebook', assignmentId, period] });
      toast.success(`${items.length} nota(s) sincronizada(s)`);
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number; data?: { message?: string } } }).response?.status;
      const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
      // Si el servidor rechaza (periodo cerrado, permisos), se avisa; si es la red, se reintenta luego
      if (status && status < 500) toast.error(msg ?? 'No se pudieron guardar las notas.');
    } finally {
      setSyncing(false);
      void refreshPending();
    }
  }, [assignmentId, period, qc, refreshPending]);

  useEffect(() => {
    void refreshPending().then(() => void sync());
    const on = () => {
      setOnline(true);
      void sync();
    };
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, [refreshPending, sync]);

  // Envío agrupado: espera 1,5 s después del último toque para mandar varias notas juntas
  useEffect(() => {
    if (!pending.length || !online) return;
    const t = setTimeout(() => void sync(), 1500);
    return () => clearTimeout(t);
  }, [pending, online, sync]);

  const valueOf = useCallback(
    (enrollmentId: string) => {
      if (!data || !competenceId || !criterionId) return undefined;
      const key = cellKey({ assignmentId: data.assignment.id, periodNumber: period, enrollmentId, competenceId, criterionId });
      if (local[key]) return local[key];
      const p = pending.find((x) => cellKey(x) === key);
      if (p) return p;
      return data.scores.find((s) => s.enrollmentId === enrollmentId && s.competenceId === competenceId && s.criterionId === criterionId);
    },
    [data, competenceId, criterionId, period, local, pending],
  );

  const setScore = async (enrollmentId: string, numericScore: number | null, literalScore: ResultLetter | null) => {
    if (!data || !competenceId || !criterionId) return;
    const base = { assignmentId: data.assignment.id, periodNumber: period, enrollmentId, competenceId, criterionId };
    setLocal((prev) => ({ ...prev, [cellKey(base)]: { numericScore, literalScore } }));
    await queueGrade({ ...base, numericScore, literalScore });
    void refreshPending();
  };

  const students = useMemo(
    () => (data?.students ?? []).filter((s) => s.state === 'REGISTERED' && (!q || s.fullName.toLowerCase().includes(q.toLowerCase()))),
    [data, q],
  );
  const filled = students.filter((s) => {
    const v = valueOf(s.enrollmentId);
    return v && (v.numericScore !== null || v.literalScore !== null);
  }).length;

  if (isLoading && !offlineData) return <Skeleton className="h-96 w-full" />;
  if (!data) return <p className="text-sm text-destructive">No se pudo abrir el curso{!online ? ' sin conexión: ábrelo una vez con señal para poder usarlo después sin internet.' : '.'}</p>;
  const competence = data.competences.find((c) => c.id === competenceId);
  const canEdit = data.canEdit;

  return (
    <div className="mx-auto max-w-2xl pb-24">
      <Link to={`/gradebook/${data.assignment.id}?period=${period}`} className="mb-2 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" /> Registro completo
      </Link>
      <h1 className="text-lg font-semibold text-foreground">
        {data.assignment.area.name} <span className="text-sm font-normal text-muted-foreground">· {classroomLabel(data.assignment.classroom)} · periodo {period}</span>
      </h1>

      <div className={cn('mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-xs', online ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-200' : 'bg-amber-500/15 text-amber-800 dark:text-amber-200')}>
        {online ? <Wifi className="h-4 w-4" aria-hidden /> : <CloudOff className="h-4 w-4" aria-hidden />}
        <span className="flex-1">
          {online
            ? pending.length
              ? `Enviando ${pending.length} nota(s)…`
              : 'Conectado: cada nota se guarda al tocarla.'
            : `Sin conexión: ${pending.length} nota(s) guardadas en el celular. Se enviarán solas al volver la señal.`}
          {offlineData && !live ? ` (Lista guardada el ${new Date(offlineData.savedAt).toLocaleString('es-PE')})` : ''}
        </span>
        {online && pending.length > 0 && (
          <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs" onClick={() => void sync()} disabled={syncing}>
            {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Enviar
          </Button>
        )}
      </div>

      {!canEdit && <p className="mt-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground">El periodo no está abierto: solo puedes consultar las notas.</p>}

      {/* Competencia y criterio */}
      <div className="sticky top-0 z-10 -mx-4 mt-3 space-y-2 border-b border-border bg-background/95 px-4 py-2 backdrop-blur md:mx-0 md:px-0">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {data.competences.map((c) => (
            <button key={c.id} type="button" onClick={() => setCompetenceId(c.id)} aria-pressed={competenceId === c.id} title={c.name}
              className={cn('shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold', competenceId === c.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground')}>
              {c.shortName}
            </button>
          ))}
        </div>
        {data.criteria.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {data.criteria.map((c) => (
              <button key={c.id} type="button" onClick={() => setCriterionId(c.id)} aria-pressed={criterionId === c.id} title={c.name}
                className={cn('shrink-0 rounded-md border px-2.5 py-1 text-[11px]', criterionId === c.id ? 'border-primary/60 bg-primary/10 text-primary' : 'border-border text-muted-foreground')}>
                {c.shortName}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar estudiante" className="h-9 pl-8" aria-label="Buscar estudiante" />
          </div>
          <div className="inline-flex rounded-lg border border-border p-0.5 text-[11px]">
            {(['letters', 'numbers'] as Mode[]).map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)} aria-pressed={mode === m} className={cn('rounded-md px-2 py-1 font-semibold', mode === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>
                {m === 'letters' ? 'AD–C' : '0–20'}
              </button>
            ))}
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {competence?.name} · {filled} de {students.length} con nota
        </p>
      </div>

      <ul className="mt-2 divide-y divide-border">
        {students.map((s, idx) => {
          const v = valueOf(s.enrollmentId);
          const isPending = pending.some((p) => p.enrollmentId === s.enrollmentId && p.competenceId === competenceId && p.criterionId === criterionId);
          return (
            <li key={s.enrollmentId} className="flex items-center gap-3 py-2.5">
              <span className="w-5 shrink-0 text-right text-[11px] text-muted-foreground">{idx + 1}</span>
              <span className="min-w-0 flex-1 text-sm text-foreground">
                {s.fullName}
                {mode === 'letters' && v?.numericScore !== null && v?.numericScore !== undefined && (
                  <span className="ml-1 rounded bg-muted px-1 text-[10px] font-semibold text-foreground" title="Nota numérica registrada">{v.numericScore}</span>
                )}
                {isPending && <span className="ml-1 text-[10px] text-amber-600">• por enviar</span>}
                {!isPending && v && (v.literalScore || v.numericScore !== null) && <Check className="ml-1 inline h-3 w-3 text-emerald-600" aria-label="Guardada" />}
              </span>
              {mode === 'letters' ? (
                <div className="flex gap-1">
                  {LETTERS.map((l) => {
                    const active = v?.literalScore === l;
                    return (
                      <button
                        key={l}
                        type="button"
                        disabled={!canEdit}
                        onClick={() => void setScore(s.enrollmentId, null, active ? null : l)}
                        aria-pressed={active}
                        aria-label={`${l} para ${s.fullName}`}
                        className={cn('h-10 w-11 rounded-lg border-2 text-sm font-bold transition-colors disabled:opacity-50', active ? LETTER_STYLE[l] : 'border-border bg-background text-muted-foreground')}
                      >
                        {l}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={20}
                  step={0.5}
                  disabled={!canEdit}
                  defaultValue={v?.numericScore ?? ''}
                  key={`${competenceId}-${criterionId}-${s.enrollmentId}`}
                  className="h-10 w-20 text-center text-base font-semibold"
                  aria-label={`Nota de ${s.fullName}`}
                  onBlur={(e) => {
                    const raw = e.target.value.trim();
                    if (raw === '' && (v?.numericScore ?? null) === null) return;
                    const n = raw === '' ? null : Number(raw.replace(',', '.'));
                    if (n !== null && (!Number.isFinite(n) || n < 0 || n > 20)) return toast.error('La nota debe estar entre 0 y 20.');
                    if (n !== (v?.numericScore ?? null)) void setScore(s.enrollmentId, n === null ? null : Math.round(n * 10) / 10, null);
                  }}
                />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
