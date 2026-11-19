import type { EducationLevel } from '@/shared/types/academic';

export interface SiagieConversion {
  letter: 'AD' | 'A' | 'B' | 'C';
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  badgeClass: string;
  textClass: string;
}

export interface SiagieCourseSummary {
  assignmentId: string;
  areaName: string;
  officialCode?: string | null;
  teacherName: string;
  competenceCount: number;
  workedCompetenceCount?: number;
  unworkedCompetenceCount?: number;
  totalExpectedGrades: number;
  filledGradesCount: number;
  percentage: number;
  isComplete: boolean;
  hasInconsistencies?: boolean;
}

export interface SiagieMatrixCourse {
  id: string;
  name: string;
  officialCode?: string | null;
  teacherName: string;
  competences: Array<{
    id: string;
    name: string;
  }>;
}

export interface SiagieConsolidatedAreaCompetence {
  id: string;
  number: number;
  name: string;
  shortName: string;
}

export interface SiagieConsolidatedArea {
  id: string;
  code: string;
  name: string;
  isSubdivided: boolean;
  tributaryCourses: string[];
  competences: SiagieConsolidatedAreaCompetence[];
}

export interface SiagieMatrixStudent {
  enrollmentId: string;
  enrollmentState?: 'REGISTERED' | 'TRANSFERRED' | 'WITHDRAWN';
  /** Cuenta en el periodo consultado (matriculado, o retirado después de completarlo) */
  activeInPeriod?: boolean;
  withdrawalDate?: string | null;
  orderIndex: number;
  documentId: string;
  studentCode: string | null;
  fullName: string;
  courseGrades: Record<
    string,
    {
      periodScore: number | null;
      letter: 'AD' | 'A' | 'B' | 'C' | 'EXO' | '-' | null;
      competences: Record<
        string,
        {
          score: number | null;
          letter: 'AD' | 'A' | 'B' | 'C' | 'EXO' | '-' | null;
          conclusion?: string;
        }
      >;
    }
  >;
  consolidatedGrades?: Record<
    string,
    {
      periodScore: number | null;
      letter: 'AD' | 'A' | 'B' | 'C' | 'EXO' | '-' | null;
      competences: Record<
        string,
        {
          score: number | null;
          letter: 'AD' | 'A' | 'B' | 'C' | 'EXO' | '-' | null;
          conclusion: string;
        }
      >;
    }
  >;
  generalScore: number | null;
  generalLetter: 'AD' | 'A' | 'B' | 'C' | null;
  finalSituation?: 'PROMOTED' | 'RECOVERY' | 'RETAINED' | 'TRANSFERRED' | 'WITHDRAWN' | null;
  failedAreasCount?: number;
  finalSituationIsProvisional?: boolean;
}

export interface SiagieMatrixData {
  courses: SiagieMatrixCourse[];
  students: SiagieMatrixStudent[];
  consolidatedAreas?: SiagieConsolidatedArea[];
}

export interface SiagieSummaryData {
  school?: {
    name: string;
    modularCode?: string | null;
    documentId: string;
  };
  classroomId: string;
  grade: number;
  section: string;
  educationLevel: EducationLevel;
  totalStudents: number;
  periodNumber: number;
  overallPercentage: number;
  courses: SiagieCourseSummary[];
  matrix?: SiagieMatrixData;
  unmappedCompetences?: Array<{
    areaName: string;
    competenceCode: string;
    competenceName: string;
  }>;
  calculationMode?: 'LAST_PERIOD' | 'AVERAGE';
}

export interface PeriodLockStatus {
  isLocked: boolean;
  lockedAt?: string | null;
  lockedBy?: string | null;
  reason?: string | null;
  classroomId?: string | null;
  periodNumber: number;
}

export interface TogglePeriodLockPayload {
  periodNumber: number;
  classroomId?: string | null;
  isLocked: boolean;
  reason?: string | null;
}
