export const courseAssignmentsKeys = {
  all: ['course-assignments'] as const,
  list: (currentSchoolId?: string | null) => ['course-assignments', currentSchoolId] as const,
  myCourses: (userId?: string | null, currentSchoolId?: string | null) =>
    ['course-assignments', 'my-courses', userId, currentSchoolId] as const,
} as const;

