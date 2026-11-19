import type { EducationLevel } from '@/shared/types/academic';
export type { EducationLevel };

export type ReportCode =
  | '0021' // Consolidado de Estudios
  | '0041' // Registro Auxiliar Borrador
  | '0048' // Orden de mérito y tercios por salón
  | '0049' // Orden de mérito y tercios por grado
  | '0030' // Listado de comentarios a la conducta
  | '0011' // Reporte de Alumnos por Salón
  | '0001' // Listado de Familias por Estado
  | '0002' // Listado de Familias e Hijos
  | '0003' // Listado de Familias y Parientes
  | '0019'; // Listado de Cumpleaños del Alumno

export interface ReportClassroomItem {
  id: string;
  grade: number;
  section: string;
  educationLevel: EducationLevel;
  shift: string;
  tutorTeacher: {
    id: string;
    firstName: string;
    lastNamePaternal: string;
    lastNameMaternal?: string;
  } | null;
  _count: {
    enrollments: number;
    assignments: number;
  };
}

export interface SchoolHeaderInfo {
  id?: string;
  name: string;
  modularCode?: string | null;
  documentId?: string | null;
  logoUrl?: string | null;
  address?: string | null;
}
