import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { EvaluationCriterion } from '../../types';

export interface CompetencyNodeProps {
  criterion: EvaluationCriterion;
  onEdit: (criterion: EvaluationCriterion) => void;
  onDelete: (criterion: EvaluationCriterion) => void;
  deleteDisabled?: boolean;
}

export const CompetencyNode: React.FC<CompetencyNodeProps> = ({
  criterion: c,
  onEdit,
  onDelete,
  deleteDisabled,
}) => {
  return (
    <tr
      className={`hover:bg-muted/30 transition-colors ${!c.isActive ? 'opacity-50 bg-muted/20' : ''}`}
    >
      {/* Orden */}
      <td className="p-3 text-center font-mono font-bold text-muted-foreground">#{c.order}</td>

      {/* Abreviatura */}
      <td className="p-3 text-center">
        <Badge variant="secondary" className="font-mono font-bold text-xs px-2 py-0.5">
          {c.shortName}
        </Badge>
      </td>

      {/* Nombre */}
      <td className="p-3 font-semibold text-foreground">{c.name}</td>

      {/* Nivel */}
      <td className="p-3 text-center">
        {c.educationLevel ? (
          <Badge variant="outline" className="text-xs uppercase font-semibold">
            {c.educationLevel === 'INITIAL'
              ? 'Inicial'
              : c.educationLevel === 'PRIMARY'
                ? 'Primaria'
                : 'Secundaria'}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs text-muted-foreground border-border">
            Todos
          </Badge>
        )}
      </td>

      {/* Peso */}
      <td className="p-3 text-center font-mono font-bold text-foreground">{c.weight.toFixed(1)}x</td>

      {/* Estado */}
      <td className="p-3 text-center">
        {c.isActive ? (
          <Badge
            variant="secondary"
            className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none text-xs"
          >
            Activo
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground text-xs">
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
            onClick={() => onEdit(c)}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            title="Editar criterio"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(c)}
            disabled={deleteDisabled}
            className="h-7 w-7 p-0 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
            title="Desactivar criterio"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
};
