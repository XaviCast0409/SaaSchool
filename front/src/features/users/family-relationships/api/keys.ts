export const familyRelationshipsKeys = {
  all: ['family-relationships'] as const,
  studentParentsAll: ['student-parents'] as const,
  studentParents: (studentId?: string | null) => ['student-parents', studentId] as const,
  parentStudentsAll: ['parent-students'] as const,
  parentStudents: (userId?: string | null) => ['parent-students', userId] as const,
} as const;

