import { AttendanceMatrixStudentRow } from '../../types';

export interface MarkedMatrixExportParams {
  students: AttendanceMatrixStudentRow[];
  monthStr: string;
  daysInMonth: number;
  classroomLabel?: string;
  schoolName?: string;
  mode: 'WITH_ATTENDANCE' | 'EMPTY';
}

export interface DayColumnInfo {
  day: number;
  short: string;
  isWeekend: boolean;
  isSunday: boolean;
}
