import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  SlidersHorizontal,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Layers,
  Scale,
  ShieldCheck,
  Check,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PlanGuard } from '@/components/ui/PlanGuard';
import {
  useEvaluationCriteria,
  useCreateCriterion,
  useUpdateCriterion,
  useDeleteCriterion,
} from '../api/useGrades';
import type { EvaluationCriterion } from '../types';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface CriterionFormValues {
  name: string;
  shortName: string;
  weight: number;
  order: number;
  educationLevel: string; // 'ALL' | 'INITIAL' | 'PRIMARY' | 'SECONDARY'
}

export const EvaluationCriteriaPage: React.FC = () => {
  const { data: criteria = [], isLoading, isError } = useEvaluationCriteria();
  const createMutation = useCreateCriterion();
  const updateMutation = useUpdateCriterion();
  const deleteMutation = useDeleteCriterion();

  const [editingCriterion, setEditingCriterion] = useState<EvaluationCriterion | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deletingCriterion, setDeletingCriterion] = useState<EvaluationCriterion | null>(null);

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
            toast.success(`Criterio "${payload.name}" actualizado correctamente`);
            handleCloseForm();
          },
          onError: () => {
            toast.error('Error al actualizar el criterio');
          },
        },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success(`Criterio "${payload.name}" creado correctamente`);
          handleCloseForm();
        },
        onError: () => {
          toast.error('Error al registrar el criterio');
        },
      });
    }
  };

  const handleConfirmDelete = () => {
    if (!deletingCriterion) return;
    deleteMutation.mutate(deletingCriterion.id, {
      onSuccess: () => {
        toast.success(`Criterio "${deletingCriterion.name}" desactivado`);
        setDeletingCriterion(null);
      },
      onError: () => {
        toast.error('Error al desactivar el criterio');
      },
    });
  };

  const activeCriteria = criteria.filter((c) => c.isActive);
  const totalWeight = activeCriteria.reduce((acc, c) => acc + (c.weight || 1), 0);
  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <PlanGuard minPlan="PRO">
      <div className="space-y-6 pb-12">
        {/* Header de la Vista del Director */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 text-[10px] font-bold">
                <ShieldCheck className="w-3 h-3 mr-1" />
                Solo Dirección y Administrador
              </Badge>
              <Badge variant="secondary" className="text-[10px] font-medium">
                CNEB / MINEDU
              </Badge>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              Criterios de Calificación por Competencia
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-3xl leading-relaxed">
              Configura los rubros y categorías que cada docente califica en el día a día para cada competencia (ej. Prácticas Calificadas, Conducta, Revisión de Cuaderno, Examen Bimestral, Exposiciones, etc.).
            </p>
          </div>

          <Button
            onClick={handleOpenCreate}
            className="gap-2 text-xs font-bold shadow-md self-start md:self-auto shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Criterio Evaluativo</span>
          </Button>
        </div>

        {/* Tarjetas Informativas / Resumen de Ponderaciones */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4 border-border bg-card flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Criterios Activos
              </p>
              <p className="text-xl font-black text-foreground">{activeCriteria.length}</p>
            </div>
          </Card>

          <Card className="p-4 border-border bg-card flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Suma de Pesos
              </p>
              <p className="text-xl font-black text-foreground font-mono">
                {totalWeight.toFixed(1)}
              </p>
            </div>
          </Card>

          <Card className="p-4 border-border bg-card flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Estado del Sistema
              </p>
              <p className="text-xs font-bold text-foreground">Sincronizado con Matriz</p>
            </div>
          </Card>
        </div>

        {/* Explicación Pedagógica para la Dirección */}
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-start gap-3.5 text-xs text-muted-foreground leading-relaxed shadow-sm">
          <HelpCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-foreground">
              ¿Cómo se aplican estos criterios en las notas y boletas?
            </h4>
            <p>
              1. <strong>Cada Competencia Curricular</strong> (definida por el MINEDU) se subdivide en estos criterios institucionales durante el bimestre.
            </p>
            <p>
              2. El docente ingresa la calificación vigesimal ($0$ a $20$) en cada criterio.
            </p>
            <p>
              3. El sistema calcula automáticamente el <strong>Promedio de la Competencia</strong> utilizando la ponderación definida aquí y realiza la conversión inmediata a la escala oficial (<strong>AD</strong>, <strong>A</strong>, <strong>B</strong>, <strong>C</strong>).
            </p>
          </div>
        </div>

        {/* Modal / Formulario Flotante de Creación o Edición */}
        {isFormOpen && (
          <Card className="p-5 border-primary/30 bg-primary/5 space-y-4 shadow-lg animate-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between border-b border-primary/20 pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">
                  {editingCriterion ? `Editar Criterio: ${editingCriterion.name}` : 'Registrar Nuevo Criterio Evaluativo'}
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseForm}
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4 mr-1" />
                Cerrar
              </Button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {/* Nombre */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-foreground">
                    Nombre Completo del Criterio *
                  </label>
                  <Input
                    {...register('name', { required: 'El nombre es obligatorio' })}
                    placeholder="Ej: Práctica Calificada, Revisión de Cuaderno, Conducta"
                    className="h-8 text-xs bg-background"
                  />
                  {errors.name && (
                    <span className="text-[10px] text-destructive">{errors.name.message}</span>
                  )}
                </div>

                {/* Abreviatura */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Abreviatura (Cabecera) *
                  </label>
                  <Input
                    {...register('shortName', {
                      required: 'La abreviatura es obligatoria',
                      maxLength: { value: 8, message: 'Máximo 8 caracteres' },
                    })}
                    placeholder="Ej: PC, COND, RC, EB, EXP"
                    className="h-8 text-xs font-mono uppercase bg-background"
                  />
                  {errors.shortName && (
                    <span className="text-[10px] text-destructive">{errors.shortName.message}</span>
                  )}
                </div>

                {/* Nivel Educativo */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Nivel Educativo
                  </label>
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
                    1.0 = ponderación estándar
                  </span>
                </div>

                {/* Orden */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Orden de Columna
                  </label>
                  <Input
                    type="number"
                    min="1"
                    {...register('order', { valueAsNumber: true })}
                    className="h-8 text-xs font-mono bg-background"
                  />
                  <span className="text-[10px] text-muted-foreground">
                    1, 2, 3... de izquierda a derecha
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-primary/20">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCloseForm}
                  className="h-8 text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSaving}
                  className="h-8 text-xs font-bold gap-1.5 shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingCriterion ? 'Guardar Cambios' : 'Crear Criterio'}</span>
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Tabla de Criterios Configurados */}
        <Card className="border-border bg-card shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Criterios Configurados para el Colegio ({criteria.length})
            </h3>
            <span className="text-[11px] text-muted-foreground font-mono">
              Los cambios se reflejan automáticamente en la matriz docente
            </span>
          </div>

          {isLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          ) : isError ? (
            <div className="p-8 text-center text-muted-foreground space-y-2">
              <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
              <p className="text-xs font-semibold text-foreground">
                Error al cargar los criterios evaluativos
              </p>
            </div>
          ) : criteria.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground space-y-3">
              <Layers className="w-10 h-10 text-muted-foreground/50 mx-auto" />
              <p className="text-sm font-semibold text-foreground">
                No hay criterios configurados aún
              </p>
              <p className="text-xs max-w-sm mx-auto">
                Haz clic en el botón superior para agregar el primer criterio de evaluación para tu colegio.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b border-border font-bold text-muted-foreground">
                    <th className="p-3 w-16 text-center">Orden</th>
                    <th className="p-3 w-28 text-center">Abreviatura</th>
                    <th className="p-3">Nombre del Criterio</th>
                    <th className="p-3 w-32 text-center">Nivel</th>
                    <th className="p-3 w-28 text-center">Peso</th>
                    <th className="p-3 w-28 text-center">Estado</th>
                    <th className="p-3 w-32 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {criteria.map((c) => (
                    <tr
                      key={c.id}
                      className={`hover:bg-muted/30 transition-colors ${
                        !c.isActive ? 'opacity-50 bg-muted/20' : ''
                      }`}
                    >
                      {/* Orden */}
                      <td className="p-3 text-center font-mono font-bold text-muted-foreground">
                        #{c.order}
                      </td>

                      {/* Abreviatura */}
                      <td className="p-3 text-center">
                        <Badge
                          variant="secondary"
                          className="font-mono font-bold text-[11px] px-2 py-0.5"
                        >
                          {c.shortName}
                        </Badge>
                      </td>

                      {/* Nombre */}
                      <td className="p-3 font-semibold text-foreground">
                        {c.name}
                      </td>

                      {/* Nivel */}
                      <td className="p-3 text-center">
                        {c.educationLevel ? (
                          <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                            {c.educationLevel === 'INITIAL'
                              ? 'Inicial'
                              : c.educationLevel === 'PRIMARY'
                              ? 'Primaria'
                              : 'Secundaria'}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground border-border">
                            Todos
                          </Badge>
                        )}
                      </td>

                      {/* Peso */}
                      <td className="p-3 text-center font-mono font-bold text-foreground">
                        {c.weight.toFixed(1)}x
                      </td>

                      {/* Estado */}
                      <td className="p-3 text-center">
                        {c.isActive ? (
                          <Badge
                            variant="secondary"
                            className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none text-[10px]"
                          >
                            Activo
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground text-[10px]">
                            Inactivo
                          </Badge>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
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
                            onClick={() => setDeletingCriterion(c)}
                            disabled={deleteMutation.isPending}
                            className="h-7 w-7 p-0 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                            title="Desactivar criterio"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <ConfirmDialog
        isOpen={Boolean(deletingCriterion)}
        onClose={() => setDeletingCriterion(null)}
        onConfirm={handleConfirmDelete}
        isLoading={deleteMutation.isPending}
        title="Desactivar Criterio Evaluativo"
        description={`¿Estás seguro de desactivar el criterio "${deletingCriterion?.name || ''}"?`}
        confirmText="Desactivar Criterio"
        cancelText="Cancelar"
        variant="danger"
        details={
          <p className="text-xs text-muted-foreground">
            El criterio ya no aparecerá en las nuevas cuadrículas de calificaciones. Las notas históricas previas se mantendrán registradas para el cálculo de actas.
          </p>
        }
      />
    </PlanGuard>
  );
};
