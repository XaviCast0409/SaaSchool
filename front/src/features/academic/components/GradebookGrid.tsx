import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  onStatus: (s: 'idle' | 'saving' | 'saved' | 'error', msg?: string) => void;
}

const keyOf = (enrollmentId: string, criterionId: string) => `${enrollmentId}|${criterionId}`;

export const GradebookGrid: React.FC<Props> = ({ data, competenceId, reason, onNeedReason, onStatus }) => {
  const saveScores = useSaveScores(data.assignment.id);
  const setFinal = useSetFinalLetter(data.assignment.id);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [invalid, setInvalid] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<GradebookResult[]>(data.results);
  const tableRef = useRef<HTMLTableElement>(null);
  const editable = data.canEdit && (!data.requiresReason || !!reason);

  // Cargar valores al cambiar de competencia o al recibir datos nuevos
  useEffect(() => {
    const next: Record<string, string> = {};
    data.scores.filter((s) => s.competenceId === competenceId).forEach((s) => { next[keyOf(s.enrollmentId, s.criterionId)] = formatCell(s); });
    setDrafts(next);
    setDirty(new Set());
    setInvalid(new Set());
    setResults(data.results);
  }, [data, competenceId]);

  const flush = useCallback(async () => {
    if (dirty.size === 0) return;
    if (data.requiresReason && !reason) { onNeedReason(); return; }
    const items: ScoreInput[] = [];
    const bad = new Set<string>();
    dirty.forEach((k) => {
      const [enrollmentId, criterionId] = k.split('|');
      const parsed = parseCell(drafts[k] ?? '');
      if (parsed === 'invalid') { bad.add(k); return; }
      items.push({ enrollmentId, criterionId, competenceId, ...parsed });
    });
    setInvalid(bad);
    if (items.length === 0) return;
    onStatus('saving');
    try {
      const res = await saveScores.mutateAsync({ periodNumber: data.periodNumber, items, reason });
      setResults((prev) => {
        const map = new Map(prev.map((r) => [`${r.enrollmentId}|${r.competenceId}`, r]));
        res.results.forEach((r) => map.set(`${r.enrollmentId}|${r.competenceId}`, r));
        return [...map.values()];
      });
      setDirty((prev) => { const n = new Set(prev); items.forEach((i) => n.delete(keyOf(i.enrollmentId, i.criterionId))); return n; });
      onStatus('saved');
    } catch (e) {
      onStatus('error', apiErrorMessage(e, 'No se pudieron guardar las notas.'));
    }
  }, [dirty, drafts, competenceId, data, reason, saveScores, onNeedReason, onStatus]);

  // Guardado automático 1,2 s después del último cambio
  useEffect(() => {
    if (dirty.size === 0) return;
    const t = setTimeout(() => { void flush(); }, 1200);
    return () => clearTimeout(t);
  }, [dirty, drafts, flush]);

  const setCell = (k: string, value: string) => {
    setDrafts((d) => ({ ...d, [k]: value }));
    setDirty((s) => new Set(s).add(k));
  };

  const focusCell = (row: number, col: number) => {
    const el = tableRef.current?.querySelector<HTMLInputElement>(`input[data-row="${row}"][data-col="${col}"]`);
    el?.focus();
    el?.select();
  };

  const activeStudents = useMemo(() => data.students.filter((s) => s.state === 'REGISTERED'), [data.students]);

  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>, row: number, col: number) => {
    const text = e.clipboardData.getData('text');
    if (!text.includes('\t') && !text.includes('\n')) return;
    e.preventDefault();
    const matrix = parseClipboard(text);
    matrix.forEach((cells, r) => cells.forEach((value, c) => {
      const student = activeStudents[row + r];
      const criterion = data.criteria[col + c];
      if (student && criterion) setCell(keyOf(student.enrollmentId, criterion.id), value);
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
            const active = s.state === 'REGISTERED';
            const row = activeStudents.findIndex((x) => x.enrollmentId === s.enrollmentId);
            const r = resultOf(s.enrollmentId);
            return (
              <tr key={s.enrollmentId} className={cn('border-t border-border', !active && 'opacity-50')}>
                <td className="px-2 py-1 text-xs tabular-nums text-muted-foreground">{idx + 1}</td>
                <td className="sticky left-0 bg-card px-2 py-1">
                  <span className="whitespace-nowrap">{s.fullName}</span>
                  {!active && <span className="ml-2 text-xs text-muted-foreground">{s.state === 'WITHDRAWN' ? 'Retirado' : 'Trasladado'}</span>}
                </td>
                {data.criteria.map((c, col) => {
                  const k = keyOf(s.enrollmentId, c.id);
                  return (
                    <td key={c.id} className="px-1 py-1 text-center">
                      <input
                        data-row={row}
                        data-col={col}
                        aria-label={`${c.shortName} de ${s.fullName}`}
                        disabled={!active || !editable}
                        value={drafts[k] ?? ''}
                        onChange={(e) => setCell(k, e.target.value)}
                        onBlur={() => { void flush(); }}
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

