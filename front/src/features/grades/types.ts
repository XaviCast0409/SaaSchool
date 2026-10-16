export interface EvaluationCriterion {
  id: string;
  schoolId: string;
  name: string;
  shortName: string;
  weight: number;
  order: number;
  educationLevel?: 'INITIAL' | 'PRIMARY' | 'SECONDARY' | null;
  isActive: boolean;
}

export interface DetailedGradeItem {
  id?: string;
  enrollmentId: string;
  competenceId: string;
  criterionId: string;
  numericScore: number;
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
    educationLevel: 'INITIAL' | 'PRIMARY' | 'SECONDARY';
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
    numericScore: number;
    comment?: string | null;
  }>;
}

export interface SiagieConversion {
  letter: 'AD' | 'A' | 'B' | 'C';
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  badgeClass: string;
  textClass: string;
}

export function getSiagieConversion(score: number): SiagieConversion {
  const rounded = Math.round(score * 10) / 10;
  if (rounded >= 17.5) {
    return {
      letter: 'AD',
      label: 'Logro Destacado',
      variant: 'default',
      badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
      textClass: 'text-emerald-600 dark:text-emerald-400',
    };
  }
  if (rounded >= 13.5) {
    return {
      letter: 'A',
      label: 'Logro Esperado',
      variant: 'secondary',
      badgeClass: 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30',
      textClass: 'text-sky-600 dark:text-sky-400',
    };
  }
  if (rounded >= 10.5) {
    return {
      letter: 'B',
      label: 'En Proceso',
      variant: 'outline',
      badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
      textClass: 'text-amber-600 dark:text-amber-400',
    };
  }
  return {
    letter: 'C',
    label: 'En Inicio',
    variant: 'destructive',
    badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30',
    textClass: 'text-rose-600 dark:text-rose-400',
  };
}

// ==========================================
// Tipos para Report Card / Libreta de Notas
// ==========================================
export interface ReportCardPeriod {
  periodNumber: number;
  periodScore: number | null;
  siagie: {
    numeric: number;
    letter: 'AD' | 'A' | 'B' | 'C';
    label: string;
  } | null;
  competences: Array<{
    competenceId: string;
    competenceName: string;
    score: number | null;
    siagie: {
      numeric: number;
      letter: 'AD' | 'A' | 'B' | 'C';
      label: string;
    } | null;
    conclusion?: string | null;
  }>;
}

// ==========================================
// Tipos para Conclusiones Descriptivas
// ==========================================
export interface CompetenceConclusionStudent {
  enrollmentId: string;
  orderIndex: number;
  studentId: string;
  fullName: string;
  documentId: string;
  studentCode: string | null;
  score: number | null;
  letter: 'AD' | 'A' | 'B' | 'C' | null;
  conclusion: string;
}

export interface CompetenceConclusionsResponse {
  assignment: {
    id: string;
    areaName: string;
    officialCode?: string | null;
    classroom: {
      id: string;
      grade: number;
      section: string;
      educationLevel: 'INITIAL' | 'PRIMARY' | 'SECONDARY';
    };
    teacher: {
      firstName: string;
      lastNamePaternal: string;
    };
    competences: Array<{
      id: string;
      name: string;
      description?: string | null;
    }>;
  };
  selectedCompetence: {
    id: string;
    name: string;
    description?: string | null;
  };
  periodNumber: number;
  students: CompetenceConclusionStudent[];
}

export interface BatchSaveConclusionsPayload {
  courseAssignmentId: string;
  competenceId: string;
  periodNumber: number;
  conclusions: Array<{
    enrollmentId: string;
    conclusion: string;
  }>;
}

export interface ReportCardCourse {
  assignmentId: string;
  areaName: string;
  officialCode?: string | null;
  teacherName: string;
  periods: ReportCardPeriod[];
  annualScore: number | null;
  annualSiagie: {
    numeric: number;
    letter: 'AD' | 'A' | 'B' | 'C';
    label: string;
  } | null;
}

export interface ReportCardData {
  school: {
    name: string;
    modularCode?: string | null;
    documentId: string;
    address?: string | null;
    logoUrl?: string | null;
  };
  student: {
    fullName: string;
    studentCode?: string | null;
    documentId: string;
  };
  classroom: {
    grade: number;
    section: string;
    educationLevel: 'INITIAL' | 'PRIMARY' | 'SECONDARY';
    shift: string;
  };
  academicYear: number;
  attendanceStats: {
    present: number;
    lateJustified: number;
    lateUnjustified: number;
    absentJustified: number;
    absentUnjustified: number;
    totalRegisteredDays: number;
  };
  courses: ReportCardCourse[];
  generalAnnualAverage: number | null;
  generalAnnualSiagie: {
    numeric: number;
    letter: 'AD' | 'A' | 'B' | 'C';
    label: string;
  } | null;
}

// ==========================================
// Tipos para Resumen SIAGIE
// ==========================================
export interface SiagieCourseSummary {
  assignmentId: string;
  areaName: string;
  officialCode?: string | null;
  teacherName: string;
  competenceCount: number;
  totalExpectedGrades: number;
  filledGradesCount: number;
  percentage: number;
  isComplete: boolean;
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

export interface SiagieMatrixStudent {
  enrollmentId: string;
  orderIndex: number;
  documentId: string;
  studentCode: string | null;
  fullName: string;
  courseGrades: Record<
    string,
    {
      periodScore: number | null;
      letter: 'AD' | 'A' | 'B' | 'C' | null;
      competences: Record<
        string,
        {
          score: number | null;
          letter: 'AD' | 'A' | 'B' | 'C' | null;
        }
      >;
    }
  >;
  generalScore: number | null;
  generalLetter: 'AD' | 'A' | 'B' | 'C' | null;
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
  educationLevel: 'INITIAL' | 'PRIMARY' | 'SECONDARY';
  totalStudents: number;
  periodNumber: number;
  overallPercentage: number;
  courses: SiagieCourseSummary[];
  matrix?: {
    courses: SiagieMatrixCourse[];
    students: SiagieMatrixStudent[];
  };
}

// ==========================================
// Tipos para Cierre y Bloqueo de Periodos (Dirección)
// ==========================================
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

