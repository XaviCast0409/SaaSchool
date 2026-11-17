import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { LetterBadge } from '@/components/ui/letter-badge';
import { useSaveScores, useSetFinalLetter, apiErrorMessage, type ScoreInput } from '../api';
import type { GradebookData, GradebookResult, ResultLetter } from '../types';
import { formatCell, parseCell, parseClipboard } from '../utils/gradeInput';

interface Props {
  data: GradebookData;
  competenceId: string;
  reason: string | null;
  onNeedReason: () => void;
  onStatus: (s: 'idle' | 'saving' | 'saved' | 'error', msg?: string, invalidCount?: number) => void;
}

/** Celda: alumno + competencia + criterio (lo escrito se conserva al cambiar de competencia) */
const keyOf = (enrollmentId: string, competenceId: string, criterionId: string) => `${enrollmentId}|${competenceId}|${criterionId}`;

export const GradebookGrid: React.FC<Props> = ({ data, competenceId, reason, onNeedReason, onStatus }) => {
  const saveScores = useSaveScores(data.assignment.id);
  const setFinal = useSetFinalLetter(data.assignment.id);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [invalid, setInvalid] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<GradebookResult[]>(data.results);
  const tableRef = useRef<HTMLTableElement>(null);
  const editable = data.canEdit && (!data.requiresReason || !!reason);

  // Valores actuales para el guardado (que corre fuera del render)
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const inFlight = useRef(false);
  const again = useRef(false);

  // Datos del servidor: se toman todos menos las celdas que se están editando (no se pisa lo escrito)
  useEffect(() => {
    const server: Record<string, string> = {};
    data.scores.forEach((sc) => { server[keyOf(sc.enrollmentId, sc.competenceId, sc.criterionId)] = formatCell(sc); });
    setDrafts((prev) => {
      const next: Record<string, string> = { ...server };
      dirtyRef.current.forEach((k) => { if (k in prev) next[k] = prev[k]; });
      return next;
    });
    setResults(data.results);
  }, [data]);

  const flush = useCallback(async () => {
    if (inFlight.current) { again.current = true; return; }
    const pending = dirtyRef.current;
    if (pending.size === 0) return;
    if (data.requiresReason && !reason) { onNeedReason(); return; }
    const current = draftsRef.current;
    const items: ScoreInput[] = [];
    const sent = new Map<string, string>();
    const shown = new Map<string, string>();
    const bad = new Set<string>();
    pending.forEach((k) => {
      const [enrollmentId, compId, criterionId] = k.split('|');
      const raw = current[k] ?? '';
      const parsed = parseCell(raw);
      if (parsed === 'invalid') { bad.add(k); return; }
      items.push({ enrollmentId, competenceId: compId, criterionId, ...parsed });
      sent.set(k, raw);
      shown.set(k, formatCell(parsed));
    });
    setInvalid(bad);
    if (items.length === 0) {
      if (bad.size > 0) onStatus('error', undefined, bad.size);
      return;
    }
    inFlight.current = true;
    onStatus('saving', undefined, bad.size);
    try {
      const res = await saveScores.mutateAsync({ periodNumber: data.periodNumber, items, reason });
      setResults((prev) => {
        const map = new Map(prev.map((r) => [`${r.enrollmentId}|${r.competenceId}`, r]));
        res.results.forEach((r) => map.set(`${r.enrollmentId}|${r.competenceId}`, r));
        return [...map.values()];
      });
      // Solo queda guardado lo que no se volvió a cambiar mientras se enviaba (y se muestra normalizado: "a" → "A")
      const saved = [...sent].filter(([k, value]) => (draftsRef.current[k] ?? '') === value).map(([k]) => k);
      setDrafts((prev) => {
        const next = { ...prev };
        saved.forEach((k) => { if ((prev[k] ?? '') === sent.get(k)) next[k] = shown.get(k) ?? ''; });
        return next;
      });
      setDirty((prev) => {
        const n = new Set(prev);
        saved.forEach((k) => n.delete(k));
        return n;
      });
      onStatus(bad.size > 0 ? 'error' : 'saved', undefined, bad.size);
    } catch (e) {
      onStatus('error', apiErrorMessage(e, 'No se pudieron guardar las notas.'), bad.size);
      // Sin conexión o falla del servidor: se reintenta solo (un rechazo, p. ej. periodo cerrado, no)
      const status = (e as { response?: { status?: number } }).response?.status;
      if (!status || status >= 500) window.setTimeout(() => { void flushRef.current(); }, 5000);
    } finally {
      inFlight.current = false;
      if (again.current) { again.current = false; void flushRef.current(); }
    }
  }, [data.periodNumber, data.requiresReason, reason, saveScores, onNeedReason, onStatus]);

  const flushRef = useRef(flush);
  flushRef.current = flush;

  // Guardado automático 1,2 s después del último cambio
  useEffect(() => {
    if (dirty.size === 0) return;
    const t = setTimeout(() => { void flushRef.current(); }, 1200);
    return () => clearTimeout(t);
  }, [dirty, drafts]);

  // Al salir de la grilla (otra pestaña, otro periodo, otra pantalla) se guarda lo pendiente
  useEffect(() => () => { void flushRef.current(); }, []);

  // Cerrar o recargar la pestaña del navegador con notas sin guardar: el navegador pregunta
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current.size === 0 && !inFlight.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  const setCell = (k: string, value: string) => {
    setDrafts((d) => ({ ...d, [k]: value }));
    setDirty((s) => (s.has(k) ? s : new Set(s).add(k)));
  };

  const focusCell = (row: number, col: number) => {
    const el = tableRef.current?.querySelector<HTMLInputElement>(`input[data-row="${row}"][data-col="${col}"]`);
    el?.focus();
    el?.select();
  };

  const activeStudents = useMemo(() => data.students.filter((s) => s.activeInPeriod), [data.students]);

  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>, row: number, col: number) => {
    const text = e.clipboardData.getData('text');
    if (!text.includes('\t') && !text.includes('\n')) return;
    e.preventDefault();
    const matrix = parseClipboard(text);
    matrix.forEach((cells, r) => cells.forEach((value, c) => {
      const student = activeStudents[row + r];
      const criterion = data.criteria[col + c];
      if (student && criterion) setCell(keyOf(student.enrollmentId, competenceId, criterion.id), value);
    }));
  };

  const resultOf = (enrollmentId: string) => results.find((r) => r.enrollmentId === enrollmentId && r.competenceId === competenceId);

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table ref={tableRef} className="w-full text-sm">
        <thead className="bg-muted/40">
          <tr className="text-xs text-muted-foreground">
            <th className="w-10 px-2 py-2 text-left font-semibold">N.°</th>
            <th className="sticky left-0 bg-muted/40 px-2 py-2 text-left font-semibold">Estudiante</th>
            {data.criteria.map((c) => (
              <th key={c.id} className="px-1 py-2 text-center font-semibold" title={`${c.name} · peso ${c.weight}`}>{c.shortName}</th>
            ))}
            {data.criteria.length > 0 && <th className="px-2 py-2 text-center font-semibold">Sugerido</th>}
            <th className="px-2 py-2 text-center font-semibold">Final</th>
          </tr>
        </thead>
        <tbody>
          {data.students.map((s, idx) => {
            const active = s.activeInPeriod;
            const row = activeStudents.findIndex((x) => x.enrollmentId === s.enrollmentId);
            const r = resultOf(s.enrollmentId);
            return (
              <tr key={s.enrollmentId} className={cn('border-t border-border', !active && 'opacity-50')}>
                <td className="px-2 py-1 text-xs tabular-nums text-muted-foreground">{idx + 1}</td>
                <td className="sticky left-0 bg-card px-2 py-1">
                  <span className="whitespace-nowrap">{s.fullName}</span>
                  {s.state !== 'REGISTERED' && (
                    <span
                      className="ml-2 text-xs text-muted-foreground"
                      title={active ? 'Completó este periodo antes de irse: sus notas se registran y se suben al SIAGIE.' : 'Se fue antes de terminar este periodo: no recibe notas.'}
                    >
                      {s.state === 'WITHDRAWN' ? 'Retirado' : 'Trasladado'}
                      {s.withdrawalDate ? ` el ${new Date(`${s.withdrawalDate}T12:00:00`).toLocaleDateString('es-PE')}` : ''}
                    </span>
                  )}
                </td>
                {data.criteria.map((c, col) => {
                  const k = keyOf(s.enrollmentId, competenceId, c.id);
                  return (
                    <td key={c.id} className="px-1 py-1 text-center">
                      <input
                        data-row={row}
                        data-col={col}
                        aria-label={`${c.shortName} de ${s.fullName}`}
                        disabled={!active || !editable}
                        value={drafts[k] ?? ''}
                        onChange={(e) => setCell(k, e.target.value)}
                        onBlur={() => {
                          const v = drafts[k] ?? '';
                          if (v.trim() !== '' && parseCell(v) === 'invalid') {
                            toast.warning(`«${v}» no es una nota válida. Ingresa un número de 0 a 20 o AD, A, B, C, EXO.`);
                          }
                          void flushRef.current();
                        }}
                        onPaste={(e) => onPaste(e, row, col)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === 'ArrowDown') { e.preventDefault(); focusCell(row + 1, col); }
                          if (e.key === 'ArrowUp') { e.preventDefault(); focusCell(row - 1, col); }
                        }}
                        className={cn(
                          'h-8 w-14 rounded border border-transparent bg-transparent text-center tabular-nums focus:border-primary focus:bg-background focus:outline-none disabled:cursor-not-allowed',
                          dirty.has(k) && 'bg-amber-500/10',
                          invalid.has(k) && 'border-red-500 bg-red-500/10',
                        )}
                      />
                    </td>
                  );
                })}
                {data.criteria.length > 0 && (
                  <td className="px-2 py-1 text-center">
                    <LetterBadge letter={r?.suggestedLetter} title={r?.computedScore !== null && r?.computedScore !== undefined ? `Promedio ${r.computedScore}` : undefined} />
                  </td>
                )}
                <td className="px-2 py-1 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <select
                      aria-label={`Calificativo final de ${s.fullName}`}
                      disabled={!active || !editable || setFinal.isPending}
                      value={r?.isOverridden ? r.finalLetter ?? '' : ''}
                      onChange={(e) => {
                        if (data.requiresReason && !reason) { onNeedReason(); return; }
                        const v = (e.target.value || null) as ResultLetter | null;
                        setFinal.mutate({ periodNumber: data.periodNumber, enrollmentId: s.enrollmentId, competenceId, finalLetter: v, reason });
                      }}
                      className="h-8 rounded border border-input bg-background px-1 text-sm"
                    >
                      <option value="">{r?.suggestedLetter ? `Usar ${r.suggestedLetter}` : '—'}</option>
                      {(['AD', 'A', 'B', 'C', 'EXO'] as const).map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                    <LetterBadge letter={r?.finalLetter} />
                    {r?.isOverridden && <span className="text-[10px] text-muted-foreground" title="Calificativo ajustado por el docente">ajustado</span>}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

