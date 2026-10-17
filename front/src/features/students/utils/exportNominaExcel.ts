import * as XLSX from 'xlsx';
import type { NominaMatriculaResponse } from '../api/useStudents';

/**
 * Calcula la edad del estudiante cumplida al 31 de marzo del año lectivo,
 * según la normativa técnica del MINEDU / SIAGIE.
 */
function calculateAgeAtMarch31(birthDateStr: string, academicYear: number): number {
  const birthDate = new Date(birthDateStr);
  if (isNaN(birthDate.getTime())) return 0;

  const refDate = new Date(academicYear, 2, 31); // 31 de marzo (mes 2 es marzo en JS)
  let age = refDate.getFullYear() - birthDate.getFullYear();
  const birthMonth = birthDate.getMonth();
  const birthDay = birthDate.getDate();

  if (birthMonth > 2 || (birthMonth === 2 && birthDay > 31)) {
    age--;
  }

  return Math.max(0, age);
}

/**
 * Formatea una fecha ISO a DD/MM/AAAA
 */
function formatDateToDMY(isoDateStr: string): string {
  if (!isoDateStr) return '';
  const date = new Date(isoDateStr);
  if (isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Genera y descarga el archivo Excel oficial (.xlsx) de la Nómina de Matrícula SIAGIE
 */
export function exportNominaToExcel(data: NominaMatriculaResponse): void {
  const currentYear = data.academicYear?.year || new Date().getFullYear();
  const totalStudents = data.students.length;
  const countMales = data.students.filter((s) => s.gender === 'MALE').length;
  const countFemales = data.students.filter((s) => s.gender === 'FEMALE').length;

  const tutorName = data.classroom.tutorTeacher
    ? `${data.classroom.tutorTeacher.lastNamePaternal} ${data.classroom.tutorTeacher.lastNameMaternal}, ${data.classroom.tutorTeacher.firstName}`
    : 'NO ASIGNADO';

  // 1. Encabezado Oficial Institucional MINEDU
  const title1 = ['REPÚBLICA DEL PERÚ - MINISTERIO DE EDUCACIÓN'];
  const title2 = [`NÓMINA OFICIAL DE MATRÍCULA SIAGIE - AÑO ESCOLAR ${currentYear}`];
  const blankRow: string[] = [];

  const metaRow1 = [
    'DRE / UGEL:',
    `${data.school.department || 'LIMA'} / ${data.school.province || 'LIMA'}`,
    '',
    'CÓDIGO MODULAR:',
    data.school.modularCode || '---',
    '',
    'CÓDIGO LOCAL:',
    data.school.localCode || '---',
  ];

  const metaRow2 = [
    'INSTITUCIÓN EDUCATIVA:',
    data.school.name.toUpperCase(),
    '',
    'DIRECCIÓN:',
    data.school.address || '---',
    '',
    'UBICACIÓN:',
    `${data.school.district || ''} - ${data.school.province || ''}`,
  ];

  const metaRow3 = [
    'NIVEL EDUCATIVO:',
    data.classroom.educationLevel,
    'GRADO Y SECCIÓN:',
    `${data.classroom.grade}° "${data.classroom.section}"`,
    'TURNO:',
    data.classroom.shift,
    'DOCENTE TUTOR(A):',
    tutorName,
  ];

  const metaRow4 = [
    'FECHA DE GENERACIÓN:',
    new Date().toLocaleDateString('es-PE'),
    'TOTAL MATRICULADOS:',
    String(totalStudents),
    'VARONES (M):',
    String(countMales),
    'MUJERES (F):',
    String(countFemales),
  ];

  // 2. Encabezados de Columnas Oficiales SIAGIE
  const headers = [
    'N° DE ORDEN',
    'CÓDIGO DE EDUCANDO (SIAGIE)',
    'TIPO DOC.',
    'NÚMERO DE DOCUMENTO',
    'APELLIDO PATERNO',
    'APELLIDO MATERNO',
    'NOMBRES',
    'SEXO',
    'FECHA DE NACIMIENTO',
    'EDAD (AL 31/03)',
    'PAÍS DE NACIMIENTO',
    'UBIGEO RESIDENCIA',
    'LENGUA MATERNA',
    'DISCAPACIDAD / NEE',
    'CONDICIÓN DE MATRÍCULA',
    '¿REPITE GRADO?',
    'DNI / DOC. APODERADO',
    'APODERADO (APELLIDOS Y NOMBRES)',
    'PARENTESCO',
    'TELÉFONO / CELULAR',
    'CORREO ELECTRÓNICO',
    'DIRECCIÓN DE DOMICILIO',
  ];

  // 3. Filas de Datos de Alumnos
  const dataRows = data.students.map((student, index) => {
    const age = calculateAgeAtMarch31(student.birthDate, currentYear);
    const birthFormatted = formatDateToDMY(student.birthDate);

    const conditionMap: Record<string, string> = {
      INGRESANTE: 'INGRESANTE',
      CONTINUO: 'CONTINUO',
      TRASLADO: 'TRASLADO',
      REENTRANTE: 'REENTRANTE',
    };

    const relationshipMap: Record<string, string> = {
      MOTHER: 'MADRE',
      FATHER: 'PADRE',
      TUTOR_LEGAL: 'TUTOR LEGAL',
      GRANDPARENT: 'ABUELO(A)',
      UNCLE_AUNT: 'TÍO(A)',
      OTHER: 'OTRO',
    };

    const disabilityText = student.hasDisability
      ? `SÍ (${student.disabilityType || 'NEE'})`
      : 'NO';

    return [
      index + 1,
      student.studentCode || 'SIN CÓDIGO',
      student.documentType,
      student.documentId,
      student.lastNamePaternal.toUpperCase(),
      (student.lastNameMaternal || '').toUpperCase(),
      student.firstNames.toUpperCase(),
      student.gender === 'MALE' ? 'M' : 'F',
      birthFormatted,
      age,
      student.birthCountry || 'PERÚ',
      student.residenceUbigeo || student.birthUbigeo || '---',
      student.motherTongue || 'CASTELLANO',
      disabilityText,
      conditionMap[student.condition] || student.condition,
      student.repeatingGrade ? 'SÍ' : 'NO',
      student.guardian?.documentId || '---',
      student.guardian?.fullName || '---',
      student.guardian?.relationshipType ? (relationshipMap[student.guardian.relationshipType] || student.guardian.relationshipType) : '---',
      student.guardian?.cellphone || '---',
      student.guardian?.email || '---',
      student.address || '---',
    ];
  });

  // 4. Resumen y Bloque de Firmas
  const summaryTitle = ['', 'RESUMEN OFICIAL DE LA NÓMINA:'];
  const summaryDetails = [
    '',
    `Total Estudiantes Matriculados: ${totalStudents} | Varones (M): ${countMales} | Mujeres (F): ${countFemales}`,
  ];
  const signatureLine = ['', '', '', '__________________________________________________'];
  const signatureLabel = ['', '', '', 'Firma y Sello de la Dirección de la I.E.'];
  const signatureModular = ['', '', '', `Código Modular: ${data.school.modularCode || '---'}`];

  const sheetData = [
    title1,
    title2,
    blankRow,
    metaRow1,
    metaRow2,
    metaRow3,
    metaRow4,
    blankRow,
    headers,
    ...dataRows,
    blankRow,
    summaryTitle,
    summaryDetails,
    blankRow,
    blankRow,
    signatureLine,
    signatureLabel,
    signatureModular,
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

  // Anchos de columnas optimizados para visualización profesional
  worksheet['!cols'] = [
    { wch: 12 }, // N°
    { wch: 18 }, // Código SIAGIE
    { wch: 10 }, // Tipo Doc
    { wch: 15 }, // Número Doc
    { wch: 18 }, // Apellido Paterno
    { wch: 18 }, // Apellido Materno
    { wch: 22 }, // Nombres
    { wch: 8 },  // Sexo
    { wch: 14 }, // Fecha Nac.
    { wch: 15 }, // Edad 31/03
    { wch: 14 }, // País
    { wch: 14 }, // Ubigeo
    { wch: 15 }, // Lengua Materna
    { wch: 18 }, // Discapacidad
    { wch: 16 }, // Condición
    { wch: 10 }, // Repite
    { wch: 15 }, // DNI Apoderado
    { wch: 28 }, // Nombre Apoderado
    { wch: 14 }, // Parentesco
    { wch: 16 }, // Celular
    { wch: 24 }, // Correo
    { wch: 30 }, // Dirección
  ];

  const workbook = XLSX.utils.book_new();
  const safeSheetName = `NOMINA_${data.classroom.grade}${data.classroom.section}_${data.classroom.educationLevel}`.slice(0, 31);
  XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);

  const fileName = `Nomina_Oficial_SIAGIE_${data.classroom.grade}${data.classroom.section}_${data.classroom.educationLevel}_${currentYear}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
