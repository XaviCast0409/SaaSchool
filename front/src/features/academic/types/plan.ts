import type { Level, CourseKind } from './common';

export interface PlanCompetence {
  id: string;
  cnebNumber: number | null;
  name: string;
  shortName: string;
  weight: number;
}

export interface PlanCourse {
  planCourseId: string;
  areaId: string;
  name: string;
  kind: CourseKind;
  catalogKey: string | null;
  officialAreaCode: string | null;
  parentAreaId: string | null;
  weeklyHours: number | null;
  order: number;
  competences: PlanCompetence[];
  assignedClassrooms: number;
  hasGrades: boolean;
}

export interface PlanCoverage {
  code: string;
  name: string;
  optional: boolean;
  isTransversal: boolean;
  inPlan: boolean;
  required: number[];
  covered: number[];
  missing: number[];
  conflict: boolean;
}

export interface StudyPlan {
  academicYearId: string;
  level: Level;
  grade: number;
  courses: PlanCourse[];
  coverage: PlanCoverage[];
  requiredMissing: string[];
  isValid: boolean;
}

export interface PreuniversityCourse {
  key: string;
  name: string;
  sanMarcos: boolean;
  byTutor: boolean;
  areaCode: string;
  competences: number[];
  suggestedGrades: number[] | null;
  active: boolean;
  weight: number;
  planCourseId: string | null;
}

export interface PreuniversityArea {
  code: string;
  name: string;
  optional: boolean;
  isTransversal: boolean;
  competences: number[];
  customCourses: Array<{ areaId: string; name: string; competences: number[] }>;
  remainder: { areaId: string; name: string; competences: number[] } | null;
  courses: PreuniversityCourse[];
}

export interface PreuniversityCatalog {
  level: Level;
  grade: number;
  areas: PreuniversityArea[];
}
