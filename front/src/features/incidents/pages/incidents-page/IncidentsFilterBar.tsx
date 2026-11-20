import React from 'react';
import { Filter } from 'lucide-react';
import type { Classroom } from '@/features/classrooms/types';
import { formatEducationLevel } from '@/lib/utils';

interface IncidentsFilterBarProps {
  selectedType: string;
  selectedSeverity: string;
  selectedClassroomId: string;
  classrooms: Classroom[];
  onSelectType: (type: string) => void;
  onSelectSeverity: (severity: string) => void;
  onSelectClassroom: (classroomId: string) => void;
}

export const IncidentsFilterBar: React.FC<IncidentsFilterBarProps> = ({
  selectedType,
  selectedSeverity,
  selectedClassroomId,
  classrooms,
  onSelectType,
  onSelectSeverity,
  onSelectClassroom,
}) => {
  return (
    <div className="p-4 rounded-xl bg-card border border-border shadow-sm flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase">
        <Filter className="w-3.5 h-3.5 text-primary" />
        <span>Filtros:</span>
      </div>

      {/* Tipo */}
      <select
        value={selectedType}
        onChange={(e) => onSelectType(e.target.value)}
        className="text-xs font-semibold bg-background border border-border rounded-lg px-2.5 py-1.5 text-foreground focus:ring-1 focus:ring-primary outline-none"
      >
        <option value="ALL">— Todos los Tipos —</option>
        <option value="MERITO">Méritos</option>
        <option value="DEMERITO">Faltas Conductuales</option>
        <option value="ATENCION_TOPICO">Tópico / Salud</option>
        <option value="CITACION_PADRES">Citaciones</option>
      </select>

      {/* Severidad */}
      <select
        value={selectedSeverity}
        onChange={(e) => onSelectSeverity(e.target.value)}
        className="text-xs font-semibold bg-background border border-border rounded-lg px-2.5 py-1.5 text-foreground focus:ring-1 focus:ring-primary outline-none"
      >
        <option value="ALL">— Toda Severidad —</option>
        <option value="LOW">Baja</option>
        <option value="MEDIUM">Media</option>
        <option value="HIGH">Alta</option>
        <option value="CRITICAL">Urgente</option>
      </select>

      {/* Aula / Salón */}
      <select
        value={selectedClassroomId}
        onChange={(e) => onSelectClassroom(e.target.value)}
        className="text-xs font-semibold bg-background border border-border rounded-lg px-2.5 py-1.5 text-foreground focus:ring-1 focus:ring-primary outline-none max-w-[200px]"
      >
        <option value="">— Todas las Aulas —</option>
        {classrooms.map((c) => (
          <option key={c.id} value={c.id}>
            {c.grade}° "{c.section}" - {formatEducationLevel(c.educationLevel)}
          </option>
        ))}
      </select>
    </div>
  );
};
