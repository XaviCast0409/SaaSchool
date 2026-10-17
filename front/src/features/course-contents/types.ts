export type ContentType = 'LESSON_MATERIAL' | 'HOMEWORK' | 'FORUM';

export interface ForumCommentUser {
  id: string;
  firstName: string;
  lastNamePaternal: string;
  role: 'SUPER_ADMIN' | 'SCHOOL_ADMIN' | 'ADMINISTRATIVE' | 'TEACHER' | 'PARENT';
}

export interface ForumComment {
  id: string;
  schoolId: string;
  courseContentId: string;
  userId: string;
  content: string;
  createdAt: string;
  user: ForumCommentUser;
}

export interface CourseContentTeacher {
  id: string;
  firstName: string;
  lastNamePaternal: string;
}

export interface CourseContent {
  id: string;
  schoolId: string;
  courseAssignmentId: string;
  teacherId: string;
  bimester: number;
  contentType: ContentType;
  title: string;
  description?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  dueDate?: string | null;
  createdAt: string;
  teacher?: CourseContentTeacher;
  _count?: {
    comments: number;
  };
}

export interface CreateCourseContentPayload {
  courseAssignmentId: string;
  bimester: number;
  contentType: ContentType;
  title: string;
  description?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  dueDate?: string;
}

export interface CreateCommentPayload {
  content: string;
}

export interface UploadFileResponse {
  url: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

export interface StudentCourseAssignment {
  id: string;
  area: {
    id: string;
    name: string;
    officialCode?: string | null;
  };
  teacher?: {
    id: string;
    firstName: string;
    lastNamePaternal: string;
    email?: string | null;
  } | null;
  _count: {
    contents: number;
  };
}

export interface StudentCoursesResponse {
  id: string;
  classroom: {
    id: string;
    grade: number;
    section: string;
    educationLevel: 'INITIAL' | 'PRIMARY' | 'SECONDARY';
    shift?: string | null;
    assignments: StudentCourseAssignment[];
  };
}
