export type AnnouncementPriority = 'NORMAL' | 'IMPORTANT' | 'URGENT';
export type AnnouncementResponseType = 'NONE' | 'ACKNOWLEDGE' | 'AUTHORIZATION' | 'POLL';
export type UserRole = 'SUPER_ADMIN' | 'SCHOOL_ADMIN' | 'ADMINISTRATIVE' | 'TEACHER' | 'PARENT';

export interface Announcement {
  id: string;
  schoolId: string;
  authorId: string;
  classroomId?: string | null;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  targetRoles: UserRole[];
  publishedAt: string;
  expiresAt?: string | null;
  isActive: boolean;
  responseType?: AnnouncementResponseType;
  responseDeadline?: string | null;
  pollOptions?: string[];
  /** Para apoderados: hijos por los que debe responder y su respuesta. */
  myTargets?: Array<{ studentId: string; studentName: string; response: string | null; respondedAt: string | null }>;
  /** Para la Dirección o el autor: avance de respuestas por alumno. */
  responseStats?: { expected: number; responded: number; tally: Record<string, number> } | null;
  author?: {
    id: string;
    firstName: string;
    lastNamePaternal: string;
    role: UserRole;
  };
  classroom?: {
    id: string;
    grade: number;
    section: string;
    educationLevel: string;
  } | null;
}

export interface AnnouncementFilters {
  page?: number;
  limit?: number;
  search?: string;
  priority?: AnnouncementPriority;
  classroomId?: string;
}

export interface AnnouncementsResponse {
  status: string;
  data: Announcement[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateAnnouncementPayload {
  title: string;
  content: string;
  priority: AnnouncementPriority;
  targetRoles: UserRole[];
  classroomId?: string;
  expiresAt?: string;
  responseType?: AnnouncementResponseType;
  responseDeadline?: string | null;
  pollOptions?: string[];
}

export interface AnnouncementResponsesDetail {
  responseType: AnnouncementResponseType;
  pollOptions: string[];
  deadline: string | null;
  expected: number;
  responded: number;
  tally: Record<string, number>;
  rows: Array<{
    studentId: string;
    studentName: string;
    classroom: string;
    response: string | null;
    respondedBy: string | null;
    respondedAt: string | null;
    comment: string | null;
  }>;
}
