/**
 * Catálogos Maestros oficiales SIAGIE (MINEDU Perú)
 */

export interface UbigeoItem {
  code: string; // 6 dígitos INEI
  department: string;
  province: string;
  district: string;
}

export const SIAGIE_CATALOGS = {
  documentTypes: [
    { code: 'DNI', name: 'Documento Nacional de Identidad (DNI)', length: 8, isNumeric: true },
    { code: 'CARNET_EXTRANJERIA', name: 'Carné de Extranjería (CE)', length: 12, isNumeric: false },
    { code: 'CE', name: 'Carné de Extranjería (CE)', length: 12, isNumeric: false },
    { code: 'PASSPORT', name: 'Pasaporte', length: 12, isNumeric: false },
    { code: 'PNA', name: 'Partida de Nacimiento', length: 15, isNumeric: false },
    { code: 'CODIGO_TEMPORAL', name: 'Código de Estudiante Temporal SIAGIE', length: 14, isNumeric: true },
    { code: 'OTHER', name: 'Otro Documento', length: 20, isNumeric: false },
  ],

  genders: [
    { code: 'MALE', name: 'Masculino', symbol: 'M' },
    { code: 'FEMALE', name: 'Femenino', symbol: 'F' },
  ],

  enrollmentConditions: [
    { code: 'INGRESANTE', name: 'Ingresante (Primera matrícula en el sistema educativo)' },
    { code: 'CONTINUO', name: 'Continuo / Promovido (Permanece en la misma I.E.)' },
    { code: 'TRASLADO', name: 'Traslado (Proviene de otra institución educativa)' },
    { code: 'REENTRANTE', name: 'Reentrante (Retoma estudios tras interrupción)' },
  ],

  relationshipTypes: [
    { code: 'MOTHER', name: 'Madre' },
    { code: 'FATHER', name: 'Padre' },
    { code: 'TUTOR_LEGAL', name: 'Tutor / Apoderado Legal' },
    { code: 'GRANDPARENT', name: 'Abuelo/a' },
    { code: 'UNCLE_AUNT', name: 'Tío/a' },
    { code: 'OTHER', name: 'Otro Apoderado' },
  ],

  educationLevels: [
    { code: 'SIN_INSTRUCCION', name: 'Sin Instrucción' },
    { code: 'PRIMARIA_INCOMPLETA', name: 'Primaria Incompleta' },
    { code: 'PRIMARIA_COMPLETA', name: 'Primaria Completa' },
    { code: 'SECUNDARIA_INCOMPLETA', name: 'Secundaria Incompleta' },
    { code: 'SECUNDARIA_COMPLETA', name: 'Secundaria Completa' },
    { code: 'SUPERIOR_NO_UNIVERSITARIA_INCOMPLETA', name: 'Superior Técnica Incompleta' },
    { code: 'SUPERIOR_NO_UNIVERSITARIA_COMPLETA', name: 'Superior Técnica Completa' },
    { code: 'SUPERIOR_UNIVERSITARIA_INCOMPLETA', name: 'Superior Universitaria Incompleta' },
    { code: 'SUPERIOR_UNIVERSITARIA_COMPLETA', name: 'Superior Universitaria Completa' },
    { code: 'POSTGRADO', name: 'Postgrado (Maestría / Doctorado)' },
  ],

  nativeLanguages: [
    { code: 'CASTELLANO', name: 'Castellano / Español' },
    { code: 'QUECHUA', name: 'Quechua' },
    { code: 'AYMARA', name: 'Aymara' },
    { code: 'ASHANINKA', name: 'Asháninka' },
    { code: 'AWAJUN', name: 'Awajún' },
    { code: 'SHIPIBO_KONIBO', name: 'Shipibo-Konibo' },
    { code: 'OTRA', name: 'Otra lengua originaria / extranjera' },
  ],

  disabilityTypes: [
    { code: 'VISUAL', name: 'Discapacidad Visual' },
    { code: 'AUDITIVA', name: 'Discapacidad Auditiva' },
    { code: 'MOTORA', name: 'Discapacidad Motora / Física' },
    { code: 'INTELECTUAL', name: 'Discapacidad Intelectual' },
    { code: 'TEA', name: 'Trastorno del Espectro Autista (TEA)' },
    { code: 'PSICOSOCIAL', name: 'Discapacidad Psicosocial' },
    { code: 'SORDOCEGUERA', name: 'Sordoceguera' },
    { code: 'MULTIPLE', name: 'Multidiscapacidad' },
    { code: 'OTRA', name: 'Otra condición NEE' },
  ],

  // Principales Ubigeos INEI de referencia rápida (Departamentos y capitales/distritos clave)
  commonUbigeos: [
    { code: '150101', department: 'LIMA', province: 'LIMA', district: 'LIMA' },
    { code: '150102', department: 'LIMA', province: 'LIMA', district: 'ANCON' },
    { code: '150103', department: 'LIMA', province: 'LIMA', district: 'ATE' },
    { code: '150104', department: 'LIMA', province: 'LIMA', district: 'BARRANCO' },
    { code: '150105', department: 'LIMA', province: 'LIMA', district: 'BREÑA' },
    { code: '150106', department: 'LIMA', province: 'LIMA', district: 'CARABAYLLO' },
    { code: '150107', department: 'LIMA', province: 'LIMA', district: 'CHACLACAYO' },
    { code: '150108', department: 'LIMA', province: 'LIMA', district: 'CHORRILLOS' },
    { code: '150109', department: 'LIMA', province: 'LIMA', district: 'CIENEGUILLA' },
    { code: '150110', department: 'LIMA', province: 'LIMA', district: 'COMAS' },
    { code: '150111', department: 'LIMA', province: 'LIMA', district: 'EL AGUSTINO' },
    { code: '150112', department: 'LIMA', province: 'LIMA', district: 'INDEPENDENCIA' },
    { code: '150113', department: 'LIMA', province: 'LIMA', district: 'JESUS MARIA' },
    { code: '150114', department: 'LIMA', province: 'LIMA', district: 'LA MOLINA' },
    { code: '150115', department: 'LIMA', province: 'LIMA', district: 'LA VICTORIA' },
    { code: '150116', department: 'LIMA', province: 'LIMA', district: 'LINCE' },
    { code: '150117', department: 'LIMA', province: 'LIMA', district: 'LOS OLIVOS' },
    { code: '150118', department: 'LIMA', province: 'LIMA', district: 'LURIGANCHO' },
    { code: '150119', department: 'LIMA', province: 'LIMA', district: 'LURIN' },
    { code: '150120', department: 'LIMA', province: 'LIMA', district: 'MAGDALENA DEL MAR' },
    { code: '150121', department: 'LIMA', province: 'LIMA', district: 'PUEBLO LIBRE' },
    { code: '150122', department: 'LIMA', province: 'LIMA', district: 'MIRAFLORES' },
    { code: '150123', department: 'LIMA', province: 'LIMA', district: 'PACHACAMAC' },
    { code: '150124', department: 'LIMA', province: 'LIMA', district: 'PUCUSANA' },
    { code: '150125', department: 'LIMA', province: 'LIMA', district: 'PUENTE PIEDRA' },
    { code: '150126', department: 'LIMA', province: 'LIMA', district: 'PUNTA HERMOSA' },
    { code: '150127', department: 'LIMA', province: 'LIMA', district: 'PUNTA NEGRA' },
    { code: '150128', department: 'LIMA', province: 'LIMA', district: 'RIMAC' },
    { code: '150129', department: 'LIMA', province: 'LIMA', district: 'SAN BARTOLO' },
    { code: '150130', department: 'LIMA', province: 'LIMA', district: 'SAN BORJA' },
    { code: '150131', department: 'LIMA', province: 'LIMA', district: 'SAN ISIDRO' },
    { code: '150132', department: 'LIMA', province: 'LIMA', district: 'SAN JUAN DE LURIGANCHO' },
    { code: '150133', department: 'LIMA', province: 'LIMA', district: 'SAN JUAN DE MIRAFLORES' },
    { code: '150134', department: 'LIMA', province: 'LIMA', district: 'SAN LUIS' },
    { code: '150135', department: 'LIMA', province: 'LIMA', district: 'SAN MARTIN DE PORRES' },
    { code: '150136', department: 'LIMA', province: 'LIMA', district: 'SAN MIGUEL' },
    { code: '150137', department: 'LIMA', province: 'LIMA', district: 'SANTA ANITA' },
    { code: '150138', department: 'LIMA', province: 'LIMA', district: 'SANTA MARIA DEL MAR' },
    { code: '150139', department: 'LIMA', province: 'LIMA', district: 'SANTA ROSA' },
    { code: '150140', department: 'LIMA', province: 'LIMA', district: 'SANTIAGO DE SURCO' },
    { code: '150141', department: 'LIMA', province: 'LIMA', district: 'SURQUILLO' },
    { code: '150142', department: 'LIMA', province: 'LIMA', district: 'VILLA EL SALVADOR' },
    { code: '150143', department: 'LIMA', province: 'LIMA', district: 'VILLA MARIA DEL TRIUNFO' },
    { code: '070101', department: 'CALLAO', province: 'CALLAO', district: 'CALLAO' },
    { code: '070102', department: 'CALLAO', province: 'CALLAO', district: 'BELLAVISTA' },
    { code: '070103', department: 'CALLAO', province: 'CALLAO', district: 'CARMEN DE LA LEGUA REYNOSO' },
    { code: '070104', department: 'CALLAO', province: 'CALLAO', district: 'LA PERLA' },
    { code: '070105', department: 'CALLAO', province: 'CALLAO', district: 'LA PUNTA' },
    { code: '070106', department: 'CALLAO', province: 'CALLAO', district: 'VENTANILLA' },
    { code: '070107', department: 'CALLAO', province: 'CALLAO', district: 'MI PERU' },
    { code: '040101', department: 'AREQUIPA', province: 'AREQUIPA', district: 'AREQUIPA' },
    { code: '130101', department: 'LA LIBERTAD', province: 'TRUJILLO', district: 'TRUJILLO' },
    { code: '080101', department: 'CUSCO', province: 'CUSCO', district: 'CUSCO' },
    { code: '200101', department: 'PIURA', province: 'PIURA', district: 'PIURA' },
    { code: '140101', department: 'LAMBAYEQUE', province: 'CHICLAYO', district: 'CHICLAYO' },
    { code: '120101', department: 'JUNIN', province: 'HUANCAYO', district: 'HUANCAYO' },
    { code: '160101', department: 'LORETO', province: 'MAYNAS', district: 'IQUITOS' },
    { code: '210101', department: 'PUNO', province: 'PUNO', district: 'PUNO' },
    { code: '230101', department: 'TACNA', province: 'TACNA', district: 'TACNA' },
    { code: '020101', department: 'ANCASH', province: 'HUARAZ', district: 'HUARAZ' },
    { code: '021801', department: 'ANCASH', province: 'SANTA', district: 'CHIMBOTE' },
    { code: '110101', department: 'ICA', province: 'ICA', district: 'ICA' },
    { code: '110201', department: 'ICA', province: 'CHINCHA', district: 'CHINCHA ALTA' },
    { code: '110501', department: 'ICA', province: 'PISCO', district: 'PISCO' },
  ] as UbigeoItem[],
};
