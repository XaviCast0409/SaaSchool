import { SIAGIE_CATALOGS } from '../students/student.catalogs';

/**
 * Columnas de la plantilla de carga masiva de alumnos. Es la única fuente de verdad: con ella se
 * genera la plantilla y se lee el archivo que devuelve el colegio (las columnas se ubican por su
 * título, así que el colegio puede moverlas o dejar vacías las opcionales).
 */
export type ColumnGroup = 'STUDENT' | 'ENROLLMENT' | 'GUARDIAN' | 'SECOND_GUARDIAN';

export const COLUMN_KEYS = [
  'lastNamePaternal', 'lastNameMaternal', 'firstNames', 'documentType', 'documentId', 'gender', 'birthDate',
  'classroom', 'studentCode', 'condition', 'repeatingGrade', 'previousSchoolModularCode',
  'address', 'residenceUbigeo', 'birthCountry', 'birthUbigeo', 'birthDepartment', 'birthProvince', 'birthDistrict',
  'motherTongue', 'hasDisability', 'disabilityType',
  'guardianRelationship', 'guardianLastNamePaternal', 'guardianLastNameMaternal', 'guardianFirstName',
  'guardianDocumentType', 'guardianDocumentId', 'guardianCellphone', 'guardianEmail', 'guardianEducationLevel', 'guardianLivesWithStudent',
  'guardian2Relationship', 'guardian2LastNamePaternal', 'guardian2LastNameMaternal', 'guardian2FirstName',
  'guardian2DocumentType', 'guardian2DocumentId', 'guardian2Cellphone', 'guardian2Email',
] as const;

export type ColumnKey = (typeof COLUMN_KEYS)[number];
export type RawRow = Record<ColumnKey, string>;

export interface ImportColumn {
  key: ColumnKey;
  header: string;
  group: ColumnGroup;
  required: boolean;
  width: number;
  /** Opciones de la lista desplegable ('CLASSROOMS' = aulas abiertas del colegio en el año). */
  options?: readonly string[] | 'CLASSROOMS';
  /** Texto de ayuda que aparece al seleccionar la celda. */
  help: string;
  example: string;
  example2?: string;
}

export const GROUP_LABEL: Record<ColumnGroup, string> = {
  STUDENT: 'DATOS DEL ALUMNO',
  ENROLLMENT: 'MATRÍCULA',
  GUARDIAN: 'APODERADO PRINCIPAL (apoderado legal y responsable de pago)',
  SECOND_GUARDIAN: 'SEGUNDO APODERADO (opcional)',
};

export const DOCUMENT_TYPE_OPTIONS = ['DNI', 'Carné de extranjería', 'Pasaporte', 'PTP', 'Partida de nacimiento', 'Otro'] as const;
export const GENDER_OPTIONS = ['Hombre', 'Mujer'] as const;
export const YES_NO_OPTIONS = ['Sí', 'No'] as const;
export const CONDITION_OPTIONS = ['Continuo', 'Ingresante', 'Traslado', 'Reentrante'] as const;
export const RELATIONSHIP_OPTIONS = ['Madre', 'Padre', 'Tutor legal', 'Abuelo/a', 'Tío/a', 'Otro'] as const;
export const MOTHER_TONGUE_OPTIONS = SIAGIE_CATALOGS.nativeLanguages.map((language) => language.name);
export const DISABILITY_OPTIONS = SIAGIE_CATALOGS.disabilityTypes.map((disability) => disability.name);
export const GUARDIAN_EDUCATION_OPTIONS = SIAGIE_CATALOGS.educationLevels.map((level) => level.name);

/** La fila de ejemplo de la plantilla empieza así en "Apellido paterno" y nunca se importa. */
export const EXAMPLE_MARKER = 'EJEMPLO';

export const IMPORT_COLUMNS: readonly ImportColumn[] = [
  { key: 'lastNamePaternal', header: 'Apellido paterno', group: 'STUDENT', required: true, width: 20, help: 'Como figura en el DNI.', example: `${EXAMPLE_MARKER} QUISPE` },
  { key: 'lastNameMaternal', header: 'Apellido materno', group: 'STUDENT', required: false, width: 20, help: 'Como figura en el DNI. Déjalo vacío si no tiene.', example: 'MAMANI' },
  { key: 'firstNames', header: 'Nombres', group: 'STUDENT', required: true, width: 24, help: 'Todos los nombres, como figuran en el DNI.', example: 'LUCÍA VALENTINA' },
  { key: 'documentType', header: 'Tipo de documento', group: 'STUDENT', required: false, width: 20, options: DOCUMENT_TYPE_OPTIONS, help: 'Elige de la lista. Si lo dejas vacío se asume DNI.', example: 'DNI' },
  { key: 'documentId', header: 'N.° de documento', group: 'STUDENT', required: true, width: 17, help: 'DNI: 8 dígitos, con sus ceros a la izquierda.', example: '07654321' },
  { key: 'gender', header: 'Sexo', group: 'STUDENT', required: true, width: 11, options: GENDER_OPTIONS, help: 'Hombre o Mujer.', example: 'Mujer' },
  { key: 'birthDate', header: 'Fecha de nacimiento', group: 'STUDENT', required: true, width: 19, help: 'Día/mes/año. Ejemplo: 15/03/2015', example: '15/03/2015' },
  { key: 'classroom', header: 'Aula', group: 'ENROLLMENT', required: true, width: 32, options: 'CLASSROOMS', help: 'Elige el aula de la lista. Si falta alguna, créala en «Aulas y secciones» y vuelve a descargar la plantilla.', example: '' },
  { key: 'studentCode', header: 'Código de estudiante SIAGIE', group: 'ENROLLMENT', required: false, width: 26, help: '14 dígitos. Opcional.', example: '15012345600010' },
  { key: 'condition', header: 'Condición de matrícula', group: 'ENROLLMENT', required: false, width: 22, options: CONDITION_OPTIONS, help: 'Si lo dejas vacío se asume Continuo.', example: 'Continuo' },
  { key: 'repeatingGrade', header: 'Repite el grado', group: 'ENROLLMENT', required: false, width: 15, options: YES_NO_OPTIONS, help: 'Sí o No. Vacío = No.', example: 'No' },
  { key: 'previousSchoolModularCode', header: 'Cód. modular del colegio de procedencia', group: 'ENROLLMENT', required: false, width: 26, help: '7 dígitos. Solo para traslados.', example: '' },
  { key: 'address', header: 'Dirección', group: 'STUDENT', required: false, width: 34, help: 'Dirección donde vive el alumno.', example: 'Av. Los Olivos 123, San Miguel' },
  { key: 'residenceUbigeo', header: 'Ubigeo de residencia', group: 'STUDENT', required: false, width: 19, help: 'Código INEI de 6 dígitos (ej: 150136). Opcional.', example: '150136' },
  { key: 'birthCountry', header: 'País de nacimiento', group: 'STUDENT', required: false, width: 18, help: 'Vacío = Perú.', example: 'PERÚ' },
  { key: 'birthUbigeo', header: 'Ubigeo de nacimiento', group: 'STUDENT', required: false, width: 19, help: 'Código INEI de 6 dígitos. Opcional.', example: '150101' },
  { key: 'birthDepartment', header: 'Departamento de nacimiento', group: 'STUDENT', required: false, width: 24, help: 'Opcional.', example: 'LIMA' },
  { key: 'birthProvince', header: 'Provincia de nacimiento', group: 'STUDENT', required: false, width: 22, help: 'Opcional.', example: 'LIMA' },
  { key: 'birthDistrict', header: 'Distrito de nacimiento', group: 'STUDENT', required: false, width: 22, help: 'Opcional.', example: 'LIMA' },
  { key: 'motherTongue', header: 'Lengua materna', group: 'STUDENT', required: false, width: 22, options: MOTHER_TONGUE_OPTIONS, help: 'Vacío = Castellano.', example: MOTHER_TONGUE_OPTIONS[0] },
  { key: 'hasDisability', header: 'Tiene discapacidad', group: 'STUDENT', required: false, width: 17, options: YES_NO_OPTIONS, help: 'Sí o No. Vacío = No.', example: 'No' },
  { key: 'disabilityType', header: 'Tipo de discapacidad', group: 'STUDENT', required: false, width: 28, options: DISABILITY_OPTIONS, help: 'Solo si marcaste Sí en la columna anterior.', example: '' },

  { key: 'guardianRelationship', header: 'Apoderado: parentesco', group: 'GUARDIAN', required: true, width: 20, options: RELATIONSHIP_OPTIONS, help: 'Relación del apoderado con el alumno.', example: 'Madre' },
  { key: 'guardianLastNamePaternal', header: 'Apoderado: apellido paterno', group: 'GUARDIAN', required: true, width: 24, help: 'Como figura en su DNI.', example: 'MAMANI' },
  { key: 'guardianLastNameMaternal', header: 'Apoderado: apellido materno', group: 'GUARDIAN', required: false, width: 24, help: 'Como figura en su DNI.', example: 'CONDORI' },
  { key: 'guardianFirstName', header: 'Apoderado: nombres', group: 'GUARDIAN', required: true, width: 22, help: 'Como figuran en su DNI.', example: 'ROSA ELENA' },
  { key: 'guardianDocumentType', header: 'Apoderado: tipo de documento', group: 'GUARDIAN', required: false, width: 24, options: DOCUMENT_TYPE_OPTIONS, help: 'Vacío = DNI.', example: 'DNI' },
  { key: 'guardianDocumentId', header: 'Apoderado: N.° de documento', group: 'GUARDIAN', required: true, width: 24, help: 'Con este número ingresará a la plataforma. Si es hermano de otro alumno, repite el mismo número.', example: '41234567' },
  { key: 'guardianCellphone', header: 'Apoderado: celular', group: 'GUARDIAN', required: false, width: 18, help: '9 dígitos, empieza con 9. Muy recomendado.', example: '987654321' },
  { key: 'guardianEmail', header: 'Apoderado: correo', group: 'GUARDIAN', required: false, width: 28, help: 'Opcional. Si no tiene, ingresa con su número de documento.', example: 'rosa.mamani@correo.com' },
  { key: 'guardianEducationLevel', header: 'Apoderado: grado de instrucción', group: 'GUARDIAN', required: false, width: 30, options: GUARDIAN_EDUCATION_OPTIONS, help: 'Opcional.', example: '' },
  { key: 'guardianLivesWithStudent', header: 'Apoderado: vive con el alumno', group: 'GUARDIAN', required: false, width: 24, options: YES_NO_OPTIONS, help: 'Sí o No. Vacío = Sí.', example: 'Sí' },

  { key: 'guardian2Relationship', header: 'Apoderado 2: parentesco', group: 'SECOND_GUARDIAN', required: false, width: 22, options: RELATIONSHIP_OPTIONS, help: 'Llena este bloque solo si quieres registrar a un segundo familiar.', example: 'Padre' },
  { key: 'guardian2LastNamePaternal', header: 'Apoderado 2: apellido paterno', group: 'SECOND_GUARDIAN', required: false, width: 25, help: 'Como figura en su DNI.', example: 'QUISPE' },
  { key: 'guardian2LastNameMaternal', header: 'Apoderado 2: apellido materno', group: 'SECOND_GUARDIAN', required: false, width: 25, help: 'Como figura en su DNI.', example: 'HUAMÁN' },
  { key: 'guardian2FirstName', header: 'Apoderado 2: nombres', group: 'SECOND_GUARDIAN', required: false, width: 22, help: 'Como figuran en su DNI.', example: 'JOSÉ LUIS' },
  { key: 'guardian2DocumentType', header: 'Apoderado 2: tipo de documento', group: 'SECOND_GUARDIAN', required: false, width: 25, options: DOCUMENT_TYPE_OPTIONS, help: 'Vacío = DNI.', example: 'DNI' },
  { key: 'guardian2DocumentId', header: 'Apoderado 2: N.° de documento', group: 'SECOND_GUARDIAN', required: false, width: 25, help: 'Obligatorio si llenas este bloque.', example: '40987654' },
  { key: 'guardian2Cellphone', header: 'Apoderado 2: celular', group: 'SECOND_GUARDIAN', required: false, width: 19, help: '9 dígitos, empieza con 9.', example: '912345678' },
  { key: 'guardian2Email', header: 'Apoderado 2: correo', group: 'SECOND_GUARDIAN', required: false, width: 28, help: 'Opcional.', example: '' },
];

/** Columna extra del archivo de filas rechazadas (la lectura la ignora). */
export const REJECTION_HEADER = 'Motivo del rechazo';
export const DATA_SHEET_NAME = 'Alumnos';
