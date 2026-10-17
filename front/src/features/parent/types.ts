export type AttendanceTodayStatus =
  | 'PRESENT'
  | 'LATE_JUSTIFIED'
  | 'LATE_UNJUSTIFIED'
  | 'ABSENT_JUSTIFIED'
  | 'ABSENT_UNJUSTIFIED'
  | 'NOT_RECORDED';

export interface ActiveEnrollmentInfo {
  id: string;
  academicYear: number;
  classroom: {
    id: string;
    grade: number;
    section: string;
    educationLevel: 'INITIAL' | 'PRIMARY' | 'SECONDARY';
    shift: string;
    label: string;
    tutor: {
      fullName: string;
      cellphone?: string | null;
      email?: string | null;
    } | null;
  };
  attendanceSummary: {
    todayStatus: AttendanceTodayStatus;
    todayCheckIn?: string | null;
    attendancePercentage: number;
    presentCount: number;
    lateCount: number;
    absentCount: number;
    totalRecorded: number;
  };
  financialSummary: {
    hasPending: boolean;
    pendingCount: number;
    totalPendingAmount: number;
    nextDueDate?: string | null;
    nextTitle?: string | null;
  };
}

export interface ParentChildInfo {
  id: string;
  firstNames: string;
  lastNamePaternal: string;
  lastNameMaternal: string;
  fullName: string;
  documentType: string;
  documentId: string;
  studentCode?: string | null;
  gender: 'MALE' | 'FEMALE';
  relationshipType: string;
  isLegalGuardian: boolean;
  isFinancialResponsible: boolean;
  activeEnrollment: ActiveEnrollmentInfo | null;
}
