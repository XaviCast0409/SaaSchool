import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  X,
  SlidersHorizontal,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  useEvaluationCriteria,
  useCreateCriterion,
  useUpdateCriterion,
  useDeleteCriterion,
} from '../api/useGrades';
import type { EvaluationCriterion } from '../types';

interface EvaluationCriteriaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CriterionFormValues {
  name: string;
  shortName: string;
  weight: number;
  order: number;
  educationLevel: string; // 'ALL' | 'INITIAL' | 'PRIMARY' | 'SECONDARY'
}

export const EvaluationCriteriaModal: React.FC<EvaluationCriteriaModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { data: criteria = [], isLoading } = useEvaluationCriteria();
  const createMutation = useCreateCriterion();
  const updateMutation = useUpdateCriterion();
  const deleteMutation = useDeleteCriterion();

  // Modo edición o creación
  const [editingCriterion, setEditingCriterion] = useState<EvaluationCriterion | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CriterionFormValues>({
    defaultValues: {
      name: '',
      shortName: '',
      weight: 1.0,
      order: 1,
      educationLevel: 'ALL',
    },
  });

  if (!isOpen) return null;

  const handleOpenCreate = () => {
    setEditingCriterion(null);
    reset({
      name: '',
      shortName: '',
      weight: 1.0,
      order: criteria.length + 1,
      educationLevel: 'ALL',
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (criterion: EvaluationCriterion) => {
    setEditingCriterion(criterion);
    setValue('name', criterion.name);
    setValue('shortName', criterion.shortName);
    setValue('weight', criterion.weight || 1.0);
    setValue('order', criterion.order || 1);
    setValue('educationLevel', criterion.educationLevel || 'ALL');
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingCriterion(null);
    reset();
  };

  const onSubmit = (values: CriterionFormValues) => {
    const payload = {
      name: values.name.trim(),
      shortName: values.shortName.trim().toUpperCase(),
      weight: Number(values.weight),
      order: Number(values.order),
      educationLevel:
        values.educationLevel === 'ALL'
          ? null
          : (values.educationLevel as 'INITIAL' | 'PRIMARY' | 'SECONDARY'),
    };

    if (editingCriterion) {
      updateMutation.mutate(
        { id: editingCriterion.id, data: payload },
        {
          onSuccess: () => {
            handleCloseForm();
          },
        },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          handleCloseForm();
        },
      });
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`¿Estás seguro de desactivar el criterio "${name}"? No aparecerá en nuevos registros.`)) {
      deleteMutation.mutate(id);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl overflow-y-auto max-h-[90vh] space-y-5">
        {/* Header Modal */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-primary" />
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Configuración de Criterios / Rubros Evaluativos
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Personaliza los campos de evaluación que tus docentes calificarán en cada competencia.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Guía Informativa */}
        <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 flex items-start gap-3 text-xs text-muted-foreground leading-relaxed">
          <HelpCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div>
            <strong className="text-foreground">¿Cómo funciona el cálculo de notas?</strong> Cada competencia oficial del CNEB agrupa estos criterios. El promedio de cada competencia se calcula con la ponderación de sus criterios, y el promedio general del curso es el promedio de todas las competencias.
          </div>
        </div>

        {/* Formulario de Creación / Edición */}
        {isFormOpen ? (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-4 animate-in slide-in-from-top-2 duration-150"
          >
            <div className="flex items-center justify-between border-b border-primary/20 pb-2">
              <h3 className="text-xs font-bold uppercase text-primary">
                {editingCriterion ? 'Editar Criterio Evaluativo' : 'Nuevo Criterio Evaluativo'}
              </h3>
              <button
                type="button"
                onClick={handleCloseForm}
                className="text-xs text-muted-foreground hover:text-foreground font-semibold"
              >
                Cancelar
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Nombre Completo */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Nombre del Criterio *
                </label>
                <Input
                  {...register('name', { required: 'El nombre es obligatorio' })}
                  placeholder="Ej: Exposición Oral, Revisión Cuaderno"
                  className="h-8 text-xs bg-background"
                />
                {errors.name && (
                  <span className="text-[10px] text-destructive">{errors.name.message}</span>
                )}
              </div>

              {/* Abreviatura en Cabecera */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Abreviatura en Tabla * (Máx. 6 letras)
                </label>
                <Input
                  {...register('shortName', {
                    required: 'La abreviatura es obligatoria',
                    maxLength: { value: 8, message: 'Máximo 8 caracteres' },
                  })}
                  placeholder="Ej: EXP, PC, RC, EB"
                  className="h-8 text-xs font-mono uppercase bg-background"
                />
                {errors.shortName && (
                  <span className="text-[10px] text-destructive">{errors.shortName.message}</span>
                )}
              </div>

              {/* Peso / Ponderación */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Peso / Ponderación *
                </label>
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  {...register('weight', {
                    required: 'El peso es obligatorio',
                    valueAsNumber: true,
                  })}
                  className="h-8 text-xs font-mono bg-background"
                />
                <span className="text-[10px] text-muted-foreground">
                  Por defecto 1.0 (Promedio simple si todos tienen el mismo peso).
                </span>
              </div>

              {/* Orden en la Matriz */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Orden de Aparición
                </label>
                <Input
                  type="number"
                  min="1"
                  {...register('order', { valueAsNumber: true })}
                  className="h-8 text-xs font-mono bg-background"
                />
              </div>

              {/* Nivel Educativo */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold text-foreground">
                  Nivel Educativo Aplicable
                </label>
                <select
                  {...register('educationLevel')}
                  className="w-full h-8 rounded-md border border-input bg-background px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                >
                  <option value="ALL">Todos los Niveles (Inicial, Primaria y Secundaria)</option>
                  <option value="INITIAL">Solo Nivel Inicial</option>
                  <option value="PRIMARY">Solo Nivel Primaria</option>
                  <option value="SECONDARY">Solo Nivel Secundaria</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-primary/20">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCloseForm}
                className="text-xs h-8"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSaving}
                className="text-xs font-bold gap-1.5 h-8 shadow-sm"
              >
                {isSaving ? (
                  <span className="animate-spin w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>{editingCriterion ? 'Actualizar Criterio' : 'Guardar Criterio'}</span>
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground uppercase tracking-wide">
              Criterios Activos ({criteria.length})
            </span>
            <Button
              size="sm"
              onClick={handleOpenCreate}
              className="gap-1.5 text-xs font-bold h-8 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Criterio</span>
            </Button>
          </div>
        )}

        {/* Listado de Criterios Existentes */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Cargando criterios de evaluación...
            </div>
          ) : criteria.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-muted-foreground/40 mx-auto" />
              <p className="text-xs text-muted-foreground">
                No hay criterios configurados en este momento.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {criteria.map((c) => (
                <div
                  key={c.id}
                  className="p-3 flex items-center justify-between gap-3 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary font-mono font-extrabold text-xs flex items-center justify-center shrink-0">
                      {c.order}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-foreground">{c.name}</span>
                        <Badge variant="outline" className="text-[10px] font-mono font-bold uppercase">
                          {c.shortName}
                        </Badge>
                        {c.educationLevel && (
                          <Badge variant="secondary" className="text-[10px]">
                            {c.educationLevel === 'PRIMARY'
                              ? 'Primaria'
                              : c.educationLevel === 'SECONDARY'
                              ? 'Secundaria'
                              : 'Inicial'}
                          </Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Peso en promedio: <strong className="font-mono text-foreground">{c.weight}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEdit(c)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                      title="Editar criterio"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(c.id, c.name)}
                      disabled={deleteMutation.isPending}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      title="Desactivar criterio"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-[11px] text-muted-foreground">
            Los cambios se reflejarán inmediatamente en la matriz de calificaciones de los docentes.
          </span>
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
};
