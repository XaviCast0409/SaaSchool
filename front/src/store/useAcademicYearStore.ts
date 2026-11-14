import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Año académico que el personal está viendo (selector de la cabecera). null = el año vigente.
 * Se envía al backend en el encabezado X-Academic-Year-Id (ver lib/axios.ts); el backend lo valida.
 */
interface AcademicYearState {
  selectedYearId: string | null;
  setSelectedYearId: (id: string | null) => void;
}

export const useAcademicYearStore = create<AcademicYearState>()(
  persist(
    (set) => ({
      selectedYearId: null,
      setSelectedYearId: (id) => set({ selectedYearId: id }),
    }),
    { name: 'saaschool-selected-academic-year' },
  ),
);

/** Roles que trabajan con el selector de año (las familias y alumnos siempre ven el vigente). */
export const YEAR_SCOPED_ROLES = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'];
