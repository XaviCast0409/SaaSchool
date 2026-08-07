import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export type EducationLevel = 'INITIAL' | 'PRIMARY' | 'SECONDARY';
export type TeachingMode = 'UNIDOCENTE' | 'POLIDOCENTE';

export interface GradeCatalogEntry {
  gradeCode: string;
  displayName: string;
  gradeNumber: number;
  level: EducationLevel;
  teachingMode: TeachingMode;
  teachingModeLabel: string;
}

export interface CourseCatalogEntry {
  officialCode: string;
  name: string;
  shortName: string;
  applicableLevels: EducationLevel[];
  isCustom: false;
  category: string;
}

export interface CustomCoursePlaceholder {
  officialCode: 'CUSTOM';
  name: 'Taller / Curso Personalizado';
  shortName: 'Personalizado';
  applicableLevels: EducationLevel[];
  isCustom: true;
  category: 'Personalizado';
}

export type CourseEntry = CourseCatalogEntry | CustomCoursePlaceholder;

interface CatalogResponse<T> {
  status: string;
  data: T[];
}

/** Catálogo de grados MINEDU, opcionalmente filtrado por nivel. */
export const useGradeCatalog = (level?: EducationLevel) => {
  return useQuery({
    queryKey: ['catalog', 'grades', level],
    queryFn: async () => {
      const params = level ? `?level=${level}` : '';
      const response = await api.get<CatalogResponse<GradeCatalogEntry>>(`/catalog/grades${params}`);
      return response.data.data;
    },
    staleTime: Infinity, // Datos estáticos, nunca caducan
    gcTime: Infinity,
  });
};

/** Catálogo de cursos MINEDU, opcionalmente filtrado por nivel. */
export const useCourseCatalog = (level?: EducationLevel) => {
  return useQuery({
    queryKey: ['catalog', 'courses', level],
    queryFn: async () => {
      const params = level ? `?level=${level}` : '';
      const response = await api.get<CatalogResponse<CourseEntry>>(`/catalog/courses${params}`);
      return response.data.data;
    },
    staleTime: Infinity, // Datos estáticos, nunca caducan
    gcTime: Infinity,
  });
};

/** Agrupa cursos por categoría para el selector agrupado. */
export function groupCoursesByCategory(courses: CourseEntry[]): Record<string, CourseEntry[]> {
  return courses.reduce<Record<string, CourseEntry[]>>((acc, course) => {
    const category = course.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(course);
    return acc;
  }, {});
}
