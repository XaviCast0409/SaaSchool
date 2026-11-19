import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/errors';
import { useBulkCreateClassrooms } from '../../api/useClassrooms';
import {
  LEVEL_GRADES,
  LEVEL_LABEL,
  SHIFT_LABEL,
  gradeLabel,
  type Level,
  type Shift,
} from './constants';

export const BulkCreateModal: React.FC<{ defaultLevel: Level; onClose: () => void }> = ({ defaultLevel, onClose }) => {
  const bulk = useBulkCreateClassrooms();
  const [level, setLevel] = useState<Level>(defaultLevel);
  const [grades, setGrades] = useState<number[]>(LEVEL_GRADES[defaultLevel]);
  const [sectionsText, setSectionsText] = useState('A');
  const [shift, setShift] = useState<Shift>('MORNING');
  const [capacity, setCapacity] = useState(30);
  const sections = [
    ...new Set(
      sectionsText
        .split(/[,\s]+/)
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean),
    ),
  ];
  const total = grades.length * sections.length;

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Crear varias aulas"
      description="Genera todas las secciones de una vez. Las aulas que ya existen se omiten."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={total === 0 || bulk.isPending}
            onClick={async () => {
              try {
                const r = await bulk.mutateAsync({ educationLevel: level, grades, sections, shift, capacity });
                toast.success(
                  `${r.created.length} aula(s) creada(s)${r.skipped.length ? ` · ${r.skipped.length} ya existían` : ''}.`,
                );
                onClose();
              } catch (err: unknown) {
                toast.error(getApiErrorMessage(err, 'No se pudieron crear las aulas.'));
              }
            }}
          >
            Crear {total} aula(s)
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <label className="block text-sm font-medium">
          Nivel
          <Select
            className="mt-1 w-full"
            value={level}
            onChange={(e) => {
              const l = e.target.value as Level;
              setLevel(l);
              setGrades(LEVEL_GRADES[l]);
            }}
          >
            {(Object.keys(LEVEL_LABEL) as Level[]).map((l) => (
              <option key={l} value={l}>
                {LEVEL_LABEL[l]}
              </option>
            ))}
          </Select>
        </label>
        <div>
          <p className="text-sm font-medium">Grados</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {LEVEL_GRADES[level].map((g) => {
              const on = grades.includes(g);
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGrades(on ? grades.filter((x) => x !== g) : [...grades, g].sort((a, b) => a - b))}
                  className={cn(
                    'rounded-full border px-3 py-1 text-sm',
                    on ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground',
                  )}
                >
                  {gradeLabel(level, g)}
                </button>
              );
            })}
          </div>
        </div>
        <label className="block text-sm font-medium">
          Secciones
          <Input
            className="mt-1"
            value={sectionsText}
            onChange={(e) => setSectionsText(e.target.value)}
            placeholder="A, B, C"
          />
          <span className="mt-1 block text-xs text-muted-foreground">
            Separa las secciones con comas. Ejemplo: A, B, C
          </span>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">
            Turno
            <Select className="mt-1 w-full" value={shift} onChange={(e) => setShift(e.target.value as Shift)}>
              {(Object.keys(SHIFT_LABEL) as Shift[]).map((s) => (
                <option key={s} value={s}>
                  {SHIFT_LABEL[s]}
                </option>
              ))}
            </Select>
          </label>
          <label className="text-sm font-medium">
            Capacidad de cada aula
            <Input
              className="mt-1"
              type="number"
              min={1}
              max={60}
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
            />
          </label>
        </div>
        {total > 0 && (
          <p className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
            Se crearán:{' '}
            {grades.map((g) => sections.map((s) => `${gradeLabel(level, g)} "${s}"`).join(', ')).join(' · ')}
          </p>
        )}
        <p className="text-xs text-muted-foreground">Los tutores se asignan después, en cada aula.</p>
      </div>
    </Modal>
  );
};
