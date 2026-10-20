export type ReportCode =
  | '0021' // Consolidado de Estudios
  | '0041' // Registro Auxiliar Borrador
  | '0048' // Orden de mérito y tercios por salón
  | '0049' // Orden de mérito y tercios por grado
  | '0030' // Listado de comentarios a la conducta
  | '0011' // Reporte de Alumnos por Salón
  | '0001' // Listado de Familias por Estado
  | '0002' // Listado de Familias e Hijos
  | '0003' // Listado de Familias y Parientes
  | '0019'; // Listado de Cumpleaños del Alumno

export type EducationLevel = 'INITIAL' | 'PRIMARY' | 'SECONDARY';

export interface ReportClassroomItem {
  id: string;
  grade: number;
  section: string;
  educationLevel: EducationLevel;
  shift: string;
  tutorTeacher: {
    id: string;
    firstName: string;
    lastNamePaternal: string;
    lastNameMaternal?: string;
  } | null;
  _count: {
    enrollments: number;
    assignments: number;
  };
}

export interface SchoolHeaderInfo {
  id?: string;
  name: string;
  modularCode?: string | null;
  documentId?: string | null;
  logoUrl?: string | null;
  address?: string | null;
}

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

// ============================================================================
// 0011: Reporte de Alumnos por Salón
// ============================================================================
export interface ClassroomRosterReportData {
  school: SchoolHeaderInfo;
  classroom: {
    id: string;
    grade: number;
    section: string;
    educationLevel: EducationLevel;
    shift: string;
    tutorTeacher: string;
  };
  students: Array<{
    index: number;
    enrollmentId: string;
    studentCode: string;
    documentId: string;
    fullName: string;
    gender: string;
    birthDate: string;
    enrollmentState: string;
    guardianName: string;
    guardianPhone: string;
  }>;
  totalStudents: number;
  reportCode: string;
}

// ============================================================================
// 0001: Listado de Familias por Estado
// ============================================================================
export interface FamilyChildItem {
  id: string;
  fullName: string;
  studentCode: string;
  documentId: string;
  classroomLabel: string;
  enrollmentState: string;
}

export interface FamilyByStateItem {
  index: number;
  familyCode: string;
  familyName: string;
  fatherName: string;
  fatherPhone: string;
  fatherEmail: string;
  motherName: string;
  motherPhone: string;
  motherEmail: string;
  guardianName: string;
  guardianPhone: string;
  address: string;
  state: string;
  childrenCount: number;
  childrenSummary: string;
  children: FamilyChildItem[];
}

export interface FamiliesByStateReportData {
  school: SchoolHeaderInfo;
  filterState: string;
  families: FamilyByStateItem[];
  totalFamilies: number;
  totalStudents: number;
  reportCode: string;
}

// ============================================================================
// 0002: Listado de Familias e Hijos
// ============================================================================
export interface FamilyChildRosterItem {
  index: number;
  studentCode: string;
  documentId: string;
  fullName: string;
  level: string;
  grade: number;
  section: string;
  classroomLabel: string;
  enrollmentState: string;
}

export interface FamilyWithChildrenItem {
  index: number;
  familyCode: string;
  familyName: string;
  fatherName: string;
  motherName: string;
  phone: string;
  address: string;
  childrenCount: number;
  children: FamilyChildRosterItem[];
}

export interface FamiliesChildrenReportData {
  school: SchoolHeaderInfo;
  families: FamilyWithChildrenItem[];
  totalFamilies: number;
  totalChildren: number;
  reportCode: string;
}

// ============================================================================
// 0003: Listado de Familias y Parientes (Directorio Institucional)
// ============================================================================
export interface FamilyRelativeRecordItem {
  index: number;
  student: {
    id: string;
    studentCode: string;
    documentId: string;
    fullName: string;
    classroomLabel: string;
    level: string;
  };
  father: {
    fullName: string;
    documentId: string;
    phone: string;
    email: string;
  };
  mother: {
    fullName: string;
    documentId: string;
    phone: string;
    email: string;
  };
  guardian: {
    fullName: string;
    documentId: string;
    relationship: string;
    phone: string;
    email: string;
  };
}

export interface FamiliesRelativesReportData {
  school: SchoolHeaderInfo;
  records: FamilyRelativeRecordItem[];
  totalRecords: number;
  reportCode: string;
}

// ============================================================================
// 0019: Listado de Cumpleaños del Alumno
// ============================================================================
export interface StudentBirthdayItem {
  index: number;
  id: string;
  studentCode: string;
  fullName: string;
  gender: string;
  birthDateFormatted: string;
  day: number;
  month: number;
  monthName: string;
  ageTurning: number | null;
  classroomLabel: string;
  educationLevel: string;
}

export interface StudentBirthdaysReportData {
  school: SchoolHeaderInfo;
  month: number | null;
  monthName: string;
  students: StudentBirthdayItem[];
  totalStudents: number;
  reportCode: string;
}

