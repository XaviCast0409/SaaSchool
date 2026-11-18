import { describe, it, expect } from 'vitest';
import { ATTENDANCE_STATUS_CONFIG, ATTENDANCE_STATUS_ORDER } from '../constants';

describe('attendance constants', () => {
  it('maps ordered statuses to expected short codes', () => {
    const shorts = ATTENDANCE_STATUS_ORDER.map((status) => ATTENDANCE_STATUS_CONFIG[status].short);
    expect(shorts).toEqual(['P', 'FI', 'FJ', 'TI', 'TJ']);
  });

  it('contains expected activeClass in PRESENT config matching AttendanceSheetView', () => {
    expect(ATTENDANCE_STATUS_CONFIG.PRESENT.activeClass).toContain('bg-emerald-600');
  });
});
