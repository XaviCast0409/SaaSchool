export interface GradeItem {
  id: string;
  gradeEntryId: string;
  enrollmentId: string;
  competenceId: string;
  numericScore: number;
  teacherComment?: string;
  competence?: {
    name: string;
  };
}
