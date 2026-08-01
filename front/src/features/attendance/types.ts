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

export interface AttendanceFilterParams {
  date?: string;
  classroomId?: string;
}

export interface AttendanceSummaryQueryParams {
  month?: string;
  classroomId?: string;
}
