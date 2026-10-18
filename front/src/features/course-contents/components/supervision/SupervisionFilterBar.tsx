import React from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { useClassrooms } from '@/features/classrooms/api/useClassrooms';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { SupervisionFeedFilters, ContentType } from '../../types';

interface SupervisionFilterBarProps {
  filters: SupervisionFeedFilters;
  onChange: (filters: SupervisionFeedFilters) => void;
  teachers?: Array<{ id: string; fullName: string }>;
}

export const SupervisionFilterBar: React.FC<SupervisionFilterBarProps> = ({
  filters,
  onChange,
  teachers = [],
}) => {
  const { data: classrooms = [] } = useClassrooms();

  const handleReset = () => {
    onChange({
      page: 1,
      limit: 20,
    });
  };

  const filteredClassrooms = React.useMemo(() => {
    if (!filters.educationLevel) return classrooms;
    return classrooms.filter((c) => c.educationLevel === filters.educationLevel);
  }, [classrooms, filters.educationLevel]);

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        {/* Buscador de texto */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={filters.search || ''}
            onChange={(e) => onChange({ ...filters, search: e.target.value, page: 1 })}
            placeholder="Buscar por título, descripción o nombre de archivo..."
            className="pl-9 h-9 text-xs bg-background"
          />
        </div>

        {/* Botón de limpiar filtros */}
        {(filters.bimester ||
          filters.educationLevel ||
          filters.classroomId ||
          filters.teacherId ||
          filters.contentType ||
          filters.search) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-9 px-3 text-xs gap-1.5 text-muted-foreground hover:text-foreground shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Limpiar Filtros</span>
          </Button>
        )}
      </div>

      {/* Selectores de filtros en cuadrícula */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1">
        {/* Bimestre */}
        <select
          value={filters.bimester || ''}
          onChange={(e) =>
            onChange({
              ...filters,
              bimester: e.target.value ? Number(e.target.value) : undefined,
              page: 1,
            })
          }
          className="h-9 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
        >
          <option value="">— Todos los Bimestres —</option>
          <option value="1">1° Bimestre</option>
          <option value="2">2° Bimestre</option>
          <option value="3">3° Bimestre</option>
          <option value="4">4° Bimestre</option>
        </select>

        {/* Nivel Educativo */}
        <select
          value={filters.educationLevel || ''}
          onChange={(e) =>
            onChange({
              ...filters,
              educationLevel: (e.target.value as any) || undefined,
              classroomId: undefined,
              page: 1,
            })
          }
          className="h-9 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
        >
          <option value="">— Nivel Educativo —</option>
          <option value="INITIAL">Inicial</option>
          <option value="PRIMARY">Primaria</option>
          <option value="SECONDARY">Secundaria</option>
        </select>

        {/* Salón / Aula */}
        <select
          value={filters.classroomId || ''}
          onChange={(e) =>
            onChange({
              ...filters,
              classroomId: e.target.value || undefined,
              page: 1,
            })
          }
          className="h-9 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
        >
          <option value="">— Todas las Aulas —</option>
          {filteredClassrooms.map((c) => (
            <option key={c.id} value={c.id}>
              {c.grade}° "{c.section}" ({c.educationLevel === 'INITIAL' ? 'Ini' : c.educationLevel === 'PRIMARY' ? 'Pri' : 'Sec'})
            </option>
          ))}
        </select>

        {/* Docente */}
        <select
          value={filters.teacherId || ''}
          onChange={(e) =>
            onChange({
              ...filters,
              teacherId: e.target.value || undefined,
              page: 1,
            })
          }
          className="h-9 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
        >
          <option value="">— Todos los Docentes —</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.fullName}
            </option>
          ))}
        </select>

        {/* Tipo de Contenido */}
        <select
          value={filters.contentType || ''}
          onChange={(e) =>
            onChange({
              ...filters,
              contentType: (e.target.value as ContentType) || undefined,
              page: 1,
            })
          }
          className="h-9 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer col-span-2 sm:col-span-1"
        >
          <option value="">— Tipo de Recurso —</option>
          <option value="LESSON_MATERIAL">Material de Clase (Guías/PDF)</option>
          <option value="HOMEWORK">Tarea / Actividad</option>
          <option value="FORUM">Foro de Debate</option>
        </select>
      </div>
    </div>
  );
};
