import { EDUCATION_LEVEL_LABELS } from '@/lib/utils';
import { ReportCode } from '../types';

export const LEVEL_LABELS = EDUCATION_LEVEL_LABELS;

export interface ReportItemDefinition {
  code: ReportCode | string;
  name: string;
  category: string;
  subCategory: string;
  defaultOrientation: 'Horizontal' | 'Vertical';
  description: string;
  isImplemented: boolean;
}

export const ALL_REPORTS_CATALOG: ReportItemDefinition[] = [
  // Menú: Mantenimiento (2) -> Familias (3)
  {
    code: '0001',
    name: 'Listado de Familias por Estado',
    category: 'Mantenimiento',
    subCategory: 'Familias',
    defaultOrientation: 'Vertical',
    description: 'Relación de familias registradas en el sistema clasificadas por estado de matrícula y convivencia.',
    isImplemented: true,
  },
  {
    code: '0002',
    name: 'Listado de Familias e Hijos',
    category: 'Mantenimiento',
    subCategory: 'Familias',
    defaultOrientation: 'Vertical',
    description: 'Padrón de padres de familia agrupados con el detalle de sus hijos matriculados.',
    isImplemented: true,
  },
  {
    code: '0003',
    name: 'Listado de Familias y Parientes',
    category: 'Mantenimiento',
    subCategory: 'Familias',
    defaultOrientation: 'Vertical',
    description: 'Directorio de contactos de emergencia, apoderados legales y parentesco.',
    isImplemented: true,
  },
  // Menú: Mantenimiento -> Alumnos (1)
  {
    code: '0019',
    name: 'Listado de Cumpleaños del Alumno',
    category: 'Mantenimiento',
    subCategory: 'Alumnos',
    defaultOrientation: 'Vertical',
    description: 'Cronograma mensual y anual de aniversarios de nacimiento de los estudiantes del colegio.',
    isImplemented: true,
  },
  // Menú: Registro (2) -> Notas (5)
  {
    code: '0021',
    name: 'Consolidado de Estudios',
    category: 'Registro',
    subCategory: 'Notas',
    defaultOrientation: 'Horizontal',
    description:
      'Matriz oficial cruzada de calificaciones por asignaturas, promedios, orden de mérito, tercios y récord de asistencia para actas bimestrales.',
    isImplemented: true,
  },
  {
    code: '0041',
    name: 'Registro Auxiliar Borrador',
    category: 'Registro',
    subCategory: 'Notas',
    defaultOrientation: 'Horizontal',
    description:
      'Plantilla cuadriculada en blanco para uso físico del docente en aula con lista de alumnos oficial y columnas de criterios de evaluación.',
    isImplemented: true,
  },
  {
    code: '0048',
    name: 'Orden de mérito y tercios por salón',
    category: 'Registro',
    subCategory: 'Notas',
    defaultOrientation: 'Vertical',
    description:
      'Escalafón jerárquico de rendimiento académico del salón, clasificación de tercios (Superior, Medio, Inferior) y estadísticas de aprobados e invictos.',
    isImplemented: true,
  },
  {
    code: '0049',
    name: 'Orden de mérito y tercios por grado',
    category: 'Registro',
    subCategory: 'Notas',
    defaultOrientation: 'Vertical',
    description:
      'Ranking unificado consolidando todas las secciones del grado con cálculo de Tercios y Quintos superiores para certificaciones oficiales.',
    isImplemented: true,
  },
  // Menú: Registro -> Conducta (1)
  {
    code: '0030',
    name: 'Listado de los comentarios a la conducta',
    category: 'Registro',
    subCategory: 'Conducta',
    defaultOrientation: 'Vertical',
    description:
      'Apreciaciones cualitativas, deméritos y observaciones de comportamiento registradas por el tutor de aula.',
    isImplemented: true,
  },
  // Menú: Reportes -> Generación de Reportes (1)
  {
    code: '0011',
    name: 'Reporte de Alumnos por Salón',
    category: 'Reportes',
    subCategory: 'Generación de Reportes',
    defaultOrientation: 'Vertical',
    description:
      'Padrón oficial de matrícula del salón con códigos SIAGIE, documentos de identidad, género y datos de apoderados.',
    isImplemented: true,
  },
];
