import React, { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useCreateSubcourses } from '../../api';
import type { Catalog, CnebArea, Level } from '../../types';
import { GradePicker } from './GradePicker';

interface SubRow {
  name: string;
  cnebNumbers: number[];
  weight: number;
}

interface SubcourseModalProps {
  open: boolean;
  onClose: () => void;
  level: Level;
  currentGrade: number;
  area: CnebArea;
  catalog: Catalog;
}

export const SubcourseModal: React.FC<SubcourseModalProps> = ({
  open,
  onClose,
  level,
  currentGrade,
  area,
  catalog,
}) => {
  const [rows, setRows] = useState<SubRow[]>([
    { name: '', cnebNumbers: [], weight: 1 },
    { name: '', cnebNumbers: [], weight: 1 },
  ]);
  const [grades, setGrades] = useState<number[]>([currentGrade]);
  const create = useCreateSubcourses();
  const covered = useMemo(() => new Set(rows.flatMap((r) => r.cnebNumbers)), [rows]);
  const missing = area.competences.filter((n) => !covered.has(n));
  const valid =
    rows.length >= 2 &&
    rows.every((r) => r.name.trim().length >= 2 && r.cnebNumbers.length > 0) &&
    missing.length === 0 &&
    grades.length > 0;
  const update = (i: number, patch: Partial<SubRow>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const toggle = (i: number, n: number) => {
    const r = rows[i];
    update(i, {
      cnebNumbers: r.cnebNumbers.includes(n) ? r.cnebNumbers.filter((x) => x !== n) : [...r.cnebNumbers, n],
    });
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={`Dividir ${area.name} en cursos`}
      description="Cada curso evalúa una o más competencias del área. Todas las competencias deben quedar cubiertas."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={!valid || create.isPending}
            onClick={() =>
              create.mutate(
                {
                  level,
                  grades,
                  officialAreaCode: area.code,
                  subcourses: rows.map((r) => ({ name: r.name.trim(), cnebNumbers: r.cnebNumbers, weight: r.weight })),
                },
                { onSuccess: onClose },
              )
            }
          >
            Guardar división
          </Button>
        </>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="py-2 text-left font-semibold">Curso</th>
              {area.competences.map((n) => (
                <th key={n} className={cn('px-2 py-2 text-center font-semibold', !covered.has(n) && 'text-red-600')}>
                  {catalog.competences[n].shortName}
                </th>
              ))}
              <th className="px-2 py-2 text-center font-semibold" title="Peso al combinar con otros cursos del área">
                Peso
              </th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-border">
                <td className="py-2 pr-2">
                  <Input
                    value={r.name}
                    placeholder="Ej.: Álgebra"
                    onChange={(e) => update(i, { name: e.target.value })}
                  />
                </td>
                {area.competences.map((n) => (
                  <td key={n} className="px-2 text-center">
                    <input
                      type="checkbox"
                      aria-label={catalog.competences[n].name}
                      checked={r.cnebNumbers.includes(n)}
                      onChange={() => toggle(i, n)}
                    />
                  </td>
                ))}
                <td className="px-2">
                  <Input
                    type="number"
                    min={0.5}
                    max={10}
                    step={0.5}
                    className="w-20"
                    value={r.weight}
                    onChange={(e) => update(i, { weight: Number(e.target.value) || 1 })}
                  />
                </td>
                <td>
                  {rows.length > 2 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setRows(rows.filter((_, j) => j !== i))}
                      aria-label="Quitar curso"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={() => setRows([...rows, { name: '', cnebNumbers: [], weight: 1 }])}
      >
        <Plus className="mr-1 h-4 w-4" />
        Agregar curso
      </Button>
      <p className={cn('mt-3 text-sm', missing.length ? 'text-red-600' : 'text-emerald-600')}>
        {missing.length
          ? `Faltan por cubrir: ${missing.map((n) => catalog.competences[n].shortName).join(', ')}`
          : 'Todas las competencias están cubiertas.'}
      </p>
      <p className="mb-2 mt-5 text-sm font-medium">Aplicar a los grados</p>
      <GradePicker level={level} grades={catalog.grades[level]} value={grades} onChange={setGrades} />
    </Modal>
  );
};
