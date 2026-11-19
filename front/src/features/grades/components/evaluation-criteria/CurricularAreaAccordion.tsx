import React from 'react';
import { AlertCircle, Layers } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import type { EvaluationCriterion } from '../../types';
import { CompetencyNode } from './CompetencyNode';

export interface CurricularAreaAccordionProps {
  criteria: EvaluationCriterion[];
  isLoading: boolean;
  isError: boolean;
  isSaving: boolean;
  onApplyPreset: () => void;
  onEdit: (criterion: EvaluationCriterion) => void;
  onDelete: (criterion: EvaluationCriterion) => void;
  deletePending: boolean;
}

export const CurricularAreaAccordion: React.FC<CurricularAreaAccordionProps> = ({
  criteria,
  isLoading,
  isError,
  isSaving,
  onApplyPreset,
  onEdit,
  onDelete,
  deletePending,
}) => {
  return (
    <Card className="border-border bg-card shadow-sm overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Criterios Configurados para el Colegio ({criteria.length})
        </h3>
        <span className="text-xs text-muted-foreground font-mono">
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
          <p className="text-xs font-semibold text-foreground">Error al cargar los criterios evaluativos</p>
        </div>
      ) : criteria.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground space-y-3">
          <EmptyState
            icon={<Layers className="w-10 h-10 text-muted-foreground/50" />}
            title="No hay criterios configurados aún"
            description="Mientras no haya criterios, cada docente registra directamente el calificativo de cada competencia (AD, A, B o C). Si tu colegio califica por rubros (prácticas, exámenes, cuaderno), agrega tus criterios o carga la plantilla estándar."
            action={
              <Button type="button" variant="outline" size="sm" onClick={onApplyPreset} disabled={isSaving}>
                Cargar plantilla estándar
              </Button>
            }
          />
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
                <CompetencyNode
                  key={c.id}
                  criterion={c}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  deleteDisabled={deletePending}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};
