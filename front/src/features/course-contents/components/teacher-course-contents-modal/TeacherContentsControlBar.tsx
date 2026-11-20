import React from 'react';
import { Search, X, BookOpen, ClipboardList, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import type { ContentType } from '../../types';

interface TeacherContentsControlBarProps {
  periods: number[];
  periodLabel: string;
  selectedBimester: number;
  contentsCount: number;
  materialsCount: number;
  homeworksCount: number;
  forumsCount: number;
  filterType: ContentType | 'ALL';
  searchQuery: string;
  onSelectBimester: (bimester: number) => void;
  onFilterTypeChange: (type: ContentType | 'ALL') => void;
  onSearchChange: (query: string) => void;
}

export const TeacherContentsControlBar: React.FC<TeacherContentsControlBarProps> = ({
  periods,
  periodLabel,
  selectedBimester,
  contentsCount,
  materialsCount,
  homeworksCount,
  forumsCount,
  filterType,
  searchQuery,
  onSelectBimester,
  onFilterTypeChange,
  onSearchChange,
}) => {
  return (
    <div className="p-3 sm:p-4 border-b border-border bg-muted/10 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Selector de Bimestres / Trimestres */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {periods.map((bim) => (
            <button
              key={bim}
              onClick={() => onSelectBimester(bim)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 border ${
                selectedBimester === bim
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-card text-muted-foreground border-border hover:bg-muted'
              }`}
            >
              <span>
                {bim}° {periodLabel}
              </span>
              {selectedBimester === bim && (
                <Badge
                  variant="secondary"
                  className="text-xs px-1.5 py-0 h-4 bg-primary-foreground/20 text-primary-foreground"
                >
                  {contentsCount}
                </Badge>
              )}
            </button>
          ))}
        </div>

        {/* Indicadores en vivo del bimestre */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <span className="text-xs font-bold text-muted-foreground hidden lg:inline">Recursos del periodo:</span>
          <Badge variant="outline" className="text-xs font-semibold gap-1 bg-card">
            <BookOpen className="w-3 h-3 text-primary" />
            <span>{materialsCount} Clases</span>
          </Badge>
          <Badge
            variant="outline"
            className="text-xs font-semibold gap-1 bg-card text-amber-700 dark:text-amber-300"
          >
            <ClipboardList className="w-3 h-3 text-amber-600" />
            <span>{homeworksCount} Tareas</span>
          </Badge>
          <Badge
            variant="outline"
            className="text-xs font-semibold gap-1 bg-card text-emerald-700 dark:text-emerald-300"
          >
            <MessageSquare className="w-3 h-3 text-emerald-600" />
            <span>{forumsCount} Foros</span>
          </Badge>
        </div>
      </div>

      {/* Filtros por Tipo de Contenido & Buscador */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => onFilterTypeChange('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors shrink-0 ${
              filterType === 'ALL'
                ? 'bg-primary/10 text-primary border border-primary/30'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            Todos ({contentsCount})
          </button>
          <button
            onClick={() => onFilterTypeChange('LESSON_MATERIAL')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors shrink-0 flex items-center gap-1 ${
              filterType === 'LESSON_MATERIAL'
                ? 'bg-primary/10 text-primary border border-primary/30'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <BookOpen className="w-3 h-3" />
            <span>Materiales ({materialsCount})</span>
          </button>
          <button
            onClick={() => onFilterTypeChange('HOMEWORK')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors shrink-0 flex items-center gap-1 ${
              filterType === 'HOMEWORK'
                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <ClipboardList className="w-3 h-3" />
            <span>Tareas ({homeworksCount})</span>
          </button>
          <button
            onClick={() => onFilterTypeChange('FORUM')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors shrink-0 flex items-center gap-1 ${
              filterType === 'FORUM'
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <MessageSquare className="w-3 h-3" />
            <span>Foros ({forumsCount})</span>
          </button>
        </div>

        {/* Buscador de Publicación */}
        <div className="relative max-w-xs w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar material o tarea..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 pr-7 h-8 text-xs bg-background rounded-xl"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
