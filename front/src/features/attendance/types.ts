export interface AttendanceRecord {
  id: string;
  schoolId: string;
  enrollmentId: string;
  date: string;
  status: 'PRESENT' | 'ABSENT_JUSTIFIED' | 'ABSENT_UNJUSTIFIED' | 'LATE_JUSTIFIED' | 'LATE_UNJUSTIFIED';
  notes?: string;
  enrollment?: {
    student?: {
      firstNames: string;
      lastNamePaternal: string;
      lastNameMaternal: string;
      documentId: string;
    };
  };
}
