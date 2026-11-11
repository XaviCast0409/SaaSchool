import * as XLSX from 'xlsx';
import {
  SiagieMatrixData,
  SiagieCourseSummary,
  SiagieMatrixCourse,
  SiagieConsolidatedArea,
} from '../types';

export interface SiagieInjectionResult {
  blob: Blob;
  fileName: string;
  matchedStudents: number;
  totalStudentsInFile: number;
  injectedGradesCount: number;
  injectedConclusionsCount: number;
  sheetsProcessed: string[];
  warnings: string[];
}

/**
 * Normaliza cadenas para comparaciones flexibles (elimina tildes, signos, mayúsculas y espacios extra).
 */
export function normalizeText(str: string): string {
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
 * Limpia y sanitiza las conclusiones descriptivas para SIAGIE MINEDU:
 * - Texto plano continuo en una sola línea (elimina \r, \n, \t).
 * - Máximo 350 caracteres reglamentarios.
 */
export function sanitizeConclusion(text?: string | null): string {
  if (!text) return '';
  const clean = text
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  // Máximo 300 (igual que el backend; validar con la plantilla vigente)
  return clean.slice(0, 300);
}

/**
 * Empareja una hoja de SIAGIE con un Área Madre Consolidada Oficial (ej: Matemática, CyT, Comunicación)
 */
function matchConsolidatedAreaForSheet(
  sheetName: string,
  ws: XLSX.WorkSheet,
  areas: SiagieConsolidatedArea[],
): SiagieConsolidatedArea | undefined {
  const normSheet = normalizeText(sheetName);

  for (const area of areas) {
    const normName = normalizeText(area.name);
    const normCode = normalizeText(area.code);

    if (
      normSheet === normName ||
      normSheet === normCode ||
      (normCode && normSheet.includes(normCode)) ||
      (normName.length > 3 && normSheet.includes(normName)) ||
      (normSheet.length > 3 && normName.includes(normSheet))
    ) {
      return area;
    }
  }

  // Escaneo en encabezados de hoja
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:Z50');
  const maxRow = Math.min(range.e.r, 15);

  for (let r = range.s.r; r <= maxRow; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (!cell || typeof cell.v !== 'string') continue;
      const cellText = normalizeText(cell.v);

      for (const area of areas) {
        const normName = normalizeText(area.name);
        const normCode = normalizeText(area.code);
        if (
          (normCode && cellText.includes(normCode)) ||
          (normName.length > 4 && cellText.includes(normName))
        ) {
          return area;
        }
      }
    }
  }

  return undefined;
}

/**
 * Intenta emparejar una hoja del Excel con un curso/área del aula.
 */
function matchCourseForSheet(
  sheetName: string,
  ws: XLSX.WorkSheet,
  courses: SiagieMatrixCourse[],
): SiagieMatrixCourse | undefined {
  const normSheet = normalizeText(sheetName);

  // 1. Intento por coincidencia exacta o contenida con nombre o código oficial del curso
  for (const course of courses) {
    const normName = normalizeText(course.name);
    const normCode = normalizeText(course.officialCode || '');

    if (
      normSheet === normName ||
      normSheet === normCode ||
      (normCode && normSheet.includes(normCode)) ||
      (normName.length > 4 && normSheet.includes(normName)) ||
      (normSheet.length > 4 && normName.includes(normSheet))
    ) {
      return course;
    }
  }

  // 2. Si el nombre de la hoja es genérico (ej. "Hoja1"), escanear las primeras 15 filas de texto
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:Z50');
  const maxRow = Math.min(range.e.r, 15);

  for (let r = range.s.r; r <= maxRow; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (!cell || typeof cell.v !== 'string') continue;
      const cellText = normalizeText(cell.v);

      for (const course of courses) {
        const normName = normalizeText(course.name);
        const normCode = normalizeText(course.officialCode || '');
        if (
          (normCode && cellText.includes(normCode)) ||
          (normName.length > 4 && cellText.includes(normName))
        ) {
          return course;
        }
      }
    }
  }

  return undefined;
}

interface CompetenceColumnPair {
  califCol: number;
  conclusionCol: number | null;
  competenceIndex: number;
}

/**
 * Detecta la estructura de columnas de la plantilla oficial SIAGIE en una hoja dada:
 * - Columna de DNI / Código del Estudiante.
 * - Columna de Apellidos y Nombres.
 * - Columnas de Calificativo y Conclusión Descriptiva para cada competencia.
 */
function detectSheetStructure(ws: XLSX.WorkSheet): {
  headerRow: number;
  dniCol: number;
  nameCol: number | null;
  competencePairs: CompetenceColumnPair[];
} | null {
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:Z100');
  const maxScanRow = Math.min(range.e.r, 25);

  let bestHeaderRow = -1;
  let dniCol = -1;
  let nameCol: number | null = null;

  // 1. Buscar la fila que contiene los encabezados de estudiantes (DNI, Código, Estudiante)
  for (let r = range.s.r; r <= maxScanRow; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (!cell || cell.v === undefined) continue;
      const text = normalizeText(String(cell.v));

      if (
        dniCol === -1 &&
        (text === 'dni' ||
          text === 'documento' ||
          text === 'n documento' ||
          text === 'nro documento' ||
          text === 'codigo' ||
          text === 'codigo del estudiante' ||
          text === 'codigo estudiante' ||
          text === 'documento de identidad' ||
          text.includes('nro doc') ||
          text.includes('num doc'))
      ) {
        dniCol = c;
        bestHeaderRow = r;
      }

      if (
        nameCol === null &&
        (text.includes('apellido') || text.includes('estudiante') || text.includes('alumno'))
      ) {
        nameCol = c;
      }
    }
    if (dniCol !== -1) break;
  }

  if (dniCol === -1 || bestHeaderRow === -1) {
    return null;
  }

  // 2. Buscar las columnas de Calificativo y Conclusión Descriptiva
  // En las plantillas de SIAGIE, los sub-encabezados suelen estar en la misma fila de encabezado o en las 2 filas adyacentes
  const competencePairs: CompetenceColumnPair[] = [];
  const startCol = Math.max(dniCol, nameCol ?? dniCol) + 1;
  const scanRows = [bestHeaderRow, bestHeaderRow + 1, Math.max(0, bestHeaderRow - 1)];

  let currentCalifCol: number | null = null;
  let compIdx = 0;

  for (let c = startCol; c <= range.e.c; c++) {
    let isCalif = false;
    let isConclusion = false;

    for (const r of scanRows) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (!cell || cell.v === undefined) continue;
      const text = normalizeText(String(cell.v));

      if (
        text === 'calificativo' ||
        text === 'calif' ||
        text === 'nl' ||
        text === 'nota' ||
        text === 'nota literal' ||
        text.startsWith('calif')
      ) {
        isCalif = true;
      }

      if (
        text.includes('conclusion') ||
        text.includes('conclusiones') ||
        text.includes('concl') ||
        text.includes('descriptiva')
      ) {
        isConclusion = true;
      }
    }

    if (isCalif) {
      if (currentCalifCol !== null) {
        // Había un calificativo previo sin conclusión
        competencePairs.push({
          califCol: currentCalifCol,
          conclusionCol: null,
          competenceIndex: compIdx++,
        });
      }
      currentCalifCol = c;
    } else if (isConclusion && currentCalifCol !== null) {
      competencePairs.push({
        califCol: currentCalifCol,
        conclusionCol: c,
        competenceIndex: compIdx++,
      });
      currentCalifCol = null;
    }
  }

  if (currentCalifCol !== null) {
    competencePairs.push({
      califCol: currentCalifCol,
      conclusionCol: null,
      competenceIndex: compIdx++,
    });
  }

  return {
    headerRow: bestHeaderRow,
    dniCol,
    nameCol,
    competencePairs,
  };
}

/**
 * Inyecta las calificaciones oficiales y conclusiones en la plantilla oficial SIAGIE descargada de MINEDU.
 * Preserva estrictamente:
 * - Nombre de archivo original (.xlsx).
 * - Hojas ocultas, metadatos y fórmulas de validación del SIAGIE.
 * - Regla de estudiantes retirados/trasladados: celdas en blanco ('').
 * - Regla de competencias no trabajadas: celdas en blanco ('').
 * - Escala literal en mayúsculas sin espacios: AD, A, B, C.
 * - Conclusiones en texto plano en una sola línea (15-350 caracteres).
 */
export async function injectGradesIntoSiagieTemplate(
  file: File,
  matrix: SiagieMatrixData,
  coursesSummary: SiagieCourseSummary[],
): Promise<SiagieInjectionResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, {
    type: 'array',
    cellStyles: true,
    cellDates: true,
    cellNF: true,
  });

  const warnings: string[] = [];
  const sheetsProcessed: string[] = [];
  let totalMatchedStudents = 0;
  let totalStudentsInFile = 0;
  let totalInjectedGrades = 0;
  let totalInjectedConclusions = 0;

  if (coursesSummary && coursesSummary.some((c) => c.hasInconsistencies)) {
    warnings.push(
      'Advertencia: Existen áreas con competencias calificadas solo para algunos alumnos. En SIAGIE, si una competencia se evalúa, debe registrarse para toda el aula.',
    );
  }

  const matrixCourses = matrix.courses || [];
  const matrixStudents = matrix.students || [];

  // Mapeo rápido de estudiantes por DNI, Código y Nombre normalizado
  const studentByDni = new Map<string, typeof matrixStudents[0]>();
  const studentByCode = new Map<string, typeof matrixStudents[0]>();
  const studentByName = new Map<string, typeof matrixStudents[0]>();

  matrixStudents.forEach((st) => {
    if (st.documentId) studentByDni.set(st.documentId.trim(), st);
    if (st.studentCode) studentByCode.set(st.studentCode.trim(), st);
    studentByName.set(normalizeText(st.fullName), st);
  });

  // Procesar cada hoja del libro Excel del SIAGIE
  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];
    if (!ws) continue;

    // 1. Intentar emparejar con un Área Madre Consolidada (ej. Matemática, CyT, Comunicación)
    const consolidatedArea = matchConsolidatedAreaForSheet(
      sheetName,
      ws,
      matrix.consolidatedAreas || [],
    );
    // 2. Si no es área consolidada, buscar coincidencia directa de curso interno
    const course = !consolidatedArea ? matchCourseForSheet(sheetName, ws, matrixCourses) : undefined;

    if (!consolidatedArea && !course) {
      // Puede ser hoja de Carátula, Instrucciones o Datos Generales
      continue;
    }

    const structure = detectSheetStructure(ws);
    if (!structure || structure.competencePairs.length === 0) {
      warnings.push(`Hoja "${sheetName}": no se encontraron columnas de calificación compatibles.`);
      continue;
    }

    sheetsProcessed.push(sheetName);

    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:Z100');
    let sheetMatchedStudents = 0;

    // Recorrer filas de estudiantes a partir de la fila siguiente al encabezado
    for (let r = structure.headerRow + 1; r <= range.e.r; r++) {
      const dniCell = ws[XLSX.utils.encode_cell({ r, c: structure.dniCol })];
      if (!dniCell || dniCell.v === undefined || dniCell.v === null) continue;

      const rawDni = String(dniCell.v).trim();
      if (!rawDni) continue;

      totalStudentsInFile++;

      // Buscar estudiante en la matriz del SaaS (código SIAGIE primero, luego DNI, luego nombre)
      let matchedStudent = studentByCode.get(rawDni) || studentByDni.get(rawDni);

      if (!matchedStudent && structure.nameCol !== null) {
        const nameCell = ws[XLSX.utils.encode_cell({ r, c: structure.nameCol })];
        if (nameCell && nameCell.v) {
          const normRowName = normalizeText(String(nameCell.v));
          matchedStudent = studentByName.get(normRowName);
        }
      }

      if (!matchedStudent) {
        warnings.push(`DNI/Cód "${rawDni}" en hoja "${sheetName}" no coincide con ningún estudiante del aula.`);
        continue;
      }

      sheetMatchedStudents++;

      const isInactive =
        matchedStudent.enrollmentState === 'WITHDRAWN' ||
        matchedStudent.enrollmentState === 'TRANSFERRED';

      const studentCourseData = course ? matchedStudent.courseGrades[course.id] : undefined;

      // Inyectar calificaciones para cada competencia emparejada
      structure.competencePairs.forEach((pair) => {
        const califRef = XLSX.utils.encode_cell({ r, c: pair.califCol });
        const concRef = pair.conclusionCol !== null ? XLSX.utils.encode_cell({ r, c: pair.conclusionCol }) : null;

        // Regla 1: Alumno Retirado o Trasladado -> Celdas obligatoriamente en blanco
        if (isInactive) {
          ws[califRef] = { t: 's', v: '' };
          if (concRef) ws[concRef] = { t: 's', v: '' };
          return;
        }

        let letter: string | null = null;
        let rawConc = '';

        if (consolidatedArea) {
          // Obtener competencia consolidada oficial (C1, C2, C3, C4...)
          const comp = consolidatedArea.competences[pair.competenceIndex];
          if (!comp) {
            ws[califRef] = { t: 's', v: '' };
            if (concRef) ws[concRef] = { t: 's', v: '' };
            return;
          }

          const studentAreaData =
            matchedStudent.consolidatedGrades?.[consolidatedArea.code] ||
            matchedStudent.consolidatedGrades?.[consolidatedArea.id];
          const compGrade = studentAreaData?.competences?.[comp.id];

          if (compGrade?.letter) {
            letter = compGrade.letter.trim().toUpperCase();
            rawConc = compGrade.conclusion || '';
          }
        } else if (course) {
          // Obtener competencia de curso directo
          const comp = course.competences[pair.competenceIndex];
          if (!comp) {
            ws[califRef] = { t: 's', v: '' };
            if (concRef) ws[concRef] = { t: 's', v: '' };
            return;
          }

          const compGrade = studentCourseData?.competences?.[comp.id];
          if (compGrade?.letter) {
            letter = compGrade.letter.trim().toUpperCase();
            rawConc = compGrade.conclusion || '';
          }
        }

        // Regla 2: Competencia no trabajada o sin nota -> Celda en blanco ('')
        if (!letter) {
          ws[califRef] = { t: 's', v: '' };
          if (concRef) ws[concRef] = { t: 's', v: '' };
          return;
        }

        // Regla 3: Nota literal en mayúsculas (AD, A, B, C)
        ws[califRef] = { t: 's', v: letter };
        totalInjectedGrades++;

        // Regla 4: Conclusión descriptiva en texto plano continuo sin saltos de línea
        if (concRef) {
          const cleanConc = sanitizeConclusion(rawConc);
          ws[concRef] = { t: 's', v: cleanConc };
          if (cleanConc) {
            totalInjectedConclusions++;
          }
        }
      });
    }

    totalMatchedStudents += sheetMatchedStudents;
  }

  // Generar nuevo binario respetando formato original
  const outputArray = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  });

  const blob = new Blob([outputArray], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  return {
    blob,
    fileName: file.name, // Regla de Oro: mantener exactamente el nombre original del archivo
    matchedStudents: totalMatchedStudents,
    totalStudentsInFile,
    injectedGradesCount: totalInjectedGrades,
    injectedConclusionsCount: totalInjectedConclusions,
    sheetsProcessed,
    warnings,
  };
}
