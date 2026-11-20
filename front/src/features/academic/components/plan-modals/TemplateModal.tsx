import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { useApplyTemplate } from '../../api';
import type { Catalog, Level } from '../../types';
import { GradePicker } from './GradePicker';

interface TemplateModalProps {
  open: boolean;
  onClose: () => void;
  level: Level;
  currentGrade: number;
  catalog: Catalog;
}

export const TemplateModal: React.FC<TemplateModalProps> = ({
  open,
  onClose,
  level,
  currentGrade,
  catalog,
}) => {
  const [grades, setGrades] = useState<number[]>([currentGrade]);
  const [optional, setOptional] = useState<string[]>([]);
  const apply = useApplyTemplate();
  const optionalAreas = catalog.areas[level].filter((a) => a.optional);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Aplicar plantilla CNEB"
      description="Agrega las áreas oficiales con sus competencias. No borra lo que ya existe."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={grades.length === 0 || apply.isPending}
            onClick={() => apply.mutate({ level, grades, includeOptional: optional }, { onSuccess: onClose })}
          >
            Aplicar
          </Button>
        </>
      }
    >
      <p className="mb-2 text-sm font-medium">Grados</p>
      <GradePicker level={level} grades={catalog.grades[level]} value={grades} onChange={setGrades} />
      {optionalAreas.length > 0 && (
        <>
          <p className="mb-2 mt-5 text-sm font-medium">Áreas opcionales</p>
          {optionalAreas.map((a) => (
            <label key={a.code} className="flex items-center gap-2 py-1 text-sm">
              <input
                type="checkbox"
                checked={optional.includes(a.code)}
                onChange={(e) =>
                  setOptional(e.target.checked ? [...optional, a.code] : optional.filter((c) => c !== a.code))
                }
              />
              {a.name}
            </label>
          ))}
        </>
      )}
    </Modal>
  );
};
