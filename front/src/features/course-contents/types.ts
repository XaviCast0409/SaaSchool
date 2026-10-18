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

export interface StudentHomeworkItem extends CourseContent {
  courseAssignment: {
    area: {
      id: string;
      name: string;
    };
    teacher?: {
      firstName: string;
      lastNamePaternal: string;
    } | null;
  };
}

export interface StudentForumItem extends CourseContent {
  courseAssignment: {
    area: {
      id: string;
      name: string;
    };
  };
  _count: {
    comments: number;
  };
}

export interface StudentTasksResponse {
  homeworks: StudentHomeworkItem[];
  forums: StudentForumItem[];
}

export interface SupervisionStats {
  totalContents: number;
  lessonMaterialsCount: number;
  homeworksCount: number;
  forumsCount: number;
  totalSizeBytes: number;
  totalAssignments: number;
  coursesWithContentCount: number;
  coveragePercentage: number;
  activeTeachersCount: number;
  totalTeachers: number;
  totalComments: number;
  recentContents: Array<{
    id: string;
    title: string;
    contentType: ContentType;
    createdAt: string;
    fileName?: string | null;
    fileUrl?: string | null;
    teacher: {
      id: string;
      firstName: string;
      lastNamePaternal: string;
    };
    courseAssignment: {
      classroom: {
        grade: number;
        section: string;
        educationLevel: string;
      };
      area: {
        name: string;
      };
    };
  }>;
}

export interface TeacherComplianceCourse {
  assignmentId: string;
  areaName: string;
  classroomLabel: string;
  contentsCount: number;
}

export interface TeacherComplianceItem {
  id: string;
  fullName: string;
  email: string;
  assignedCoursesCount: number;
  coursesWithContentCount: number;
  totalContents: number;
  lastPublishedAt: string | null;
  status: 'COMPLIANT' | 'PARTIAL' | 'INACTIVE';
  courses: TeacherComplianceCourse[];
}

export interface SupervisedContentItem {
  id: string;
  title: string;
  description?: string | null;
  contentType: ContentType;
  bimester: number;
  fileName?: string | null;
  fileUrl?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  dueDate?: string | null;
  createdAt: string;
  teacher: {
    id: string;
    firstName: string;
    lastNamePaternal: string;
    lastNameMaternal?: string | null;
    email: string;
  };
  courseAssignment: {
    classroom: {
      id: string;
      grade: number;
      section: string;
      educationLevel: 'INITIAL' | 'PRIMARY' | 'SECONDARY';
    };
    area: {
      id: string;
      name: string;
      officialCode?: string | null;
    };
  };
  _count: {
    comments: number;
  };
}

export interface SupervisedFeedResponse {
  items: SupervisedContentItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SupervisionFeedFilters {
  bimester?: number;
  classroomId?: string;
  teacherId?: string;
  educationLevel?: 'INITIAL' | 'PRIMARY' | 'SECONDARY';
  contentType?: ContentType;
  search?: string;
  page?: number;
  limit?: number;
}

