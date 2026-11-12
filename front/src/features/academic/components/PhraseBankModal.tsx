import React, { useMemo, useState } from 'react';
import { Eye, EyeOff, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { LetterBadge } from '@/components/ui/letter-badge';
import { cn } from '@/lib/utils';
import { useCreatePhrase, useDeletePhrase, usePhrasesManage, usePreuniversityCatalog, useSetPhraseHidden } from '../api';
import { LEVEL_LABEL, type Catalog, type Letter, type Level } from '../types';

const LEVELS: Level[] = ['INITIAL', 'PRIMARY', 'SECONDARY'];

export const PhraseBankModal: React.FC<{ open: boolean; onClose: () => void; catalog: Catalog; initialLevel: Level }> = ({ open, onClose, catalog, initialLevel }) => {
  const [level, setLevel] = useState<Level>(initialLevel);
  const areas = catalog.areas[level];
  const [areaCode, setAreaCode] = useState(areas[0]?.code ?? '');
  const area = areas.find((a) => a.code === areaCode) ?? areas[0];
  const [cnebNumber, setCnebNumber] = useState<number | null>(area?.competences[0] ?? null);
  const [courseKey, setCourseKey] = useState<string | null>(null);
  const [letter, setLetter] = useState<Letter | 'ALL'>('ALL');
  const [showHidden, setShowHidden] = useState(false);
  const [draft, setDraft] = useState('');
  const [draftLetter, setDraftLetter] = useState<Letter | ''>('');
  const { data, isLoading } = usePhrasesManage(level, cnebNumber, courseKey);
  const { data: preuni } = usePreuniversityCatalog(level, catalog.grades[level][0], level !== 'INITIAL');
  const hide = useSetPhraseHidden();
  const create = useCreatePhrase();
  const remove = useDeletePhrase();

  const courseOptions = useMemo(
    () => (preuni?.areas.find((a) => a.code === area?.code)?.courses ?? []).filter((c) => cnebNumber !== null && c.competences.includes(cnebNumber)),
    [preuni, area, cnebNumber],
  );
  const list = (data?.phrases ?? []).filter((p) => (letter === 'ALL' || !p.letter || p.letter === letter) && (showHidden || !p.hidden));
  const hiddenCount = (data?.phrases ?? []).filter((p) => p.hidden).length;

  const pickLevel = (l: Level) => {
    setLevel(l);
    const first = catalog.areas[l][0];
    setAreaCode(first?.code ?? '');
    setCnebNumber(first?.competences[0] ?? null);
    setCourseKey(null);
  };
  const pickArea = (code: string) => {
    setAreaCode(code);
    setCnebNumber(catalog.areas[level].find((a) => a.code === code)?.competences[0] ?? null);
    setCourseKey(null);
  };

  return (
    <Modal open={open} onClose={onClose} size="xl" title="Banco de frases para conclusiones"
      description="Los docentes eligen estas frases al escribir conclusiones. Oculta las sugeridas que no uses y agrega las frases propias del colegio.">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {LEVELS.map((l) => (
            <Button key={l} size="sm" variant={l === level ? 'default' : 'outline'} onClick={() => pickLevel(l)}>{LEVEL_LABEL[l]}</Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <select className="h-9 rounded-md border border-border bg-background px-2 text-sm" value={area?.code} onChange={(e) => pickArea(e.target.value)}>
            {areas.map((a) => <option key={a.code} value={a.code}>{a.name}</option>)}
          </select>
          <select className="h-9 rounded-md border border-border bg-background px-2 text-sm" value={cnebNumber ?? ''} onChange={(e) => { setCnebNumber(Number(e.target.value)); setCourseKey(null); }}>
            {area?.competences.map((n) => <option key={n} value={n}>{catalog.competences[n].name}</option>)}
          </select>
          {courseOptions.length > 0 && (
            <select className="h-9 rounded-md border border-border bg-background px-2 text-sm" value={courseKey ?? ''} onChange={(e) => setCourseKey(e.target.value || null)}>
              <option value="">Todas las frases de la competencia</option>
              {courseOptions.map((c) => <option key={c.key} value={c.key}>+ frases de {c.name}</option>)}
            </select>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(['ALL', 'AD', 'A', 'B', 'C'] as const).map((l) => (
            <Button key={l} size="sm" variant={letter === l ? 'default' : 'outline'} onClick={() => setLetter(l)}>{l === 'ALL' ? 'Todas' : l}</Button>
          ))}
          {hiddenCount > 0 && (
            <label className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
              <input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} />Ver ocultas ({hiddenCount})
            </label>
          )}
        </div>

        <div className="rounded-lg border border-dashed border-border p-3">
          <Textarea rows={2} value={draft} maxLength={500} onChange={(e) => setDraft(e.target.value)} placeholder="Nueva frase del colegio para esta competencia." />
          <div className="mt-2 flex items-center justify-between gap-2">
            <select className="h-8 rounded-md border border-border bg-background px-2 text-sm" value={draftLetter} onChange={(e) => setDraftLetter(e.target.value as Letter | '')}>
              <option value="">Para cualquier nivel de logro</option>
              {(['AD', 'A', 'B', 'C'] as const).map((l) => <option key={l} value={l}>Para {l}</option>)}
            </select>
            <Button size="sm" disabled={draft.trim().length < 10 || cnebNumber === null || create.isPending}
              onClick={() => cnebNumber !== null && create.mutate(
                { scope: 'SCHOOL', cnebNumber, letter: draftLetter || null, level, courseKey, text: draft },
                { onSuccess: () => setDraft('') },
              )}>
              Agregar al colegio
            </Button>
          </div>
        </div>

        {isLoading ? <Skeleton className="h-48 w-full" /> : (
          <div className="max-h-[45vh] space-y-1 overflow-y-auto pr-1">
            {list.length === 0 && <p className="text-sm text-muted-foreground">No hay frases con este filtro.</p>}
            {list.map((p) => (
              <div key={p.id} className={cn('flex items-start gap-2 rounded-md border border-border p-2 text-sm', p.hidden && 'opacity-50')}>
                <span className="flex-1">
                  {p.letter && <LetterBadge letter={p.letter} className="mr-1.5 align-middle" />}
                  {p.text}
                  <span className="ml-1 text-xs text-muted-foreground">
                    · {p.source === 'FACTORY' ? (p.courseKey ? 'sugerida del curso' : 'sugerida') : p.source === 'SCHOOL' ? 'del colegio' : 'mía'}
                  </span>
                </span>
                {p.source === 'FACTORY' ? (
                  <Button size="icon" variant="ghost" title={p.hidden ? 'Mostrar a los docentes' : 'Ocultar a los docentes'}
                    onClick={() => hide.mutate({ phraseKey: p.id, hidden: !p.hidden })}>
                    {p.hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                ) : (
                  <Button size="icon" variant="ghost" title="Borrar" onClick={() => remove.mutate(p.id)}><Trash2 className="h-4 w-4" /></Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};
