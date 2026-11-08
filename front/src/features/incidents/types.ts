export type IncidentType =
  | 'MERITO'
  | 'DEMERITO'
  | 'ATENCION_TOPICO'
  | 'CITACION_PADRES'
  | 'BEHAVIORAL'
  | 'HEALTH'
  | 'ACADEMIC'
  | 'CITATION'
  | 'POSITIVE';

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface StudentIncident {
  id: string;
  schoolId: string;
  enrollmentId: string;
  authorId: string;
  type: IncidentType;
  severity: IncidentSeverity;
  title: string;
  description: string;
  actionTaken?: string | null;
  citationDate?: string | null;
  acknowledgedAt?: string | null;
  acknowledgedByUserId?: string | null;
  createdAt: string;
  author?: {
    id: string;
    firstName: string;
    lastNamePaternal: string;
    lastNameMaternal?: string;
    email?: string;
  };
  enrollment?: {
    classroom?: {
      id: string;
      grade: number;
      section: string;
      educationLevel: string;
    };
    academicYear?: {
      id: string;
      year: number;
    };
    student?: {
      id: string;
      firstNames: string;
      lastNamePaternal: string;
      lastNameMaternal?: string;
      documentType: string;
      documentId: string;
      studentCode?: string;
    };
  };
}

export interface CreateIncidentPayload {
  studentId?: string;
  enrollmentId?: string;
  type: IncidentType;
  severity: IncidentSeverity;
  title: string;
  description: string;
  actionTaken?: string;
  citationDate?: string;
}

export interface IncidentFilterParams {
  page?: number;
  limit?: number;
  enrollmentId?: string;
  studentId?: string;
  classroomId?: string;
  type?: string;
  severity?: string;
  startDate?: string;
  endDate?: string;
}

export interface IncidentsPaginatedResponse {
  data: StudentIncident[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

