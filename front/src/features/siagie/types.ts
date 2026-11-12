export type Level = 'INITIAL' | 'PRIMARY' | 'SECONDARY';
export type StudentAction = 'CREATE' | 'UPDATE' | 'NONE' | 'ERROR' | 'DUPLICATE';
export type EnrollmentAction = 'CREATE' | 'MOVE' | 'STATE' | 'MOVE_STATE' | 'NONE' | 'SKIP';

export interface NominaPlanRow {
  key: string;
  fileName: string;
  rowNumber: number;
  fullName: string;
  studentCode: string | null;
  documentId: string;
  level: Level | null;
  grade: number | null;
  section: string;
  classroomLabel: string;
  enrollmentState: 'REGISTERED' | 'TRANSFERRED' | 'WITHDRAWN';
  studentAction: StudentAction;
  enrollmentAction: EnrollmentAction;
  changes: string[];
  issues: string[];
  warnings: string[];
}

export interface NominaPlan {
  academicYear: { id: string; year: number };
  files: Array<{ fileName: string; level: Level | null; modularCode: string | null; year: number | null; rows: number; issues: string[] }>;
  rows: NominaPlanRow[];
  newClassrooms: string[];
  summary: {
    total: number;
    createStudents: number;
    updateStudents: number;
    unchanged: number;
    errors: number;
    duplicates: number;
    createEnrollments: number;
    moveEnrollments: number;
    stateChanges: number;
    newClassrooms: number;
  };
  blocking: string[];
}

export interface NominaCommitResult {
  createdStudents: number;
  updatedStudents: number;
  createdEnrollments: number;
  updatedEnrollments: number;
  createdClassrooms: number;
  skipped: number;
}

// ── Plantillas de registro de notas
export interface TemplateCompetence {
  column: string; // columna del NL, ej: "D"
  conclusionColumn: string;
  label: string; // "01"
  name: string; // leyenda de la plantilla
  cnebNumber: number | null;
  filledGrades: number;
  filledConclusions: number;
}

export interface TemplateArea {
  sheetName: string;
  siagieCode: string;
  siagieName: string;
  areaCode: string | null;
  areaName: string;
  inStudyPlan: boolean;
  competences: TemplateCompetence[];
}

export interface TemplateInspection {
  fileName: string;
  level: Level | null;
  levelText: string;
  grade: number | null;
  gradeText: string;
  section: string;
  periodCode: string;
  periodNumber: number | null;
  periodText: string;
  year: number | null;
  classroom: { id: string; label: string } | null;
  areas: TemplateArea[];
  students: { total: number; matched: number; notInApp: string[]; notInFile: string[]; inactiveInApp: string[] };
  filledGrades: number;
  filledConclusions: number;
  issues: string[];
  warnings: string[];
}

export interface FillReport {
  fileName: string;
  outputName: string;
  classroomLabel: string | null;
  periodText: string;
  matchedStudents: number;
  totalStudents: number;
  writtenGrades: number;
  writtenConclusions: number;
  conclusionsFromBank: number;
  keptFromFile: number;
  missingGrades: number;
  missingConclusions: number;
  issues: string[];
  warnings: string[];
}

export interface FillResponse {
  fileName: string;
  contentType: string;
  fileBase64: string;
  reports: FillReport[];
}

export interface TemplateImportResult {
  fileName: string;
  importedGrades: number;
  importedConclusions: number;
  skipped: string[];
}
