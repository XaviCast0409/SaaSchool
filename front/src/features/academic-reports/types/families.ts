import type { SchoolHeaderInfo } from './common';

// ============================================================================
// 0011: Reporte de Alumnos por Salón
// ============================================================================
export interface ClassroomRosterReportData {
  school: SchoolHeaderInfo;
  classroom: {
    id: string;
    grade: number;
    section: string;
    educationLevel: string;
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
