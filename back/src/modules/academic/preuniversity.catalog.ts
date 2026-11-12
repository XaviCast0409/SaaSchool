import type { EducationLevel } from './cneb.catalog';

/**
 * Catálogo de cursos "preuniversitarios" que muchos colegios privados dictan por separado.
 * Base: los cursos que evalúa el examen de admisión de la UNMSM (San Marcos) más tres de uso frecuente.
 *
 * Cada curso es HIJO de un área oficial del CNEB (su "área madre") y evalúa una o más de sus
 * competencias. En el SIAGIE solo va el área madre: el calificativo de cada competencia es el promedio
 * ponderado de los cursos hijos que la evalúan (ver consolidateOfficialCompetence).
 */

export interface PreuniversityCourse {
  key: string;
  name: string;
  /** Curso del examen de admisión de San Marcos (los demás son de uso frecuente en colegios). */
  sanMarcos: boolean;
  /** Área madre y competencias CNEB que evalúa, por nivel. Si un nivel no aparece, el curso no aplica. */
  levels: Partial<Record<EducationLevel, { areaCode: string; competences: number[] }>>;
  /** Grados sugeridos (el colegio puede activarlo en cualquiera). */
  suggestedGrades?: Partial<Record<EducationLevel, number[]>>;
}

const sec = (areaCode: string, competences: number[]) => ({ areaCode, competences });

export const PREUNIVERSITY_COURSES: PreuniversityCourse[] = [
  // ── Matemática (área madre MAT: 23 cantidad, 24 regularidad, 25 forma, 26 datos)
  { key: 'ARITMETICA', name: 'Aritmética', sanMarcos: true, levels: { PRIMARY: sec('MAT', [23]), SECONDARY: sec('MAT', [23]) }, suggestedGrades: { PRIMARY: [3, 4, 5, 6] } },
  { key: 'ALGEBRA', name: 'Álgebra', sanMarcos: true, levels: { PRIMARY: sec('MAT', [24]), SECONDARY: sec('MAT', [24]) }, suggestedGrades: { PRIMARY: [5, 6] } },
  { key: 'GEOMETRIA', name: 'Geometría', sanMarcos: true, levels: { PRIMARY: sec('MAT', [25]), SECONDARY: sec('MAT', [25]) }, suggestedGrades: { PRIMARY: [3, 4, 5, 6] } },
  { key: 'TRIGONOMETRIA', name: 'Trigonometría', sanMarcos: true, levels: { SECONDARY: sec('MAT', [25, 24]) }, suggestedGrades: { SECONDARY: [3, 4, 5] } },
  { key: 'RAZ_MATEMATICO', name: 'Razonamiento Matemático', sanMarcos: true, levels: { PRIMARY: sec('MAT', [23, 26]), SECONDARY: sec('MAT', [23, 26]) } },
  { key: 'ESTADISTICA', name: 'Estadística y Probabilidad', sanMarcos: false, levels: { PRIMARY: sec('MAT', [26]), SECONDARY: sec('MAT', [26]) } },

  // ── Comunicación (área madre COM: 7 oral, 8 lee, 9 escribe)
  { key: 'LENGUAJE', name: 'Lenguaje', sanMarcos: true, levels: { PRIMARY: sec('COM', [7, 9]), SECONDARY: sec('COM', [7, 9]) } },
  { key: 'LITERATURA', name: 'Literatura', sanMarcos: true, levels: { SECONDARY: sec('COM', [8, 9]) } },
  { key: 'RAZ_VERBAL', name: 'Razonamiento Verbal', sanMarcos: true, levels: { PRIMARY: sec('COM', [8, 7]), SECONDARY: sec('COM', [8, 7]) } },
  { key: 'PLAN_LECTOR', name: 'Plan Lector', sanMarcos: false, levels: { PRIMARY: sec('COM', [8]), SECONDARY: sec('COM', [8]) } },

  // ── Ciencias Sociales (secundaria: CCSS 17, 18, 19) / Personal Social (primaria: PS 1, 16, 17, 18, 19)
  { key: 'HIST_PERU', name: 'Historia del Perú', sanMarcos: true, levels: { PRIMARY: sec('PS', [17]), SECONDARY: sec('CCSS', [17]) } },
  { key: 'HIST_UNIVERSAL', name: 'Historia Universal', sanMarcos: true, levels: { SECONDARY: sec('CCSS', [17]) } },
  { key: 'GEOGRAFIA', name: 'Geografía', sanMarcos: true, levels: { PRIMARY: sec('PS', [18]), SECONDARY: sec('CCSS', [18]) } },
  { key: 'ECONOMIA', name: 'Economía', sanMarcos: true, levels: { PRIMARY: sec('PS', [19]), SECONDARY: sec('CCSS', [19]) } },

  // ── DPCC (secundaria: 1 identidad, 16 convivencia) / Personal Social (primaria)
  { key: 'CIVICA', name: 'Educación Cívica', sanMarcos: true, levels: { PRIMARY: sec('PS', [16, 1]), SECONDARY: sec('DPCC', [16]) } },
  { key: 'PSICOLOGIA', name: 'Psicología', sanMarcos: true, levels: { SECONDARY: sec('DPCC', [1]) } },
  { key: 'FILOSOFIA', name: 'Filosofía', sanMarcos: true, levels: { SECONDARY: sec('DPCC', [1, 16]) } },
  { key: 'LOGICA', name: 'Lógica', sanMarcos: false, levels: { SECONDARY: sec('DPCC', [1]) } },

  // ── Ciencia y Tecnología (CYT: 20 indaga, 21 explica, 22 diseña)
  { key: 'FISICA', name: 'Física', sanMarcos: true, levels: { SECONDARY: sec('CYT', [20, 21, 22]) } },
  { key: 'QUIMICA', name: 'Química', sanMarcos: true, levels: { SECONDARY: sec('CYT', [20, 21, 22]) } },
  { key: 'BIOLOGIA', name: 'Biología', sanMarcos: true, levels: { PRIMARY: sec('CYT', [20, 21]), SECONDARY: sec('CYT', [20, 21]) } },
];

export function getPreuniversityCourse(key: string): PreuniversityCourse | undefined {
  return PREUNIVERSITY_COURSES.find((c) => c.key === key);
}

/** Cursos del catálogo que aplican a un nivel (opcionalmente a un área madre). */
export function preuniversityCoursesFor(level: EducationLevel, areaCode?: string) {
  return PREUNIVERSITY_COURSES
    .filter((c) => c.levels[level] && (!areaCode || c.levels[level]!.areaCode === areaCode))
    .map((c) => ({
      key: c.key,
      name: c.name,
      sanMarcos: c.sanMarcos,
      areaCode: c.levels[level]!.areaCode,
      competences: c.levels[level]!.competences,
      suggestedGrades: c.suggestedGrades?.[level] ?? null,
    }));
}
