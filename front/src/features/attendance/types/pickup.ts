import type { AttendanceStatus } from './records';

export interface AuthorizedPickup {
  id: string;
  schoolId: string;
  studentId: string;
  fullName: string;
  documentType: string;
  documentId: string;
  relationship: string;
  cellphone?: string | null;
  photoFileUrl?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreatePickupPayload {
  studentId: string;
  fullName: string;
  documentType: string;
  documentId: string;
  relationship: string;
  cellphone?: string | null;
  photoFileUrl?: string | null;
}

export interface UpdatePickupPayload {
  fullName?: string;
  documentType?: string;
  documentId?: string;
  relationship?: string;
  cellphone?: string | null;
  photoFileUrl?: string | null;
}

export interface CheckoutPreviewData {
  student: {
    id: string;
    fullName: string;
    documentId: string;
    classroom: string;
    educationLevel: string;
  };
  todayAttendance: {
    id?: string;
    status: AttendanceStatus;
    checkInTime?: string | null;
    checkOutTime?: string | null;
    earlyLeaveReason?: string | null;
    pickedUpByName?: string | null;
  } | null;
  guardians: Array<{
    id: string;
    fullName: string;
    relationshipType: string;
    documentId?: string | null;
  }>;
  authorizedPickups: Array<{
    id: string;
    fullName: string;
    relationship: string;
    documentType: string;
    documentId: string;
    photoFileUrl?: string | null;
  }>;
}

export interface CheckoutPayload {
  code: string;
  pickupType: 'GUARDIAN' | 'AUTHORIZED' | 'SELF' | 'OTHER';
  pickupPersonId?: string;
  earlyLeaveReason?: string | null;
  otherPickupName?: string;
  otherPickupDocument?: string;
}
