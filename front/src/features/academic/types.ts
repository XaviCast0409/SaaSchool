import type { SiagieMatrixData } from '@/features/grades/types';

export type Level = 'INITIAL' | 'PRIMARY' | 'SECONDARY';
export type CourseKind = 'OFFICIAL' | 'SUBCOURSE' | 'WORKSHOP';
export type Letter = 'AD' | 'A' | 'B' | 'C';
export type ResultLetter = Letter | 'EXO';
export type PeriodState = 'OPEN' | 'REVIEW' | 'CLOSED';

export const LEVEL_LABEL: Record<Level, string> = { INITIAL: 'Inicial', PRIMARY: 'Primaria', SECONDARY: 'Secundaria' };
export const gradeLabel = (level: Level, grade: number) => (level === 'INITIAL' ? `${grade} años` : `${grade}.° ${LEVEL_LABEL[level]}`);
export const classroomLabel = (c: { educationLevel: Level; grade: number; section: string }) => `${gradeLabel(c.educationLevel, c.grade)} "${c.section}"`;

export interface CnebArea { code: string; name: string; competences: number[]; optional?: boolean; isTransversal?: boolean }
export interface Catalog {
  competences: Record<number, { name: string; shortName: string }>;
  areas: Record<Level, CnebArea[]>;
  grades: Record<Level, number[]>;
}

export interface PlanCompetence { id: string; cnebNumber: number | null; name: string; shortName: string; weight: number }
export interface PlanCourse {
  planCourseId: string; areaId: string; name: string; kind: CourseKind; officialAreaCode: string | null; parentAreaId: string | null;
  weeklyHours: number | null; order: number; competences: PlanCompetence[]; assignedClassrooms: number; hasGrades: boolean;
}
export interface PlanCoverage {
  code: string; name: string; optional: boolean; isTransversal: boolean; inPlan: boolean;
  required: number[]; covered: number[]; missing: number[]; conflict: boolean;
}
export interface StudyPlan {
  academicYearId: string; level: Level; grade: number; courses: PlanCourse[]; coverage: PlanCoverage[]; requiredMissing: string[]; isValid: boolean;
}

export interface TeacherLite { id: string; firstName: string; lastNamePaternal: string; lastNameMaternal?: string | null }
export const teacherName = (t: TeacherLite) => `${t.lastNamePaternal} ${t.lastNameMaternal ?? ''}`.trim() + `, ${t.firstName}`;
export interface LoadCell {
  areaId: string; name: string; kind: CourseKind; isTransversal: boolean; weeklyHours: number | null;
  assignmentId: string | null; teacherId: string | null; hasGrades: boolean;
}
export interface LoadClassroom { id: string; grade: number; section: string; shift: string; tutorTeacherId: string | null; courses: LoadCell[] }
export interface TeachingLoad {
  academicYearId: string; level: Level; teachers: TeacherLite[]; classrooms: LoadClassroom[];
  teacherLoad: Array<{ teacherId: string; courses: number; weeklyHours: number }>;
}

export interface MyCourse {
  id: string; academicYearId: string;
  classroom: { id: string; educationLevel: Level; grade: number; section: string; tutorTeacherId: string | null };
  area: { id: string; name: string; kind: CourseKind; officialAreaCode: string | null; isTransversal: boolean };
}

export interface PeriodInfo {
  periodNumber: number; name: string; startDate: string; endDate: string; status: PeriodState;
  gradingDeadline: string | null; reason: string | null; changedAt: string | null;
  overrides: Array<{ classroomId: string; status: PeriodState; reason: string | null; classroom: { grade: number; section: string; educationLevel: Level } | null }>;
}
export interface PeriodsResponse { academicYearId: string; year: number; annualCalculationMode: string; periods: PeriodInfo[] }

export interface SetupStatus {
  academicYear: { id: string; year: number; periodType: string; hasPeriods: boolean };
  gradesInUse: number; invalidPlans: Array<{ level: Level; grade: number }>; classrooms: number; classroomsWithoutTutor: number;
  coursesWithoutTeacher: number; teachers: number; teachersWithoutLoad: number;
}

export interface GradebookStudent { enrollmentId: string; state: 'REGISTERED' | 'TRANSFERRED' | 'WITHDRAWN'; fullName: string; studentCode: string | null; documentId: string }
export interface GradebookScore { enrollmentId: string; competenceId: string; criterionId: string; numericScore: number | null; literalScore: string | null; isExonerated: boolean }
export interface GradebookResult { enrollmentId: string; competenceId: string; computedScore: number | null; suggestedLetter: ResultLetter | null; finalLetter: ResultLetter | null; isOverridden: boolean }
export interface GradebookData {
  assignment: {
    id: string; academicYearId: string;
    classroom: { id: string; educationLevel: Level; grade: number; section: string };
    area: { id: string; name: string; kind: CourseKind; officialAreaCode: string | null };
    teacher: TeacherLite;
  };
  periodNumber: number; periodCount: number; periodStatus: PeriodState; canEdit: boolean; requiresReason: boolean;
  competences: Array<{ id: string; cnebNumber: number | null; name: string; shortName: string }>;
  criteria: Array<{ id: string; name: string; shortName: string; weight: number; isCustom: boolean }>;
  students: GradebookStudent[]; scores: GradebookScore[]; results: GradebookResult[];
  conclusions: Array<{ enrollmentId: string; competenceId: string; conclusion: string }>;
  conclusionMaxLength: number;
  thresholds: { AD: number; A: number; B: number };
}

export interface ProgressRow {
  assignmentId: string; classroom: { id: string; educationLevel: Level; grade: number; section: string }; course: string; kind: CourseKind;
  teacher: { id: string; name: string }; students: number; expected: number; filled: number; percent: number; missingGrades: number; missingConclusions: number;
}
export interface ProgressResponse {
  academicYearId: string; periodNumber: number; rows: ProgressRow[];
  totals: { expected: number; filled: number; missingGrades: number; missingConclusions: number; percent: number };
}

export interface ConsolidationIssue { type: string; message: string; enrollmentId?: string; areaCode?: string; cnebNumber?: number }
export interface ConsolidationResponse {
  school: { name: string; modularCode: string | null; documentId: string; address: string | null; logoUrl: string | null } | null;
  classroom: { id: string; educationLevel: Level; grade: number; section: string; label: string; tutor: string | null };
  academicYear: { id: string; year: number; annualCalculationMode: string };
  period: number | 'FINAL';
  matrix: SiagieMatrixData;
  issues: ConsolidationIssue[];
  summary: { totalStudents: number; missingGrades: number; missingConclusions: number; missingStudentCodes: number; coursesWithoutTeacher: number };
}

export interface ReportCard {
  school: { name: string; modularCode: string | null; documentId: string; address: string | null; logoUrl: string | null } | null;
  student: { fullName: string; studentCode: string | null; documentId: string };
  classroom: { educationLevel: Level; grade: number; section: string; label: string };
  academicYear: { year: number; annualCalculationMode: string };
  tutor: string | null;
  periods: Array<{ periodNumber: number; name: string; status: PeriodState }>;
  visiblePeriods: number[];
  officialAreas: Array<{
    code: string; name: string;
    competences: Array<{ number: number; name: string; shortName: string; letters: Record<number, ResultLetter | null>; conclusions: Record<number, string>; finalLetter: ResultLetter | null }>;
  }>;
  internalCourses: Array<{ name: string; kind: CourseKind; teacher: string; competences: Array<{ name: string; letters: Record<number, ResultLetter | null> }> }>;
  attendance: Array<{ periodNumber: number; absentJustified: number; absentUnjustified: number; lateJustified: number; lateUnjustified: number }>;
  finalSituation: string | null;
  scaleLegend: Array<{ letter: string; label: string }>;
}
