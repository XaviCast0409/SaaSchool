import type { Level, CourseKind, TeacherLite } from './common';

export interface LoadCell {
  areaId: string;
  name: string;
  kind: CourseKind;
  isTransversal: boolean;
  weeklyHours: number | null;
  assignmentId: string | null;
  teacherId: string | null;
  hasGrades: boolean;
}

export interface LoadClassroom {
  id: string;
  grade: number;
  section: string;
  shift: string;
  tutorTeacherId: string | null;
  courses: LoadCell[];
}

export interface TeachingLoad {
  academicYearId: string;
  level: Level;
  teachers: TeacherLite[];
  classrooms: LoadClassroom[];
  teacherLoad: Array<{ teacherId: string; courses: number; weeklyHours: number }>;
}

export interface MyCourse {
  id: string;
  academicYearId: string;
  classroom: { id: string; educationLevel: Level; grade: number; section: string; tutorTeacherId: string | null };
  area: { id: string; name: string; kind: CourseKind; officialAreaCode: string | null; isTransversal: boolean };
}

export interface PeriodInfo {
  periodNumber: number;
  name: string;
  startDate: string;
  endDate: string;
  status: 'OPEN' | 'REVIEW' | 'CLOSED';
  gradingDeadline: string | null;
  reason: string | null;
  changedAt: string | null;
  overrides: Array<{
    classroomId: string;
    status: 'OPEN' | 'REVIEW' | 'CLOSED';
    reason: string | null;
    classroom: { grade: number; section: string; educationLevel: Level } | null;
  }>;
}

export interface PeriodsResponse {
  academicYearId: string;
  year: number;
  annualCalculationMode: string;
  periods: PeriodInfo[];
}

export interface SetupStatus {
  academicYear: { id: string; year: number; periodType: string; hasPeriods: boolean };
  gradesInUse: number;
  invalidPlans: Array<{ level: Level; grade: number }>;
  classrooms: number;
  classroomsWithoutTutor: number;
  coursesWithoutTeacher: number;
  teachers: number;
  teachersWithoutLoad: number;
}
