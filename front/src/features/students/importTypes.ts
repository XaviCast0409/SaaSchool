/** Carga masiva de alumnos desde la plantilla Excel (espejo de student-import.service.ts). */
export type ImportStudentAction = 'CREATE' | 'UPDATE' | 'NONE' | 'ERROR' | 'DUPLICATE';
export type ImportEnrollmentAction = 'CREATE' | 'NONE' | 'SKIP';
export type ImportGuardianAction = 'CREATE' | 'LINK' | 'NONE' | 'SKIP';

export interface StudentImportRow {
  rowNumber: number;
  fullName: string;
  documentId: string;
  classroomLabel: string;
  guardianName: string;
  studentAction: ImportStudentAction;
  enrollmentAction: ImportEnrollmentAction;
  guardianAction: ImportGuardianAction;
  changes: string[];
  issues: string[];
  warnings: string[];
}

export interface StudentImportPlan {
  school: { name: string };
  academicYear: { id: string; year: number; isActive: boolean };
  rows: StudentImportRow[];
  summary: {
    total: number;
    createStudents: number;
    updateStudents: number;
    unchanged: number;
    errors: number;
    duplicates: number;
    createEnrollments: number;
    createGuardians: number;
  };
  notes: string[];
  blocking: string[];
}

export interface StudentImportResult {
  createdStudents: number;
  updatedStudents: number;
  createdEnrollments: number;
  createdGuardians: number;
  linkedGuardians: number;
  createdFees: number;
  enrollmentsWithoutFeeSchedule: number;
  skipped: number;
}
