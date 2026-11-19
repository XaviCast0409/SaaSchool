import type { EducationLevel } from '@/shared/types/academic';

export type Level = EducationLevel;
export type CourseKind = 'OFFICIAL' | 'SUBCOURSE' | 'WORKSHOP';
export type Letter = 'AD' | 'A' | 'B' | 'C';
export type ResultLetter = Letter | 'EXO';
export type PeriodState = 'OPEN' | 'REVIEW' | 'CLOSED';

export const LEVEL_LABEL: Record<Level, string> = { INITIAL: 'Inicial', PRIMARY: 'Primaria', SECONDARY: 'Secundaria' };
export const gradeLabel = (level: Level, grade: number) =>
  level === 'INITIAL' ? `${grade} años` : `${grade}.° ${LEVEL_LABEL[level]}`;
export const classroomLabel = (c: { educationLevel: Level; grade: number; section: string }) =>
  `${gradeLabel(c.educationLevel, c.grade)} "${c.section}"`;

export interface CnebArea {
  code: string;
  name: string;
  competences: number[];
  optional?: boolean;
  isTransversal?: boolean;
}

export interface Catalog {
  competences: Record<number, { name: string; shortName: string }>;
  areas: Record<Level, CnebArea[]>;
  grades: Record<Level, number[]>;
}

export interface TeacherLite {
  id: string;
  firstName: string;
  lastNamePaternal: string;
  lastNameMaternal?: string | null;
}

export const teacherName = (t: TeacherLite) =>
  `${t.lastNamePaternal} ${t.lastNameMaternal ?? ''}`.trim() + `, ${t.firstName}`;
