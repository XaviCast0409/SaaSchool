import React, { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarRange, Eye } from 'lucide-react';
import { useAcademicYears } from '@/features/academic-years/api/useAcademicYears';
import { useAcademicYearStore, YEAR_SCOPED_ROLES } from '@/store/useAcademicYearStore';
import { useAuthStore } from '@/store/useAuthStore';

/** Estado del año elegido en la cabecera. */
export const useSelectedAcademicYear = () => {
  const { user } = useAuthStore();
  const enabled = !!user && YEAR_SCOPED_ROLES.includes(user.role);
  // Familias y alumnos no eligen año: no se pide la lista (el servidor se la niega)
  const { data: years = [] } = useAcademicYears(enabled);
  const { selectedYearId } = useAcademicYearStore();
  const current = years.find((y) => y.isActive) ?? null;
  const selected = (enabled && years.find((y) => y.id === selectedYearId)) || current;
  return { enabled, years, current, selected, isOtherYear: !!selected && !!current && selected.id !== current.id };
};

/** Cambia de año: descarta la caché para que todas las listas se vuelvan a pedir con el año nuevo. */
const useSwitchYear = () => {
  const qc = useQueryClient();
  const { setSelectedYearId } = useAcademicYearStore();
  return (id: string | null, currentId?: string) => {
    setSelectedYearId(id && id !== currentId ? id : null);
    qc.resetQueries({ predicate: (q) => q.queryKey[0] !== 'academic-years' });
  };
};

/** Selector de año para el personal (cabecera). */
export const AcademicYearSwitcher: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { enabled, years, current, selected } = useSelectedAcademicYear();
  const { selectedYearId } = useAcademicYearStore();
  const switchYear = useSwitchYear();

  // Si el año guardado ya no existe (o es de otro colegio), volver al vigente
  useEffect(() => {
    if (enabled && selectedYearId && years.length > 0 && !years.some((y) => y.id === selectedYearId)) switchYear(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, selectedYearId, years]);

  if (!enabled || years.length < 2 || !selected) return null;
  return (
    <label className={`flex items-center gap-1.5 text-xs ${className}`}>
      <CalendarRange className="w-3.5 h-3.5 text-primary" />
      <span className="sr-only">Año que estás viendo</span>
      <select
        value={selected.id}
        onChange={(e) => switchYear(e.target.value, current?.id)}
        className="rounded-lg border border-input bg-background px-2 py-1 font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        aria-label="Año que estás viendo"
      >
        {[...years]
          .sort((a, b) => b.year - a.year)
          .map((y) => (
            <option key={y.id} value={y.id}>
              {y.year}
              {y.isActive ? ' · vigente' : y.enrollmentOpen ? ' · matrícula abierta' : ''}
            </option>
          ))}
      </select>
    </label>
  );
};

/** Aviso cuando se está viendo un año distinto al vigente. */
export const AcademicYearBanner: React.FC = () => {
  const { enabled, current, selected, isOtherYear } = useSelectedAcademicYear();
  const switchYear = useSwitchYear();
  if (!enabled || !isOtherYear || !selected || !current) return null;
  return (
        <div className="bg-indigo-500/10 border-b border-indigo-500/30 px-4 md:px-8 py-2 text-xs flex flex-wrap items-center justify-between gap-2 text-indigo-900 dark:text-indigo-200 print:hidden">
          <span className="flex items-center gap-2">
            <Eye className="w-4 h-4 shrink-0" />
            <span>
              Estás viendo <strong>{selected.year}</strong>
              {selected.enrollmentOpen ? ' (matrícula abierta)' : ''}: estudiantes, aulas, personal, plan de estudios, carga docente,
              avance de notas, libretas y cobranza muestran ese año. Asistencia, moras y analítica siguen con <strong>{current.year}</strong>, el año vigente.
            </span>
          </span>
          <button
            type="button"
            onClick={() => switchYear(null)}
            className="rounded-md border border-indigo-500/40 bg-background px-2 py-1 font-semibold text-foreground hover:bg-muted"
          >
            Volver a {current.year}
          </button>
        </div>
  );
};
