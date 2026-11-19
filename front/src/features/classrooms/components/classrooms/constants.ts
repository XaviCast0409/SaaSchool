import { EDUCATION_LEVEL_LABELS, SHIFT_LABELS } from '@/lib/utils';

export type Level = 'INITIAL' | 'PRIMARY' | 'SECONDARY';
export type Shift = 'MORNING' | 'AFTERNOON' | 'NIGHT';

export const LEVEL_LABEL = EDUCATION_LEVEL_LABELS as Record<Level, string>;
export const SHIFT_LABEL = SHIFT_LABELS as Record<Shift, string>;

export const LEVEL_GRADES: Record<Level, number[]> = {
  INITIAL: [3, 4, 5],
  PRIMARY: [1, 2, 3, 4, 5, 6],
  SECONDARY: [1, 2, 3, 4, 5],
};

export const gradeLabel = (level: Level, grade: number) =>
  level === 'INITIAL' ? `${grade} años` : `${grade}.° ${LEVEL_LABEL[level]}`;

export const roomLabel = (c: { educationLevel: Level; grade: number; section: string }) =>
  `${gradeLabel(c.educationLevel, c.grade)} "${c.section}"`;

export interface TeacherOption {
  id: string;
  name: string;
  tutorOf?: string;
  tutorOfLabel?: string;
}
