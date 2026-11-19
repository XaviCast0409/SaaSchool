import React, { useState } from 'react';
import {
  CheckCircle2,
  HelpCircle,
  Layers,
  Plus,
  Scale,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PlanGuard } from '@/components/ui/PlanGuard';
import { getApiErrorMessage } from '@/lib/errors';
import { useAuthStore } from '@/store/useAuthStore';
import {
  useCreateCriterion,
  useDeleteCriterion,
  useEvaluationCriteria,
  useUpdateCriterion,
} from '../api/useGrades';
import { GradingScaleCard } from '../components/GradingScaleCard';
import { CriterionModal, type CriterionPayload } from '../components/evaluation-criteria/CriterionModal';
import { CurricularAreaAccordion } from '../components/evaluation-criteria/CurricularAreaAccordion';
import type { EvaluationCriterion } from '../types';

export const EvaluationCriteriaPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const canConfigureScale = user?.role === 'SCHOOL_ADMIN' || user?.role === 'SUPER_ADMIN';
  const { data: criteria = [], isLoading, isError } = useEvaluationCriteria();
  const createMutation = useCreateCriterion();
  const updateMutation = useUpdateCriterion();
  const deleteMutation = useDeleteCriterion();

  const [editingCriterion, setEditingCriterion] = useState<EvaluationCriterion | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deletingCriterion, setDeletingCriterion] = useState<EvaluationCriterion | null>(null);
  const [isApplyingPreset, setIsApplyingPreset] = useState(false);

  const activeCriteria = criteria.filter((c) => c.isActive);
  const totalWeight = activeCriteria.reduce((acc, c) => acc + (c.weight || 1), 0);
  const isSaving = createMutation.isPending || updateMutation.isPending || isApplyingPreset;

  const handleOpenCreate = () => {
    setEditingCriterion(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (criterion: EvaluationCriterion) => {
    setEditingCriterion(criterion);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingCriterion(null);
  };

  const onSubmitForm = (payload: CriterionPayload) => {
    if (editingCriterion) {
      updateMutation.mutate(
        { id: editingCriterion.id, data: payload },
        {
          onSuccess: () => {
            toast.success(`Criterio "${payload.name}" actualizado correctamente`);
            handleCloseForm();
          },
          onError: (err) => {
            toast.error(getApiErrorMessage(err, 'Error al actualizar el criterio'));
          },
        },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success(`Criterio "${payload.name}" creado correctamente`);
          handleCloseForm();
        },
        onError: (err) => {
          toast.error(getApiErrorMessage(err, 'Error al registrar el criterio'));
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
      onError: (err) => {
        toast.error(getApiErrorMessage(err, 'Error al desactivar el criterio'));
      },
    });
  };

  const handleApplyPreset = async () => {
    if (
      !confirm(
        '¿Deseas cargar la plantilla estándar para Colegios Particulares? Se configurarán: Práctica Mensual (PM), Examen Mensual (EM), Revisión de Cuaderno / Tareas (RC) y Examen Bimestral (EB).',
      )
    ) {
      return;
    }

    setIsApplyingPreset(true);
    try {
      for (const c of activeCriteria) {
        await deleteMutation.mutateAsync(c.id);
      }

      const preset: CriterionPayload[] = [
        { name: 'Práctica Mensual', shortName: 'PM', weight: 1.0, order: 1, educationLevel: null },
        { name: 'Examen Mensual', shortName: 'EM', weight: 1.0, order: 2, educationLevel: null },
        { name: 'Revisión de Cuaderno / Tareas', shortName: 'RC', weight: 1.0, order: 3, educationLevel: null },
        { name: 'Examen Bimestral', shortName: 'EB', weight: 2.0, order: 4, educationLevel: null },
      ];

      for (const item of preset) {
        await createMutation.mutateAsync(item);
      }

      toast.success('Plantilla de colegio particular aplicada con éxito.');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Error al aplicar la plantilla.'));
    } finally {
      setIsApplyingPreset(false);
    }
  };

  return (
    <PlanGuard minPlan="PRO">
      <div className="space-y-6 pb-12">
        {/* Header de la Vista del Director */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 text-xs font-bold">
                <ShieldCheck className="w-3 h-3 mr-1" />
                Solo Dirección y Administrador
              </Badge>
              <Badge variant="secondary" className="text-xs font-medium">
                CNEB / MINEDU
              </Badge>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              Criterios de Calificación por Competencia
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-3xl leading-relaxed">
              Configura los rubros y categorías que cada docente califica en el día a día para cada competencia (ej.
              Práctica Mensual, Examen Mensual, Revisión de Cuaderno, Examen Bimestral, etc.).
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start md:self-auto shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleApplyPreset}
              disabled={isSaving}
              className="gap-2 text-xs font-semibold shadow-sm border-border bg-card hover:bg-secondary text-foreground"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>{isApplyingPreset ? 'Cargando...' : 'Cargar Plantilla Particular'}</span>
            </Button>

            <Button onClick={handleOpenCreate} className="gap-2 text-xs font-bold shadow-md">
              <Plus className="w-4 h-4" />
              <span>Nuevo Criterio Evaluativo</span>
            </Button>
          </div>
        </div>

        {/* Tarjetas Informativas / Resumen de Ponderaciones */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4 border-border bg-card flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Criterios Activos</p>
              <p className="text-xl font-black text-foreground">{activeCriteria.length}</p>
            </div>
          </Card>

          <Card className="p-4 border-border bg-card flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Suma de Pesos</p>
              <p className="text-xl font-black text-foreground font-mono">{totalWeight.toFixed(1)}</p>
            </div>
          </Card>

          <Card className="p-4 border-border bg-card flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estado del Sistema</p>
              <p className="text-xs font-bold text-foreground">Sincronizado con Matriz</p>
            </div>
          </Card>
        </div>

        {/* Explicación Pedagógica para la Dirección */}
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-start gap-3.5 text-xs text-muted-foreground leading-relaxed shadow-sm">
          <HelpCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-foreground">¿Cómo se aplican estos criterios en las notas y boletas?</h4>
            <p>
              1. <strong>Cada Competencia Curricular</strong> (definida por el MINEDU) se subdivide en estos criterios
              institucionales durante el bimestre.
            </p>
            <p>2. El docente ingresa la calificación vigesimal (0 a 20) en cada criterio.</p>
            <p>
              3. El sistema calcula automáticamente el <strong>Promedio de la Competencia</strong> utilizando la
              ponderación definida aquí y realiza la conversión inmediata a la escala oficial (<strong>AD</strong>,{' '}
              <strong>A</strong>, <strong>B</strong>, <strong>C</strong>).
            </p>
          </div>
        </div>

        {/* Modal / Formulario Flotante de Creación o Edición */}
        <CriterionModal
          isOpen={isFormOpen}
          editingCriterion={editingCriterion}
          defaultOrder={criteria.length + 1}
          isSaving={isSaving}
          onClose={handleCloseForm}
          onSubmit={onSubmitForm}
        />

        {/* Tabla de Criterios Configurados */}
        <CurricularAreaAccordion
          criteria={criteria}
          isLoading={isLoading}
          isError={isError}
          isSaving={isSaving}
          onApplyPreset={handleApplyPreset}
          onEdit={handleOpenEdit}
          onDelete={setDeletingCriterion}
          deletePending={deleteMutation.isPending}
        />

        {/* Escala de Conversión Numérica a Literal CNEB */}
        {canConfigureScale && <GradingScaleCard />}
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
            El criterio ya no aparecerá en las nuevas cuadrículas de calificaciones. Las notas históricas previas se
            mantendrán registradas para el cálculo de actas.
          </p>
        }
      />
    </PlanGuard>
  );
};
