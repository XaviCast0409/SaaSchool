import type { EducationLevel } from '@/shared/types/academic';

export interface EvaluationCriterion {
  id: string;
  schoolId: string;
  name: string;
  shortName: string;
  weight: number;
  order: number;
  educationLevel?: EducationLevel | null;
  isActive: boolean;
}

export interface DetailedGradeItem {
  id?: string;
  enrollmentId: string;
  competenceId: string;
  criterionId: string;
  numericScore: number | null;
  literalScore?: 'AD' | 'A' | 'B' | 'C' | 'EXO' | '-' | null;
  isExonerated?: boolean;
  comment?: string | null;
}

export interface MatrixStudent {
  id: string;
  firstNames: string;
  lastNamePaternal: string;
  lastNameMaternal: string | null;
  studentCode: string | null;
  documentId: string;
}

export interface MatrixEnrollment {
  id: string; // enrollmentId
  enrollmentState?: 'REGISTERED' | 'TRANSFERRED' | 'WITHDRAWN';
  student: MatrixStudent;
  incidentsSummary?: {
    total: number;
    topics: number;
    convivencia: number;
    acoso: number;
  };
}

export interface MatrixCompetence {
  id: string;
  name: string;
  description?: string | null;
}

export interface MatrixCourseAssignment {
  id: string;
  area: {
    id: string;
    name: string;
    officialCode?: string | null;
    competences: MatrixCompetence[];
  };
  classroom: {
    id: string;
    grade: number;
    section: string;
    educationLevel: EducationLevel;
    shift: string;
    enrollments: MatrixEnrollment[];
  };
  teacher: {
    id: string;
    firstName: string;
    lastNamePaternal: string;
    lastNameMaternal: string;
  };
}

export interface GradeMatrixResponse {
  assignment: MatrixCourseAssignment;
  criteria: EvaluationCriterion[];
  detailedGrades: DetailedGradeItem[];
}

export interface BatchSaveGradesPayload {
  courseAssignmentId: string;
  periodNumber: number;
  grades: Array<{
    enrollmentId: string;
    competenceId: string;
    criterionId: string;
    numericScore?: number | null;
    literalScore?: 'AD' | 'A' | 'B' | 'C' | 'EXO' | '-' | null;
    isExonerated?: boolean;
    comment?: string | null;
  }>;
}
