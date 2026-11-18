export const courseContentsKeys = {
  all: ['course-contents'] as const,
  list: (courseAssignmentId?: string | null, bimester?: number | string | null) =>
    bimester !== undefined
      ? (['course-contents', courseAssignmentId, bimester] as const)
      : (['course-contents', courseAssignmentId] as const),
  forumCommentsAll: ['forum-comments'] as const,
  forumComments: (contentId?: string | null) =>
    ['forum-comments', contentId] as const,
  studentCourses: (studentId?: string | null) =>
    ['student-courses', studentId] as const,
  studentTasksAll: ['student-tasks'] as const,
  studentTasks: (studentId?: string | null) =>
    ['student-tasks', studentId] as const,
  homeworkSubmissionsAll: ['homework-submissions'] as const,
  homeworkSubmissions: (courseContentId?: string | null) =>
    ['homework-submissions', courseContentId] as const,
  fileLink: (url?: string | null) =>
    ['file-link', url] as const,
  supervisionStatsAll: ['supervision-stats'] as const,
  supervisionStats: (bimester?: number | string | null) =>
    ['supervision-stats', bimester] as const,
  teacherComplianceAll: ['teacher-compliance'] as const,
  teacherCompliance: (bimester?: number | string | null) =>
    ['teacher-compliance', bimester] as const,
  supervisedFeedAll: ['supervised-feed'] as const,
  supervisedFeed: (filters?: Record<string, unknown> | null) =>
    ['supervised-feed', filters] as const,
} as const;

