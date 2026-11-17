import { UBIGEO_CODES } from '../students/ubigeo.catalog';
import type { DocumentType, EnrollmentCondition, Gender, RelationshipType } from '@prisma/client';
import { SIAGIE_CATALOGS } from '../students/student.catalogs';
import type { RawRow } from './student-import.columns';

/**
 * Reglas puras de la carga masiva: convierten lo que el colegio escribió en el Excel en datos
 * listos para guardar, y explican en lenguaje llano qué está mal en cada fila. Sin base de datos.
 */

export interface ImportGuardian {
  relationshipType: RelationshipType;
  firstName: string;
  lastNamePaternal: string;
  lastNameMaternal: string;
  documentType: DocumentType;
  documentId: string;
  cellphone: string | null;
  email: string | null;
  educationLevel: string | null;
  livesWithStudent: boolean;
}

export interface ImportStudent {
  firstNames: string;
  lastNamePaternal: string;
  lastNameMaternal: string | null;
  documentType: DocumentType;
  documentId: string;
  gender: Gender;
  birthDate: Date;
  studentCode: string | null;
  address: string | null;
  residenceUbigeo: string | null;
  birthCountry: string | null;
  birthUbigeo: string | null;
  birthDepartment: string | null;
  birthProvince: string | null;
  birthDistrict: string | null;
  motherTongue: string | null;
  hasDisability: boolean | null;
  disabilityType: string | null;
}

export interface ImportEnrollment {
  classroomText: string;
  condition: EnrollmentCondition;
  repeatingGrade: boolean;
  previousSchoolModularCode: string | null;
}

export interface ParsedImportRow {
  rowNumber: number;
  raw: RawRow;
  /** null cuando la fila tiene errores que impiden construir al alumno. */
  student: ImportStudent | null;
  enrollment: ImportEnrollment;
  guardian: ImportGuardian | null;
  secondGuardian: ImportGuardian | null;
  issues: string[]; // Impiden cargar la fila
  warnings: string[]; // Informativos: la fila se carga igual
}

export const normalizeText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const clean = (value: string | undefined): string => (value ?? '').replace(/\s+/g, ' ').trim();
const orNull = (value: string): string | null => (value ? value : null);
const upper = (value: string): string => value.toLocaleUpperCase('es');

/** Excel guarda como número lo que el colegio pega sin formato de texto: 7654321, 9.87654321E8, 7654321.0 */
export function cleanIdentifier(value: string): string {
  const text = clean(value).replace(/\s/g, '');
  if (/^\d+(\.\d+)?E\+?\d+$/i.test(text)) return Number(text).toFixed(0);
  return text.replace(/\.0+$/, '');
}

export function parseDocumentType(text: string): DocumentType | null {
  const normalized = normalizeText(text);
  if (!normalized) return 'DNI';
  if (normalized === 'dni' || normalized.includes('documento nacional')) return 'DNI';
  if (normalized.includes('extranjer') || normalized === 'ce') return 'CE';
  if (normalized.includes('pasaporte') || normalized === 'passport') return 'PASSPORT';
  if (normalized === 'ptp' || normalized.includes('permiso temporal')) return 'PTP';
  if (normalized.includes('partida') || normalized === 'pna') return 'PNA';
  if (normalized.startsWith('otro')) return 'OTHER';
  return null;
}

export function parseGender(text: string): Gender | null {
  const normalized = normalizeText(text);
  if (['hombre', 'h', 'm', 'masculino', 'varon', 'male'].includes(normalized)) return 'MALE';
  if (['mujer', 'f', 'femenino', 'female'].includes(normalized)) return 'FEMALE';
  return null;
}

/** dd/mm/aaaa, aaaa-mm-dd o el número de serie con que Excel guarda las fechas. Medianoche UTC. */
export function parseDate(text: string): Date | null {
  const value = clean(text);
  if (!value) return null;
  const build = (year: number, month: number, day: number): Date | null => {
    const date = new Date(Date.UTC(year, month - 1, day));
    const isReal = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
    return isReal ? date : null;
  };
  const dayFirst = value.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (dayFirst) return build(Number(dayFirst[3]), Number(dayFirst[2]), Number(dayFirst[1]));
  const iso = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return build(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  if (/^\d+(\.\d+)?$/.test(value)) {
    const serial = Number(value);
    if (serial > 20000 && serial < 80000) return new Date(Date.UTC(1899, 11, 30) + Math.floor(serial) * 86_400_000);
  }
  return null;
}

/** Sí/No. Devuelve null si está vacío o no se entiende (quien llama decide el valor por defecto). */
export function parseYesNo(text: string): boolean | null {
  const normalized = normalizeText(text);
  if (['si', 's', 'x', '1', 'true', 'verdadero'].includes(normalized)) return true;
  if (['no', 'n', '0', 'false', 'falso'].includes(normalized)) return false;
  return null;
}

export function parseCondition(text: string): EnrollmentCondition | null {
  const normalized = normalizeText(text);
  if (!normalized) return 'CONTINUO';
  if (normalized.startsWith('continu') || normalized.startsWith('promovid')) return 'CONTINUO';
  if (normalized.startsWith('ingres') || normalized.startsWith('nuevo')) return 'INGRESANTE';
  if (normalized.startsWith('traslad')) return 'TRASLADO';
  if (normalized.startsWith('reentr') || normalized.startsWith('reingres')) return 'REENTRANTE';
  return null;
}

export function parseRelationship(text: string): RelationshipType | null {
  const normalized = normalizeText(text);
  if (['madre', 'mama', 'mother'].includes(normalized)) return 'MOTHER';
  if (['padre', 'papa', 'father'].includes(normalized)) return 'FATHER';
  if (normalized.includes('tutor') || normalized.includes('apoderado')) return 'TUTOR_LEGAL';
  if (normalized.startsWith('abuel')) return 'GRANDPARENT';
  if (normalized.startsWith('tio') || normalized.startsWith('tia')) return 'UNCLE_AUNT';
  if (normalized.startsWith('otr') || normalized.startsWith('herman')) return 'OTHER';
  return null;
}

/** Busca el código de catálogo a partir del nombre o del propio código que escribió el colegio. */
function catalogCode(catalog: ReadonlyArray<{ code: string; name: string }>, text: string): string | null {
  const normalized = normalizeText(text);
  if (!normalized) return null;
  const exact = catalog.find((item) => normalizeText(item.name) === normalized || normalizeText(item.code) === normalized);
  if (exact) return exact.code;
  const partial = catalog.find((item) => normalizeText(item.name).startsWith(normalized) || normalized.startsWith(normalizeText(item.code)));
  return partial?.code ?? null;
}

/** Valida el número según el tipo de documento. Devuelve el número limpio o el motivo del error. */
export function checkDocument(type: DocumentType, rawNumber: string, owner: string): { documentId: string; issue: string | null; warning: string | null } {
  let documentId = cleanIdentifier(rawNumber).toUpperCase();
  if (!documentId) return { documentId, issue: `Falta el número de documento ${owner}.`, warning: null };
  if (type === 'DNI') {
    let warning: string | null = null;
    // Excel quita los ceros a la izquierda cuando la celda no es de texto
    if (/^\d{6,7}$/.test(documentId)) {
      documentId = documentId.padStart(8, '0');
      warning = `Al DNI ${owner} le faltaban ceros a la izquierda: se registra como ${documentId}.`;
    }
    if (!/^\d{8}$/.test(documentId)) return { documentId, issue: `El DNI ${owner} debe tener 8 dígitos (dice "${documentId}").`, warning: null };
    return { documentId, issue: null, warning };
  }
  if (!/^[A-Z0-9-]{6,15}$/.test(documentId)) {
    return { documentId, issue: `El documento ${owner} debe tener entre 6 y 15 letras o números (dice "${documentId}").`, warning: null };
  }
  return { documentId, issue: null, warning: null };
}

function parseCellphone(text: string, owner: string, warnings: string[]): string | null {
  const digits = cleanIdentifier(text).replace(/\D/g, '').replace(/^51(?=9\d{8}$)/, '');
  if (!digits) return null;
  if (/^9\d{8}$/.test(digits)) return digits;
  warnings.push(`El celular ${owner} no es válido ("${clean(text)}"): debe tener 9 dígitos y empezar con 9. Se carga sin celular.`);
  return null;
}

function parseEmail(text: string, owner: string, warnings: string[]): string | null {
  const email = clean(text).toLowerCase();
  if (!email) return null;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return email;
  warnings.push(`El correo ${owner} no es válido ("${email}"). Se carga sin correo.`);
  return null;
}

function optionalUbigeo(text: string, label: string, warnings: string[]): string | null {
  const value = cleanIdentifier(text);
  if (!value) return null;
  const padded = /^\d{5}$/.test(value) ? value.padStart(6, '0') : value;
  if (/^\d{6}$/.test(padded)) {
    if (UBIGEO_CODES.has(padded)) return padded;
    warnings.push(`El ${label} "${padded}" no existe en el catálogo del INEI. Se carga sin ese dato.`);
    return null;
  }
  warnings.push(`El ${label} debe tener 6 dígitos ("${value}"). Se carga sin ese dato.`);
  return null;
}

interface GuardianCells {
  relationship: string; lastNamePaternal: string; lastNameMaternal: string; firstName: string;
  documentType: string; documentId: string; cellphone: string; email: string; educationLevel: string; livesWithStudent: string;
}

function parseGuardian(cells: GuardianCells, owner: string, issues: string[], warnings: string[]): ImportGuardian | null {
  const before = issues.length;
  const relationshipType = parseRelationship(cells.relationship);
  if (!clean(cells.relationship)) issues.push(`Falta el parentesco ${owner}.`);
  else if (!relationshipType) issues.push(`Parentesco ${owner} no reconocido: "${clean(cells.relationship)}".`);
  const firstName = upper(clean(cells.firstName));
  const lastNamePaternal = upper(clean(cells.lastNamePaternal));
  if (firstName.length < 2) issues.push(firstName ? `Los nombres ${owner} son muy cortos ("${firstName}").` : `Faltan los nombres ${owner}.`);
  if (lastNamePaternal.length < 2) issues.push(lastNamePaternal ? `El apellido paterno ${owner} es muy corto ("${lastNamePaternal}").` : `Falta el apellido paterno ${owner}.`);
  const documentType = parseDocumentType(cells.documentType);
  if (!documentType) issues.push(`Tipo de documento ${owner} no reconocido: "${clean(cells.documentType)}".`);
  const document = checkDocument(documentType ?? 'DNI', cells.documentId, owner);
  if (document.issue) issues.push(document.issue);
  if (document.warning) warnings.push(document.warning);
  if (issues.length > before || !relationshipType || !documentType) return null;

  const educationText = clean(cells.educationLevel);
  const educationLevel = catalogCode(SIAGIE_CATALOGS.educationLevels, educationText);
  if (educationText && !educationLevel) warnings.push(`Grado de instrucción ${owner} no reconocido ("${educationText}"). Se carga sin ese dato.`);
  return {
    relationshipType,
    firstName,
    lastNamePaternal,
    lastNameMaternal: upper(clean(cells.lastNameMaternal)),
    documentType,
    documentId: document.documentId,
    cellphone: parseCellphone(cells.cellphone, owner, warnings),
    email: parseEmail(cells.email, owner, warnings),
    educationLevel,
    livesWithStudent: parseYesNo(cells.livesWithStudent) ?? true,
  };
}

const MIN_AGE_YEARS = 2;
const MAX_AGE_YEARS = 25;

export function parseImportRow(raw: RawRow, rowNumber: number, today: Date = new Date()): ParsedImportRow {
  const issues: string[] = [];
  const warnings: string[] = [];

  // ── Alumno
  const firstNames = upper(clean(raw.firstNames));
  const lastNamePaternal = upper(clean(raw.lastNamePaternal));
  if (lastNamePaternal.length < 2) issues.push(lastNamePaternal ? `El apellido paterno del alumno es muy corto ("${lastNamePaternal}").` : 'Falta el apellido paterno del alumno.');
  if (firstNames.length < 2) issues.push(firstNames ? `Los nombres del alumno son muy cortos ("${firstNames}").` : 'Faltan los nombres del alumno.');

  const documentType = parseDocumentType(raw.documentType);
  if (!documentType) issues.push(`Tipo de documento del alumno no reconocido: "${clean(raw.documentType)}".`);
  const document = checkDocument(documentType ?? 'DNI', raw.documentId, 'del alumno');
  if (document.issue) issues.push(document.issue);
  if (document.warning) warnings.push(document.warning);

  const gender = parseGender(raw.gender);
  if (!clean(raw.gender)) issues.push('Falta el sexo del alumno.');
  else if (!gender) issues.push(`Sexo no reconocido: "${clean(raw.gender)}". Usa Hombre o Mujer.`);

  const birthDate = parseDate(raw.birthDate);
  if (!clean(raw.birthDate)) issues.push('Falta la fecha de nacimiento.');
  else if (!birthDate) issues.push(`Fecha de nacimiento no válida: "${clean(raw.birthDate)}". Usa día/mes/año, por ejemplo 15/03/2015.`);
  else {
    const age = (today.getTime() - birthDate.getTime()) / (365.25 * 86_400_000);
    if (age < 0) issues.push('La fecha de nacimiento está en el futuro.');
    else if (age < MIN_AGE_YEARS || age > MAX_AGE_YEARS) warnings.push(`Revisa la fecha de nacimiento: el alumno tendría ${Math.floor(age)} años.`);
  }

  const rawCode = cleanIdentifier(raw.studentCode);
  let studentCode: string | null = null;
  if (rawCode) {
    if (/^\d{14}$/.test(rawCode)) studentCode = rawCode;
    else warnings.push(`El código de estudiante SIAGIE debe tener 14 dígitos ("${rawCode}"). Se carga sin código.`);
  }

  const motherTongueText = clean(raw.motherTongue);
  const motherTongue = catalogCode(SIAGIE_CATALOGS.nativeLanguages, motherTongueText);
  if (motherTongueText && !motherTongue) warnings.push(`Lengua materna no reconocida ("${motherTongueText}"). Se registra Castellano.`);

  const disabilityText = clean(raw.disabilityType);
  const disabilityType = catalogCode(SIAGIE_CATALOGS.disabilityTypes, disabilityText);
  if (disabilityText && !disabilityType) warnings.push(`Tipo de discapacidad no reconocido ("${disabilityText}"). Se registra como "Otra".`);
  const hasDisabilityAnswer = parseYesNo(raw.hasDisability);
  const hasDisability = disabilityText ? true : hasDisabilityAnswer;

  // ── Matrícula
  const classroomText = clean(raw.classroom);
  if (!classroomText) issues.push('Falta el aula.');
  const condition = parseCondition(raw.condition);
  if (!condition) warnings.push(`Condición de matrícula no reconocida ("${clean(raw.condition)}"). Se registra Continuo.`);
  const modularCode = cleanIdentifier(raw.previousSchoolModularCode);
  let previousSchoolModularCode: string | null = null;
  if (modularCode) {
    if (/^\d{6,7}$/.test(modularCode)) previousSchoolModularCode = modularCode.padStart(7, '0');
    else warnings.push(`El código modular del colegio de procedencia debe tener 7 dígitos ("${modularCode}"). Se carga sin ese dato.`);
  }

  // ── Apoderados
  const guardian = parseGuardian({
    relationship: raw.guardianRelationship, lastNamePaternal: raw.guardianLastNamePaternal, lastNameMaternal: raw.guardianLastNameMaternal,
    firstName: raw.guardianFirstName, documentType: raw.guardianDocumentType, documentId: raw.guardianDocumentId,
    cellphone: raw.guardianCellphone, email: raw.guardianEmail, educationLevel: raw.guardianEducationLevel, livesWithStudent: raw.guardianLivesWithStudent,
  }, 'del apoderado', issues, warnings);

  const secondCells: GuardianCells = {
    relationship: raw.guardian2Relationship, lastNamePaternal: raw.guardian2LastNamePaternal, lastNameMaternal: raw.guardian2LastNameMaternal,
    firstName: raw.guardian2FirstName, documentType: raw.guardian2DocumentType, documentId: raw.guardian2DocumentId,
    cellphone: raw.guardian2Cellphone, email: raw.guardian2Email, educationLevel: '', livesWithStudent: '',
  };
  let secondGuardian: ImportGuardian | null = null;
  const secondFilled = [secondCells.lastNamePaternal, secondCells.firstName, secondCells.documentId].some((cell) => clean(cell));
  if (secondFilled) {
    // El segundo apoderado es opcional: si está incompleto no bloquea al alumno, solo se omite
    const secondIssues: string[] = [];
    secondGuardian = parseGuardian(secondCells, 'del segundo apoderado', secondIssues, warnings);
    if (secondIssues.length) warnings.push(`El segundo apoderado no se carga: ${secondIssues.join(' ')}`);
    if (secondGuardian && guardian && secondGuardian.documentId === guardian.documentId) {
      warnings.push('El segundo apoderado tiene el mismo documento que el principal: se omite.');
      secondGuardian = null;
    }
  }

  for (const [person, owner] of [[guardian, 'El apoderado'], [secondGuardian, 'El segundo apoderado']] as const) {
    if (person && person.documentId === document.documentId) issues.push(`${owner} tiene el mismo número de documento que el alumno.`);
  }

  const student: ImportStudent | null = issues.length === 0 && documentType && gender && birthDate
    ? {
        firstNames,
        lastNamePaternal,
        lastNameMaternal: orNull(upper(clean(raw.lastNameMaternal))),
        documentType,
        documentId: document.documentId,
        gender,
        birthDate,
        studentCode,
        address: orNull(clean(raw.address)),
        residenceUbigeo: optionalUbigeo(raw.residenceUbigeo, 'ubigeo de residencia', warnings),
        birthCountry: orNull(upper(clean(raw.birthCountry))),
        birthUbigeo: optionalUbigeo(raw.birthUbigeo, 'ubigeo de nacimiento', warnings),
        birthDepartment: orNull(upper(clean(raw.birthDepartment))),
        birthProvince: orNull(upper(clean(raw.birthProvince))),
        birthDistrict: orNull(upper(clean(raw.birthDistrict))),
        motherTongue,
        hasDisability,
        disabilityType: hasDisability ? (disabilityType ?? (disabilityText ? 'OTRA' : null)) : null,
      }
    : null;

  return {
    rowNumber,
    raw,
    student,
    enrollment: {
      classroomText,
      condition: condition ?? 'CONTINUO',
      repeatingGrade: parseYesNo(raw.repeatingGrade) ?? false,
      previousSchoolModularCode,
    },
    guardian: issues.length === 0 ? guardian : null,
    secondGuardian,
    issues,
    warnings,
  };
}

/** Texto único con que se identifica un aula en la plantilla y al leerla (sin tildes ni símbolos). */
export const classroomMatchKey = (label: string): string => normalizeText(label);
