/**
 * Catálogos oficiales MINEDU/SIAGIE para colegios particulares del Perú.
 * Estos datos son inmutables y representan la normativa vigente 2024-2026.
 * Se sirven como endpoint de solo lectura para que el frontend use selectores
 * en lugar de inputs de texto libre (evita errores humanos).
 */

export type EducationLevel = 'INITIAL' | 'PRIMARY' | 'SECONDARY';

export interface GradeCatalogEntry {
  gradeCode: string;         // Identificador único (ej: 'INITIAL_3Y', 'PRIMARY_1', 'SECONDARY_1')
  displayName: string;        // Nombre de visualización (ej: '3 Años', '1° Primaria', '1° Secundaria')
  gradeNumber: number;        // Número de grado (3, 4, 5 para inicial; 1-6 para primaria; 1-5 para sec)
  level: EducationLevel;
  teachingMode: 'UNIDOCENTE' | 'POLIDOCENTE';
  teachingModeLabel: string;
}

export interface CourseCatalogEntry {
  officialCode: string;       // Código oficial (ej: 'MAT-ALG', 'RAZ-MAT', 'COM-LIT')
  name: string;               // Nombre completo (ej: 'Matemática - Álgebra')
  shortName: string;          // Nombre corto para tablas (ej: 'Álgebra')
  applicableLevels: EducationLevel[];
  isCustom: false;
  category: string;           // Agrupación para el selector (ej: 'Matemática', 'Comunicación')
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

// ============================================================================
// CATÁLOGO DE GRADOS
// ============================================================================
export const GRADE_CATALOG: GradeCatalogEntry[] = [
  // Nivel Inicial
  { gradeCode: 'INITIAL_3Y', displayName: '3 Años', gradeNumber: 3, level: 'INITIAL', teachingMode: 'UNIDOCENTE', teachingModeLabel: 'Unidocencia (Docente de Aula)' },
  { gradeCode: 'INITIAL_4Y', displayName: '4 Años', gradeNumber: 4, level: 'INITIAL', teachingMode: 'UNIDOCENTE', teachingModeLabel: 'Unidocencia (Docente de Aula)' },
  { gradeCode: 'INITIAL_5Y', displayName: '5 Años', gradeNumber: 5, level: 'INITIAL', teachingMode: 'UNIDOCENTE', teachingModeLabel: 'Unidocencia (Docente de Aula)' },

  // Nivel Primaria — Baja (Unidocencia: 1° a 3°)
  { gradeCode: 'PRIMARY_1', displayName: '1° Primaria', gradeNumber: 1, level: 'PRIMARY', teachingMode: 'UNIDOCENTE', teachingModeLabel: 'Unidocencia — Docente de Aula (1° a 3°)' },
  { gradeCode: 'PRIMARY_2', displayName: '2° Primaria', gradeNumber: 2, level: 'PRIMARY', teachingMode: 'UNIDOCENTE', teachingModeLabel: 'Unidocencia — Docente de Aula (1° a 3°)' },
  { gradeCode: 'PRIMARY_3', displayName: '3° Primaria', gradeNumber: 3, level: 'PRIMARY', teachingMode: 'UNIDOCENTE', teachingModeLabel: 'Unidocencia — Docente de Aula (1° a 3°)' },

  // Nivel Primaria — Alta (Polidocencia: 4° a 6°)
  { gradeCode: 'PRIMARY_4', displayName: '4° Primaria', gradeNumber: 4, level: 'PRIMARY', teachingMode: 'POLIDOCENTE', teachingModeLabel: 'Polidocencia — Asignaturas (4° a 6°)' },
  { gradeCode: 'PRIMARY_5', displayName: '5° Primaria', gradeNumber: 5, level: 'PRIMARY', teachingMode: 'POLIDOCENTE', teachingModeLabel: 'Polidocencia — Asignaturas (4° a 6°)' },
  { gradeCode: 'PRIMARY_6', displayName: '6° Primaria', gradeNumber: 6, level: 'PRIMARY', teachingMode: 'POLIDOCENTE', teachingModeLabel: 'Polidocencia — Asignaturas (4° a 6°)' },

  // Nivel Secundaria (Polidocencia: 1° a 5°)
  { gradeCode: 'SECONDARY_1', displayName: '1° Secundaria', gradeNumber: 1, level: 'SECONDARY', teachingMode: 'POLIDOCENTE', teachingModeLabel: 'Polidocencia — Asignaturas Especializadas' },
  { gradeCode: 'SECONDARY_2', displayName: '2° Secundaria', gradeNumber: 2, level: 'SECONDARY', teachingMode: 'POLIDOCENTE', teachingModeLabel: 'Polidocencia — Asignaturas Especializadas' },
  { gradeCode: 'SECONDARY_3', displayName: '3° Secundaria', gradeNumber: 3, level: 'SECONDARY', teachingMode: 'POLIDOCENTE', teachingModeLabel: 'Polidocencia — Asignaturas Especializadas' },
  { gradeCode: 'SECONDARY_4', displayName: '4° Secundaria', gradeNumber: 4, level: 'SECONDARY', teachingMode: 'POLIDOCENTE', teachingModeLabel: 'Polidocencia — Asignaturas Especializadas' },
  { gradeCode: 'SECONDARY_5', displayName: '5° Secundaria', gradeNumber: 5, level: 'SECONDARY', teachingMode: 'POLIDOCENTE', teachingModeLabel: 'Polidocencia — Asignaturas Especializadas' },
];

// ============================================================================
// CATÁLOGO DE CURSOS / ÁREAS CURRICULARES
// ============================================================================
export const COURSE_CATALOG: CourseEntry[] = [
  // ── INICIAL ──────────────────────────────────────────────────────────────
  { officialCode: 'INI-PS',   name: 'Personal Social',                       shortName: 'Personal Social',        applicableLevels: ['INITIAL'],                         isCustom: false, category: 'Áreas Inicial' },
  { officialCode: 'INI-PSI',  name: 'Psicomotriz',                           shortName: 'Psicomotriz',            applicableLevels: ['INITIAL'],                         isCustom: false, category: 'Áreas Inicial' },
  { officialCode: 'INI-COM',  name: 'Comunicación Integral',                 shortName: 'Comunicación',           applicableLevels: ['INITIAL'],                         isCustom: false, category: 'Áreas Inicial' },
  { officialCode: 'INI-CT',   name: 'Descubrimiento del Mundo / C. y T.',    shortName: 'Descubrimiento Mundo',   applicableLevels: ['INITIAL'],                         isCustom: false, category: 'Áreas Inicial' },

  // ── PRIMARIA — ÁREAS TRANSVERSALES ───────────────────────────────────────
  { officialCode: 'PRI-MAT',  name: 'Matemática',                            shortName: 'Matemática',             applicableLevels: ['PRIMARY'],                         isCustom: false, category: 'Matemática' },
  { officialCode: 'PRI-COM',  name: 'Comunicación',                          shortName: 'Comunicación',           applicableLevels: ['PRIMARY'],                         isCustom: false, category: 'Comunicación' },
  { officialCode: 'PRI-CYT',  name: 'Ciencia y Tecnología',                  shortName: 'Ciencia y Tec.',         applicableLevels: ['PRIMARY'],                         isCustom: false, category: 'Ciencias' },
  { officialCode: 'PRI-PS',   name: 'Personal Social',                       shortName: 'Personal Social',        applicableLevels: ['PRIMARY'],                         isCustom: false, category: 'Social' },
  { officialCode: 'PRI-AYC',  name: 'Arte y Cultura',                        shortName: 'Arte y Cultura',         applicableLevels: ['PRIMARY'],                         isCustom: false, category: 'Arte' },
  { officialCode: 'PRI-EF',   name: 'Educación Física',                      shortName: 'Ed. Física',             applicableLevels: ['PRIMARY'],                         isCustom: false, category: 'Deportes' },
  { officialCode: 'PRI-ER',   name: 'Educación Religiosa',                   shortName: 'Ed. Religiosa',          applicableLevels: ['PRIMARY'],                         isCustom: false, category: 'Religión' },
  { officialCode: 'PRI-ING',  name: 'Inglés como Lengua Extranjera',         shortName: 'Inglés',                 applicableLevels: ['PRIMARY'],                         isCustom: false, category: 'Idiomas' },

  // ── SECUNDARIA — MATEMÁTICA ───────────────────────────────────────────────
  { officialCode: 'MAT-ALG',  name: 'Matemática - Álgebra',                  shortName: 'Álgebra',                applicableLevels: ['SECONDARY'],                       isCustom: false, category: 'Matemática' },
  { officialCode: 'MAT-GEO',  name: 'Matemática - Geometría',                shortName: 'Geometría',              applicableLevels: ['SECONDARY'],                       isCustom: false, category: 'Matemática' },
  { officialCode: 'MAT-ARI',  name: 'Matemática - Aritmética',               shortName: 'Aritmética',             applicableLevels: ['SECONDARY'],                       isCustom: false, category: 'Matemática' },
  { officialCode: 'MAT-TRI',  name: 'Matemática - Trigonometría',            shortName: 'Trigonometría',          applicableLevels: ['SECONDARY'],                       isCustom: false, category: 'Matemática' },

  // ── SECUNDARIA — COMUNICACIÓN ─────────────────────────────────────────────
  { officialCode: 'COM-LIT',  name: 'Comunicación - Literatura',             shortName: 'Literatura',             applicableLevels: ['SECONDARY'],                       isCustom: false, category: 'Comunicación' },
  { officialCode: 'COM-LEN',  name: 'Comunicación - Lenguaje y Gramática',   shortName: 'Lenguaje',               applicableLevels: ['SECONDARY'],                       isCustom: false, category: 'Comunicación' },

  // ── SECUNDARIA — RAZONAMIENTO (Particulares Perú) ─────────────────────────
  { officialCode: 'RAZ-MAT',  name: 'Razonamiento Matemático',               shortName: 'Raz. Matemático',        applicableLevels: ['PRIMARY', 'SECONDARY'],            isCustom: false, category: 'Razonamiento' },
  { officialCode: 'RAZ-VER',  name: 'Razonamiento Verbal',                   shortName: 'Raz. Verbal',            applicableLevels: ['PRIMARY', 'SECONDARY'],            isCustom: false, category: 'Razonamiento' },

  // ── SECUNDARIA — CIENCIAS SOCIALES ────────────────────────────────────────
  { officialCode: 'DPCC-SEC', name: 'Desarrollo Personal, Ciudadanía y C.',  shortName: 'DPCC',                   applicableLevels: ['SECONDARY'],                       isCustom: false, category: 'Ciencias Sociales' },
  { officialCode: 'CCSS-HP',  name: 'Historia del Perú',                     shortName: 'Historia Perú',          applicableLevels: ['SECONDARY'],                       isCustom: false, category: 'Ciencias Sociales' },
  { officialCode: 'CCSS-HU',  name: 'Historia Universal',                    shortName: 'Historia Universal',     applicableLevels: ['SECONDARY'],                       isCustom: false, category: 'Ciencias Sociales' },
  { officialCode: 'CCSS-GEO', name: 'Geografía',                             shortName: 'Geografía',              applicableLevels: ['SECONDARY'],                       isCustom: false, category: 'Ciencias Sociales' },

  // ── SECUNDARIA — CIENCIAS ─────────────────────────────────────────────────
  { officialCode: 'CT-BIO',   name: 'Ciencia y Tecnología - Biología',       shortName: 'Biología',               applicableLevels: ['SECONDARY'],                       isCustom: false, category: 'Ciencias' },
  { officialCode: 'CT-QUI',   name: 'Ciencia y Tecnología - Química',        shortName: 'Química',                applicableLevels: ['SECONDARY'],                       isCustom: false, category: 'Ciencias' },
  { officialCode: 'CT-FIS',   name: 'Ciencia y Tecnología - Física',         shortName: 'Física',                 applicableLevels: ['SECONDARY'],                       isCustom: false, category: 'Ciencias' },

  // ── SECUNDARIA — OTRAS ÁREAS ──────────────────────────────────────────────
  { officialCode: 'ING-SEC',  name: 'Inglés como Lengua Extranjera',         shortName: 'Inglés',                 applicableLevels: ['SECONDARY'],                       isCustom: false, category: 'Idiomas' },
  { officialCode: 'EPT-COM',  name: 'EPT - Computación / TIC',               shortName: 'Computación / TIC',      applicableLevels: ['PRIMARY', 'SECONDARY'],            isCustom: false, category: 'EPT / Tecnología' },
  { officialCode: 'EPT-EMP',  name: 'EPT - Emprendimiento y Finanzas',       shortName: 'Emprendimiento',         applicableLevels: ['SECONDARY'],                       isCustom: false, category: 'EPT / Tecnología' },
  { officialCode: 'AYC-SEC',  name: 'Arte y Cultura',                        shortName: 'Arte y Cultura',         applicableLevels: ['SECONDARY'],                       isCustom: false, category: 'Arte' },
  { officialCode: 'EF-SEC',   name: 'Educación Física',                      shortName: 'Ed. Física',             applicableLevels: ['SECONDARY'],                       isCustom: false, category: 'Deportes' },
  { officialCode: 'ER-SEC',   name: 'Educación Religiosa',                   shortName: 'Ed. Religiosa',          applicableLevels: ['SECONDARY'],                       isCustom: false, category: 'Religión' },
  { officialCode: 'TOE-SEC',  name: 'Tutoría y Orientación Educativa (TOE)', shortName: 'TOE',                    applicableLevels: ['SECONDARY'],                       isCustom: false, category: 'Tutoría' },

  // ── PERSONALIZADO / TALLER ────────────────────────────────────────────────
  { officialCode: 'CUSTOM', name: 'Taller / Curso Personalizado', shortName: 'Personalizado', applicableLevels: ['INITIAL', 'PRIMARY', 'SECONDARY'], isCustom: true, category: 'Personalizado' },
];

/** Obtiene los grados filtrados por nivel educativo */
export function getGradesByLevel(level: EducationLevel): GradeCatalogEntry[] {
  return GRADE_CATALOG.filter((g) => g.level === level);
}

/** Obtiene los cursos filtrados por nivel educativo, agrupados por categoría */
export function getCoursesByLevel(level: EducationLevel): CourseEntry[] {
  return COURSE_CATALOG.filter((c) => c.applicableLevels.includes(level));
}

/** Obtiene todas las categorías únicas para un nivel dado */
export function getCourseCategories(level: EducationLevel): string[] {
  const courses = getCoursesByLevel(level);
  return [...new Set(courses.map((c) => c.category))];
}
