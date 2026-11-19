export type JustificationReason = 'MEDICAL' | 'FAMILY' | 'BEREAVEMENT' | 'TRANSPORT' | 'OTHER';

export type JustificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AttendanceJustification {
  id: string;
  schoolId: string;
  enrollmentId: string;
  dateFrom: string;
  dateTo: string;
  reason: JustificationReason;
  description: string;
  fileUrl?: string | null;
  fileName?: string | null;
  requestedById: string;
  requestedByRole: string;
  status: JustificationStatus;
  reviewedById?: string | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  createdAt: string;
  updatedAt: string;
  enrollment?: {
    id: string;
    classroom?: {
      grade: number;
      section: string;
      educationLevel: string;
    };
    student?: {
      id: string;
      firstNames: string;
      lastNamePaternal: string;
      lastNameMaternal: string;
    };
  };
}

export interface CreateJustificationPayload {
  enrollmentId: string;
  dateFrom: string;
  dateTo: string;
  reason: JustificationReason;
  description: string;
  fileUrl?: string | null;
  fileName?: string | null;
}

export interface ReviewJustificationPayload {
  decision: 'APPROVED' | 'REJECTED';
  reviewNote?: string | null;
}
