import React, { useEffect, useMemo, useState } from 'react';
import { BookmarkPlus, Check, Loader2, MessageSquare, Search, Sparkles, Trash2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LetterBadge } from '@/components/ui/letter-badge';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';
import { useCreatePhrase, useDeletePhrase, usePhrases, useSaveConclusions } from '../api';
import type { GradebookData, Letter, Phrase } from '../types';

type Filter = 'REQUIRED' | 'EMPTY' | 'ALL';
interface Row { enrollmentId: string; fullName: string; letter: string | null; conclusion: string }

const SOURCE_LABEL: Record<Phrase['source'], string> = { MINE: 'Mis frases', SCHOOL: 'Del colegio', FACTORY: 'Sugeridas' };
const isLetter = (l: string | null | undefined): l is Letter => l === 'AD' || l === 'A' || l === 'B' || l === 'C';

/** Frases que corresponden a una competencia y un nivel de logro (las sin nivel sirven para cualquiera). */
function phrasesFor(all: Phrase[], cnebNumber: number | null, letter: string | null): Phrase[] {
  if (cnebNumber === null) return [];
  return all.filter((p) => p.cnebNumber === cnebNumber && (!p.letter || !isLetter(letter) || p.letter === letter));
}

/** Prioridad al autocompletar: propias > colegio > del curso > generales. */
function rankForAuto(list: Phrase[]): Phrase[] {
  const score = (p: Phrase) => (p.source === 'MINE' ? 0 : p.source === 'SCHOOL' ? 1 : p.courseKey ? 2 : 3);
  return [...list].sort((a, b) => score(a) - score(b));
}

const PhrasePicker: React.FC<{
  open: boolean;
  onClose: () => void;
  phrases: Phrase[];
  competenceName: string;
  cnebNumber: number;
  letter: string | null;
  courseKey: string | null;
  level: GradebookData['assignment']['classroom']['educationLevel'];
  targetsLabel: string;
  onPick: (text: string) => void;
}> = ({ open, onClose, phrases, competenceName, cnebNumber, letter, courseKey, level, targetsLabel, onPick }) => {
  const role = useAuthStore((s) => s.user?.role);
  const isAdmin = role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN';
  const [query, setQuery] = useState('');
  const [letterFilter, setLetterFilter] = useState<Letter | 'ALL'>(isLetter(letter) ? letter : 'ALL');
  const [draft, setDraft] = useState('');
  const [scope, setScope] = useState<'MINE' | 'SCHOOL'>('MINE');
  const create = useCreatePhrase();
  const remove = useDeletePhrase();
  useEffect(() => { setLetterFilter(isLetter(letter) ? letter : 'ALL'); setQuery(''); }, [letter, open]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return phrases.filter((p) => p.cnebNumber === cnebNumber
      && (letterFilter === 'ALL' || !p.letter || p.letter === letterFilter)
      && (!q || p.text.toLowerCase().includes(q)));
  }, [phrases, cnebNumber, letterFilter, query]);
  const groups = (['MINE', 'SCHOOL', 'FACTORY'] as const).map((src) => ({ src, items: list.filter((p) => p.source === src) })).filter((g) => g.items.length);

  return (
    <Modal open={open} onClose={onClose} size="lg" title={`Frases para «${competenceName}»`} description={`Se aplicará a: ${targetsLabel}`}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Buscar frase…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          {(['ALL', 'AD', 'A', 'B', 'C'] as const).map((l) => (
            <Button key={l} size="sm" variant={letterFilter === l ? 'default' : 'outline'} onClick={() => setLetterFilter(l)}>{l === 'ALL' ? 'Todas' : l}</Button>
          ))}
        </div>

        <div className="max-h-[45vh] space-y-3 overflow-y-auto pr-1">
          {groups.length === 0 && <p className="text-sm text-muted-foreground">No hay frases con este filtro.</p>}
          {groups.map((g) => (
            <div key={g.src}>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{SOURCE_LABEL[g.src]}</p>
              <div className="space-y-1">
                {g.items.map((p) => (
                  <div key={p.id} className="group flex items-start gap-2 rounded-md border border-border p-2 text-sm hover:border-primary/50 hover:bg-primary/5">
                    <button type="button" className="flex-1 text-left" onClick={() => { onPick(p.text); onClose(); }}>
                      {p.letter && <LetterBadge letter={p.letter} className="mr-1.5 align-middle" />}
                      {p.text}
                      {p.courseKey && p.source === 'FACTORY' && <span className="ml-1 text-xs text-muted-foreground">(del curso)</span>}
                    </button>
                    {(p.source === 'MINE' || (p.source === 'SCHOOL' && isAdmin)) && (
                      <button type="button" className="rounded p-1 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100" aria-label="Borrar frase"
                        onClick={() => remove.mutate(p.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-dashed border-border p-3">
          <p className="mb-1 flex items-center gap-1 text-sm font-medium"><BookmarkPlus className="h-4 w-4" />Nueva frase</p>
          <Textarea rows={2} value={draft} maxLength={500} onChange={(e) => setDraft(e.target.value)} placeholder="Escribe una frase para reutilizarla en esta competencia." />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            {isAdmin ? (
              <select className="h-8 rounded-md border border-border bg-background px-2 text-sm" value={scope} onChange={(e) => setScope(e.target.value as 'MINE' | 'SCHOOL')}>
                <option value="MINE">Solo para mí</option>
                <option value="SCHOOL">Para todo el colegio</option>
              </select>
            ) : <span className="text-xs text-muted-foreground">Se guarda en «Mis frases».</span>}
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={draft.trim().length < 10 || create.isPending}
                onClick={() => create.mutate(
                  { scope, cnebNumber, letter: letterFilter === 'ALL' ? null : letterFilter, level, courseKey: null, text: draft },
                  { onSuccess: () => setDraft('') },
                )}>
                Guardar
              </Button>
              <Button size="sm" disabled={draft.trim().length < 10 || create.isPending}
                onClick={() => create.mutate(
                  { scope, cnebNumber, letter: letterFilter === 'ALL' ? null : letterFilter, level, courseKey: null, text: draft },
                  { onSuccess: () => { onPick(draft.trim()); setDraft(''); onClose(); } },
                )}>
                Guardar y aplicar
              </Button>
            </div>
          </div>
          {courseKey && <p className="mt-1 text-xs text-muted-foreground">Las frases nuevas sirven para cualquier curso que evalúe esta competencia.</p>}
        </div>
      </div>
    </Modal>
  );
};

const ConclusionField: React.FC<{ value: string; min: number; max: number; disabled: boolean; onSave: (v: string) => void }> = ({ value, min, max, disabled, onSave }) => {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const tooShort = text.trim().length > 0 && text.trim().length < min;
  return (
    <div className="flex-1">
      <Textarea rows={2} value={text} disabled={disabled} maxLength={max} onChange={(e) => setText(e.target.value)}
        onBlur={() => { if (text !== value && !tooShort) onSave(text); }}
        placeholder="Elige una frase o escribe la conclusión." />
      <p className={cn('mt-0.5 text-right text-xs', tooShort ? 'text-destructive' : text.length > max * 0.9 ? 'text-amber-600' : 'text-muted-foreground')}>
        {tooShort ? `Mínimo ${min} caracteres · ` : ''}{text.length}/{max}
      </p>
    </div>
  );
};

export const ConclusionsWorkspace: React.FC<{ data: GradebookData; reason: string | null; onNeedReason: () => void }> = ({ data, reason, onNeedReason }) => {
  const save = useSaveConclusions(data.assignment.id);
  const { data: bank, isLoading: loadingBank } = usePhrases(data.assignment.id);
  const competences = data.competences.filter((c) => c.cnebNumber !== null);
  const [competenceId, setCompetenceId] = useState(competences[0]?.id ?? data.competences[0]?.id ?? '');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [picker, setPicker] = useState<{ targets: string[]; letter: string | null; label: string } | null>(null);
  const [autoOpen, setAutoOpen] = useState(false);
  const [autoScope, setAutoScope] = useState<'COMPETENCE' | 'ALL'>('COMPETENCE');
  const [autoReplace, setAutoReplace] = useState(false);
  const [busy, setBusy] = useState(false);
  const competence = data.competences.find((c) => c.id === competenceId) ?? data.competences[0];
  const min = data.conclusionMinLength ?? 10;
  const editable = data.canEdit;
  const phrases = bank?.phrases ?? [];

  useEffect(() => setSelected(new Set()), [competenceId, filter]);

  const rowsFor = (compId: string): Row[] => data.students.filter((s) => s.state === 'REGISTERED').map((s) => ({
    enrollmentId: s.enrollmentId,
    fullName: s.fullName,
    letter: data.results.find((x) => x.enrollmentId === s.enrollmentId && x.competenceId === compId)?.finalLetter ?? null,
    conclusion: data.conclusions.find((x) => x.enrollmentId === s.enrollmentId && x.competenceId === compId)?.conclusion ?? '',
  }));

  const rows = useMemo(() => {
    if (!competence) return [];
    const all = rowsFor(competence.id);
    if (filter === 'REQUIRED') return all.filter((r) => r.letter === 'B' || r.letter === 'C');
    if (filter === 'EMPTY') return all.filter((r) => r.letter && !r.conclusion);
    return all;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, competence, filter]);

  const pending = (compId: string) => rowsFor(compId).filter((r) => r.letter && r.letter !== 'EXO' && !r.conclusion).length;

  const persist = async (items: Array<{ enrollmentId: string; competenceId: string; conclusion: string }>) => {
    if (items.length === 0) return;
    if (data.requiresReason && !reason) { onNeedReason(); return; }
    setBusy(true);
    try {
      for (let i = 0; i < items.length; i += 400) {
        await save.mutateAsync({ periodNumber: data.periodNumber, reason, items: items.slice(i, i + 400) });
      }
      toast.success(items.length === 1 ? 'Conclusión guardada' : `${items.length} conclusiones guardadas`);
    } catch {
      // El error ya se muestra desde useSaveConclusions.
    } finally {
      setBusy(false);
    }
  };

  const applyText = (text: string, targets: string[]) =>
    persist(targets.map((enrollmentId) => ({ enrollmentId, competenceId: competence.id, conclusion: text })));

  const runAuto = async () => {
    const comps = autoScope === 'ALL' ? competences : competences.filter((c) => c.id === competence.id);
    const items: Array<{ enrollmentId: string; competenceId: string; conclusion: string }> = [];
    let withoutPhrase = 0;
    for (const c of comps) {
      const counters = new Map<string, number>();
      for (const r of rowsFor(c.id)) {
        if (!isLetter(r.letter)) continue;
        if (r.conclusion && !autoReplace) continue;
        const options = rankForAuto(phrasesFor(phrases, c.cnebNumber, r.letter).filter((p) => p.letter === r.letter || !p.letter));
        if (options.length === 0) { withoutPhrase += 1; continue; }
        // Rotación: alumnos con el mismo nivel reciben frases distintas.
        const n = counters.get(r.letter) ?? 0;
        counters.set(r.letter, n + 1);
        items.push({ enrollmentId: r.enrollmentId, competenceId: c.id, conclusion: options[n % options.length].text });
      }
    }
    setAutoOpen(false);
    if (items.length === 0) { toast.info('No hay conclusiones por completar.'); return; }
    await persist(items);
    if (withoutPhrase) toast.warning(`${withoutPhrase} conclusiones quedaron sin frase porque no hay frases para su competencia.`);
  };

  if (!competence) return <p className="text-sm text-muted-foreground">Este curso no tiene competencias.</p>;
  const targetsOfLetter = (letter: string) => rows.filter((r) => r.letter === letter).map((r) => r.enrollmentId);
  const lettersInView = [...new Set(rows.map((r) => r.letter).filter(isLetter))];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {data.competences.map((c) => {
          const p = pending(c.id);
          return (
            <button key={c.id} type="button" onClick={() => setCompetenceId(c.id)} title={c.name}
              className={cn('rounded-full border px-3 py-1 text-sm', c.id === competence.id ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground')}>
              {c.shortName}{p > 0 && <span className="ml-1 rounded-full bg-amber-500/20 px-1.5 text-xs text-amber-700 dark:text-amber-300">{p}</span>}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(['ALL', 'EMPTY', 'REQUIRED'] as Filter[]).map((f) => (
          <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)}>
            {f === 'ALL' ? 'Todos' : f === 'EMPTY' ? 'Sin conclusión' : 'Solo B y C'}
          </Button>
        ))}
        <div className="ml-auto flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={!editable || selected.size === 0 || busy || loadingBank}
            onClick={() => setPicker({ targets: [...selected], letter: null, label: `${selected.size} estudiante(s) seleccionados` })}>
            <MessageSquare className="mr-1 h-4 w-4" />Frase a seleccionados
          </Button>
          <Button size="sm" disabled={!editable || busy || loadingBank} onClick={() => setAutoOpen(true)}>
            {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Wand2 className="mr-1 h-4 w-4" />}Autocompletar
          </Button>
        </div>
      </div>

      {lettersInView.length > 0 && editable && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" />Una frase para todos los que tienen:
          {lettersInView.map((l) => (
            <button key={l} type="button" className="rounded-md border border-border px-2 py-0.5 hover:border-primary/50"
              onClick={() => setPicker({ targets: targetsOfLetter(l), letter: l, label: `todos los que tienen ${l} en ${competence.shortName} (${targetsOfLetter(l).length})` })}>
              <LetterBadge letter={l} />
            </button>
          ))}
        </div>
      )}

      {rows.length === 0 ? <p className="text-sm text-muted-foreground">No hay estudiantes en este filtro.</p> : (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={selected.size === rows.length && rows.length > 0}
              onChange={(e) => setSelected(e.target.checked ? new Set(rows.map((r) => r.enrollmentId)) : new Set())} />
            Seleccionar todos
          </label>
          {rows.map((r) => (
            <div key={r.enrollmentId} className={cn('flex items-start gap-2 rounded-lg border p-3', !r.conclusion && isLetter(r.letter) ? 'border-amber-500/40' : 'border-border')}>
              <input type="checkbox" className="mt-1" checked={selected.has(r.enrollmentId)}
                onChange={(e) => { const next = new Set(selected); if (e.target.checked) next.add(r.enrollmentId); else next.delete(r.enrollmentId); setSelected(next); }} />
              <div className="w-48 shrink-0 text-sm">
                <p className="font-medium leading-tight">{r.fullName}</p>
                <div className="mt-1 flex items-center gap-1">
                  {r.letter ? <LetterBadge letter={r.letter} /> : <span className="text-xs text-muted-foreground">Sin calificativo</span>}
                  {r.conclusion && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                </div>
              </div>
              <ConclusionField value={r.conclusion} min={min} max={data.conclusionMaxLength} disabled={!editable}
                onSave={(v) => persist([{ enrollmentId: r.enrollmentId, competenceId: competence.id, conclusion: v }])} />
              <Button size="sm" variant="ghost" disabled={!editable || loadingBank} title="Elegir una frase"
                onClick={() => setPicker({ targets: [r.enrollmentId], letter: r.letter, label: r.fullName })}>
                <MessageSquare className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {picker && competence.cnebNumber !== null && (
        <PhrasePicker
          open
          onClose={() => setPicker(null)}
          phrases={phrases}
          competenceName={competence.name}
          cnebNumber={competence.cnebNumber}
          letter={picker.letter}
          courseKey={bank?.courseKey ?? null}
          level={data.assignment.classroom.educationLevel}
          targetsLabel={picker.label}
          onPick={(text) => applyText(text, picker.targets)}
        />
      )}

      <Modal open={autoOpen} onClose={() => setAutoOpen(false)} title="Autocompletar conclusiones"
        description="Cada estudiante recibe una frase según su calificativo. Las frases se reparten para que no salgan todas iguales; luego puedes editar cualquiera."
        footer={<>
          <Button variant="outline" onClick={() => setAutoOpen(false)}>Cancelar</Button>
          <Button onClick={runAuto} disabled={busy}>{busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Autocompletar</Button>
        </>}>
        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2"><input type="radio" checked={autoScope === 'COMPETENCE'} onChange={() => setAutoScope('COMPETENCE')} />Solo «{competence.shortName}»</label>
          <label className="flex items-center gap-2"><input type="radio" checked={autoScope === 'ALL'} onChange={() => setAutoScope('ALL')} />Todas las competencias del curso</label>
          <label className="mt-3 flex items-center gap-2"><input type="checkbox" checked={autoReplace} onChange={(e) => setAutoReplace(e.target.checked)} />Reemplazar también las conclusiones que ya están escritas</label>
          <p className="text-xs text-muted-foreground">Orden de preferencia: tus frases, las del colegio, las del curso y las sugeridas.</p>
        </div>
      </Modal>
    </div>
  );
};
