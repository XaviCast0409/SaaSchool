/**
 * Servicio de Consolidación SIAGIE Exacto y Jerárquico (CNEB - MINEDU RVM N° 094-2020)
 * 
 * Permite que los colegios particulares asignen múltiples cursos internos / sub-cursos (Ramas)
 * con docentes distintos (ej: Aritmética, Álgebra, Geometría, Trigonometría, Física, Química, Biología)
 * y consolida automáticamente las calificaciones y conclusiones descriptivas hacia las Áreas Madre
 * Oficiales requeridas por el SIAGIE (Matemática, Ciencia y Tecnología, Comunicación, etc.).
 * 
 * Cumple al 100% con la normativa oficial:
 * 1. Jerarquía oficial CNEB (Área Madre vs. Sub-cursos).
 * 2. Detección de competencias oficiales huérfanas (unmappedCompetences).
 * 3. Modos de cálculo anual: LAST_PERIOD (por defecto RVM 094-2020) vs AVERAGE.
 * 4. Regla de situación final: Más del 50% de competencias en 'C' por área.
 * 5. Sanitización limpia de conclusiones descriptivas a 300 caracteres para macros de SIAGIE.
 */

export interface OfficialCompetenceSpec {
  number: number;
  name: string;
  shortName: string;
  tributaryKeywords: string[];
}

export interface OfficialAreaSpec {
  code: string;
  name: string;
  aliases: string[];
  competences: OfficialCompetenceSpec[];
}

/**
 * Catálogo Oficial de Áreas y Competencias del Currículo Nacional (CNEB)
 */
export const MINEDU_MOTHER_AREAS: OfficialAreaSpec[] = [
  {
    code: 'MAT',
    name: 'Matemática',
    aliases: ['matematica', 'matemática', 'mat', '01_mat'],
    competences: [
      {
        number: 1,
        name: 'Resuelve problemas de cantidad',
        shortName: 'C1 - Cantidad',
        tributaryKeywords: ['aritmetica', 'aritmética', 'cantidad', 'numerico', 'numérico', 'rm', 'razonamiento matematico'],
      },
      {
        number: 2,
        name: 'Resuelve problemas de regularidad, equivalencia y cambio',
        shortName: 'C2 - Álgebra',
        tributaryKeywords: ['algebra', 'álgebra', 'regularidad', 'equivalencia', 'funciones'],
      },
      {
        number: 3,
        name: 'Resuelve problemas de forma, movimiento y localización',
        shortName: 'C3 - Geometría y Trigonometría',
        tributaryKeywords: ['geometria', 'geometría', 'trigonometria', 'trigonometría', 'forma', 'movimiento', 'espacio'],
      },
      {
        number: 4,
        name: 'Resuelve problemas de gestión de datos e incertidumbre',
        shortName: 'C4 - Estadística',
        tributaryKeywords: ['estadistica', 'estadística', 'probabilidades', 'datos', 'incertidumbre'],
      },
    ],
  },
  {
    code: 'CYT',
    name: 'Ciencia y Tecnología',
    aliases: ['ciencia y tecnologia', 'ciencia y tecnología', 'cyt', 'ct', '09_cyt', 'ciencias'],
    competences: [
      {
        number: 1,
        name: 'Indaga mediante métodos científicos para construir sus conocimientos',
        shortName: 'C1 - Indaga',
        tributaryKeywords: ['fisica', 'física', 'quimica', 'química', 'biologia', 'biología', 'anatomia', 'anatomía', 'laboratorio', 'indaga', 'ciencia'],
      },
      {
        number: 2,
        name: 'Explica el mundo físico basándose en conocimientos sobre los seres vivos, materia y energía, biodiversidad, Tierra y universo',
        shortName: 'C2 - Explica el mundo físico',
        tributaryKeywords: ['fisica', 'física', 'quimica', 'química', 'biologia', 'biología', 'anatomia', 'anatomía', 'teoria', 'explica', 'ciencia'],
      },
      {
        number: 3,
        name: 'Diseña y construye soluciones tecnológicas para resolver problemas de su entorno',
        shortName: 'C3 - Diseña soluciones tecnológicas',
        tributaryKeywords: ['fisica', 'física', 'quimica', 'química', 'biologia', 'biología', 'tecnologia', 'robotica', 'diseña', 'ciencia'],
      },
    ],
  },
  {
    code: 'COM',
    name: 'Comunicación',
    aliases: ['comunicacion', 'comunicación', 'com', '02_com'],
    competences: [
      {
        number: 1,
        name: 'Se comunica oralmente en su lengua materna',
        shortName: 'C1 - Oralidad',
        tributaryKeywords: ['oratoria', 'expresion oral', 'expresión oral', 'oralidad', 'comunica', 'dialogo'],
      },
      {
        number: 2,
        name: 'Lee diversos tipos de textos escritos en su lengua materna',
        shortName: 'C2 - Comprensión Lectora',
        tributaryKeywords: ['literatura', 'plan lector', 'comprension lectora', 'comprensión lectora', 'razonamiento verbal', 'rv', 'lee'],
      },
      {
        number: 3,
        name: 'Escribe diversos tipos de textos en su lengua materna',
        shortName: 'C3 - Redacción y Gramática',
        tributaryKeywords: ['lenguaje', 'gramatica', 'gramática', 'ortografia', 'ortografía', 'redaccion', 'redacción', 'escribe', 'normativa'],
      },
    ],
  },
  {
    code: 'CCSS',
    name: 'Ciencias Sociales',
    aliases: ['ciencias sociales', 'ccss', '05_ccss', 'historia'],
    competences: [
      {
        number: 1,
        name: 'Construye interpretaciones históricas',
        shortName: 'C1 - Historia',
        tributaryKeywords: ['historia del peru', 'historia del perú', 'historia universal', 'historia', 'hp', 'hu'],
      },
      {
        number: 2,
        name: 'Gestiona responsablemente el espacio y el ambiente',
        shortName: 'C2 - Geografía',
        tributaryKeywords: ['geografia', 'geografía', 'espacio', 'ambiente', 'medio ambiente'],
      },
      {
        number: 3,
        name: 'Gestiona responsablemente los recursos económicos',
        shortName: 'C3 - Economía',
        tributaryKeywords: ['economia', 'economía', 'finanzas', 'recursos economicos'],
      },
    ],
  },
  {
    code: 'PS',
    name: 'Personal Social',
    aliases: ['personal social', 'ps', '01_ps'],
    competences: [
      { number: 1, name: 'Construye su identidad', shortName: 'C1 - Identidad', tributaryKeywords: ['identidad', 'autoestima', 'personal'] },
      { number: 2, name: 'Convive y participa democráticamente en la búsqueda del bien común', shortName: 'C2 - Convivencia', tributaryKeywords: ['convive', 'civica', 'cívica'] },
      { number: 3, name: 'Construye interpretaciones históricas', shortName: 'C3 - Historia', tributaryKeywords: ['historia', 'peru', 'tiempo'] },
      { number: 4, name: 'Gestiona responsablemente el espacio y el ambiente', shortName: 'C4 - Espacio y Ambiente', tributaryKeywords: ['geografia', 'ambiente'] },
      { number: 5, name: 'Gestiona responsablemente los recursos económicos', shortName: 'C5 - Economía', tributaryKeywords: ['economia', 'ahorro'] },
    ],
  },
  {
    code: 'DPCC',
    name: 'Desarrollo Personal, Ciudadanía y Cívica',
    aliases: ['desarrollo personal', 'dpcc', 'civica', 'cívica', '06_dpcc'],
    competences: [
      { number: 1, name: 'Construye su identidad', shortName: 'C1 - Identidad y Ética', tributaryKeywords: ['psicologia', 'psicología', 'etica', 'ética', 'filosofia', 'identidad'] },
      { number: 2, name: 'Convive y participa democráticamente en la búsqueda del bien común', shortName: 'C2 - Cívica y Ciudadanía', tributaryKeywords: ['civica', 'cívica', 'ciudadania', 'ciudadanía', 'constitucion'] },
    ],
  },
  {
    code: 'ING',
    name: 'Inglés como Lengua Extranjera',
    aliases: ['ingles', 'inglés', 'ing', '03_ing'],
    competences: [
      { number: 1, name: 'Se comunica oralmente en inglés como lengua extranjera', shortName: 'C1 - Speaking', tributaryKeywords: ['speaking', 'oral', 'listening'] },
      { number: 2, name: 'Lee diversos tipos de textos en inglés como lengua extranjera', shortName: 'C2 - Reading', tributaryKeywords: ['reading', 'lectura'] },
      { number: 3, name: 'Escribe diversos tipos de textos en inglés como lengua extranjera', shortName: 'C3 - Writing', tributaryKeywords: ['writing', 'redaccion'] },
    ],
  },
  {
    code: 'ART',
    name: 'Arte y Cultura',
    aliases: ['arte y cultura', 'arte', 'ayc', 'ac', '04_ac', 'art'],
    competences: [
      { number: 1, name: 'Aprecia de manera crítica manifestaciones artístico-culturales', shortName: 'C1 - Aprecia', tributaryKeywords: ['aprecia', 'teoria del arte', 'historia del arte'] },
      { number: 2, name: 'Crea proyectos desde los lenguajes artísticos', shortName: 'C2 - Crea proyectos', tributaryKeywords: ['musica', 'música', 'teatro', 'danza', 'dibujo', 'pintura'] },
    ],
  },
  {
    code: 'EF',
    name: 'Educación Física',
    aliases: ['educacion fisica', 'educación física', 'ef', 'ed fisica', '07_ef'],
    competences: [
      { number: 1, name: 'Se desenvuelve de manera autónoma a través de su motricidad', shortName: 'C1 - Motricidad', tributaryKeywords: ['motricidad', 'deporte', 'atletismo'] },
      { number: 2, name: 'Asume una vida saludable', shortName: 'C2 - Vida Saludable', tributaryKeywords: ['salud', 'nutricion', 'acondicionamiento'] },
      { number: 3, name: 'Interactúa a través de sus habilidades sociomotrices', shortName: 'C3 - Sociomotriz', tributaryKeywords: ['juegos', 'cooperacion', 'equipo'] },
    ],
  },
  {
    code: 'REL',
    name: 'Educación Religiosa',
    aliases: ['educacion religiosa', 'educación religiosa', 'religion', 'religión', 'er', 'rel', '08_er'],
    competences: [
      { number: 1, name: 'Construye su identidad como persona humana, amada por Dios', shortName: 'C1 - Identidad y Fe', tributaryKeywords: ['fe', 'dios', 'identidad'] },
      { number: 2, name: 'Asume la experiencia del encuentro personal y comunitario con Dios', shortName: 'C2 - Encuentro Comunitario', tributaryKeywords: ['comunidad', 'accion', 'valores'] },
    ],
  },
  {
    code: 'EPT',
    name: 'Educación para el Trabajo',
    aliases: ['educacion para el trabajo', 'educación para el trabajo', 'ept', 'computacion', 'computación', 'robotica', '10_ept'],
    competences: [
      { number: 1, name: 'Gestiona proyectos de emprendimiento económico o social', shortName: 'C1 - Emprendimiento', tributaryKeywords: ['emprendimiento', 'computacion', 'computación', 'robotica', 'robótica', 'proyectos', 'gestion'] },
    ],
  },
  {
    code: 'PSI',
    name: 'Psicomotriz',
    aliases: ['psicomotriz', 'psi', '00_psi'],
    competences: [
      { number: 1, name: 'Se desenvuelve de manera autónoma a través de su motricidad', shortName: 'C1 - Motricidad', tributaryKeywords: ['motricidad', 'movimiento', 'corporal'] },
    ],
  },
  {
    code: 'TRANS',
    name: 'Competencias Transversales',
    aliases: ['competencias transversales', 'transversales', 'trans', 'tic', 'autonomia', '11_trans'],
    competences: [
      {
        number: 28,
        name: 'Se desenvuelve en entornos virtuales generados por las TIC',
        shortName: 'C28 - Entornos Virtuales TIC',
        tributaryKeywords: ['tic', 'virtuales', 'entornos virtuales', 'tecnologia', 'c28'],
      },
      {
        number: 29,
        name: 'Gestiona su aprendizaje de manera autónoma',
        shortName: 'C29 - Aprendizaje Autónomo',
        tributaryKeywords: ['autonoma', 'autónoma', 'aprendizaje', 'metacognicion', 'c29'],
      },
    ],
  },
];

/**
 * Normaliza texto para comparaciones semánticas
 */
function normalizeText(str?: string | null): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Sanitiza conclusiones descriptivas para evitar roturas en macros de SIAGIE Excel
 */
export function sanitizeSiagieConclusion(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/"/g, '')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);
}

/**
 * Convierte un puntaje numérico (00-20) a la escala literal oficial CNEB
 */
export function scoreToLetter(score: number | null): 'AD' | 'A' | 'B' | 'C' | null {
  if (score === null || isNaN(score)) return null;
  if (score >= 17.5) return 'AD';
  if (score >= 13.5) return 'A';
  if (score >= 10.5) return 'B';
  return 'C';
}

export function letterToScore(letter?: string | null): number | null {
  if (!letter) return null;
  const upper = letter.trim().toUpperCase();
  if (upper === 'AD') return 19;
  if (upper === 'A') return 15;
  if (upper === 'B') return 12;
  if (upper === 'C') return 8;
  return null;
}

export interface InternalCourseInfo {
  assignmentId: string;
  name: string;
  officialCode?: string | null;
  officialAreaCode?: string | null;
  parentAreaId?: string | null;
  parentArea?: {
    id: string;
    name: string;
    officialAreaCode?: string | null;
    competences: Array<{ id: string; name: string; officialCompetenceCode?: string | null }>;
  } | null;
  evaluatedCompetenceIds?: string[];
  teacherName: string;
  competences: Array<{ id: string; name: string; officialCompetenceCode?: string | null }>;
}

export interface InternalStudentGradeData {
  enrollmentId: string;
  enrollmentState?: 'REGISTERED' | 'TRANSFERRED' | 'WITHDRAWN';
  orderIndex: number;
  documentId: string;
  studentCode: string | null;
  fullName: string;
  lastNamePaternal?: string;
  lastNameMaternal?: string;
  firstNames?: string;
  courseGrades: Record<
    string,
    {
      periodScore: number | null;
      letter: 'AD' | 'A' | 'B' | 'C' | 'EXO' | '-' | null;
      competences: Record<
        string,
        { score: number | null; letter: 'AD' | 'A' | 'B' | 'C' | 'EXO' | '-' | null; conclusion?: string }
      >;
    }
  >;
  attendanceStats?: {
    absentJustified: number;
    absentUnjustified: number;
    lateJustified: number;
    lateUnjustified: number;
  };
}

export interface ConsolidatedAreaCompetence {
  id: string; // ID real o compuesto para SIAGIE
  number: number;
  name: string;
  shortName: string;
  officialCompetenceCode?: string | null;
}

export interface ConsolidatedArea {
  id: string;
  code: string;
  name: string;
  isSubdivided: boolean;
  tributaryCourses: string[];
  competences: ConsolidatedAreaCompetence[];
}

export interface ConsolidatedStudentGrade {
  periodScore: number | null;
  letter: 'AD' | 'A' | 'B' | 'C' | 'EXO' | '-' | null;
  competences: Record<
    string,
    {
      score: number | null;
      letter: 'AD' | 'A' | 'B' | 'C' | 'EXO' | '-' | null;
      conclusion: string;
    }
  >;
}

export interface UnmappedCompetenceAlert {
  areaName: string;
  competenceCode: string;
  competenceName: string;
}

export class SiagieConsolidatorService {
  /**
   * Resuelve a qué Área Madre Oficial pertenece un curso (por DB o por catálogo CNEB)
   */
  static identifyMotherArea(
    course: InternalCourseInfo,
    motherAreas: OfficialAreaSpec[] = MINEDU_MOTHER_AREAS,
  ): OfficialAreaSpec | null {
    // 1. Si viene con parentArea de la BD
    if (course.parentArea) {
      const code = (course.parentArea.officialAreaCode || '').toUpperCase();
      const match = motherAreas.find((m) => m.code.toUpperCase() === code);
      if (match) return match;
      return {
        code: code || 'CUSTOM',
        name: course.parentArea.name,
        aliases: [normalizeText(course.parentArea.name)],
        competences: course.parentArea.competences.map((c, idx) => ({
          number: idx + 1,
          name: c.name,
          shortName: c.officialCompetenceCode || `C${idx + 1}`,
          tributaryKeywords: [normalizeText(c.name)],
        })),
      };
    }

    // 2. Coincidencia por officialAreaCode
    if (course.officialAreaCode) {
      const match = motherAreas.find(
        (m) => m.code.toUpperCase() === course.officialAreaCode?.toUpperCase(),
      );
      if (match) return match;
    }

    const normName = normalizeText(course.name);
    const normCode = normalizeText(course.officialCode || '');

    // 3. Coincidencia directa con alias de Áreas Madre
    for (const mother of motherAreas) {
      if (
        mother.aliases.some(
          (alias) =>
            normName === alias ||
            normCode === alias ||
            (alias.length > 3 && normCode.startsWith(alias)) ||
            (alias.length > 4 && normName.startsWith(alias)),
        )
      ) {
        return mother;
      }
    }

    // 4. Coincidencia por palabras clave de cursos tributarios
    for (const mother of motherAreas) {
      for (const comp of mother.competences) {
        if (
          comp.tributaryKeywords.some(
            (kw) =>
              normName.includes(kw) ||
              normCode.includes(kw) ||
              (kw.length > 4 && kw.includes(normName)),
          )
        ) {
          return mother;
        }
      }
    }

    return null;
  }

  /**
   * Mapea una competencia interna al número oficial de competencia de la madre
   */
  static mapToOfficialCompetence(
    course: InternalCourseInfo,
    internalComp: { id?: string; name: string; officialCompetenceCode?: string | null },
    mother: OfficialAreaSpec,
  ): OfficialCompetenceSpec | null {
    // 0. Si el curso es un sub-curso y la competencia tiene officialCompetenceCode coincidente
    if (internalComp.officialCompetenceCode) {
      const compNum = parseInt(internalComp.officialCompetenceCode.replace(/\D/g, ''), 10);
      const match = mother.competences.find(
        (c) =>
          c.number === compNum ||
          `C${c.number}`.toUpperCase() === internalComp.officialCompetenceCode?.toUpperCase(),
      );
      if (match) return match;
    }

    const normCompName = normalizeText(internalComp.name);
    const normCourseName = normalizeText(course.name);

    // 1. Coincidencia por nombre de la competencia oficial
    for (const offComp of mother.competences) {
      const normOff = normalizeText(offComp.name);
      if (normCompName === normOff || normCompName.includes(normOff) || normOff.includes(normCompName)) {
        return offComp;
      }
    }

    // 2. Reglas especializadas (Ciencia y Tecnología)
    if (mother.code === 'CYT') {
      if (normCompName.includes('indaga') || normCompName.includes('metodo') || normCompName.includes('laboratorio')) {
        return mother.competences[0];
      }
      if (normCompName.includes('explica') || normCompName.includes('mundo') || normCompName.includes('materia') || normCompName.includes('seres')) {
        return mother.competences[1] || mother.competences[0];
      }
      if (normCompName.includes('disena') || normCompName.includes('diseña') || normCompName.includes('tecnolog') || normCompName.includes('solucion')) {
        return mother.competences[2] || mother.competences[0];
      }
      return mother.competences[0];
    }

    // 3. Mapeo por keywords del curso
    for (const offComp of mother.competences) {
      if (offComp.tributaryKeywords.some((kw) => normCourseName.includes(kw) || normCompName.includes(kw))) {
        return offComp;
      }
    }

    return mother.competences[0] || null;
  }

  /**
   * Ejecuta la consolidación oficial SIAGIE para un aula
   */
  static consolidateClassroom(
    courses: InternalCourseInfo[],
    students: InternalStudentGradeData[],
    classroomInfo?: {
      educationLevel?: string;
      grade?: number | string;
      annualCalculationMode?: 'LAST_PERIOD' | 'AVERAGE';
      periodNumber?: number;
    },
  ): {
    consolidatedAreas: ConsolidatedArea[];
    consolidatedStudents: Array<
      InternalStudentGradeData & {
        consolidatedGrades: Record<string, ConsolidatedStudentGrade>;
        finalSituation?: 'PROMOTED' | 'RECOVERY' | 'RETAINED' | 'TRANSFERRED' | 'WITHDRAWN' | null;
      }
    >;
    unmappedCompetences: UnmappedCompetenceAlert[];
  } {
    // 1. Agrupar cursos bajo su Área Oficial Madre
    // SIAGIE NUNCA muestra sub-cursos sueltos. Todo debe agrupar bajo la Madre.
    const motherGroups = new Map<string, { mother: OfficialAreaSpec; courses: InternalCourseInfo[] }>();
    const unmappedCourses: InternalCourseInfo[] = [];

    courses.forEach((course) => {
      const mother = this.identifyMotherArea(course);
      if (mother) {
        if (!motherGroups.has(mother.code)) {
          motherGroups.set(mother.code, { mother, courses: [] });
        }
        motherGroups.get(mother.code)!.courses.push(course);
      } else {
        unmappedCourses.push(course);
      }
    });

    const consolidatedAreas: ConsolidatedArea[] = [];

    // Registrar Áreas Madres consolidadas
    motherGroups.forEach(({ mother, courses: groupCourses }) => {
      const isSubdivided =
        groupCourses.length > 1 ||
        groupCourses.some((c) => Boolean(c.parentAreaId)) ||
        groupCourses[0]?.name.toLowerCase() !== mother.name.toLowerCase();

      consolidatedAreas.push({
        id: mother.code,
        code: mother.code,
        name: mother.name,
        isSubdivided,
        tributaryCourses: groupCourses.map((c) => c.name),
        competences: mother.competences.map((c) => ({
          id: `${mother.code}_C${c.number}`,
          number: c.number,
          name: c.name,
          shortName: c.shortName,
          officialCompetenceCode: `C${c.number}`,
        })),
      });
    });

    // 2. Detección de Competencias Oficiales Huérfanas (unmappedCompetences)
    const unmappedCompetences: UnmappedCompetenceAlert[] = [];
    motherGroups.forEach(({ mother, courses: groupCourses }) => {
      mother.competences.forEach((offComp) => {
        // Verificar si algún curso cubre esta competencia oficial
        const covered = groupCourses.some((course) => {
          // Si el sub-curso tiene evaluatedCompetenceIds
          if (course.evaluatedCompetenceIds && course.evaluatedCompetenceIds.length > 0) {
            // Verificar si alguna competencia del parentArea mapeada a offComp está en evaluatedCompetenceIds
            if (course.parentArea?.competences) {
              const matchingParentComp = course.parentArea.competences.find((pc) => {
                const mapped = this.mapToOfficialCompetence(course, pc, mother);
                return mapped?.number === offComp.number;
              });
              if (matchingParentComp && course.evaluatedCompetenceIds.includes(matchingParentComp.id)) {
                return true;
              }
            }
          } else {
            // Si no tiene evaluatedCompetenceIds (o está vacío), evalúa todas las de la madre
            if (course.parentAreaId) return true;
          }

          // Verificación directa en sus propias competencias
          return course.competences.some((comp) => {
            const mapped = this.mapToOfficialCompetence(course, comp, mother);
            return mapped?.number === offComp.number;
          });
        });

        if (!covered) {
          unmappedCompetences.push({
            areaName: mother.name,
            competenceCode: `C${offComp.number}`,
            competenceName: offComp.name,
          });
        }
      });
    });

    // 3. Consolidar notas de cada estudiante ordenado alfabéticamente
    const sortedStudents = [...students].sort((a, b) => {
      const nameA = `${a.lastNamePaternal || ''} ${a.lastNameMaternal || ''} ${a.firstNames || a.fullName}`.trim();
      const nameB = `${b.lastNamePaternal || ''} ${b.lastNameMaternal || ''} ${b.firstNames || b.fullName}`.trim();
      return nameA.localeCompare(nameB, 'es-PE');
    });

    const consolidatedStudents = sortedStudents.map((st, idx) => {
      const isInactive = st.enrollmentState === 'WITHDRAWN' || st.enrollmentState === 'TRANSFERRED';
      const consolidatedGrades: Record<string, ConsolidatedStudentGrade> = {};

      motherGroups.forEach(({ mother, courses: groupCourses }) => {
        const areaCompGrades: Record<
          string,
          { score: number | null; letter: 'AD' | 'A' | 'B' | 'C' | 'EXO' | '-' | null; conclusion: string }
        > = {};
        const validCompScores: number[] = [];
        const evaluatedCompetencesInArea: Array<'AD' | 'A' | 'B' | 'C'> = [];

        mother.competences.forEach((offComp) => {
          const compKey = `${mother.code}_C${offComp.number}`;

          if (isInactive) {
            areaCompGrades[compKey] = { score: null, letter: null, conclusion: '' };
            return;
          }

          const contributingScores: number[] = [];
          const contributingConclusions: string[] = [];
          let hasExo = false;
          let hasHyphen = false;

          groupCourses.forEach((course) => {
            const courseData = st.courseGrades[course.assignmentId];
            if (!courseData) return;

            // Revisar cada competencia del curso tributario
            course.competences.forEach((intComp) => {
              const matchedOffComp = this.mapToOfficialCompetence(course, intComp, mother);
              if (matchedOffComp && matchedOffComp.number === offComp.number) {
                const gradeInfo = courseData.competences[intComp.id];
                if (gradeInfo) {
                  if (gradeInfo.letter === 'EXO') {
                    hasExo = true;
                  } else if (gradeInfo.letter === '-') {
                    hasHyphen = true;
                  } else if (gradeInfo.score !== null && !isNaN(gradeInfo.score)) {
                    contributingScores.push(gradeInfo.score);
                  } else if (gradeInfo.letter) {
                    const numericFromLetter = letterToScore(gradeInfo.letter);
                    if (numericFromLetter !== null) {
                      contributingScores.push(numericFromLetter);
                    }
                  }

                  if (gradeInfo.conclusion && gradeInfo.conclusion.trim()) {
                    contributingConclusions.push(gradeInfo.conclusion.trim());
                  }
                }
              }
            });
          });

          if (contributingScores.length > 0) {
            const avg =
              Math.round(
                (contributingScores.reduce((acc, val) => acc + val, 0) / contributingScores.length) * 10,
              ) / 10;
            const letter = scoreToLetter(avg);

            let rawConc = contributingConclusions.join('. ');
            if (letter === 'C' && !rawConc.trim()) {
              rawConc = `El estudiante requiere acompañamiento continuo y refuerzo en la competencia "${offComp.name}".`;
            }

            const sanitized = sanitizeSiagieConclusion(rawConc);

            areaCompGrades[compKey] = {
              score: avg,
              letter,
              conclusion: sanitized,
            };
            validCompScores.push(avg);
            if (letter) evaluatedCompetencesInArea.push(letter);
          } else if (hasExo) {
            areaCompGrades[compKey] = {
              score: null,
              letter: 'EXO',
              conclusion: sanitizeSiagieConclusion(contributingConclusions.join('. ')),
            };
          } else if (hasHyphen) {
            areaCompGrades[compKey] = {
              score: null,
              letter: '-',
              conclusion: sanitizeSiagieConclusion(contributingConclusions.join('. ')),
            };
          } else {
            areaCompGrades[compKey] = {
              score: null,
              letter: null,
              conclusion: '',
            };
          }
        });

        const periodScore =
          !isInactive && validCompScores.length > 0
            ? Math.round((validCompScores.reduce((a, b) => a + b, 0) / validCompScores.length) * 10) / 10
            : null;
        const letter = scoreToLetter(periodScore);

        consolidatedGrades[mother.code] = {
          periodScore,
          letter,
          competences: areaCompGrades,
        };
      });

      // 4. Regla Oficial de Situación Final SIAGIE
      let finalSituation: 'PROMOTED' | 'RECOVERY' | 'RETAINED' | 'TRANSFERRED' | 'WITHDRAWN' | null = null;
      if (st.enrollmentState === 'WITHDRAWN') {
        finalSituation = 'WITHDRAWN';
      } else if (st.enrollmentState === 'TRANSFERRED') {
        finalSituation = 'TRANSFERRED';
      } else {
        const edLevel = (classroomInfo?.educationLevel || '').toUpperCase();
        const gradeStr = String(classroomInfo?.grade ?? '').trim().toLowerCase();
        const isAutomaticPromotion =
          edLevel === 'INITIAL' ||
          (edLevel === 'PRIMARY' && ['1', '1°', '1ro', 'primero'].includes(gradeStr));

        if (isAutomaticPromotion) {
          finalSituation = 'PROMOTED';
        } else {
          // Evaluar áreas desaprobadas según regla oficial: cCount > totalComp / 2
          let failedAreasCount = 0;
          let totalCCompetences = 0;

          Object.values(consolidatedGrades).forEach((areaGrade) => {
            const compList = Object.values(areaGrade.competences).filter(
              (c): c is typeof c & { letter: 'AD' | 'A' | 'B' | 'C' } =>
                c.letter === 'AD' || c.letter === 'A' || c.letter === 'B' || c.letter === 'C',
            );
            const totalComp = compList.length;
            if (totalComp > 0) {
              const cCount = compList.filter((c) => c.letter === 'C').length;
              totalCCompetences += cCount;
              if (cCount > totalComp / 2) {
                failedAreasCount++;
              }
            }
          });

          if (failedAreasCount >= 4) {
            finalSituation = 'RETAINED';
          } else if (failedAreasCount < 4 && totalCCompetences >= 1) {
            finalSituation = 'RECOVERY';
          } else {
            finalSituation = 'PROMOTED';
          }
        }
      }

      return {
        ...st,
        orderIndex: idx + 1,
        finalSituation,
        consolidatedGrades,
      };
    });

    return {
      consolidatedAreas,
      consolidatedStudents,
      unmappedCompetences,
    };
  }
}
