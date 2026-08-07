import { AppError } from '../../core/errors/app-error';
import type { CurricularAreaRepository, MineduSeedArea } from './curricular-area.repository';
import type {
  CreateCurricularAreaDto,
  UpdateCurricularAreaDto,
  CreateCompetenceDto,
} from './curricular-area.schema';
import type { CurricularArea, CurricularCompetence } from '@prisma/client';

export const MINEDU_OFFICIAL_CURRICULUM: MineduSeedArea[] = [
  // NIVEL INICIAL (3 A 5 AÑOS - UNIDOCENCIA / APRESTAMIENTO INTEGRAL)
  {
    name: 'Personal Social (Inicial)',
    officialCode: 'PS-INI',
    competences: [
      { name: 'Construye su identidad', description: 'Reconocimiento de emociones y autoestima' },
      { name: 'Convive y participa democráticamente', description: 'Normas de convivencia y respeto' },
    ],
  },
  {
    name: 'Psicomotriz (Inicial)',
    officialCode: 'PSI-INI',
    competences: [{ name: 'Se desenvuelve de manera autónoma a través de su motricidad' }],
  },
  {
    name: 'Comunicación Integral (Inicial)',
    officialCode: 'COM-INI',
    competences: [
      { name: 'Se comunica oralmente en su lengua materna' },
      { name: 'Crea proyectos desde los lenguajes artísticos' },
      { name: 'Lee diversos tipos de textos en su lengua materna' },
    ],
  },
  {
    name: 'Descubrimiento del Mundo / Ciencia y Tecnología (Inicial)',
    officialCode: 'CT-INI',
    competences: [
      { name: 'Indaga mediante métodos científicos para construir sus conocimientos' },
      { name: 'Resuelve problemas de cantidad y forma en su entorno' },
    ],
  },

  // NIVEL PRIMARIA (6 A 11 AÑOS - UNIDOCENCIA Y POLIDOCENCIA)
  {
    name: 'Matemática (Primaria)',
    officialCode: 'MAT-PRI',
    competences: [
      { name: 'Resuelve problemas de cantidad' },
      { name: 'Resuelve problemas de regularidad, equivalencia y cambio' },
      { name: 'Resuelve problemas de forma, movimiento y localización' },
      { name: 'Resuelve problemas de gestión de datos e incertidumbre' },
    ],
  },
  {
    name: 'Comunicación (Primaria)',
    officialCode: 'COM-PRI',
    competences: [
      { name: 'Se comunica oralmente en su lengua materna' },
      { name: 'Lee diversos tipos de textos escritos' },
      { name: 'Escribe diversos tipos de textos' },
    ],
  },
  {
    name: 'Ciencia y Tecnología (Primaria)',
    officialCode: 'CT-PRI',
    competences: [
      { name: 'Indaga mediante métodos científicos' },
      { name: 'Explica el mundo físico basándose en conocimientos científicos' },
      { name: 'Diseña y construye soluciones tecnológicas' },
    ],
  },
  {
    name: 'Personal Social (Primaria)',
    officialCode: 'PS-PRI',
    competences: [
      { name: 'Construye su identidad' },
      { name: 'Convive y participa democráticamente' },
      { name: 'Construye interpretaciones históricas' },
      { name: 'Gestiona responsablemente el espacio y el ambiente' },
      { name: 'Gestiona responsablemente los recursos económicos' },
    ],
  },
  {
    name: 'Arte y Cultura (Primaria)',
    officialCode: 'AC-PRI',
    competences: [
      { name: 'Aprecia de manera crítica manifestaciones artístico-culturales' },
      { name: 'Crea proyectos desde los lenguajes artísticos' },
    ],
  },
  {
    name: 'Educación Física (Primaria)',
    officialCode: 'EF-PRI',
    competences: [
      { name: 'Se desenvuelve de manera autónoma a través de su motricidad' },
      { name: 'Asume una vida saludable' },
      { name: 'Interactúa a través de sus habilidades sociomotrices' },
    ],
  },
  {
    name: 'Educación Religiosa (Primaria)',
    officialCode: 'ER-PRI',
    competences: [
      { name: 'Construye su identidad como persona humana, amada por Dios' },
      { name: 'Asume la experiencia del encuentro personal y comunitario con Dios' },
    ],
  },
  {
    name: 'Inglés como Lengua Extranjera (Primaria)',
    officialCode: 'ING-PRI',
    competences: [
      { name: 'Se comunica oralmente en inglés como lengua extranjera' },
      { name: 'Lee diversos tipos de textos escritos en inglés' },
      { name: 'Escribe diversos tipos de textos en inglés' },
    ],
  },

  // NIVEL SECUNDARIA (12 A 17 AÑOS - POLIDOCENCIA / ASIGNATURAS ESPECIALIZADAS)
  {
    name: 'Matemática - Álgebra',
    officialCode: 'MAT-ALG',
    competences: [{ name: 'Resuelve problemas de regularidad, equivalencia y cambio (Álgebra)' }],
  },
  {
    name: 'Matemática - Geometría',
    officialCode: 'MAT-GEO',
    competences: [{ name: 'Resuelve problemas de forma, movimiento y localización (Geometría)' }],
  },
  {
    name: 'Matemática - Aritmética',
    officialCode: 'MAT-ARI',
    competences: [{ name: 'Resuelve problemas de cantidad y sistema numérico' }],
  },
  {
    name: 'Matemática - Trigonometría',
    officialCode: 'MAT-TRI',
    competences: [{ name: 'Resuelve problemas trigonométricos y ángulos en espacio' }],
  },
  {
    name: 'Comunicación - Literatura',
    officialCode: 'COM-LIT',
    competences: [{ name: 'Lee y analiza obras de literatura peruana e hispanoamericana' }],
  },
  {
    name: 'Comunicación - Lenguaje',
    officialCode: 'COM-LEN',
    competences: [{ name: 'Escribe diversos tipos de textos con corrección gramatical y sintáctica' }],
  },
  {
    name: 'Comunicación - Razonamiento Verbal',
    officialCode: 'COM-RV',
    competences: [{ name: 'Comprende críticamente textos complejos e inferencia léxica' }],
  },
  {
    name: 'Desarrollo Personal, Ciudadanía y Cívica (DPCC)',
    officialCode: 'DPCC-SEC',
    competences: [
      { name: 'Construye su identidad (Psicología y Ética)' },
      { name: 'Convive y participa democráticamente en la búsqueda del bien común (Cívica)' },
    ],
  },
  {
    name: 'Ciencias Sociales - Historia del Perú',
    officialCode: 'CCSS-HP',
    competences: [{ name: 'Construye interpretaciones históricas del Perú' }],
  },
  {
    name: 'Ciencias Sociales - Historia Universal',
    officialCode: 'CCSS-HU',
    competences: [{ name: 'Construye interpretaciones históricas del contexto mundial' }],
  },
  {
    name: 'Ciencias Sociales - Geografía',
    officialCode: 'CCSS-GEO',
    competences: [{ name: 'Gestiona responsablemente el espacio y el ambiente' }],
  },
  {
    name: 'Ciencia y Tecnología - Biología',
    officialCode: 'CT-BIO',
    competences: [{ name: 'Explica el mundo vivo y la biodiversidad' }],
  },
  {
    name: 'Ciencia y Tecnología - Química',
    officialCode: 'CT-QUI',
    competences: [{ name: 'Comprende y usa conocimientos sobre materia y transformaciones químicas' }],
  },
  {
    name: 'Ciencia y Tecnología - Física',
    officialCode: 'CT-FIS',
    competences: [{ name: 'Comprende el comportamiento físico de la energía y las fuerzas' }],
  },
  {
    name: 'Inglés como Lengua Extranjera (Secundaria)',
    officialCode: 'ING-SEC',
    competences: [
      { name: 'Se comunica oralmente en inglés avanzado' },
      { name: 'Lee textos complejos en inglés' },
      { name: 'Redacta ensayos y cartas en inglés' },
    ],
  },
  {
    name: 'Educación para el Trabajo (EPT) - Computación y Emprendimiento',
    officialCode: 'EPT-SEC',
    competences: [
      { name: 'Gestiona proyectos de emprendimiento económico o social' },
      { name: 'Aplica habilidades técnicas en computación y finanzas' },
    ],
  },
  {
    name: 'Arte y Cultura (Secundaria)',
    officialCode: 'AC-SEC',
    competences: [
      { name: 'Aprecia de manera crítica manifestaciones artístico-culturales' },
      { name: 'Crea proyectos desde los lenguajes artísticos' },
    ],
  },
  {
    name: 'Educación Física (Secundaria)',
    officialCode: 'EF-SEC',
    competences: [
      { name: 'Se desenvuelve de manera autónoma a través de su motricidad' },
      { name: 'Asume una vida saludable y acondicionamiento físico' },
    ],
  },
  {
    name: 'Educación Religiosa (Secundaria)',
    officialCode: 'ER-SEC',
    competences: [
      { name: 'Construye su identidad como persona humana, amada por Dios' },
    ],
  },
  {
    name: 'Tutoría y Orientación Educativa (TOE)',
    officialCode: 'TOE-SEC',
    competences: [
      { name: 'Desarrolla habilidades socioemocionales y orientación vocacional' },
    ],
  },
];

export function getDefaultCompetencesForCode(officialCode?: string): { name: string; description?: string }[] {
  if (!officialCode) return [];
  const code = officialCode.toUpperCase();

  // Buscar coincidencia directa en el catálogo
  const direct = MINEDU_OFFICIAL_CURRICULUM.find((item) => item.officialCode === code);
  if (direct?.competences) return direct.competences;

  // Aliases y códigos SIAGIE de catalog.data
  if (code.includes('INI-PS') || code.includes('PS-INI')) {
    return [
      { name: 'Construye su identidad', description: 'Reconocimiento de emociones y autoestima' },
      { name: 'Convive y participa democráticamente', description: 'Normas de convivencia y respeto' },
    ];
  }
  if (code.includes('INI-PSI') || code.includes('PSI-INI')) {
    return [{ name: 'Se desenvuelve de manera autónoma a través de su motricidad' }];
  }
  if (code.includes('INI-COM') || code.includes('COM-INI')) {
    return [
      { name: 'Se comunica oralmente en su lengua materna' },
      { name: 'Crea proyectos desde los lenguajes artísticos' },
      { name: 'Lee diversos tipos de textos en su lengua materna' },
    ];
  }
  if (code.includes('INI-CT') || code.includes('CT-INI')) {
    return [
      { name: 'Indaga mediante métodos científicos para construir sus conocimientos' },
      { name: 'Resuelve problemas de cantidad y forma en su entorno' },
    ];
  }
  if (code.includes('PRI-MAT') || code.includes('MAT-PRI') || code === 'MAT') {
    return [
      { name: 'Resuelve problemas de cantidad' },
      { name: 'Resuelve problemas de regularidad, equivalencia y cambio' },
      { name: 'Resuelve problemas de forma, movimiento y localización' },
      { name: 'Resuelve problemas de gestión de datos e incertidumbre' },
    ];
  }
  if (code.includes('PRI-COM') || code.includes('COM-PRI') || code === 'COM') {
    return [
      { name: 'Se comunica oralmente en su lengua materna' },
      { name: 'Lee diversos tipos de textos escritos' },
      { name: 'Escribe diversos tipos de textos' },
    ];
  }
  if (code.includes('PRI-CYT') || code.includes('CT-PRI') || code === 'CYT') {
    return [
      { name: 'Indaga mediante métodos científicos' },
      { name: 'Explica el mundo físico basándose en conocimientos científicos' },
      { name: 'Diseña y construye soluciones tecnológicas' },
    ];
  }
  if (code.includes('PRI-PS') || code.includes('PS-PRI') || code === 'PS') {
    return [
      { name: 'Construye su identidad' },
      { name: 'Convive y participa democráticamente' },
      { name: 'Construye interpretaciones históricas' },
      { name: 'Gestiona responsablemente el espacio y el ambiente' },
      { name: 'Gestiona responsablemente los recursos económicos' },
    ];
  }
  if (code.includes('PRI-AYC') || code.includes('AC-PRI')) {
    return [
      { name: 'Aprecia de manera crítica manifestaciones artístico-culturales' },
      { name: 'Crea proyectos desde los lenguajes artísticos' },
    ];
  }
  if (code.includes('PRI-EF') || code.includes('EF-PRI')) {
    return [
      { name: 'Se desenvuelve de manera autónoma a través de su motricidad' },
      { name: 'Asume una vida saludable' },
      { name: 'Interactúa a través de sus habilidades sociomotrices' },
    ];
  }
  if (code.includes('PRI-ER') || code.includes('ER-PRI')) {
    return [
      { name: 'Construye su identidad como persona humana, amada por Dios' },
      { name: 'Asume la experiencia del encuentro personal y comunitario con Dios' },
    ];
  }
  if (code.includes('PRI-ING') || code.includes('ING-PRI') || code === 'ING') {
    return [
      { name: 'Se comunica oralmente en inglés como lengua extranjera' },
      { name: 'Lee diversos tipos de textos escritos en inglés' },
      { name: 'Escribe diversos tipos de textos en inglés' },
    ];
  }
  if (code === 'MAT-ALG') return [{ name: 'Resuelve problemas de regularidad, equivalencia y cambio (Álgebra)' }];
  if (code === 'MAT-GEO') return [{ name: 'Resuelve problemas de forma, movimiento y localización (Geometría)' }];
  if (code === 'MAT-ARI') return [{ name: 'Resuelve problemas de cantidad y sistema numérico (Aritmética)' }];
  if (code === 'MAT-TRI') return [{ name: 'Resuelve problemas trigonométricos y ángulos en espacio (Trigonometría)' }];
  if (code === 'COM-LIT') return [{ name: 'Lee y analiza obras de literatura peruana e hispanoamericana (Literatura)' }];
  if (code === 'COM-LEN') return [{ name: 'Escribe diversos tipos de textos con corrección gramatical (Lenguaje)' }];
  if (code === 'RAZ-MAT') {
    return [
      { name: 'Resuelve problemas de razonamiento lógico y matemático' },
      { name: 'Aplica estrategias heurísticas en resolución de problemas' },
    ];
  }
  if (code === 'RAZ-VER') {
    return [
      { name: 'Aplica comprensión lectora y análisis semántico' },
      { name: 'Infiere y sintetiza información de textos complejos' },
    ];
  }
  if (code.includes('EPT')) {
    return [
      { name: 'Gestiona proyectos de emprendimiento económico o social' },
      { name: 'Aplica habilidades técnicas en computación y tecnología' },
    ];
  }
  if (code.includes('BIO')) return [{ name: 'Explica el mundo vivo y la biodiversidad (Biología)' }];
  if (code.includes('QUI')) return [{ name: 'Comprende materia y transformaciones químicas (Química)' }];
  if (code.includes('FIS')) return [{ name: 'Comprende el comportamiento de la energía y las fuerzas (Física)' }];
  if (code.includes('DPCC')) {
    return [
      { name: 'Construye su identidad (Psicología y Ética)' },
      { name: 'Convive y participa democráticamente en la búsqueda del bien común (Cívica)' },
    ];
  }
  if (code.includes('HP')) return [{ name: 'Construye interpretaciones históricas del Perú' }];
  if (code.includes('HU')) return [{ name: 'Construye interpretaciones históricas del contexto mundial' }];
  if (code.includes('GEO')) return [{ name: 'Gestiona responsablemente el espacio y el ambiente' }];
  if (code.includes('TOE')) return [{ name: 'Desarrolla habilidades socioemocionales y orientación vocacional' }];

  return [];
}

export class CurricularAreaService {
  constructor(private readonly curricularAreaRepository: CurricularAreaRepository) {}

  async getAllAreas(schoolId: string): Promise<CurricularArea[]> {
    return this.curricularAreaRepository.findAllBySchool(schoolId);
  }

  async getAllAreasPaginated(
    schoolId: string,
    page: number = 1,
    limit: number = 8,
    level: string = 'ALL',
  ): Promise<{ data: CurricularArea[]; total: number; page: number; limit: number; totalPages: number }> {
    return this.curricularAreaRepository.findAllPaginated(schoolId, page, limit, level);
  }

  async getAreaById(areaId: string, schoolId: string): Promise<CurricularArea> {
    const area = await this.curricularAreaRepository.findById(areaId, schoolId);

    if (!area) {
      throw new AppError(`Área curricular con id ${areaId} no encontrada`, 404);
    }

    return area;
  }

  async createArea(
    schoolId: string,
    createAreaDto: CreateCurricularAreaDto,
  ): Promise<CurricularArea> {
    // 1. Evitar la creación de cursos duplicados en el mismo colegio
    const existing = await this.curricularAreaRepository.findByCodeOrName(
      schoolId,
      createAreaDto.name,
      createAreaDto.officialCode,
    );

    if (existing) {
      throw new AppError(
        `La asignatura "${createAreaDto.name}" ya está registrada en el plan curricular de este colegio.`,
        409,
      );
    }

    const defaultCompetences = getDefaultCompetencesForCode(createAreaDto.officialCode);
    return this.curricularAreaRepository.create(schoolId, createAreaDto, defaultCompetences);
  }

  async updateArea(
    areaId: string,
    schoolId: string,
    updateAreaDto: UpdateCurricularAreaDto,
  ): Promise<CurricularArea> {
    await this.getAreaById(areaId, schoolId);
    return this.curricularAreaRepository.update(areaId, schoolId, updateAreaDto);
  }

  async deleteArea(areaId: string, schoolId: string): Promise<CurricularArea> {
    const area = await this.getAreaById(areaId, schoolId);

    // 1. Verificar si la asignatura tiene profesores o carga horaria asignada
    const assignmentCount = await this.curricularAreaRepository.countAssignments(areaId);
    if (assignmentCount > 0) {
      throw new AppError(
        `No se puede eliminar el curso "${area.name}" porque tiene docente(s) asignado(s) en Carga Horaria. Primero elimina sus asignaciones docentes.`,
        400,
      );
    }

    // 2. Verificar si la asignatura tiene notas registradas
    const gradeCount = await this.curricularAreaRepository.countGrades(areaId);
    if (gradeCount > 0) {
      throw new AppError(
        `No se puede eliminar el curso "${area.name}" porque ya cuenta con calificaciones registradas en el sistema.`,
        400,
      );
    }

    return this.curricularAreaRepository.delete(areaId, schoolId);
  }

  async createCompetence(
    schoolId: string,
    createCompetenceDto: CreateCompetenceDto,
  ): Promise<CurricularCompetence> {
    await this.getAreaById(createCompetenceDto.areaId, schoolId);
    return this.curricularAreaRepository.createCompetence(createCompetenceDto);
  }

  async seedMineduCurriculum(schoolId: string): Promise<{ count: number }> {
    return this.curricularAreaRepository.seedMineduAreas(schoolId, MINEDU_OFFICIAL_CURRICULUM);
  }
}
