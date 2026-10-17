import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Check, BookOpen, X } from 'lucide-react';
import type { CourseEntry } from '@/features/catalog/api/useCatalog';

interface CourseCatalogSelectProps {
  value: string;
  onChange: (value: string) => void;
  coursesByCategory: Record<string, CourseEntry[]>;
  catalogCourses: CourseEntry[];
}

export const CourseCatalogSelect: React.FC<CourseCatalogSelectProps> = ({
  value,
  onChange,
  coursesByCategory,
  catalogCourses,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Cerrar al hacer clic fuera del componente
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Enfocar el input de búsqueda al abrir
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const selectedCourse = useMemo(() => {
    return catalogCourses.find((c) => c.officialCode === value);
  }, [catalogCourses, value]);

  // Filtrar cursos por término de búsqueda
  const filteredCategories = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return coursesByCategory;

    const result: Record<string, CourseEntry[]> = {};
    Object.entries(coursesByCategory).forEach(([category, courses]) => {
      const matched = courses.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.officialCode.toLowerCase().includes(q) ||
          category.toLowerCase().includes(q),
      );
      if (matched.length > 0) {
        result[category] = matched;
      }
    });
    return result;
  }, [coursesByCategory, searchQuery]);

  const totalFilteredCount = useMemo(() => {
    return Object.values(filteredCategories).reduce((acc, list) => acc + list.length, 0);
  }, [filteredCategories]);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Botón Trigger tipo Selector */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between rounded-xl border bg-background px-3 py-2.5 text-xs font-semibold text-foreground transition-all shadow-sm ${
          isOpen
            ? 'border-primary ring-2 ring-primary/20'
            : 'border-border hover:border-primary/50'
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
          {selectedCourse ? (
            <span className="truncate">
              {selectedCourse.name}{' '}
              {selectedCourse.officialCode !== 'CUSTOM' && (
                <span className="text-[10px] font-mono text-muted-foreground ml-1">
                  ({selectedCourse.officialCode})
                </span>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground font-normal">
              ── Seleccionar curso oficial ──
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-primary' : ''
          }`}
        />
      </button>

      {/* Menú desplegable hacia abajo (Strictly Top-Full Downwards) */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl backdrop-blur-md overflow-hidden animate-in fade-in slide-from-top-2 duration-150">
          {/* Buscador Rápido Superior */}
          <div className="p-2 border-b border-border bg-muted/40 flex items-center gap-2">
            <div className="relative flex-1 flex items-center">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar curso por nombre o código..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-border bg-background text-xs font-medium placeholder:text-muted-foreground text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Lista de Opciones con Scroll Acotado */}
          <div className="max-h-56 sm:max-h-64 overflow-y-auto p-1.5 space-y-2 divide-y divide-border/40">
            {totalFilteredCount === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No se encontraron cursos para "{searchQuery}".
              </div>
            ) : (
              Object.entries(filteredCategories).map(([category, courses]) => (
                <div key={category} className="pt-1.5 first:pt-0 space-y-1">
                  <div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {category}
                  </div>
                  <div className="space-y-0.5">
                    {courses.map((course) => {
                      const isSelected = course.officialCode === value;
                      return (
                        <button
                          key={course.officialCode}
                          type="button"
                          onClick={() => {
                            onChange(course.officialCode);
                            setIsOpen(false);
                            setSearchQuery('');
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left transition-colors ${
                            isSelected
                              ? 'bg-primary/10 text-primary font-bold'
                              : 'text-foreground hover:bg-muted/80'
                          }`}
                        >
                          <span className="truncate pr-2">{course.name}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {course.officialCode !== 'CUSTOM' ? (
                              <span
                                className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                                  isSelected
                                    ? 'bg-primary/20 text-primary border-primary/30'
                                    : 'bg-muted text-muted-foreground border-border'
                                }`}
                              >
                                {course.officialCode}
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                Taller
                              </span>
                            )}
                            {isSelected && <Check className="w-3.5 h-3.5 text-primary ml-1" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
