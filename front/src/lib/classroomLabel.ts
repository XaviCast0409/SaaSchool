import type { Classroom } from '@/features/classrooms/types';
import { formatEducationLevel } from '@/lib/utils';

const LEVEL_ORDER: Record<string, number> = {
  INITIAL: 1,
  PRIMARY: 2,
  SECONDARY: 3,
};

export function formatClassroomLabel(c: Pick<Classroom, 'grade' | 'section' | 'educationLevel'>): string {
  return `${c.grade}° "${c.section}" — ${formatEducationLevel(c.educationLevel)}`;
}

export function sortClassrooms<T extends Pick<Classroom, 'grade' | 'section' | 'educationLevel'>>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const levelDiff = (LEVEL_ORDER[a.educationLevel] ?? 99) - (LEVEL_ORDER[b.educationLevel] ?? 99);
    if (levelDiff !== 0) return levelDiff;
    const gradeDiff = a.grade - b.grade;
    if (gradeDiff !== 0) return gradeDiff;
    return a.section.localeCompare(b.section);
  });
}
