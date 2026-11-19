import type { EducationLevel } from '@/shared/types/academic';

export interface CompetenceConclusionStudent {
  enrollmentId: string;
  enrollmentState?: 'REGISTERED' | 'TRANSFERRED' | 'WITHDRAWN';
  orderIndex: number;
  studentId: string;
  fullName: string;
  documentId: string;
  studentCode: string | null;
  score: number | null;
  letter: 'AD' | 'A' | 'B' | 'C' | null;
  conclusion: string;
}

export interface CompetenceConclusionsResponse {
  assignment: {
    id: string;
    areaName: string;
    officialCode?: string | null;
    classroom: {
      id: string;
      grade: number;
      section: string;
      educationLevel: EducationLevel;
    };
    teacher: {
      firstName: string;
      lastNamePaternal: string;
    };
    competences: Array<{
      id: string;
      name: string;
      description?: string | null;
    }>;
  };
  selectedCompetence: {
    id: string;
    name: string;
    description?: string | null;
  };
  periodNumber: number;
  students: CompetenceConclusionStudent[];
}

export interface BatchSaveConclusionsPayload {
  courseAssignmentId: string;
  competenceId: string;
  periodNumber: number;
  conclusions: Array<{
    enrollmentId: string;
    conclusion: string;
  }>;
}
