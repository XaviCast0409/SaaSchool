import type { EducationLevel } from '@/shared/types/academic';

export interface ReportCardPeriod {
  periodNumber: number;
  periodScore: number | null;
  siagie: {
    numeric: number;
    letter: 'AD' | 'A' | 'B' | 'C';
    label: string;
  } | null;
  competences: Array<{
    competenceId: string;
    competenceName: string;
    score: number | null;
    siagie: {
      numeric: number;
      letter: 'AD' | 'A' | 'B' | 'C';
      label: string;
    } | null;
    conclusion?: string | null;
  }>;
}

export interface ReportCardCourse {
  assignmentId: string;
  areaName: string;
  officialCode?: string | null;
  parentAreaId?: string | null;
  parentAreaName?: string | null;
  teacherName: string;
  periods: ReportCardPeriod[];
  annualScore: number | null;
  annualSiagie: {
    numeric: number;
    letter: 'AD' | 'A' | 'B' | 'C';
    label: string;
  } | null;
}

export interface ReportCardData {
  school: {
    name: string;
    modularCode?: string | null;
    documentId: string;
    address?: string | null;
    logoUrl?: string | null;
  };
  student: {
    fullName: string;
    studentCode?: string | null;
    documentId: string;
  };
  classroom: {
    grade: number;
    section: string;
    educationLevel: EducationLevel;
    shift: string;
  };
  academicYear: number;
  attendanceStats: {
    present: number;
    lateJustified: number;
    lateUnjustified: number;
    absentJustified: number;
    absentUnjustified: number;
    totalRegisteredDays: number;
  };
  periodAttendanceStats?: Array<{
    periodNumber: number;
    present: number;
    lateJustified: number;
    lateUnjustified: number;
    absentJustified: number;
    absentUnjustified: number;
    totalRegisteredDays: number;
  }>;
  courses: ReportCardCourse[];
  generalAnnualAverage: number | null;
  generalAnnualSiagie: {
    numeric: number;
    letter: 'AD' | 'A' | 'B' | 'C';
    label: string;
  } | null;
}
