import { secretariatKeys } from './keys';

export type Level = 'INITIAL' | 'PRIMARY' | 'SECONDARY';
export type AdmissionStatus = 'NEW' | 'INTERVIEW' | 'ADMITTED' | 'ENROLLED' | 'REJECTED' | 'WITHDRAWN';
export type DocumentStatus = 'REQUESTED' | 'IN_PROCESS' | 'READY' | 'DELIVERED' | 'REJECTED';
export type DocumentType =
  | 'CONSTANCIA_ESTUDIOS'
  | 'CONSTANCIA_MATRICULA'
  | 'CONSTANCIA_CONDUCTA'
  | 'CONSTANCIA_NO_ADEUDO'
  | 'CERTIFICADO_ESTUDIOS'
  | 'LIBRETA_NOTAS'
  | 'OTRO';

export const ADMISSION_LABEL: Record<AdmissionStatus, string> = {
  NEW: 'Nueva',
  INTERVIEW: 'Entrevista',
  ADMITTED: 'Admitido',
  ENROLLED: 'Registrado',
  REJECTED: 'No admitido',
  WITHDRAWN: 'Desistió',
};

export const DOCUMENT_STATUS_LABEL: Record<DocumentStatus, string> = {
  REQUESTED: 'Solicitado',
  IN_PROCESS: 'En proceso',
  READY: 'Listo',
  DELIVERED: 'Entregado',
  REJECTED: 'Observado',
};

export const DOCUMENT_TYPE_LABEL: Record<DocumentType, string> = {
  CONSTANCIA_ESTUDIOS: 'Constancia de estudios',
  CONSTANCIA_MATRICULA: 'Constancia de matrícula',
  CONSTANCIA_CONDUCTA: 'Constancia de conducta',
  CONSTANCIA_NO_ADEUDO: 'Constancia de no adeudo',
  CERTIFICADO_ESTUDIOS: 'Certificado de estudios',
  LIBRETA_NOTAS: 'Copia de libreta de notas',
  OTRO: 'Otro documento',
};

export const LEVEL_LABEL: Record<Level, string> = { INITIAL: 'Inicial', PRIMARY: 'Primaria', SECONDARY: 'Secundaria' };

export const gradeOptions = (level: Level): Array<{ value: number; label: string }> =>
  level === 'INITIAL'
    ? [3, 4, 5].map((g) => ({ value: g, label: `${g} años` }))
    : Array.from({ length: level === 'PRIMARY' ? 6 : 5 }, (_, i) => ({ value: i + 1, label: `${i + 1}.° grado` }));

export const KEY = secretariatKeys.all;

