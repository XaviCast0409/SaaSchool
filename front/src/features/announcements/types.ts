export type AnnouncementPriority = 'NORMAL' | 'IMPORTANT' | 'URGENT';
export type UserRole = 'SUPER_ADMIN' | 'SCHOOL_ADMIN' | 'TEACHER' | 'PARENT';

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
}
