import type { EducationLevel } from './cneb.catalog';

/**
 * Catálogo de cursos que muchos colegios privados dictan por separado (polidocencia o unidocencia),
 * en primaria y secundaria. Base: los cursos del examen de admisión de la UNMSM (San Marcos) más
 * Arte, Inglés, Computación, Educación Física y otros de uso frecuente. Los talleres o cursos extra
 * que no tributan al SIAGIE se crean aparte (kind WORKSHOP).
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
  /** Lo registra el tutor o tutora del aula (se asigna solo al tutor). */
  byTutor?: boolean;
  /** Grados sugeridos (el colegio puede activarlo en cualquiera). */
  suggestedGrades?: Partial<Record<EducationLevel, number[]>>;
}

const sec = (areaCode: string, competences: number[]) => ({ areaCode, competences });

export const PREUNIVERSITY_COURSES: PreuniversityCourse[] = [
  // ── Comunicación (área madre COM: 7 oral, 8 lee, 9 escribe)
  { key: 'RAZ_VERBAL', name: 'Razonamiento Verbal', sanMarcos: true, levels: { PRIMARY: sec('COM', [8, 7]), SECONDARY: sec('COM', [8, 7]) } },
  { key: 'LENGUAJE', name: 'Lenguaje', sanMarcos: true, levels: { PRIMARY: sec('COM', [7, 9]), SECONDARY: sec('COM', [7, 9]) } },
  { key: 'LITERATURA', name: 'Literatura', sanMarcos: true, levels: { PRIMARY: sec('COM', [8, 9]), SECONDARY: sec('COM', [8, 9]) } },
  { key: 'PLAN_LECTOR', name: 'Plan Lector', sanMarcos: false, levels: { PRIMARY: sec('COM', [8]), SECONDARY: sec('COM', [8]) } },

  // ── Matemática (área madre MAT: 23 cantidad, 24 regularidad, 25 forma, 26 datos)
  { key: 'RAZ_MATEMATICO', name: 'Razonamiento Matemático', sanMarcos: true, levels: { PRIMARY: sec('MAT', [23, 26]), SECONDARY: sec('MAT', [23, 26]) } },
  { key: 'ARITMETICA', name: 'Aritmética', sanMarcos: true, levels: { PRIMARY: sec('MAT', [23]), SECONDARY: sec('MAT', [23]) }, suggestedGrades: { PRIMARY: [3, 4, 5, 6] } },
  { key: 'ALGEBRA', name: 'Álgebra', sanMarcos: true, levels: { PRIMARY: sec('MAT', [24]), SECONDARY: sec('MAT', [24]) }, suggestedGrades: { PRIMARY: [5, 6] } },
  { key: 'TRIGONOMETRIA', name: 'Trigonometría', sanMarcos: true, levels: { PRIMARY: sec('MAT', [25, 24]), SECONDARY: sec('MAT', [25, 24]) }, suggestedGrades: { PRIMARY: [6], SECONDARY: [3, 4, 5] } },
  { key: 'GEOMETRIA', name: 'Geometría', sanMarcos: true, levels: { PRIMARY: sec('MAT', [25]), SECONDARY: sec('MAT', [25]) }, suggestedGrades: { PRIMARY: [3, 4, 5, 6] } },
  { key: 'ESTADISTICA', name: 'Estadística y Probabilidad', sanMarcos: false, levels: { PRIMARY: sec('MAT', [26]), SECONDARY: sec('MAT', [26]) } },

  // ── DPCC (secundaria: 1 identidad, 16 convivencia) / Personal Social (primaria: PS 1, 16, 17, 18, 19)
  { key: 'PSICOLOGIA', name: 'Psicología', sanMarcos: true, levels: { PRIMARY: sec('PS', [1]), SECONDARY: sec('DPCC', [1]) } },
  { key: 'CIVICA', name: 'Educación Cívica', sanMarcos: true, levels: { PRIMARY: sec('PS', [16, 1]), SECONDARY: sec('DPCC', [16]) } },
  { key: 'FILOSOFIA', name: 'Filosofía', sanMarcos: true, levels: { PRIMARY: sec('PS', [1, 16]), SECONDARY: sec('DPCC', [1, 16]) } },
  { key: 'LOGICA', name: 'Lógica', sanMarcos: false, levels: { SECONDARY: sec('DPCC', [1]) } },

  // ── Ciencias Sociales (secundaria: CCSS 17, 18, 19) / Personal Social (primaria)
  { key: 'HIST_PERU', name: 'Historia del Perú', sanMarcos: true, levels: { PRIMARY: sec('PS', [17]), SECONDARY: sec('CCSS', [17]) } },
  { key: 'HIST_UNIVERSAL', name: 'Historia Universal', sanMarcos: true, levels: { PRIMARY: sec('PS', [17]), SECONDARY: sec('CCSS', [17]) } },
  { key: 'GEOGRAFIA', name: 'Geografía', sanMarcos: true, levels: { PRIMARY: sec('PS', [18]), SECONDARY: sec('CCSS', [18]) } },
  { key: 'ECONOMIA', name: 'Economía', sanMarcos: true, levels: { PRIMARY: sec('PS', [19]), SECONDARY: sec('CCSS', [19]) } },

  // ── Ciencia y Tecnología (CYT: 20 indaga, 21 explica, 22 diseña)
  { key: 'FISICA', name: 'Física', sanMarcos: true, levels: { PRIMARY: sec('CYT', [20, 21, 22]), SECONDARY: sec('CYT', [20, 21, 22]) } },
  { key: 'QUIMICA', name: 'Química', sanMarcos: true, levels: { PRIMARY: sec('CYT', [20, 21, 22]), SECONDARY: sec('CYT', [20, 21, 22]) } },
  { key: 'BIOLOGIA', name: 'Biología', sanMarcos: true, levels: { PRIMARY: sec('CYT', [20, 21]), SECONDARY: sec('CYT', [20, 21]) } },

  // ── Cursos que ocupan un área completa (un solo curso basta: se reporta con el nombre del área madre)
  { key: 'ARTE', name: 'Arte', sanMarcos: false, levels: { PRIMARY: sec('ART', [5, 6]), SECONDARY: sec('ART', [5, 6]) } },
  { key: 'INGLES', name: 'Inglés', sanMarcos: false, levels: { PRIMARY: sec('ING', [13, 14, 15]), SECONDARY: sec('ING', [13, 14, 15]) } },
  { key: 'EDU_FISICA', name: 'Educación Física', sanMarcos: false, levels: { PRIMARY: sec('EF', [2, 3, 4]), SECONDARY: sec('EF', [2, 3, 4]) } },

  // ── Competencias transversales (TRANS: 28 TIC → hoja «DESEN TIC»; 29 aprendizaje autónomo → hoja «GEST AUTO»).
  //    Computación evalúa solo la 28; la 29 sigue en «Competencias transversales» y la registra el tutor o tutora.
  { key: 'COMPUTACION', name: 'Computación', sanMarcos: false, levels: { PRIMARY: sec('TRANS', [28]), SECONDARY: sec('TRANS', [28]) } },
];

/**
 * Competencias de un área que ningún curso elegido evalúa: quedan en un curso con el nombre del área
 * madre (en TRANS lo registra el tutor). Así el SIAGIE siempre recibe todas las competencias del área.
 */
export const REMAINDER_PREFIX = 'REST_';
export const remainderKey = (areaCode: string, competences: number[]) =>
  `${REMAINDER_PREFIX}${areaCode}_${[...competences].sort((a, b) => a - b).join('_')}`;
export const isRemainderKey = (key: string | null | undefined) => !!key && key.startsWith(REMAINDER_PREFIX);

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
      byTutor: !!c.byTutor,
      areaCode: c.levels[level]!.areaCode,
      competences: c.levels[level]!.competences,
      suggestedGrades: c.suggestedGrades?.[level] ?? null,
    }));
}
