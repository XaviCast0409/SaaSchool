import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { getApiErrorMessage } from '@/lib/errors';
import { useCopyClassroomYear } from '../../api/useClassrooms';

/** Copia las secciones (vacantes y, si se quiere, tutores) de otro año al que se está viendo. */
export const CopySectionsModal: React.FC<{
  toYear: { id: string; year: number };
  years: Array<{ id: string; year: number }>;
  defaultFromId?: string;
  onClose: () => void;
}> = ({ toYear, years, defaultFromId, onClose }) => {
  const copy = useCopyClassroomYear();
  const [fromId, setFromId] = useState(defaultFromId ?? years[0]?.id ?? '');
  const [includeTutors, setIncludeTutors] = useState(false);
  return (
    <Modal
      open
      onClose={onClose}
      title={`Copiar secciones a ${toYear.year}`}
      description="Se abren en este año las secciones del año de origen que aún no están abiertas, con sus mismas vacantes."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={!fromId || copy.isPending}
            onClick={() =>
              copy.mutate(
                { fromAcademicYearId: fromId, toAcademicYearId: toYear.id, includeTutors },
                {
                  onSuccess: (r) => {
                    toast.success(
                      r.copied
                        ? `Se abrieron ${r.copied} secciones en ${toYear.year}.`
                        : 'No había secciones nuevas que copiar.',
                    );
                    onClose();
                  },
                  onError: (err) => toast.error(getApiErrorMessage(err, 'No se pudo copiar.')),
                },
              )
            }
          >
            Copiar
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-sm">
        <label className="block space-y-1">
          <span className="font-medium">Desde el año</span>
          <Select value={fromId} onChange={(e) => setFromId(e.target.value)} className="w-full">
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.year}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={includeTutors}
            onChange={(e) => setIncludeTutors(e.target.checked)}
            className="h-4 w-4 rounded"
          />
          Copiar también los tutores
        </label>
      </div>
    </Modal>
  );
};
