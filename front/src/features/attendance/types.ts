export type AttendanceStatus =
  | 'PRESENT'
  | 'ABSENT_JUSTIFIED'
  | 'ABSENT_UNJUSTIFIED'
  | 'LATE_JUSTIFIED'
  | 'LATE_UNJUSTIFIED';

export interface AttendanceRecord {
  id: string;
  schoolId: string;
  enrollmentId: string;
  date: string;
  status: AttendanceStatus;
  notes?: string;
  enrollment?: {
    id: string;
    classroomId: string;
    student?: {
      id: string;
      firstNames: string;
      lastNamePaternal: string;
      lastNameMaternal: string;
      documentId: string;
      studentCode?: string;
    };
    classroom?: {
      id: string;
      grade: number;
      section: string;
      educationLevel: string;
    };
  };
}

export interface AttendancePaginatedResult {
  status: string;
  data: AttendanceRecord[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AttendanceMonthlySummary {
  period: string;
  totalRecords: number;
  counts: {
    PRESENT: number;
    ABSENT_JUSTIFIED: number;
    ABSENT_UNJUSTIFIED: number;
    LATE_JUSTIFIED: number;
    LATE_UNJUSTIFIED: number;
  };
  percentages: {
    presentRate: number;
    absentRate: number;
    lateRate: number;
  };
}

export interface AttendanceExportRow {
  studentName: string;
  documentId: string;
  grade: string;
  section: string;
  counts: {
    PRESENT: number;
    ABSENT_JUSTIFIED: number;
    ABSENT_UNJUSTIFIED: number;
    LATE_JUSTIFIED: number;
    LATE_UNJUSTIFIED: number;
  };
  attendanceRate: number;
}

export interface AttendanceMatrixStudentRow {
  enrollmentId: string;
  studentId: string;
  studentName: string;
  documentId: string;
  studentCode?: string;
  grade: string;
  section: string;
  educationLevel: string;
  dailyStatus: Record<number, AttendanceStatus>;
  dailyNotes: Record<number, string>;
  counts: {
    PRESENT: number;
    ABSENT_JUSTIFIED: number;
    ABSENT_UNJUSTIFIED: number;
    LATE_JUSTIFIED: number;
    LATE_UNJUSTIFIED: number;
  };
  attendanceRate: number;
  riskLevel: 'CRITICAL' | 'WARNING' | 'NORMAL';
  consecutiveAbsences: number;
}

export interface AttendanceMatrixData {
  period: string;
  year: number;
  month: number;
  daysInMonth: number;
  students: AttendanceMatrixStudentRow[];
}

export interface StudentAttendanceDetail {
  enrollmentId: string;
  studentName: string;
  documentId: string;
  studentCode?: string;
  grade: string;
  section: string;
  educationLevel: string;
  period: string;
  counts: {
    PRESENT: number;
    ABSENT_JUSTIFIED: number;
    ABSENT_UNJUSTIFIED: number;
    LATE_JUSTIFIED: number;
    LATE_UNJUSTIFIED: number;
  };
  attendanceRate: number;
  consecutiveAbsences: number;
  riskLevel: 'CRITICAL' | 'WARNING' | 'NORMAL';
  records: Array<{
    id: string;
    date: string;
    status: AttendanceStatus;
    notes?: string;
  }>;
}

export interface AttendanceFilterParams {
  date?: string;
  classroomId?: string;
  page?: number;
  limit?: number;
}

export interface AttendanceSummaryQueryParams {
  month?: string;
  classroomId?: string;
}

export interface AttendanceMatrixQueryParams {
  month: string;
  classroomId?: string;
}
