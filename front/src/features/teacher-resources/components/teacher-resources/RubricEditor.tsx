import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, X } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getApiErrorMessage } from '@/lib/errors';
import {
  LEVEL_LABEL,
  useSaveRubric,
  type Level,
  type Rubric,
  type RubricCriterion,
  type RubricInput,
} from '../../api/useTeacherResources';
import { LEVELS, LEVEL_HEAD, selectCls } from './constants';

const emptyCriterion = (): RubricCriterion => ({ name: '', levels: { AD: '', A: '', B: '', C: '' } });

export const RubricEditor: React.FC<{ open: boolean; onClose: () => void; initial: Rubric | null }> = ({
  open,
  onClose,
  initial,
}) => {
  const save = useSaveRubric();
  const [form, setForm] = useState<RubricInput>({
    title: '',
    description: '',
    areaName: '',
    educationLevel: null,
    criteria: [emptyCriterion()],
    isShared: true,
  });
  useEffect(() => {
    if (open) {
      setForm(
        initial
          ? {
              title: initial.title,
              description: initial.description,
              areaName: initial.areaName,
              educationLevel: initial.educationLevel,
              criteria: initial.criteria,
              isShared: initial.isShared,
            }
          : {
              title: '',
              description: '',
              areaName: '',
              educationLevel: null,
              criteria: [emptyCriterion(), emptyCriterion()],
              isShared: true,
            },
      );
    }
  }, [open, initial]);
  const setCriterion = (i: number, patch: Partial<RubricCriterion>) =>
    setForm({ ...form, criteria: form.criteria.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Editar rúbrica' : 'Nueva rúbrica'}
      size="xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={form.isShared}
              onChange={(e) => setForm({ ...form, isShared: e.target.checked })}
            />{' '}
            Compartir con mis colegas
          </label>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              disabled={save.isPending}
              className="gap-2"
              onClick={() =>
                save.mutate(
                  {
                    id: initial?.id,
                    input: { ...form, description: form.description || null, areaName: form.areaName || null },
                  },
                  {
                    onSuccess: () => (toast.success('Rúbrica guardada'), onClose()),
                    onError: (e) => toast.error(getApiErrorMessage(e)),
                  },
                )
              }
            >
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Guardar
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs text-muted-foreground sm:col-span-3">
            Título
            <Input
              className="h-9"
              maxLength={150}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Ej.: Rúbrica para exposición oral"
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Área o curso
            <Input
              className="h-9"
              maxLength={80}
              value={form.areaName ?? ''}
              onChange={(e) => setForm({ ...form, areaName: e.target.value })}
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Nivel
            <select
              className={`${selectCls} w-full`}
              value={form.educationLevel ?? ''}
              onChange={(e) => setForm({ ...form, educationLevel: (e.target.value || null) as Level | null })}
            >
              <option value="">Cualquiera</option>
              {Object.entries(LEVEL_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted-foreground">
            Descripción (opcional)
            <Input
              className="h-9"
              maxLength={1000}
              value={form.description ?? ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-xs">
            <thead>
              <tr className="text-muted-foreground">
                <th scope="col" className="w-44 px-1 py-1 text-left font-medium">
                  Criterio
                </th>
                {LEVELS.map((l) => (
                  <th key={l} scope="col" className="px-1 py-1 text-left font-medium">
                    {LEVEL_HEAD[l]}
                  </th>
                ))}
                <th scope="col" className="w-8" aria-label="Quitar" />
              </tr>
            </thead>
            <tbody>
              {form.criteria.map((c, i) => (
                <tr key={i} className="align-top">
                  <td className="px-1 py-1">
                    <Textarea
                      rows={3}
                      maxLength={120}
                      value={c.name}
                      onChange={(e) => setCriterion(i, { name: e.target.value })}
                      placeholder="Ej.: Claridad"
                      aria-label={`Nombre del criterio ${i + 1}`}
                    />
                  </td>
                  {LEVELS.map((l) => (
                    <td key={l} className="px-1 py-1">
                      <Textarea
                        rows={3}
                        maxLength={600}
                        value={c.levels[l]}
                        onChange={(e) => setCriterion(i, { levels: { ...c.levels, [l]: e.target.value } })}
                        aria-label={`${c.name || `Criterio ${i + 1}`} nivel ${l}`}
                      />
                    </td>
                  ))}
                  <td className="px-1 py-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setForm({ ...form, criteria: form.criteria.filter((_, idx) => idx !== i) })}
                      aria-label={`Quitar criterio ${i + 1}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {form.criteria.length < 10 && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => setForm({ ...form, criteria: [...form.criteria, emptyCriterion()] })}
          >
            <Plus className="h-4 w-4" aria-hidden /> Agregar criterio
          </Button>
        )}
      </div>
    </Modal>
  );
};
