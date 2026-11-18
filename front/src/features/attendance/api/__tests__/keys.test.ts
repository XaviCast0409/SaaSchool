import { describe, it, expect, vi } from 'vitest';
import { createAppQueryClient } from '@/lib/queryClient';
import { attendanceKeys, invalidateAttendanceViews } from '../keys';
import { familyKeys } from '@/features/family/api/keys';

describe('attendanceKeys and familyKeys', () => {
  it.each([
    ['attendance.all', attendanceKeys.all, ['attendance']],
    [
      'attendance.list',
      attendanceKeys.list({
        date: '2026-03-01',
        classroomId: 'c1',
        status: 'PRESENT',
        search: 'Ana',
        page: 1,
        limit: 20,
      }),
      ['attendance', '2026-03-01', 'c1', 'PRESENT', 'Ana', 1, 20],
    ],
    ['attendance.matrixAll', attendanceKeys.matrixAll, ['attendance-matrix']],
    ['attendance.matrix', attendanceKeys.matrix('2026-03', 'c1'), ['attendance-matrix', '2026-03', 'c1']],
    ['attendance.detailAll', attendanceKeys.detailAll, ['student-attendance-detail']],
    ['attendance.detail', attendanceKeys.detail('e1', '2026-03'), ['student-attendance-detail', 'e1', '2026-03']],
    ['attendance.summaryAll', attendanceKeys.summaryAll, ['attendance-summary']],
    [
      'attendance.summary',
      attendanceKeys.summary({ month: '2026-03', classroomId: 'c1' }),
      ['attendance-summary', '2026-03', 'c1'],
    ],
    ['attendance.exportData', attendanceKeys.exportData({ month: '2026-03', classroomId: 'c1' }), ['attendance-export', '2026-03', 'c1']],
    ['attendance.sheetAll', attendanceKeys.sheetAll, ['attendance-sheet']],
    ['attendance.sheet', attendanceKeys.sheet('c1', '2026-03-01'), ['attendance-sheet', 'c1', '2026-03-01']],
    ['attendance.byEnrollment', attendanceKeys.byEnrollment('e1'), ['attendance-by-enrollment', 'e1']],
    ['attendance.scheduleConfigs', attendanceKeys.scheduleConfigs(), ['attendance-schedule-configs']],
    ['attendance.holidaysAll', attendanceKeys.holidaysAll, ['school-holidays']],
    ['attendance.holidays', attendanceKeys.holidays(2026), ['school-holidays', 2026]],
    [
      'attendance.alerts',
      attendanceKeys.alerts({ status: 'OPEN', page: 1, limit: 10 }),
      ['attendance-alerts', { status: 'OPEN', page: 1, limit: 10 }],
    ],
    ['attendance.checkoutPreview', attendanceKeys.checkoutPreview('CODE123'), ['checkout-preview', 'CODE123']],
    [
      'attendance.justifications',
      attendanceKeys.justifications({ status: 'PENDING' }),
      ['attendance-justifications', { status: 'PENDING' }],
    ],
    ['attendance.pickupsAll', attendanceKeys.pickupsAll, ['pickups']],
    ['attendance.pickups', attendanceKeys.pickups('st1'), ['pickups', 'st1']],
    ['attendance.scanRoster', attendanceKeys.scanRoster(), ['attendance', 'scan-roster']],
    ['familyKeys.all', familyKeys.all, ['family']],
    ['familyKeys.overview', familyKeys.overview(), ['family', 'overview']],
    ['familyKeys.timeline', familyKeys.timeline('st1', 14), ['family', 'timeline', 'st1', 14]],
    ['familyKeys.gate', familyKeys.gate(), ['family', 'gate']],
  ])('matches original literal for %s', (_name, keyResult, expected) => {
    expect(keyResult).toEqual(expected);
  });

  describe('invalidateAttendanceViews', () => {
    it('invalidates attendance, sheet, summary, matrix, and detail by default', () => {
      const client = createAppQueryClient();
      const spy = vi.spyOn(client, 'invalidateQueries');

      invalidateAttendanceViews(client);

      expect(spy).toHaveBeenCalledTimes(5);
      expect(spy).toHaveBeenCalledWith({ queryKey: ['attendance'] });
      expect(spy).toHaveBeenCalledWith({ queryKey: ['attendance-sheet'] });
      expect(spy).toHaveBeenCalledWith({ queryKey: ['attendance-summary'] });
      expect(spy).toHaveBeenCalledWith({ queryKey: ['attendance-matrix'] });
      expect(spy).toHaveBeenCalledWith({ queryKey: ['student-attendance-detail'] });
    });

    it('omits detail when includeDetail is false', () => {
      const client = createAppQueryClient();
      const spy = vi.spyOn(client, 'invalidateQueries');

      invalidateAttendanceViews(client, { includeDetail: false });

      expect(spy).toHaveBeenCalledTimes(4);
      expect(spy).toHaveBeenCalledWith({ queryKey: ['attendance'] });
      expect(spy).toHaveBeenCalledWith({ queryKey: ['attendance-sheet'] });
      expect(spy).toHaveBeenCalledWith({ queryKey: ['attendance-summary'] });
      expect(spy).toHaveBeenCalledWith({ queryKey: ['attendance-matrix'] });
      expect(spy).not.toHaveBeenCalledWith({ queryKey: ['student-attendance-detail'] });
    });
  });
});
