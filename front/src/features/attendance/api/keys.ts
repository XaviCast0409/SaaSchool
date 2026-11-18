import type { QueryClient } from '@tanstack/react-query';
import type { AttendanceFilterParams, AttendanceSummaryQueryParams } from '../types';
import type { AlertsFilters } from './useAttendanceAlerts';
import type { JustificationFilters } from './useJustifications';

export const attendanceKeys = {
  all: ['attendance'] as const,
  list: (filters: AttendanceFilterParams = {}) =>
    [
      'attendance',
      filters.date,
      filters.classroomId,
      filters.status,
      filters.search,
      filters.page,
      filters.limit,
    ] as const,
  matrixAll: ['attendance-matrix'] as const,
  matrix: (month?: string, classroomId?: string) => ['attendance-matrix', month, classroomId] as const,
  detailAll: ['student-attendance-detail'] as const,
  detail: (enrollmentId?: string, month?: string) => ['student-attendance-detail', enrollmentId, month] as const,
  summaryAll: ['attendance-summary'] as const,
  summary: (monthOrParams?: string | AttendanceSummaryQueryParams, classroomId?: string) => {
    if (typeof monthOrParams === 'object' && monthOrParams !== null) {
      return ['attendance-summary', monthOrParams.month, monthOrParams.classroomId] as const;
    }
    return ['attendance-summary', monthOrParams, classroomId] as const;
  },
  exportDataAll: ['attendance-export'] as const,
  exportData: (monthOrParams?: string | { month?: string; classroomId?: string }, classroomId?: string) => {
    if (typeof monthOrParams === 'object' && monthOrParams !== null) {
      return ['attendance-export', monthOrParams.month, monthOrParams.classroomId] as const;
    }
    return ['attendance-export', monthOrParams, classroomId] as const;
  },
  sheetAll: ['attendance-sheet'] as const,
  sheet: (classroomId?: string, date?: string) => ['attendance-sheet', classroomId, date] as const,
  byEnrollment: (enrollmentId?: string) => ['attendance-by-enrollment', enrollmentId] as const,
  scheduleConfigs: () => ['attendance-schedule-configs'] as const,
  scheduleConfigsAll: ['attendance-schedule-configs'] as const,
  holidaysAll: ['school-holidays'] as const,
  holidays: (year?: number) => ['school-holidays', year] as const,
  alertsAll: ['attendance-alerts'] as const,
  alerts: (filters: AlertsFilters = {}) => ['attendance-alerts', filters] as const,
  checkoutPreview: (code?: string | null) => ['checkout-preview', code] as const,
  justificationsAll: ['attendance-justifications'] as const,
  justifications: (filters: JustificationFilters = {}) => ['attendance-justifications', filters] as const,
  pickupsAll: ['pickups'] as const,
  pickups: (studentId?: string | null) => ['pickups', studentId] as const,
  scanRoster: () => ['attendance', 'scan-roster'] as const,
} as const;

export function invalidateAttendanceViews(qc: QueryClient, opts: { includeDetail?: boolean } = {}) {
  qc.invalidateQueries({ queryKey: attendanceKeys.all });
  qc.invalidateQueries({ queryKey: attendanceKeys.sheetAll });
  qc.invalidateQueries({ queryKey: attendanceKeys.summaryAll });
  qc.invalidateQueries({ queryKey: attendanceKeys.matrixAll });
  if (opts.includeDetail !== false) {
    qc.invalidateQueries({ queryKey: attendanceKeys.detailAll });
  }
}
