import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LetterBadge } from '@/components/ui/letter-badge';
import { useEvaluationCriteria } from '@/features/grades/api/useGrades';
import { cn } from '@/lib/utils';
import { useSetCourseCriteria } from '../api';
import type { GradebookData } from '../types';

export const SummaryTable: React.FC<{ data: GradebookData; onPick: (competenceId: string) => void }> = ({ data, onPick }) => (
  <div className="overflow-x-auto rounded-lg border border-border">
    <table className="w-full text-sm">
      <thead className="bg-muted/40">
        <tr className="text-xs text-muted-foreground">
          <th className="px-2 py-2 text-left font-semibold">Estudiante</th>
          {data.competences.map((c) => (
            <th key={c.id} className="px-2 py-2 text-center font-semibold">
              <button type="button" className="hover:underline" onClick={() => onPick(c.id)} title={c.name}>{c.shortName}</button>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.students.map((s) => (
          <tr key={s.enrollmentId} className={cn('border-t border-border', s.state !== 'REGISTERED' && 'opacity-50')}>
            <td className="whitespace-nowrap px-2 py-1.5">{s.fullName}</td>
            {data.competences.map((c) => {
              const r = data.results.find((x) => x.enrollmentId === s.enrollmentId && x.competenceId === c.id);
              return <td key={c.id} className="px-2 py-1.5 text-center"><LetterBadge letter={r?.finalLetter} /></td>;
            })}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const CriteriaModal: React.FC<{ open: boolean; onClose: () => void; data: GradebookData }> = ({ open, onClose, data }) => {
  const { data: all = [] } = useEvaluationCriteria(data.assignment.classroom.educationLevel);
  const save = useSetCourseCriteria(data.assignment.id);
  const [selected, setSelected] = useState<Record<string, string>>(() =>
    Object.fromEntries(data.criteria.map((c) => [c.id, c.isCustom ? String(c.weight) : ''])));
  const list = (all as Array<{ id: string; name: string; shortName: string; weight: number; isActive?: boolean }>).filter((c) => c.isActive !== false);
  return (
    <Modal open={open} onClose={onClose} title="Criterios de este curso" description="Elige qué criterios usas y su peso. Si dejas el peso vacío, se usa el del colegio."
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button disabled={save.isPending || Object.keys(selected).length === 0}
          onClick={() => save.mutate(Object.entries(selected).map(([criterionId, w]) => ({ criterionId, weight: w ? Number(w) : null })), { onSuccess: onClose })}>
          Guardar
        </Button>
      </>}>
      {list.map((c) => {
        const on = c.id in selected;
        return (
          <div key={c.id} className="flex items-center justify-between gap-3 border-b border-border py-2 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={on} onChange={(e) => {
                const next = { ...selected };
                if (e.target.checked) next[c.id] = ''; else delete next[c.id];
                setSelected(next);
              }} />
              {c.name} <span className="text-muted-foreground">({c.shortName} · peso {c.weight})</span>
            </label>
            {on && <Input type="number" min={0.5} max={10} step={0.5} className="w-20" placeholder={String(c.weight)} value={selected[c.id]} onChange={(e) => setSelected({ ...selected, [c.id]: e.target.value })} />}
          </div>
        );
      })}
    </Modal>
  );
};

export const ReasonModal: React.FC<{ open: boolean; onClose: () => void; onConfirm: (reason: string) => void }> = ({ open, onClose, onConfirm }) => {
  const [text, setText] = useState('');
  return (
    <Modal open={open} onClose={onClose} title="Motivo de la corrección" description="El periodo no está abierto. Tu motivo quedará en la bitácora."
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button disabled={text.trim().length < 5} onClick={() => onConfirm(text.trim())}>Continuar</Button>
      </>}>
      <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Ej.: corrección solicitada por el docente el 12/06 por error de digitación." />
    </Modal>
  );
};

