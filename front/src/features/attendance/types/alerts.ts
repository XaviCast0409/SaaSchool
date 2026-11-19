export type AttendanceAlertReason = 'CONSECUTIVE_ABSENCES' | 'MONTHLY_ABSENCE_RATE' | 'REPEATED_LATENESS';

export interface AttendanceAlert {
  id: string;
  schoolId: string;
  enrollmentId: string;
  reason: AttendanceAlertReason;
  metricValue: number;
  threshold: number;
  triggeredOn: string;
  status: 'OPEN' | 'ATTENDED';
  attendedById?: string | null;
  attendedAt?: string | null;
  attendedNote?: string | null;
  incidentId?: string | null;
  createdAt: string;
  enrollment?: {
    id: string;
    student?: {
      id: string;
      firstNames: string;
      lastNamePaternal: string;
      lastNameMaternal?: string | null;
    };
    classroom?: {
      grade: number;
      section: string;
      educationLevel: string;
    };
  };
}
