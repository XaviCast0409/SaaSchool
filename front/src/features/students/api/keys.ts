export interface StudentFilters {
  search?: string;
  classroomId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export const studentsKeys = {
  all: ['students'] as const,
  list: (filters?: StudentFilters) => ['students', filters] as const,
  detailAll: ['student'] as const,
  detail: (id?: string) => ['student', id] as const,
  siagieCatalogs: () => ['siagie-catalogs'] as const,
  nominaMatricula: (classroomId?: string) => ['nomina-matricula', classroomId] as const,
  myChildren: () => ['my-children'] as const,
  certificateEnrollment: (studentId?: string) => ['certificate-enrollment', studentId] as const,
  certificateNoDebt: (studentId?: string) => ['certificate-no-debt', studentId] as const,
} as const;

