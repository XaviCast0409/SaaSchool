import type { EducationLevel, SchoolHeaderInfo } from './common';

// ============================================================================
// 0021: Consolidado de Estudios
// ============================================================================
export interface ConsolidatedStudentRow {
  enrollmentId: string;
  orderIndex: number;
  studentId: string;
  studentCode: string | null;
  documentId: string;
  fullName: string;
  gender: string;
  courseScores: Record<string, number | null>;
  conduct: number;
  average: number | null;
  points: number;
  failedCoursesCount: number;
  hasNoGrades: boolean;
  meritOrder: number | null;
  tercio: 'SUP' | 'MED' | 'INF' | null;
  attendance: {
    lateUnjustified: number;
    lateJustified: number;
    absentUnjustified: number;
    absentJustified: number;
  };
}

export interface CourseStatItem {
  average: number | null;
  approvedCount: number;
  failedCount: number;
  approvedPercent: number;
  failedPercent: number;
  maxScore: number | null;
  minScore: number | null;
}

export interface ConsolidatedGradesReportData {
  school: SchoolHeaderInfo;
  classroom: {
    id: string;
    grade: number;
    section: string;
    educationLevel: EducationLevel;
    shift: string;
    tutorTeacher: string;
  };
  periodNumber: number;
  courses: Array<{
    id: string;
    name: string;
    officialCode?: string | null;
    teacherName: string;
  }>;
  students: ConsolidatedStudentRow[];
  courseStats: Record<string, CourseStatItem>;
  totalAttendances: {
    lateUnjustified: number;
    lateJustified: number;
    absentUnjustified: number;
    absentJustified: number;
  };
  totalStudents: number;
  reportCode: string;
}

// ============================================================================
// 0048: Orden de Mérito por Salón
// ============================================================================
export interface MeritClassroomStudent {
  rank: number | null;
  fullName: string;
  gender: string;
  average: string;
  points: number;
  approvedCoursesCount: number;
  failedCoursesCount: number;
  hasNoGrades: boolean;
  conduct: number;
  tercio: string;
}

export interface TercioStatRow {
  total: number;
  percent: number;
  initialScore: number;
  finalScore: number;
  average: number;
}

export interface MeritClassroomReportData {
  school: SchoolHeaderInfo;
  classroom: {
    id: string;
    grade: number;
    section: string;
    educationLevel: EducationLevel;
    shift: string;
    tutorTeacher: string;
  };
  periodNumber: number;
  students: MeritClassroomStudent[];
  statistics: {
    studentCounts: {
      invictos: number;
      withFailed: number;
      withoutGrades: number;
      blankGrades: number;
      withdrawn: number;
      total: number;
    };
    tercios: {
      superior: TercioStatRow;
      medio: TercioStatRow;
      inferior: TercioStatRow;
      withoutTercio: {
        total: number;
        percent: number;
      };
    };
    classroomAverage: number;
    maxScore: number;
    minScore: number;
  };
  reportCode: string;
}

// ============================================================================
// 0049: Orden de Mérito por Grado
// ============================================================================
export interface MeritGradeStudent {
  rank: number;
  enrollmentId: string;
  fullName: string;
  gender: string;
  section: string;
  average: string;
  points: number;
  approvedCoursesCount: number;
  failedCoursesCount: number;
  hasNoGrades: boolean;
  conduct: number;
  tercio: string;
  quinto: string;
}

export interface MeritGradeReportData {
  school: SchoolHeaderInfo;
  educationLevel: EducationLevel;
  grade: number;
  periodNumber: number;
  students: MeritGradeStudent[];
  statistics: {
    studentCounts: {
      invictos: number;
      withFailed: number;
      withoutGrades: number;
      blankGrades: number;
      withdrawn: number;
      total: number;
    };
    tercios: {
      superior: TercioStatRow;
      medio: TercioStatRow;
      inferior: TercioStatRow;
      withoutTercio: {
        total: number;
        percent: number;
      };
    };
    gradeAverage: number;
    maxScore: number;
    minScore: number;
  };
  reportCode: string;
}

// ============================================================================
// 0041: Registro Auxiliar Borrador
// ============================================================================
export interface DraftRegisterReportData {
  school: SchoolHeaderInfo;
  classroom: {
    id: string;
    grade: number;
    section: string;
    educationLevel: EducationLevel;
  };
  course: {
    id: string;
    name: string;
    officialCode?: string | null;
    teacherName: string;
  } | null;
  students: Array<{
    index: number;
    enrollmentId: string;
    studentCode: string | null;
    documentId: string;
    fullName: string;
  }>;
  blankCriteriaColumnsCount: number;
  reportCode: string;
}

// ============================================================================
// 0030: Comentarios a la Conducta
// ============================================================================
export interface ConductCommentsReportData {
  school: SchoolHeaderInfo;
  classroom: {
    id: string;
    grade: number;
    section: string;
    educationLevel: EducationLevel;
    tutorTeacher: string;
  };
  periodNumber: number;
  students: Array<{
    index: number;
    enrollmentId: string;
    studentCode: string | null;
    documentId: string;
    fullName: string;
    conductScore: number;
    comments: string;
  }>;
  reportCode: string;
}
