import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAddWorkshop } from '../../api';
import type { Catalog, Level } from '../../types';
import { GradePicker } from './GradePicker';

const WORKSHOP_SUGGESTIONS = [
  'Taller',
  'Curso extra',
  'Robótica',
  'Música',
  'Danza',
  'Ajedrez',
  'Oratoria',
  'Dibujo y Pintura',
];

interface WorkshopModalProps {
  open: boolean;
  onClose: () => void;
  level: Level;
  currentGrade: number;
  catalog: Catalog;
}

export const WorkshopModal: React.FC<WorkshopModalProps> = ({
  open,
  onClose,
  level,
  currentGrade,
  catalog,
}) => {
  const [name, setName] = useState('');
  const [hours, setHours] = useState<string>('');
  const [grades, setGrades] = useState<number[]>([currentGrade]);
  const add = useAddWorkshop();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Agregar taller o curso extra"
      description="Los talleres y cursos extra aparecen en la libreta interna, no en el SIAGIE."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={name.trim().length < 2 || grades.length === 0 || add.isPending}
            onClick={() =>
              add.mutate(
                { level, grades, name: name.trim(), weeklyHours: hours ? Number(hours) : null },
                { onSuccess: onClose },
              )
            }
          >
            Agregar
          </Button>
        </>
      }
    >
      <label className="text-sm font-medium">Nombre</label>
      <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej.: Robótica" />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {WORKSHOP_SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setName(s)}
            className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground hover:border-primary hover:text-primary"
          >
            {s}
          </button>
        ))}
      </div>
      <label className="mt-4 block text-sm font-medium">Horas semanales (opcional)</label>
      <Input
        className="mt-1 w-28"
        type="number"
        min={0}
        max={40}
        value={hours}
        onChange={(e) => setHours(e.target.value)}
      />
      <p className="mb-2 mt-4 text-sm font-medium">Grados</p>
      <GradePicker level={level} grades={catalog.grades[level]} value={grades} onChange={setGrades} />
    </Modal>
  );
};
