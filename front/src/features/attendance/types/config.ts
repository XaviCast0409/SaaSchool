export type AttendanceScheduleScope = 'GENERAL' | 'INITIAL' | 'PRIMARY' | 'SECONDARY';

export interface AttendanceScheduleConfig {
  id: string;
  schoolId: string;
  scope: AttendanceScheduleScope;
  entryTime: string;
  lateToleranceTime: string;
  autoCloseTime: string;
  autoCloseEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertAttendanceScheduleConfigPayload {
  scope: AttendanceScheduleScope;
  entryTime: string;
  lateToleranceTime: string;
  autoCloseTime: string;
  autoCloseEnabled: boolean;
}

export interface CloseClassroomAttendancePayload {
  classroomId?: string;
  date?: string;
}

export interface CloseAttendanceResult {
  closedCount: number;
  totalUnrecorded: number;
  message: string;
}
