import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSaveScores, useSetFinalLetter, apiErrorMessage, type ScoreInput } from '../api';
import type { GradebookData, GradebookResult } from '../types';
import { formatCell, parseCell, parseClipboard } from '../utils/gradeInput';
import { GradebookRow } from './gradebook/GradebookRow';

interface Props {
  data: GradebookData;
  competenceId: string;
  reason: string | null;
  onNeedReason: () => void;
  onStatus: (s: 'idle' | 'saving' | 'saved' | 'error', msg?: string, invalidCount?: number) => void;
}

/** Celda: alumno + competencia + criterio (lo escrito se conserva al cambiar de competencia) */
const keyOf = (enrollmentId: string, competenceId: string, criterionId: string) =>
  `${enrollmentId}|${competenceId}|${criterionId}`;

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
    data.scores.forEach((sc) => {
      server[keyOf(sc.enrollmentId, sc.competenceId, sc.criterionId)] = formatCell(sc);
    });
    setDrafts((prev) => {
      const next: Record<string, string> = { ...server };
      dirtyRef.current.forEach((k) => {
        if (k in prev) next[k] = prev[k];
      });
      return next;
    });
    setResults(data.results);
  }, [data]);

  const flush = useCallback(async () => {
    if (inFlight.current) {
      again.current = true;
      return;
    }
    const pending = dirtyRef.current;
    if (pending.size === 0) return;
    if (data.requiresReason && !reason) {
      onNeedReason();
      return;
    }
    const current = draftsRef.current;
    const items: ScoreInput[] = [];
    const sent = new Map<string, string>();
    const shown = new Map<string, string>();
    const bad = new Set<string>();
    pending.forEach((k) => {
      const [enrollmentId, compId, criterionId] = k.split('|');
      const raw = current[k] ?? '';
      const parsed = parseCell(raw);
      if (parsed === 'invalid') {
        bad.add(k);
        return;
      }
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
        saved.forEach((k) => {
          if ((prev[k] ?? '') === sent.get(k)) next[k] = shown.get(k) ?? '';
        });
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
      if (!status || status >= 500)
        window.setTimeout(() => {
          void flushRef.current();
        }, 5000);
    } finally {
      inFlight.current = false;
      if (again.current) {
        again.current = false;
        void flushRef.current();
      }
    }
  }, [data.periodNumber, data.requiresReason, reason, saveScores, onNeedReason, onStatus]);

  const flushRef = useRef(flush);
  flushRef.current = flush;

  // Guardado automático 1,2 s después del último cambio
  useEffect(() => {
    if (dirty.size === 0) return;
    const t = setTimeout(() => {
      void flushRef.current();
    }, 1200);
    return () => clearTimeout(t);
  }, [dirty, drafts]);

  // Al salir de la grilla (otra pestaña, otro periodo, otra pantalla) se guarda lo pendiente
  useEffect(
    () => () => {
      void flushRef.current();
    },
    [],
  );

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
    matrix.forEach((cells, r) =>
      cells.forEach((value, c) => {
        const student = activeStudents[row + r];
        const criterion = data.criteria[col + c];
        if (student && criterion) setCell(keyOf(student.enrollmentId, competenceId, criterion.id), value);
      }),
    );
  };

  const resultOf = (enrollmentId: string) =>
    results.find((r) => r.enrollmentId === enrollmentId && r.competenceId === competenceId);

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table ref={tableRef} className="w-full text-sm">
        <thead className="bg-muted/40">
          <tr className="text-xs text-muted-foreground">
            <th className="w-10 px-2 py-2 text-left font-semibold">N.°</th>
            <th className="sticky left-0 bg-muted/40 px-2 py-2 text-left font-semibold">Estudiante</th>
            {data.criteria.map((c) => (
              <th key={c.id} className="px-1 py-2 text-center font-semibold" title={`${c.name} · peso ${c.weight}`}>
                {c.shortName}
              </th>
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
              <GradebookRow
                key={s.enrollmentId}
                student={s}
                idx={idx}
                active={active}
                row={row}
                result={r}
                editable={editable}
                criteria={data.criteria}
                competenceId={competenceId}
                drafts={drafts}
                dirty={dirty}
                invalid={invalid}
                reason={reason}
                requiresReason={data.requiresReason}
                periodNumber={data.periodNumber}
                setFinalPending={setFinal.isPending}
                onSetCell={setCell}
                onFlush={() => void flushRef.current()}
                onPaste={onPaste}
                onFocusCell={focusCell}
                onNeedReason={onNeedReason}
                onSetFinalLetter={(params) => setFinal.mutate(params)}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
