import React, { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAddWorkshop, useApplyTemplate, useCreateSubcourses, useUpdateCourseCompetences } from '../api';
import type { Catalog, CnebArea, Level, PlanCourse } from '../types';
import { gradeLabel } from '../types';

const GradePicker: React.FC<{ level: Level; grades: number[]; value: number[]; onChange: (v: number[]) => void }> = ({ level, grades, value, onChange }) => (
  <div className="flex flex-wrap gap-2">
    {grades.map((g) => {
      const on = value.includes(g);
      return (
        <button key={g} type="button" onClick={() => onChange(on ? value.filter((x) => x !== g) : [...value, g].sort((a, b) => a - b))}
          className={cn('rounded-full border px-3 py-1 text-sm', on ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground')}>
          {gradeLabel(level, g)}
        </button>
      );
    })}
  </div>
);

export const TemplateModal: React.FC<{ open: boolean; onClose: () => void; level: Level; currentGrade: number; catalog: Catalog }> = ({ open, onClose, level, currentGrade, catalog }) => {
  const [grades, setGrades] = useState<number[]>([currentGrade]);
  const [optional, setOptional] = useState<string[]>([]);
  const apply = useApplyTemplate();
  const optionalAreas = catalog.areas[level].filter((a) => a.optional);
  return (
    <Modal open={open} onClose={onClose} title="Aplicar plantilla CNEB" description="Agrega las áreas oficiales con sus competencias. No borra lo que ya existe."
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button disabled={grades.length === 0 || apply.isPending} onClick={() => apply.mutate({ level, grades, includeOptional: optional }, { onSuccess: onClose })}>Aplicar</Button>
      </>}>
      <p className="mb-2 text-sm font-medium">Grados</p>
      <GradePicker level={level} grades={catalog.grades[level]} value={grades} onChange={setGrades} />
      {optionalAreas.length > 0 && (
        <>
          <p className="mb-2 mt-5 text-sm font-medium">Áreas opcionales</p>
          {optionalAreas.map((a) => (
            <label key={a.code} className="flex items-center gap-2 py-1 text-sm">
              <input type="checkbox" checked={optional.includes(a.code)} onChange={(e) => setOptional(e.target.checked ? [...optional, a.code] : optional.filter((c) => c !== a.code))} />
              {a.name}
            </label>
          ))}
        </>
      )}
    </Modal>
  );
};

interface SubRow { name: string; cnebNumbers: number[]; weight: number }

export const SubcourseModal: React.FC<{ open: boolean; onClose: () => void; level: Level; currentGrade: number; area: CnebArea; catalog: Catalog }> = ({ open, onClose, level, currentGrade, area, catalog }) => {
  const [rows, setRows] = useState<SubRow[]>([{ name: '', cnebNumbers: [], weight: 1 }, { name: '', cnebNumbers: [], weight: 1 }]);
  const [grades, setGrades] = useState<number[]>([currentGrade]);
  const create = useCreateSubcourses();
  const covered = useMemo(() => new Set(rows.flatMap((r) => r.cnebNumbers)), [rows]);
  const missing = area.competences.filter((n) => !covered.has(n));
  const valid = rows.length >= 2 && rows.every((r) => r.name.trim().length >= 2 && r.cnebNumbers.length > 0) && missing.length === 0 && grades.length > 0;
  const update = (i: number, patch: Partial<SubRow>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const toggle = (i: number, n: number) => {
    const r = rows[i];
    update(i, { cnebNumbers: r.cnebNumbers.includes(n) ? r.cnebNumbers.filter((x) => x !== n) : [...r.cnebNumbers, n] });
  };
  return (
    <Modal open={open} onClose={onClose} size="xl" title={`Dividir ${area.name} en cursos`}
      description="Cada curso evalúa una o más competencias del área. Todas las competencias deben quedar cubiertas."
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button disabled={!valid || create.isPending}
          onClick={() => create.mutate({ level, grades, officialAreaCode: area.code, subcourses: rows.map((r) => ({ name: r.name.trim(), cnebNumbers: r.cnebNumbers, weight: r.weight })) }, { onSuccess: onClose })}>
          Guardar división
        </Button>
      </>}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="py-2 text-left font-semibold">Curso</th>
              {area.competences.map((n) => (
                <th key={n} className={cn('px-2 py-2 text-center font-semibold', !covered.has(n) && 'text-red-600')}>{catalog.competences[n].shortName}</th>
              ))}
              <th className="px-2 py-2 text-center font-semibold" title="Peso al combinar con otros cursos del área">Peso</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-border">
                <td className="py-2 pr-2"><Input value={r.name} placeholder="Ej.: Álgebra" onChange={(e) => update(i, { name: e.target.value })} /></td>
                {area.competences.map((n) => (
                  <td key={n} className="px-2 text-center"><input type="checkbox" aria-label={catalog.competences[n].name} checked={r.cnebNumbers.includes(n)} onChange={() => toggle(i, n)} /></td>
                ))}
                <td className="px-2"><Input type="number" min={0.5} max={10} step={0.5} className="w-20" value={r.weight} onChange={(e) => update(i, { weight: Number(e.target.value) || 1 })} /></td>
                <td>{rows.length > 2 && <Button variant="ghost" size="icon" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label="Quitar curso"><Trash2 className="h-4 w-4" /></Button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button variant="outline" size="sm" className="mt-3" onClick={() => setRows([...rows, { name: '', cnebNumbers: [], weight: 1 }])}><Plus className="mr-1 h-4 w-4" />Agregar curso</Button>
      <p className={cn('mt-3 text-sm', missing.length ? 'text-red-600' : 'text-emerald-600')}>
        {missing.length ? `Faltan por cubrir: ${missing.map((n) => catalog.competences[n].shortName).join(', ')}` : 'Todas las competencias están cubiertas.'}
      </p>
      <p className="mb-2 mt-5 text-sm font-medium">Aplicar a los grados</p>
      <GradePicker level={level} grades={catalog.grades[level]} value={grades} onChange={setGrades} />
    </Modal>
  );
};

export const WorkshopModal: React.FC<{ open: boolean; onClose: () => void; level: Level; currentGrade: number; catalog: Catalog }> = ({ open, onClose, level, currentGrade, catalog }) => {
  const [name, setName] = useState('');
  const [hours, setHours] = useState<string>('');
  const [grades, setGrades] = useState<number[]>([currentGrade]);
  const add = useAddWorkshop();
  return (
    <Modal open={open} onClose={onClose} title="Agregar taller" description="Los talleres aparecen en la libreta interna, no en el SIAGIE."
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button disabled={name.trim().length < 2 || grades.length === 0 || add.isPending}
          onClick={() => add.mutate({ level, grades, name: name.trim(), weeklyHours: hours ? Number(hours) : null }, { onSuccess: onClose })}>Agregar</Button>
      </>}>
      <label className="text-sm font-medium">Nombre</label>
      <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej.: Robótica" />
      <label className="mt-4 block text-sm font-medium">Horas semanales (opcional)</label>
      <Input className="mt-1 w-28" type="number" min={0} max={40} value={hours} onChange={(e) => setHours(e.target.value)} />
      <p className="mb-2 mt-4 text-sm font-medium">Grados</p>
      <GradePicker level={level} grades={catalog.grades[level]} value={grades} onChange={setGrades} />
    </Modal>
  );
};

export const CourseCompetencesModal: React.FC<{ open: boolean; onClose: () => void; course: PlanCourse; area: CnebArea; catalog: Catalog }> = ({ open, onClose, course, area, catalog }) => {
  const initial = Object.fromEntries(course.competences.filter((c) => c.cnebNumber).map((c) => [c.cnebNumber as number, c.weight]));
  const [selected, setSelected] = useState<Record<number, number>>(initial);
  const save = useUpdateCourseCompetences();
  const items = Object.entries(selected).map(([n, w]) => ({ cnebNumber: Number(n), weight: w }));
  return (
    <Modal open={open} onClose={onClose} title={`Competencias de ${course.name}`} description="El cambio aplica a todos los grados que usan este curso."
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button disabled={items.length === 0 || save.isPending} onClick={() => save.mutate({ areaId: course.areaId, competences: items }, { onSuccess: onClose })}>Guardar</Button>
      </>}>
      {area.competences.map((n) => {
        const on = selected[n] !== undefined;
        return (
          <div key={n} className="flex items-center justify-between gap-3 border-b border-border py-2 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={on} onChange={(e) => {
                const next = { ...selected };
                if (e.target.checked) next[n] = 1; else delete next[n];
                setSelected(next);
              }} />
              {catalog.competences[n].name}
            </label>
            {on && <Input type="number" min={0.5} max={10} step={0.5} className="w-20" value={selected[n]} onChange={(e) => setSelected({ ...selected, [n]: Number(e.target.value) || 1 })} />}
          </div>
        );
      })}
    </Modal>
  );
};

