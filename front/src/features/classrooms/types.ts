export interface Classroom {
  id: string;
  schoolId: string;
  educationLevel: 'INITIAL' | 'PRIMARY' | 'SECONDARY';
  grade: number;
  section: string;
  shift: 'MORNING' | 'AFTERNOON' | 'NIGHT';
  capacity: number;
  tutorTeacherId?: string | null;
  /** Estudiantes matriculados del año que se está viendo */
  enrolledCount?: number;
  /** ¿La sección está abierta en el año que se está viendo? (capacidad y tutor son los de ese año) */
  openInYear?: boolean;
  academicYearId?: string | null;
  tutorTeacher?: {
    id: string;
    firstName: string;
    lastNamePaternal: string;
    lastNameMaternal?: string | null;
    email?: string;
  } | null;
}
