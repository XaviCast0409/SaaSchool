/**
 * Servicio de Consolidación SIAGIE de Dos Capas (CNEB - MINEDU RVM N° 094-2020)
 * 
 * Permite que los colegios privados asignen múltiples cursos internos con docentes distintos
 * (ej: Aritmética, Álgebra, Geometría, Trigonometría, Física, Química, Biología, etc.)
 * y consolida automáticamente las notas y conclusiones hacia las Áreas y Competencias Oficiales
 * requeridas por el SIAGIE (Matemática, Ciencia y Tecnología, Comunicación, Ciencias Sociales, etc.).
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
    code: 'AC',
    name: 'Arte y Cultura',
    aliases: ['arte y cultura', 'arte', 'ayc', 'ac', '04_ac'],
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
    code: 'ER',
    name: 'Educación Religiosa',
    aliases: ['educacion religiosa', 'educación religiosa', 'religion', 'religión', 'er', '08_er'],
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
];

/**
 * Normaliza texto para comparaciones flexibles
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
 * Convierte un puntaje numérico (00-20) a la escala literal oficial CNEB
 */
export function scoreToLetter(score: number | null): 'AD' | 'A' | 'B' | 'C' | null {
  if (score === null || isNaN(score)) return null;
  if (score >= 17.5) return 'AD';
  if (score >= 13.5) return 'A';
  if (score >= 10.5) return 'B';
  return 'C';
}

export interface InternalCourseInfo {
  assignmentId: string;
  name: string;
  officialCode?: string | null;
  parentAreaId?: string | null;
  teacherName: string;
  competences: Array<{ id: string; name: string }>;
}

export interface InternalStudentGradeData {
  enrollmentId: string;
  enrollmentState?: 'REGISTERED' | 'TRANSFERRED' | 'WITHDRAWN';
  orderIndex: number;
  documentId: string;
  studentCode: string | null;
  fullName: string;
  courseGrades: Record<
    string,
    {
      periodScore: number | null;
      letter: 'AD' | 'A' | 'B' | 'C' | null;
      competences: Record<
        string,
        { score: number | null; letter: 'AD' | 'A' | 'B' | 'C' | null; conclusion?: string }
      >;
    }
  >;
}

export interface ConsolidatedAreaCompetence {
  id: string; // Ej: "MAT_C1"
  number: number;
  name: string;
  shortName: string;
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
  letter: 'AD' | 'A' | 'B' | 'C' | null;
  competences: Record<
    string, // competence id (ej: "MAT_C1")
    {
      score: number | null;
      letter: 'AD' | 'A' | 'B' | 'C' | null;
      conclusion: string;
    }
  >;
}

export class SiagieConsolidatorService {
  /**
   * Identifica a qué Área Madre Oficial de SIAGIE pertenece un curso interno
   */
  static identifyMotherArea(
    course: InternalCourseInfo,
    motherAreas: OfficialAreaSpec[] = MINEDU_MOTHER_AREAS,
  ): OfficialAreaSpec | null {
    const normName = normalizeText(course.name);
    const normCode = normalizeText(course.officialCode || '');

    // 1. Coincidencia directa con alias de Áreas Madre
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

    // 2. Coincidencia por palabras clave de cursos tributarios en sus competencias
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
   * Determina a qué competencia oficial de la Madre tributa una competencia interna
   */
  static mapToOfficialCompetence(
    course: InternalCourseInfo,
    internalCompName: string,
    mother: OfficialAreaSpec,
  ): OfficialCompetenceSpec | null {
    const normCompName = normalizeText(internalCompName);
    const normCourseName = normalizeText(course.name);

    // 1. Si la competencia interna coincide con el nombre de la oficial
    for (const offComp of mother.competences) {
      const normOff = normalizeText(offComp.name);
      if (normCompName === normOff || normCompName.includes(normOff) || normOff.includes(normCompName)) {
        return offComp;
      }
    }

    // 2. Si el curso es de Ciencia y Tecnología (Física, Química, Biología):
    // Cada curso evalúa transversalmente las 3 competencias según CNEB
    if (mother.code === 'CYT') {
      if (normCompName.includes('indaga') || normCompName.includes('metodo') || normCompName.includes('laboratorio')) {
        return mother.competences[0];
      }
      if (normCompName.includes('explica') || normCompName.includes('mundo') || normCompName.includes('materia') || normCompName.includes('seres')) {
        return mother.competences[1];
      }
      if (normCompName.includes('disena') || normCompName.includes('diseña') || normCompName.includes('tecnolog') || normCompName.includes('solucion')) {
        return mother.competences[2];
      }
      // Por defecto si no coincide texto exacto, asignar por orden relativo
      return mother.competences[0];
    }

    // 3. Mapeo Directo por Especialidad del Curso
    for (const offComp of mother.competences) {
      if (offComp.tributaryKeywords.some((kw) => normCourseName.includes(kw) || normCompName.includes(kw))) {
        return offComp;
      }
    }

    // 4. Fallback: primera competencia de la madre
    return mother.competences[0] || null;
  }

  /**
   * Ejecuta la consolidación integral de las notas de un aula hacia las Áreas Oficiales SIAGIE
   */
  static consolidateClassroom(
    courses: InternalCourseInfo[],
    students: InternalStudentGradeData[],
  ): {
    consolidatedAreas: ConsolidatedArea[];
    consolidatedStudents: Array<
      InternalStudentGradeData & {
        consolidatedGrades: Record<string, ConsolidatedStudentGrade>;
      }
    >;
  } {
    // 1. Agrupar cursos por Área Madre Oficial
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
      const isSubdivided = groupCourses.length > 1 || groupCourses[0]?.name.toLowerCase() !== mother.name.toLowerCase();

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
        })),
      });
    });

    // Registrar cursos independientes no mapeados como sus propias áreas
    unmappedCourses.forEach((c) => {
      consolidatedAreas.push({
        id: c.assignmentId,
        code: c.officialCode || 'CUSTOM',
        name: c.name,
        isSubdivided: false,
        tributaryCourses: [c.name],
        competences: c.competences
          .filter((comp) => (comp as any).isActive !== false)
          .map((comp, idx) => ({
          id: comp.id,
          number: idx + 1,
          name: comp.name,
          shortName: `C${idx + 1}`,
        })),
      });
    });

    // 2. Consolidar notas de cada estudiante
    const consolidatedStudents = students.map((st) => {
      const isInactive = st.enrollmentState === 'WITHDRAWN' || st.enrollmentState === 'TRANSFERRED';
      const consolidatedGrades: Record<string, ConsolidatedStudentGrade> = {};

      // Consolidar Áreas Madres
      motherGroups.forEach(({ mother, courses: groupCourses }) => {
        const areaCompGrades: Record<
          string,
          { score: number | null; letter: 'AD' | 'A' | 'B' | 'C' | null; conclusion: string }
        > = {};
        const validCompScores: number[] = [];

        mother.competences.forEach((offComp) => {
          const compKey = `${mother.code}_C${offComp.number}`;

          if (isInactive) {
            areaCompGrades[compKey] = { score: null, letter: null, conclusion: '' };
            return;
          }

          // Recolectar todas las notas numéricas que los cursos tributarios aportaron a esta competencia
          const contributingScores: number[] = [];
          const contributingConclusions: string[] = [];

          groupCourses.forEach((course) => {
            const courseData = st.courseGrades[course.assignmentId];
            if (!courseData) return;

            course.competences.forEach((intComp) => {
              if ((intComp as any).isActive === false) return;
              const matchedOffComp = this.mapToOfficialCompetence(course, intComp.name, mother);

              // Si esta competencia interna tributa a la competencia oficial actual
              if (matchedOffComp && matchedOffComp.number === offComp.number) {
                const gradeInfo = courseData.competences[intComp.id];
                if (gradeInfo && gradeInfo.score !== null && !isNaN(gradeInfo.score)) {
                  contributingScores.push(gradeInfo.score);
                }
                if (gradeInfo?.conclusion && gradeInfo.conclusion.trim()) {
                  contributingConclusions.push(gradeInfo.conclusion.trim());
                }
              }
            });
          });

          if (contributingScores.length > 0) {
            // Promedio aritmético oficial entre los cursos tributarios
            const avg =
              Math.round(
                (contributingScores.reduce((acc, val) => acc + val, 0) / contributingScores.length) * 10,
              ) / 10;
            const letter = scoreToLetter(avg);

            // Conclusión descriptiva: usar la del docente responsable o sugerencia pedagógica si es 'C'
            let finalConclusion = contributingConclusions[0] || '';
            if (letter === 'C' && !finalConclusion) {
              finalConclusion = `El estudiante requiere acompañamiento continuo y refuerzo en la competencia "${offComp.name}".`;
            }

            areaCompGrades[compKey] = {
              score: avg,
              letter,
              conclusion: finalConclusion,
            };
            validCompScores.push(avg);
          } else {
            // Competencia no trabajada o sin calificaciones en los cursos tributarios
            areaCompGrades[compKey] = {
              score: null,
              letter: null,
              conclusion: '',
            };
          }
        });

        // Promedio general del Área Madre
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

      // Consolidar cursos independientes no mapeados
      unmappedCourses.forEach((c) => {
        const courseData = st.courseGrades[c.assignmentId];
        const areaCompGrades: Record<
          string,
          { score: number | null; letter: 'AD' | 'A' | 'B' | 'C' | null; conclusion: string }
        > = {};

        if (courseData) {
          c.competences.forEach((comp) => {
            if ((comp as any).isActive === false) return;
            const g = courseData.competences[comp.id];
            areaCompGrades[comp.id] = {
              score: g?.score ?? null,
              letter: g?.letter ?? null,
              conclusion: g?.conclusion ?? '',
            };
          });
        }

        consolidatedGrades[c.assignmentId] = {
          periodScore: courseData?.periodScore ?? null,
          letter: courseData?.letter ?? null,
          competences: areaCompGrades,
        };
      });

      return {
        ...st,
        consolidatedGrades,
      };
    });

    return {
      consolidatedAreas,
      consolidatedStudents,
    };
  }
}
