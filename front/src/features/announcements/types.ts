export type AnnouncementPriority = 'NORMAL' | 'IMPORTANT' | 'URGENT';
export type AnnouncementResponseType = 'NONE' | 'ACKNOWLEDGE' | 'AUTHORIZATION' | 'POLL';
export type UserRole = 'SUPER_ADMIN' | 'SCHOOL_ADMIN' | 'ADMINISTRATIVE' | 'TEACHER' | 'PARENT';

export interface Announcement {
  id: string;
  schoolId: string;
  authorId: string;
  classroomId?: string | null;
  targetLevel?: 'INITIAL' | 'PRIMARY' | 'SECONDARY' | null;
  targetGrade?: number | null;
  attachments?: AnnouncementAttachment[];
  title: string;
  content: string;
  priority: AnnouncementPriority;
  targetRoles: UserRole[];
  publishedAt: string;
  expiresAt?: string | null;
  /** Cuándo deja (o dejó) de estar vigente: expiresAt o, sin fecha, 60 días tras publicarse. */
  endsAt?: string;
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
  /** current = vigentes (por defecto en el servidor), past = anteriores. */
  status?: AnnouncementStatus;
}

export type AnnouncementStatus = 'current' | 'past';

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

/** Archivo adjunto a un comunicado (se abre con /api/files/<fileId>). */
export interface AnnouncementAttachment {
  fileId: string;
  name: string;
  size: number;
  type: string;
}

export interface CreateAnnouncementPayload {
  title: string;
  content: string;
  priority: AnnouncementPriority;
  targetRoles: UserRole[];
  classroomId?: string;
  targetLevel?: 'INITIAL' | 'PRIMARY' | 'SECONDARY' | null;
  targetGrade?: number | null;
  expiresAt?: string | null;
  responseType?: AnnouncementResponseType;
  responseDeadline?: string | null;
  pollOptions?: string[];
  attachments?: AnnouncementAttachment[];
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
