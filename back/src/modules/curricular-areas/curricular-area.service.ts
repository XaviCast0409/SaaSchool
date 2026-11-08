import { AppError } from '../../core/errors/app-error';
import type { CurricularAreaRepository, MineduSeedArea } from './curricular-area.repository';
import type {
  CreateCurricularAreaDto,
  UpdateCurricularAreaDto,
  CreateCompetenceDto,
  UpdateCompetenceDto,
} from './curricular-area.schema';
import type { CurricularArea, CurricularCompetence } from '@prisma/client';

export const MINEDU_OFFICIAL_CURRICULUM: MineduSeedArea[] = [
  // ============================================================================
  // NIVEL INICIAL (Ciclo II — 3, 4 y 5 años)
  // ============================================================================
  {
    name: 'Personal Social (Inicial)',
    officialCode: 'PS-INI',
    officialAreaCode: 'PS',
    competences: [
      { name: 'Construye su identidad', officialCompetenceCode: 'C1' },
      { name: 'Convive y participa democráticamente en la búsqueda del bien común', officialCompetenceCode: 'C2' },
      { name: 'Construye su identidad, como persona humana, amada por Dios, digna, libre y trascendente', officialCompetenceCode: 'C3' },
    ],
  },
  {
    name: 'Psicomotriz (Inicial)',
    officialCode: 'PSI-INI',
    officialAreaCode: 'PSI',
    competences: [
      { name: 'Se desenvuelve de manera autónoma a través de su motricidad', officialCompetenceCode: 'C1' },
    ],
  },
  {
    name: 'Comunicación (Inicial)',
    officialCode: 'COM-INI',
    officialAreaCode: 'COM',
    competences: [
      { name: 'Se comunica oralmente en su lengua materna', officialCompetenceCode: 'C1' },
      { name: 'Lee diversos tipos de textos en su lengua materna', officialCompetenceCode: 'C2' },
      { name: 'Escribe diversos tipos de textos en su lengua materna', officialCompetenceCode: 'C3' },
      { name: 'Crea proyectos desde los lenguajes artísticos', officialCompetenceCode: 'C4' },
    ],
  },
  {
    name: 'Matemática (Inicial)',
    officialCode: 'MAT-INI',
    officialAreaCode: 'MAT',
    competences: [
      { name: 'Resuelve problemas de cantidad', officialCompetenceCode: 'C1' },
      { name: 'Resuelve problemas de forma, movimiento y localización', officialCompetenceCode: 'C2' },
    ],
  },
  {
    name: 'Ciencia y Tecnología (Inicial)',
    officialCode: 'CYT-INI',
    officialAreaCode: 'CYT',
    competences: [
      { name: 'Indaga mediante métodos científicos para construir sus conocimientos', officialCompetenceCode: 'C1' },
    ],
  },
  {
    name: 'Competencias Transversales (Inicial)',
    officialCode: 'TRANS-INI',
    isTransversal: true,
    officialAreaCode: 'TRANS',
    competences: [
      {
        name: 'Se desenvuelve en entornos virtuales generados por las TIC',
        description: 'Uso formativo de herramientas tecnológicas y virtuales',
        officialCompetenceCode: 'C28',
      },
      {
        name: 'Gestiona su aprendizaje de manera autónoma',
        description: 'Autorregulación y metas de aprendizaje continuo',
        officialCompetenceCode: 'C29',
      },
    ],
  },

  // ============================================================================
  // NIVEL PRIMARIA (1.° a 6.° grado)
  // ============================================================================
  {
    name: 'Personal Social (Primaria)',
    officialCode: 'PS-PRI',
    officialAreaCode: 'PS',
    competences: [
      { name: 'Construye su identidad', officialCompetenceCode: 'C1' },
      { name: 'Convive y participa democráticamente en la búsqueda del bien común', officialCompetenceCode: 'C2' },
      { name: 'Construye interpretaciones históricas', officialCompetenceCode: 'C3' },
      { name: 'Gestiona responsablemente el espacio y el ambiente', officialCompetenceCode: 'C4' },
      { name: 'Gestiona responsablemente los recursos económicos', officialCompetenceCode: 'C5' },
    ],
  },
  {
    name: 'Educación Física (Primaria)',
    officialCode: 'EF-PRI',
    officialAreaCode: 'EF',
    competences: [
      { name: 'Se desenvuelve de manera autónoma a través de su motricidad', officialCompetenceCode: 'C1' },
      { name: 'Asume una vida saludable', officialCompetenceCode: 'C2' },
      { name: 'Interactúa a través de sus habilidades sociomotrices', officialCompetenceCode: 'C3' },
    ],
  },
  {
    name: 'Arte y Cultura (Primaria)',
    officialCode: 'ART-PRI',
    officialAreaCode: 'ART',
    competences: [
      { name: 'Aprecia de manera crítica manifestaciones artístico-culturales', officialCompetenceCode: 'C1' },
      { name: 'Crea proyectos desde los lenguajes artísticos', officialCompetenceCode: 'C2' },
    ],
  },
  {
    name: 'Comunicación (Primaria)',
    officialCode: 'COM-PRI',
    officialAreaCode: 'COM',
    competences: [
      { name: 'Se comunica oralmente en su lengua materna', officialCompetenceCode: 'C1' },
      { name: 'Lee diversos tipos de textos escritos en su lengua materna', officialCompetenceCode: 'C2' },
      { name: 'Escribe diversos tipos de textos en su lengua materna', officialCompetenceCode: 'C3' },
    ],
  },
  {
    name: 'Inglés como lengua extranjera (Primaria)',
    officialCode: 'ING-PRI',
    officialAreaCode: 'ING',
    competences: [
      { name: 'Se comunica oralmente en inglés como lengua extranjera', officialCompetenceCode: 'C1' },
      { name: 'Lee diversos tipos de textos escritos en inglés como lengua extranjera', officialCompetenceCode: 'C2' },
      { name: 'Escribe diversos tipos de textos en inglés como lengua extranjera', officialCompetenceCode: 'C3' },
    ],
  },
  {
    name: 'Matemática (Primaria)',
    officialCode: 'MAT-PRI',
    officialAreaCode: 'MAT',
    competences: [
      { name: 'Resuelve problemas de cantidad', officialCompetenceCode: 'C1' },
      { name: 'Resuelve problemas de regularidad, equivalencia y cambio', officialCompetenceCode: 'C2' },
      { name: 'Resuelve problemas de forma, movimiento y localización', officialCompetenceCode: 'C3' },
      { name: 'Resuelve problemas de gestión de datos e incertidumbre', officialCompetenceCode: 'C4' },
    ],
  },
  {
    name: 'Ciencia y Tecnología (Primaria)',
    officialCode: 'CYT-PRI',
    officialAreaCode: 'CYT',
    competences: [
      { name: 'Indaga mediante métodos científicos para construir sus conocimientos', officialCompetenceCode: 'C1' },
      { name: 'Explica el mundo físico basándose en conocimientos sobre los seres vivos, materia y energía, biodiversidad, Tierra y universo', officialCompetenceCode: 'C2' },
      { name: 'Diseña y construye soluciones tecnológicas para resolver problemas de su entorno', officialCompetenceCode: 'C3' },
    ],
  },
  {
    name: 'Educación Religiosa (Primaria)',
    officialCode: 'REL-PRI',
    officialAreaCode: 'REL',
    competences: [
      { name: 'Construye su identidad como persona humana, amada por Dios, digna, libre y trascendente', officialCompetenceCode: 'C1' },
      { name: 'Asume la experiencia del encuentro personal y comunitario con Dios en su proyecto de vida', officialCompetenceCode: 'C2' },
    ],
  },
  {
    name: 'Competencias Transversales (Primaria)',
    officialCode: 'TRANS-PRI',
    isTransversal: true,
    officialAreaCode: 'TRANS',
    competences: [
      {
        name: 'Se desenvuelve en entornos virtuales generados por las TIC',
        description: 'Uso formativo de herramientas tecnológicas y virtuales',
        officialCompetenceCode: 'C28',
      },
      {
        name: 'Gestiona su aprendizaje de manera autónoma',
        description: 'Autorregulación y metas de aprendizaje continuo',
        officialCompetenceCode: 'C29',
      },
    ],
  },

  // ============================================================================
  // NIVEL SECUNDARIA (1.° a 5.° grado)
  // ============================================================================
  {
    name: 'Desarrollo Personal, Ciudadanía y Cívica (Secundaria)',
    officialCode: 'DPCC-SEC',
    officialAreaCode: 'DPCC',
    competences: [
      { name: 'Construye su identidad', officialCompetenceCode: 'C1' },
      { name: 'Convive y participa democráticamente en la búsqueda del bien común', officialCompetenceCode: 'C2' },
    ],
  },
  {
    name: 'Ciencias Sociales (Secundaria)',
    officialCode: 'CCSS-SEC',
    officialAreaCode: 'CCSS',
    competences: [
      { name: 'Construye interpretaciones históricas', officialCompetenceCode: 'C1' },
      { name: 'Gestiona responsablemente el espacio y el ambiente', officialCompetenceCode: 'C2' },
      { name: 'Gestiona responsablemente los recursos económicos', officialCompetenceCode: 'C3' },
    ],
  },
  {
    name: 'Educación para el Trabajo (Secundaria)',
    officialCode: 'EPT-SEC',
    officialAreaCode: 'EPT',
    competences: [
      { name: 'Gestiona proyectos de emprendimiento económico o social', officialCompetenceCode: 'C1' },
    ],
  },
  {
    name: 'Educación Física (Secundaria)',
    officialCode: 'EF-SEC',
    officialAreaCode: 'EF',
    competences: [
      { name: 'Se desenvuelve de manera autónoma a través de su motricidad', officialCompetenceCode: 'C1' },
      { name: 'Asume una vida saludable', officialCompetenceCode: 'C2' },
      { name: 'Interactúa a través de sus habilidades sociomotrices', officialCompetenceCode: 'C3' },
    ],
  },
  {
    name: 'Arte y Cultura (Secundaria)',
    officialCode: 'ART-SEC',
    officialAreaCode: 'ART',
    competences: [
      { name: 'Aprecia de manera crítica manifestaciones artístico-culturales', officialCompetenceCode: 'C1' },
      { name: 'Crea proyectos desde los lenguajes artísticos', officialCompetenceCode: 'C2' },
    ],
  },
  {
    name: 'Comunicación (Secundaria)',
    officialCode: 'COM-SEC',
    officialAreaCode: 'COM',
    competences: [
      { name: 'Se comunica oralmente en su lengua materna', officialCompetenceCode: 'C1' },
      { name: 'Lee diversos tipos de textos escritos en su lengua materna', officialCompetenceCode: 'C2' },
      { name: 'Escribe diversos tipos de textos en su lengua materna', officialCompetenceCode: 'C3' },
    ],
  },
  {
    name: 'Inglés como lengua extranjera (Secundaria)',
    officialCode: 'ING-SEC',
    officialAreaCode: 'ING',
    competences: [
      { name: 'Se comunica oralmente en inglés como lengua extranjera', officialCompetenceCode: 'C1' },
      { name: 'Lee diversos tipos de textos escritos en inglés como lengua extranjera', officialCompetenceCode: 'C2' },
      { name: 'Escribe diversos tipos de textos en inglés como lengua extranjera', officialCompetenceCode: 'C3' },
    ],
  },
  {
    name: 'Matemática (Secundaria)',
    officialCode: 'MAT-SEC',
    officialAreaCode: 'MAT',
    competences: [
      { name: 'Resuelve problemas de cantidad', officialCompetenceCode: 'C1' },
      { name: 'Resuelve problemas de regularidad, equivalencia y cambio', officialCompetenceCode: 'C2' },
      { name: 'Resuelve problemas de forma, movimiento y localización', officialCompetenceCode: 'C3' },
      { name: 'Resuelve problemas de gestión de datos e incertidumbre', officialCompetenceCode: 'C4' },
    ],
  },
  {
    name: 'Ciencia y Tecnología (Secundaria)',
    officialCode: 'CYT-SEC',
    officialAreaCode: 'CYT',
    competences: [
      { name: 'Indaga mediante métodos científicos para construir sus conocimientos', officialCompetenceCode: 'C1' },
      { name: 'Explica el mundo físico basándose en conocimientos sobre los seres vivos, materia y energía, biodiversidad, Tierra y universo', officialCompetenceCode: 'C2' },
      { name: 'Diseña y construye soluciones tecnológicas para resolver problemas de su entorno', officialCompetenceCode: 'C3' },
    ],
  },
  {
    name: 'Educación Religiosa (Secundaria)',
    officialCode: 'REL-SEC',
    officialAreaCode: 'REL',
    competences: [
      { name: 'Construye su identidad como persona humana, amada por Dios, digna, libre y trascendente', officialCompetenceCode: 'C1' },
      { name: 'Asume la experiencia del encuentro personal y comunitario con Dios en su proyecto de vida', officialCompetenceCode: 'C2' },
    ],
  },
  {
    name: 'Competencias Transversales (Secundaria)',
    officialCode: 'TRANS-SEC',
    isTransversal: true,
    officialAreaCode: 'TRANS',
    competences: [
      {
        name: 'Se desenvuelve en entornos virtuales generados por las TIC',
        description: 'Uso formativo de herramientas tecnológicas y virtuales',
        officialCompetenceCode: 'C28',
      },
      {
        name: 'Gestiona su aprendizaje de manera autónoma',
        description: 'Autorregulación y metas de aprendizaje continuo',
        officialCompetenceCode: 'C29',
      },
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
  if (
    code.includes('MAT') ||
    code === 'MAT-ALG' ||
    code === 'MAT-GEO' ||
    code === 'MAT-ARI' ||
    code === 'MAT-TRI' ||
    code === 'RAZ-MAT'
  ) {
    return [
      { name: 'Resuelve problemas de cantidad' },
      { name: 'Resuelve problemas de regularidad, equivalencia y cambio' },
      { name: 'Resuelve problemas de forma, movimiento y localización' },
      { name: 'Resuelve problemas de gestión de datos e incertidumbre' },
    ];
  }

  if (
    code.includes('COM') ||
    code === 'COM-LIT' ||
    code === 'COM-LEN' ||
    code === 'RAZ-VER'
  ) {
    return [
      { name: 'Se comunica oralmente en su lengua materna' },
      { name: 'Lee diversos tipos de textos escritos' },
      { name: 'Escribe diversos tipos de textos' },
    ];
  }

  if (
    code.includes('CT') ||
    code.includes('CYT') ||
    code.includes('BIO') ||
    code.includes('QUI') ||
    code.includes('FIS')
  ) {
    return [
      { name: 'Indaga mediante métodos científicos' },
      { name: 'Explica el mundo físico basándose en conocimientos científicos' },
      { name: 'Diseña y construye soluciones tecnológicas' },
    ];
  }

  if (
    code.includes('CCSS') ||
    code.includes('HP') ||
    code.includes('HU') ||
    code.includes('GEO')
  ) {
    return [
      { name: 'Construye interpretaciones históricas' },
      { name: 'Gestiona responsablemente el espacio y el ambiente' },
      { name: 'Gestiona responsablemente los recursos económicos' },
    ];
  }

  if (code.includes('EPT')) {
    return [
      { name: 'Gestiona proyectos de emprendimiento económico o social' },
      { name: 'Aplica habilidades técnicas en computación y tecnología' },
    ];
  }

  if (code.includes('DPCC')) {
    return [
      { name: 'Construye su identidad' },
      { name: 'Convive y participa democráticamente en la búsqueda del bien común' },
    ];
  }

  if (code.includes('TOE')) {
    return [{ name: 'Desarrolla habilidades socioemocionales y orientación vocacional' }];
  }

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

  async deleteCompetence(
    competenceId: string,
    schoolId: string,
  ): Promise<CurricularCompetence> {
    const competence = await this.curricularAreaRepository.findCompetenceById(competenceId);
    if (!competence || competence.area.schoolId !== schoolId) {
      throw new AppError('Competencia no encontrada.', 404);
    }

    const gradesCount = await this.curricularAreaRepository.countCompetenceGrades(competenceId);
    if (gradesCount > 0) {
      throw new AppError(
        'No se puede eliminar la competencia porque ya contiene calificaciones registradas.',
        400,
      );
    }

    return this.curricularAreaRepository.deleteCompetence(competenceId);
  }

  async updateCompetence(
    competenceId: string,
    schoolId: string,
    updateCompetenceDto: UpdateCompetenceDto,
  ): Promise<CurricularCompetence> {
    const competence = await this.curricularAreaRepository.findCompetenceById(competenceId);
    if (!competence || competence.area.schoolId !== schoolId) {
      throw new AppError('Competencia no encontrada.', 404);
    }

    return this.curricularAreaRepository.updateCompetence(competenceId, updateCompetenceDto);
  }

  async toggleCompetence(
    competenceId: string,
    schoolId: string,
  ): Promise<CurricularCompetence> {
    const competence = await this.curricularAreaRepository.findCompetenceById(competenceId);
    if (!competence || competence.area.schoolId !== schoolId) {
      throw new AppError('Competencia no encontrada.', 404);
    }

    const currentStatus = (competence as any).isActive ?? true;
    return this.curricularAreaRepository.updateCompetence(competenceId, {
      isActive: !currentStatus,
    });
  }

  async loadDefaultCompetencesForArea(
    areaId: string,
    schoolId: string,
  ): Promise<{ copied: number }> {
    const area = await this.getAreaById(areaId, schoolId);

    // 1. Si tiene parentAreaId, copiar competencias del área madre
    if ((area as any).parentAreaId) {
      const copied = await this.curricularAreaRepository.copyParentCompetences(
        areaId,
        (area as any).parentAreaId,
      );
      return { copied };
    }

    // 2. Si no tiene parentAreaId pero tiene officialCode o nombre reconocible
    const defaultCompetences = getDefaultCompetencesForCode(area.officialCode || area.name);
    if (defaultCompetences.length === 0) {
      const lower = area.name.toLowerCase();
      if (
        lower.includes('álgebra') ||
        lower.includes('algebra') ||
        lower.includes('geometría') ||
        lower.includes('geometria') ||
        lower.includes('trigonometría') ||
        lower.includes('trigonometria') ||
        lower.includes('aritmética') ||
        lower.includes('aritmetica') ||
        lower.includes('razonamiento mat') ||
        lower.includes('raz. mat')
      ) {
        defaultCompetences.push(...getDefaultCompetencesForCode('MAT-PRI'));
      } else if (
        lower.includes('literatura') ||
        lower.includes('lenguaje') ||
        lower.includes('plan lector') ||
        lower.includes('razonamiento verb') ||
        lower.includes('raz. verb')
      ) {
        defaultCompetences.push(...getDefaultCompetencesForCode('COM-PRI'));
      } else if (
        lower.includes('química') ||
        lower.includes('quimica') ||
        lower.includes('física') ||
        lower.includes('fisica') ||
        lower.includes('biología') ||
        lower.includes('biologia')
      ) {
        defaultCompetences.push(...getDefaultCompetencesForCode('CT-PRI'));
      }
    }

    let copied = 0;
    for (const comp of defaultCompetences) {
      const exists = (area as any).competences?.some(
        (c: any) => c.name.toLowerCase().trim() === comp.name.toLowerCase().trim(),
      );
      if (!exists) {
        await this.curricularAreaRepository.createCompetence({
          areaId,
          name: comp.name,
          description: comp.description,
          isActive: true,
        });
        copied++;
      }
    }

    return { copied };
  }

  async seedMineduCurriculum(schoolId: string): Promise<{ count: number }> {
    return this.curricularAreaRepository.seedMineduAreas(schoolId, MINEDU_OFFICIAL_CURRICULUM);
  }
}
