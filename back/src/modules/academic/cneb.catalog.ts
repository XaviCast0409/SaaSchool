/**
 * Catálogo único del Currículo Nacional de la Educación Básica (CNEB) para EBR.
 * Es la ÚNICA fuente de verdad de áreas y competencias oficiales en todo el sistema.
 * La numeración de competencias es la oficial del CNEB (1 a 31).
 *
 * VALIDAR cada año contra la plantilla de registro del SIAGIE: el orden de las competencias
 * dentro de cada área es el orden de las columnas de la plantilla.
 */
export type EducationLevel = 'INITIAL' | 'PRIMARY' | 'SECONDARY';

export const CNEB_COMPETENCES: Record<number, { name: string; shortName: string }> = {
  1: { name: 'Construye su identidad', shortName: 'Identidad' },
  2: { name: 'Se desenvuelve de manera autónoma a través de su motricidad', shortName: 'Motricidad' },
  3: { name: 'Asume una vida saludable', shortName: 'Vida saludable' },
  4: { name: 'Interactúa a través de sus habilidades sociomotrices', shortName: 'Sociomotricidad' },
  5: { name: 'Aprecia de manera crítica manifestaciones artístico-culturales', shortName: 'Aprecia' },
  6: { name: 'Crea proyectos desde los lenguajes artísticos', shortName: 'Crea proyectos' },
  7: { name: 'Se comunica oralmente en su lengua materna', shortName: 'Oralidad' },
  8: { name: 'Lee diversos tipos de textos escritos en su lengua materna', shortName: 'Lectura' },
  9: { name: 'Escribe diversos tipos de textos en su lengua materna', shortName: 'Escritura' },
  10: { name: 'Se comunica oralmente en castellano como segunda lengua', shortName: 'Oralidad L2' },
  11: { name: 'Lee diversos tipos de textos escritos en castellano como segunda lengua', shortName: 'Lectura L2' },
  12: { name: 'Escribe diversos tipos de textos en castellano como segunda lengua', shortName: 'Escritura L2' },
  13: { name: 'Se comunica oralmente en inglés como lengua extranjera', shortName: 'Speaking' },
  14: { name: 'Lee diversos tipos de textos escritos en inglés como lengua extranjera', shortName: 'Reading' },
  15: { name: 'Escribe diversos tipos de textos en inglés como lengua extranjera', shortName: 'Writing' },
  16: { name: 'Convive y participa democráticamente en la búsqueda del bien común', shortName: 'Convivencia' },
  17: { name: 'Construye interpretaciones históricas', shortName: 'Historia' },
  18: { name: 'Gestiona responsablemente el espacio y el ambiente', shortName: 'Espacio y ambiente' },
  19: { name: 'Gestiona responsablemente los recursos económicos', shortName: 'Recursos económicos' },
  20: { name: 'Indaga mediante métodos científicos para construir sus conocimientos', shortName: 'Indaga' },
  21: {
    name: 'Explica el mundo físico basándose en conocimientos sobre los seres vivos, materia y energía, biodiversidad, Tierra y universo',
    shortName: 'Explica el mundo físico',
  },
  22: { name: 'Diseña y construye soluciones tecnológicas para resolver problemas de su entorno', shortName: 'Soluciones tecnológicas' },
  23: { name: 'Resuelve problemas de cantidad', shortName: 'Cantidad' },
  24: { name: 'Resuelve problemas de regularidad, equivalencia y cambio', shortName: 'Regularidad y cambio' },
  25: { name: 'Resuelve problemas de forma, movimiento y localización', shortName: 'Forma y movimiento' },
  26: { name: 'Resuelve problemas de gestión de datos e incertidumbre', shortName: 'Datos e incertidumbre' },
  27: { name: 'Gestiona proyectos de emprendimiento económico o social', shortName: 'Emprendimiento' },
  28: { name: 'Se desenvuelve en entornos virtuales generados por las TIC', shortName: 'Entornos virtuales (TIC)' },
  29: { name: 'Gestiona su aprendizaje de manera autónoma', shortName: 'Aprendizaje autónomo' },
  30: {
    name: 'Construye su identidad como persona humana, amada por Dios, digna, libre y trascendente, comprendiendo la doctrina de su propia religión, abierto al diálogo con las que le son cercanas',
    shortName: 'Identidad religiosa',
  },
  31: {
    name: 'Asume la experiencia del encuentro personal y comunitario con Dios en su proyecto de vida en coherencia con su creencia religiosa',
    shortName: 'Encuentro con Dios',
  },
};

export interface CnebArea {
  code: string;            // Código interno estable del área (no cambiar)
  name: string;
  competences: number[];   // Números CNEB en el orden de la plantilla SIAGIE
  optional?: boolean;      // No se incluye por defecto al aplicar la plantilla
  isTransversal?: boolean; // Competencias transversales: las registra el tutor o tutora
}

export const CNEB_AREAS: Record<EducationLevel, CnebArea[]> = {
  INITIAL: [
    { code: 'PS', name: 'Personal Social', competences: [1, 16, 30] },
    { code: 'PSI', name: 'Psicomotriz', competences: [2] },
    { code: 'COM', name: 'Comunicación', competences: [7, 8, 9, 6] },
    { code: 'C2L', name: 'Castellano como segunda lengua', competences: [10], optional: true },
    { code: 'MAT', name: 'Matemática', competences: [23, 25] },
    { code: 'CYT', name: 'Ciencia y Tecnología', competences: [20] },
    { code: 'TRANS', name: 'Competencias transversales', competences: [28, 29], isTransversal: true },
  ],
  PRIMARY: [
    { code: 'PS', name: 'Personal Social', competences: [1, 16, 17, 18, 19] },
    { code: 'EF', name: 'Educación Física', competences: [2, 3, 4] },
    { code: 'COM', name: 'Comunicación', competences: [7, 8, 9] },
    { code: 'ART', name: 'Arte y Cultura', competences: [5, 6] },
    { code: 'C2L', name: 'Castellano como segunda lengua', competences: [10, 11, 12], optional: true },
    { code: 'ING', name: 'Inglés como lengua extranjera', competences: [13, 14, 15], optional: true },
    { code: 'MAT', name: 'Matemática', competences: [23, 24, 25, 26] },
    { code: 'CYT', name: 'Ciencia y Tecnología', competences: [20, 21, 22] },
    { code: 'REL', name: 'Educación Religiosa', competences: [30, 31] },
    { code: 'TRANS', name: 'Competencias transversales', competences: [28, 29], isTransversal: true },
  ],
  SECONDARY: [
    { code: 'DPCC', name: 'Desarrollo Personal, Ciudadanía y Cívica', competences: [1, 16] },
    { code: 'CCSS', name: 'Ciencias Sociales', competences: [17, 18, 19] },
    { code: 'EF', name: 'Educación Física', competences: [2, 3, 4] },
    { code: 'ART', name: 'Arte y Cultura', competences: [5, 6] },
    { code: 'COM', name: 'Comunicación', competences: [7, 8, 9] },
    { code: 'C2L', name: 'Castellano como segunda lengua', competences: [10, 11, 12], optional: true },
    { code: 'ING', name: 'Inglés como lengua extranjera', competences: [13, 14, 15] },
    { code: 'MAT', name: 'Matemática', competences: [23, 24, 25, 26] },
    { code: 'CYT', name: 'Ciencia y Tecnología', competences: [20, 21, 22] },
    { code: 'EPT', name: 'Educación para el Trabajo', competences: [27] },
    { code: 'REL', name: 'Educación Religiosa', competences: [30, 31] },
    { code: 'TRANS', name: 'Competencias transversales', competences: [28, 29], isTransversal: true },
  ],
};

export const LEVEL_GRADES: Record<EducationLevel, number[]> = {
  INITIAL: [3, 4, 5],
  PRIMARY: [1, 2, 3, 4, 5, 6],
  SECONDARY: [1, 2, 3, 4, 5],
};

export const LEVEL_LABEL: Record<EducationLevel, string> = {
  INITIAL: 'Inicial',
  PRIMARY: 'Primaria',
  SECONDARY: 'Secundaria',
};

export function gradeLabel(level: EducationLevel, grade: number): string {
  return level === 'INITIAL' ? `${grade} años` : `${grade}.° ${LEVEL_LABEL[level]}`;
}

export function getOfficialArea(level: EducationLevel, code: string): CnebArea | undefined {
  return CNEB_AREAS[level].find((a) => a.code === code.toUpperCase());
}

export function competenceName(cnebNumber: number): string {
  return CNEB_COMPETENCES[cnebNumber]?.name ?? `Competencia ${cnebNumber}`;
}

export function isValidGrade(level: EducationLevel, grade: number): boolean {
  return LEVEL_GRADES[level].includes(grade);
}

/** Normaliza texto para comparaciones (solo para migración de datos antiguos). */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * SOLO PARA MIGRAR DATOS ANTIGUOS (scripts/academic-normalize.ts). Ningún flujo en tiempo de
 * ejecución puede usar esta función: el vínculo oficial es CurricularCompetence.cnebNumber.
 */
export function matchCnebNumberByName(name: string): number | null {
  const n = normalizeText(name);
  const has = (s: string) => n.includes(s);
  if (has('amada por dios')) return 30;
  if (has('encuentro personal')) return 31;
  if (has('entornos virtuales')) return 28;
  if (has('gestiona su aprendizaje')) return 29;
  if (has('ingles')) {
    if (has('oralmente')) return 13;
    if (has('lee')) return 14;
    if (has('escribe')) return 15;
  }
  if (has('segunda lengua')) {
    if (has('oralmente')) return 10;
    if (has('lee')) return 11;
    if (has('escribe')) return 12;
  }
  if (has('construye su identidad')) return 1;
  if (has('motricidad')) return 2;
  if (has('vida saludable')) return 3;
  if (has('sociomotri')) return 4;
  if (has('aprecia de manera critica')) return 5;
  if (has('crea proyectos')) return 6;
  if (has('se comunica oralmente')) return 7;
  if (has('lee diversos tipos de textos')) return 8;
  if (has('escribe diversos tipos de textos')) return 9;
  if (has('convive y participa')) return 16;
  if (has('interpretaciones historicas')) return 17;
  if (has('espacio y el ambiente')) return 18;
  if (has('recursos economicos')) return 19;
  if (has('indaga')) return 20;
  if (has('explica el mundo fisico')) return 21;
  if (has('disena y construye soluciones')) return 22;
  if (has('problemas de cantidad')) return 23;
  if (has('regularidad')) return 24;
  if (has('forma movimiento')) return 25;
  if (has('gestion de datos')) return 26;
  if (has('emprendimiento')) return 27;
  return null;
}

/** SOLO PARA MIGRACIÓN: deduce el código de área oficial a partir de códigos antiguos. */
export function legacyAreaCode(officialCode?: string | null, officialAreaCode?: string | null, name?: string | null): string | null {
  const candidates = [officialAreaCode, officialCode].filter(Boolean).map((c) => String(c).toUpperCase());
  const map: Array<[RegExp, string]> = [
    [/^TRANS|TRANS-/, 'TRANS'],
    [/^DPCC/, 'DPCC'],
    [/^CCSS/, 'CCSS'],
    [/^(PSI|INI-PSI)/, 'PSI'],
    [/^(PS|INI-PS|PRI-PS)\b|^PS-/, 'PS'],
    [/^(EF|PRI-EF)\b|^EF-/, 'EF'],
    [/^(ART|AYC|PRI-AYC)\b|^(ART|AYC)-/, 'ART'],
    [/^(ING|PRI-ING)\b|^ING-/, 'ING'],
    [/^(REL|ER|PRI-ER)\b|^(REL|ER)-/, 'REL'],
    [/^EPT$|^EPT-(EMP|SEC)$/, 'EPT'],
    [/^(MAT|PRI-MAT)\b|^MAT-/, 'MAT'],
    [/^(CYT|CT|PRI-CYT|INI-CT)\b|^(CYT|CT)-/, 'CYT'],
    [/^(COM|PRI-COM|INI-COM)\b|^COM-/, 'COM'],
  ];
  for (const code of candidates) {
    for (const [re, value] of map) if (re.test(code)) return value;
  }
  const n = normalizeText(name ?? '');
  if (n.includes('transversal')) return 'TRANS';
  if (n.startsWith('matematica')) return 'MAT';
  if (n.startsWith('comunicacion')) return 'COM';
  if (n.startsWith('ciencia y tecnologia')) return 'CYT';
  if (n.startsWith('personal social')) return 'PS';
  if (n.startsWith('psicomotri')) return 'PSI';
  if (n.startsWith('educacion fisica')) return 'EF';
  if (n.startsWith('arte')) return 'ART';
  if (n.startsWith('ingles')) return 'ING';
  if (n.startsWith('educacion religiosa')) return 'REL';
  if (n.startsWith('desarrollo personal')) return 'DPCC';
  if (n.startsWith('ciencias sociales')) return 'CCSS';
  if (n.startsWith('educacion para el trabajo')) return 'EPT';
  return null;
}
