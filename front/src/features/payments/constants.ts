import type { EducationLevel, FeeSchedule } from './api/useFeeSchedules';

export const CONCEPTS: Record<string, string> = {
  PENSION: 'Pensión',
  MATRICULA: 'Matrícula',
  LIBROS_MATERIALES: 'Libros y materiales',
  UNIFORME: 'Uniforme',
  CARNET_AGENDA: 'Carné / agenda',
  CUOTA_INGRESO: 'Cuota de ingreso',
  EXCURSION_EVENTO: 'Excursión / evento',
  OTROS: 'Otros',
};

export const LEVELS: EducationLevel[] = ['INITIAL', 'PRIMARY', 'SECONDARY'];

export const scopeLabel = (f: Pick<FeeSchedule, 'educationLevel' | 'grade'>) =>
  f.grade === null ? 'Todo el nivel' : f.educationLevel === 'INITIAL' ? `${f.grade} años` : `${f.grade}° grado`;
