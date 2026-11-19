import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Check, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { EvaluationCriterion } from '../../types';

export interface CriterionPayload {
  name: string;
  shortName: string;
  weight: number;
  order: number;
  educationLevel: 'INITIAL' | 'PRIMARY' | 'SECONDARY' | null;
}

interface CriterionFormValues {
  name: string;
  shortName: string;
  weight: number;
  order: number;
  educationLevel: string;
}

export interface CriterionModalProps {
  isOpen: boolean;
  editingCriterion: EvaluationCriterion | null;
  defaultOrder: number;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (payload: CriterionPayload) => void;
}

export const CriterionModal: React.FC<CriterionModalProps> = ({
  isOpen,
  editingCriterion,
  defaultOrder,
  isSaving,
  onClose,
  onSubmit,
}) => {
  const {
    register,
    handleSubmit,
    reset,
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

  useEffect(() => {
    if (!isOpen) return;
    if (editingCriterion) {
      reset({
        name: editingCriterion.name,
        shortName: editingCriterion.shortName,
        weight: editingCriterion.weight || 1.0,
        order: editingCriterion.order || 1,
        educationLevel: editingCriterion.educationLevel || 'ALL',
      });
    } else {
      reset({
        name: '',
        shortName: '',
        weight: 1.0,
        order: defaultOrder,
        educationLevel: 'ALL',
      });
    }
  }, [isOpen, editingCriterion, defaultOrder, reset]);

  if (!isOpen) return null;

  const handleFormSubmit = (values: CriterionFormValues) => {
    onSubmit({
      name: values.name.trim(),
      shortName: values.shortName.trim().toUpperCase(),
      weight: Number(values.weight),
      order: Number(values.order),
      educationLevel:
        values.educationLevel === 'ALL' ? null : (values.educationLevel as 'INITIAL' | 'PRIMARY' | 'SECONDARY'),
    });
  };

  return (
    <Card className="p-5 border-primary/30 bg-primary/5 space-y-4 shadow-lg animate-in slide-in-from-top-2 duration-150">
      <div className="flex items-center justify-between border-b border-primary/20 pb-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">
            {editingCriterion
              ? `Editar Criterio: ${editingCriterion.name}`
              : 'Registrar Nuevo Criterio Evaluativo'}
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-7 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4 mr-1" />
          Cerrar
        </Button>
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Nombre */}
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-semibold text-foreground">Nombre Completo del Criterio *</label>
            <Input
              {...register('name', { required: 'El nombre es obligatorio' })}
              placeholder="Ej: Práctica Calificada, Revisión de Cuaderno, Conducta"
              className="h-8 text-xs bg-background"
            />
            {errors.name && <span className="text-xs text-destructive">{errors.name.message}</span>}
          </div>

          {/* Abreviatura */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Abreviatura (Cabecera) *</label>
            <Input
              {...register('shortName', {
                required: 'La abreviatura es obligatoria',
                maxLength: { value: 8, message: 'Máximo 8 caracteres' },
              })}
              placeholder="Ej: PC, COND, RC, EB, EXP"
              className="h-8 text-xs font-mono uppercase bg-background"
            />
            {errors.shortName && <span className="text-xs text-destructive">{errors.shortName.message}</span>}
          </div>

          {/* Nivel Educativo */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Nivel Educativo</label>
            <select
              {...register('educationLevel')}
              className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="ALL">Todos los Niveles</option>
              <option value="INITIAL">Inicial</option>
              <option value="PRIMARY">Primaria</option>
              <option value="SECONDARY">Secundaria</option>
            </select>
          </div>

          {/* Peso */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Peso / Ponderación *</label>
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
            <span className="text-xs text-muted-foreground">1.0 = ponderación estándar</span>
          </div>

          {/* Orden */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Orden de Columna</label>
            <Input
              type="number"
              min="1"
              {...register('order', { valueAsNumber: true })}
              className="h-8 text-xs font-mono bg-background"
            />
            <span className="text-xs text-muted-foreground">1, 2, 3... de izquierda a derecha</span>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-primary/20">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
            Cancelar
          </Button>
          <Button type="submit" size="sm" disabled={isSaving} className="h-8 text-xs font-bold gap-1.5 shadow-sm">
            <Check className="w-3.5 h-3.5" />
            <span>{editingCriterion ? 'Guardar Cambios' : 'Crear Criterio'}</span>
          </Button>
        </div>
      </form>
    </Card>
  );
};
