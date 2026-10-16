import React, { useState, useMemo } from 'react';
import { X, Search, Sparkles, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PredefinedComment {
  id: string;
  level: 'AD' | 'A' | 'B' | 'C';
  title: string;
  text: string;
}

const PREDEFINED_COMMENTS: PredefinedComment[] = [
  // AD - Logro Destacado
  {
    id: 'ad-1',
    level: 'AD',
    title: 'Autonomía y excelencia',
    text: 'Demuestra excelente autonomía, iniciativa y solidez en el desarrollo de la competencia, superando ampliamente las expectativas del grado.',
  },
  {
    id: 'ad-2',
    level: 'AD',
    title: 'Resolución creativa y justificación',
    text: 'Resuelve situaciones complejas con creatividad, justificando con solvencia y claridad cada uno de sus procedimientos y conclusiones.',
  },
  {
    id: 'ad-3',
    level: 'AD',
    title: 'Liderazgo y pensamiento crítico',
    text: 'Evidencia un pensamiento crítico reflexivo de alto nivel, proponiendo soluciones innovadoras y apoyando activamente a sus compañeros.',
  },

  // A - Logro Esperado
  {
    id: 'a-1',
    level: 'A',
    title: 'Cumplimiento satisfactorio',
    text: 'Logra el nivel esperado para el grado en los plazos previstos, participando activamente y cumpliendo satisfactoriamente con los desempeños.',
  },
  {
    id: 'a-2',
    level: 'A',
    title: 'Comprensión y aplicación',
    text: 'Demuestra una adecuada comprensión de los conceptos clave y aplica estrategias pertinentes de manera consistente en sus actividades.',
  },
  {
    id: 'a-3',
    level: 'A',
    title: 'Progreso constante',
    text: 'Evidencia constancia y responsabilidad en su proceso de aprendizaje, alcanzando con éxito las metas programadas para el periodo.',
  },

  // B - En Proceso
  {
    id: 'b-1',
    level: 'B',
    title: 'Acompañamiento en consolidación',
    text: 'Se encuentra próximo a alcanzar el nivel esperado; requiere acompañamiento puntual y práctica reflexiva para consolidar sus procedimientos.',
  },
  {
    id: 'b-2',
    level: 'B',
    title: 'Afianzamiento conceptual',
    text: 'Identifica los conceptos básicos, pero necesita mayor seguridad al aplicarlos en situaciones variadas y de mayor complejidad.',
  },
  {
    id: 'b-3',
    level: 'B',
    title: 'Organización y constancia',
    text: 'Muestra interés en aprender; se sugiere reforzar la organización de tiempos y la revisión crítica de sus trabajos antes de entregarlos.',
  },

  // C - En Inicio
  {
    id: 'c-1',
    level: 'C',
    title: 'Refuerzo continuo y apoyo guiado',
    text: 'Muestra dificultades iniciales para alcanzar los desempeños requeridos; necesita apoyo pedagógico continuo y práctica guiada personalizada.',
  },
  {
    id: 'c-2',
    level: 'C',
    title: 'Compromiso conjunto colegio-familia',
    text: 'Evidencia un progreso mínimo hacia el nivel esperado; es indispensable coordinar un plan de refuerzo conjunto entre docente y familia.',
  },
  {
    id: 'c-3',
    level: 'C',
    title: 'Revisión de prerrequisitos',
    text: 'Requiere afianzar conocimientos previos fundamentales para poder avanzar en la comprensión de las competencias del grado.',
  },
];

interface PredefinedCommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectComment: (comment: string) => void;
  studentName?: string;
  currentScoreLetter?: 'AD' | 'A' | 'B' | 'C' | null;
}

export const PredefinedCommentsModal: React.FC<PredefinedCommentsModalProps> = ({
  isOpen,
  onClose,
  onSelectComment,
  studentName,
  currentScoreLetter,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<'ALL' | 'AD' | 'A' | 'B' | 'C'>(
    currentScoreLetter || 'ALL',
  );
  const [searchQuery, setSearchQuery] = useState('');

  const filteredComments = useMemo(() => {
    return PREDEFINED_COMMENTS.filter((item) => {
      const matchLevel = selectedLevel === 'ALL' || item.level === selectedLevel;
      const matchSearch =
        !searchQuery.trim() ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.text.toLowerCase().includes(searchQuery.toLowerCase());
      return matchLevel && matchSearch;
    });
  }, [selectedLevel, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Cabecera */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-foreground">
                Comentarios y Conclusiones Predefinidas
              </h3>
              {studentName && (
                <p className="text-xs text-muted-foreground truncate max-w-sm">
                  Alumno: <strong className="text-foreground">{studentName}</strong>
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filtros por Nivel y Búsqueda */}
        <div className="p-4 border-b border-border space-y-3 bg-card">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              variant={selectedLevel === 'ALL' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedLevel('ALL')}
              className="h-7 text-xs font-semibold px-2.5"
            >
              Todos
            </Button>
            <Button
              variant={selectedLevel === 'AD' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedLevel('AD')}
              className={`h-7 text-xs font-semibold px-2.5 ${
                selectedLevel === 'AD' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''
              }`}
            >
              AD (Destacado)
            </Button>
            <Button
              variant={selectedLevel === 'A' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedLevel('A')}
              className={`h-7 text-xs font-semibold px-2.5 ${
                selectedLevel === 'A' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''
              }`}
            >
              A (Esperado)
            </Button>
            <Button
              variant={selectedLevel === 'B' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedLevel('B')}
              className={`h-7 text-xs font-semibold px-2.5 ${
                selectedLevel === 'B' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''
              }`}
            >
              B (En Proceso)
            </Button>
            <Button
              variant={selectedLevel === 'C' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedLevel('C')}
              className={`h-7 text-xs font-semibold px-2.5 ${
                selectedLevel === 'C' ? 'bg-rose-600 hover:bg-rose-700 text-white' : ''
              }`}
            >
              C (En Inicio)
            </Button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por palabra clave (autonomía, perseverancia, dificultad...)"
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Lista de Conclusiones */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-border/60">
          {filteredComments.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-xs">
              No se encontraron conclusiones con los filtros seleccionados.
            </div>
          ) : (
            filteredComments.map((item) => (
              <div
                key={item.id}
                className="pt-2.5 first:pt-0 group flex items-start justify-between gap-3 hover:bg-muted/15 p-2 rounded-xl transition-colors cursor-pointer"
                onClick={() => {
                  onSelectComment(item.text);
                  onClose();
                }}
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-black px-1.5 py-0 border ${
                        item.level === 'AD'
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                          : item.level === 'A'
                          ? 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30'
                          : item.level === 'B'
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
                          : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30'
                      }`}
                    >
                      {item.level}
                    </Badge>
                    <span className="text-xs font-bold text-foreground">{item.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.text}</p>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="opacity-80 group-hover:opacity-100 shrink-0 text-xs gap-1 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground h-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectComment(item.text);
                    onClose();
                  }}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Insertar</span>
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
