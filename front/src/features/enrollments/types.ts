export interface Enrollment {
  id: string;
  schoolId: string;
  studentId: string;
  academicYearId: string;
  classroomId: string;
  enrollmentState: string;
  repeatingGrade: boolean;
  isActive: boolean;
  student?: {
    id: string;
    firstNames: string;
    lastNamePaternal: string;
    lastNameMaternal: string;
    documentId: string;
    studentCode?: string;
  };
  classroom?: {
    id: string;
    grade: number;
    section: string;
    educationLevel: string;
  };
}
