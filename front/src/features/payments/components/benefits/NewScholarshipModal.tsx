import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { getPeruToday } from '@/lib/dateUtils';
import { getApiErrorMessage } from '@/lib/errors';
import { useStudents } from '@/features/students/api/useStudents';
import { useCreateScholarship } from '../../api/useFinance';
import { CONCEPTS } from './constants';

export const NewScholarshipModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const create = useCreateScholarship();
  const year = getPeruToday().slice(0, 4);
  const empty = {
    studentId: '',
    name: '',
    kind: 'PERCENT' as 'PERCENT' | 'FIXED',
    value: '',
    concepts: ['PENSION'],
    validFrom: `${year}-01-01`,
    validTo: `${year}-12-31`,
    reason: '',
    applyNow: true,
  };
  const [f, setF] = useState(empty);
  const [search, setSearch] = useState('');
  useEffect(() => {
    if (open) {
      setF(empty);
      setSearch('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const { data: studentsData } = useStudents(
    { page: 1, limit: 20, search: search || undefined },
    open && search.trim().length >= 2,
  );
  const students = studentsData?.data ?? [];
  const valid =
    f.studentId &&
    f.name.trim().length >= 3 &&
    Number(f.value) > 0 &&
    (f.kind === 'FIXED' || Number(f.value) <= 100) &&
    f.concepts.length > 0 &&
    f.reason.trim().length >= 5;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar beca o descuento recurrente"
      description="Se aplica como ajuste numerado a cada cuota que cubre, también a las pensiones que generes después."
      size="lg"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            size="sm"
            disabled={!valid}
            isLoading={create.isPending}
            onClick={() =>
              create.mutate(
                {
                  ...f,
                  value: Number(f.value),
                  validTo: f.validTo || null,
                  name: f.name.trim(),
                  reason: f.reason.trim(),
                },
                {
                  onSuccess: (r) => {
                    toast.success(
                      `Beca registrada.${f.applyNow ? ` Se aplicó a ${r.applied} cuota(s) pendiente(s)${r.skipped ? `; ${r.skipped} no se pudieron (tienen pagos)` : ''}.` : ''}`,
                    );
                    onClose();
                  },
                  onError: (e) => toast.error(getApiErrorMessage(e, 'No se pudo registrar la beca.')),
                },
              )
            }
          >
            Registrar beca
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <label htmlFor="benefitspage-field-1" className="text-xs font-semibold">
            Estudiante
          </label>
          <Input
            id="benefitspage-field-1"
            placeholder="Buscar por apellido o DNI (mínimo 2 letras)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search.trim().length >= 2 && (
            <select
              size={Math.min(6, Math.max(2, students.length))}
              className="w-full rounded-md border border-input bg-background p-1 text-sm"
              value={f.studentId}
              onChange={(e) => setF({ ...f, studentId: e.target.value })}
            >
              {students.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.lastNamePaternal} {st.lastNameMaternal}, {st.firstNames}{' '}
                  {st.documentId ? `— ${st.documentId}` : ''}
                </option>
              ))}
            </select>
          )}
        </div>
        <label className="space-y-1 text-xs font-semibold sm:col-span-2">
          Nombre de la beca
          <Input
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
            placeholder="Ej: Beca hermanos, Beca socioeconómica"
          />
        </label>
        <label className="space-y-1 text-xs font-semibold">
          Tipo
          <select
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={f.kind}
            onChange={(e) => setF({ ...f, kind: e.target.value as 'PERCENT' | 'FIXED' })}
          >
            <option value="PERCENT">Porcentaje del monto</option>
            <option value="FIXED">Monto fijo por cuota</option>
          </select>
        </label>
        <label className="space-y-1 text-xs font-semibold">
          {f.kind === 'PERCENT' ? 'Porcentaje (%)' : 'Monto por cuota (S/)'}
          <Input
            type="number"
            step="0.01"
            min="0"
            value={f.value}
            onChange={(e) => setF({ ...f, value: e.target.value })}
          />
        </label>
        <label className="space-y-1 text-xs font-semibold">
          Vigente desde (vencimiento)
          <Input type="date" value={f.validFrom} onChange={(e) => setF({ ...f, validFrom: e.target.value })} />
        </label>
        <label className="space-y-1 text-xs font-semibold">
          Hasta (opcional)
          <Input type="date" value={f.validTo} onChange={(e) => setF({ ...f, validTo: e.target.value })} />
        </label>
        <fieldset className="space-y-1 sm:col-span-2">
          <legend className="text-xs font-semibold">Conceptos que cubre</legend>
          <div className="flex flex-wrap gap-3 text-xs">
            {Object.entries(CONCEPTS).map(([k, v]) => (
              <label key={k} className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={f.concepts.includes(k)}
                  onChange={(e) =>
                    setF({ ...f, concepts: e.target.checked ? [...f.concepts, k] : f.concepts.filter((c) => c !== k) })
                  }
                />
                {v}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="space-y-1 text-xs font-semibold sm:col-span-2">
          Motivo / sustento (obligatorio)
          <textarea
            rows={2}
            value={f.reason}
            onChange={(e) => setF({ ...f, reason: e.target.value })}
            placeholder="Ej: Aprobada por Dirección según informe socioeconómico N° 12"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-normal"
          />
        </label>
        <label className="flex items-center gap-2 text-xs sm:col-span-2">
          <input type="checkbox" checked={f.applyNow} onChange={(e) => setF({ ...f, applyNow: e.target.checked })} />
          Aplicar ya a las cuotas pendientes que cubre (las cuotas pagadas no se tocan)
        </label>
      </div>
    </Modal>
  );
};
