import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUpdateCourseCompetences } from '../../api';
import type { Catalog, CnebArea, PlanCourse } from '../../types';

interface CourseCompetencesModalProps {
  open: boolean;
  onClose: () => void;
  course: PlanCourse;
  area: CnebArea;
  catalog: Catalog;
}

export const CourseCompetencesModal: React.FC<CourseCompetencesModalProps> = ({
  open,
  onClose,
  course,
  area,
  catalog,
}) => {
  const initial = Object.fromEntries(
    course.competences.filter((c) => c.cnebNumber).map((c) => [c.cnebNumber as number, c.weight]),
  );
  const [selected, setSelected] = useState<Record<number, number>>(initial);
  const save = useUpdateCourseCompetences();
  const items = Object.entries(selected).map(([n, w]) => ({ cnebNumber: Number(n), weight: w }));
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Competencias de ${course.name}`}
      description="El cambio aplica a todos los grados que usan este curso."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={items.length === 0 || save.isPending}
            onClick={() => save.mutate({ areaId: course.areaId, competences: items }, { onSuccess: onClose })}
          >
            Guardar
          </Button>
        </>
      }
    >
      {area.competences.map((n) => {
        const on = selected[n] !== undefined;
        return (
          <div key={n} className="flex items-center justify-between gap-3 border-b border-border py-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={on}
                onChange={(e) => {
                  const next = { ...selected };
                  if (e.target.checked) next[n] = 1;
                  else delete next[n];
                  setSelected(next);
                }}
              />
              {catalog.competences[n].name}
            </label>
            {on && (
              <Input
                type="number"
                min={0.5}
                max={10}
                step={0.5}
                className="w-20"
                value={selected[n]}
                onChange={(e) => setSelected({ ...selected, [n]: Number(e.target.value) || 1 })}
              />
            )}
          </div>
        );
      })}
    </Modal>
  );
};
