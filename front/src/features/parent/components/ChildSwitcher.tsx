import React from 'react';
import { Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ParentChildInfo } from '../types';

interface ChildSwitcherProps {
  childrenList: ParentChildInfo[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export const ChildSwitcher: React.FC<ChildSwitcherProps> = ({
  childrenList,
  selectedId,
  onSelect,
}) => {
  if (childrenList.length <= 1) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
        <Users className="w-3.5 h-3.5 text-primary" />
        <span>Seleccionar Hijo / Estudiante ({childrenList.length})</span>
      </div>

      <div className="flex flex-wrap gap-2.5">
        {childrenList.map((child) => {
          const isSelected = child.id === selectedId;
          const classroom = child.activeEnrollment?.classroom;

          return (
            <button
              key={child.id}
              onClick={() => onSelect(child.id)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl border text-left transition-all shadow-sm ${
                isSelected
                  ? 'bg-primary text-primary-foreground border-primary shadow-primary/20 scale-[1.02]'
                  : 'bg-card text-foreground border-border hover:bg-secondary/70 hover:border-border/80'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm ${
                  isSelected
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-primary/10 text-primary'
                }`}
              >
                {child.firstNames.charAt(0)}
              </div>

              <div className="overflow-hidden">
                <span className="block font-bold text-xs truncate max-w-[170px]">
                  {child.firstNames} {child.lastNamePaternal}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge
                    variant={isSelected ? 'outline' : 'secondary'}
                    className={`text-[9px] px-1.5 py-0 font-bold ${
                      isSelected
                        ? 'border-primary-foreground/40 text-primary-foreground'
                        : ''
                    }`}
                  >
                    {classroom ? `${classroom.grade}° "${classroom.section}"` : 'Sin aula'}
                  </Badge>
                  <span
                    className={`text-[10px] truncate ${
                      isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                    }`}
                  >
                    {classroom?.educationLevel === 'INITIAL'
                      ? 'Inicial'
                      : classroom?.educationLevel === 'SECONDARY'
                      ? 'Secundaria'
                      : 'Primaria'}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
