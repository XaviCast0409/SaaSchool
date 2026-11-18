import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { AttendanceSheetView } from '../AttendanceSheetView';
import type { AttendanceSheetData } from '../../types';

const { saveSheet, closeAttendance, sheetState, CLASSROOM_ID, E1, E2, mockSheet } = vi.hoisted(() => {
  const cId = '11111111-1111-4111-8111-111111111111';
  const enrollment1 = '22222222-2222-4222-8222-222222222222';
  const enrollment2 = '33333333-3333-4333-8333-333333333333';
  const student1 = '44444444-4444-4444-8444-444444444444';
  const student2 = '55555555-5555-4555-8555-555555555555';

  const defaultSheet: AttendanceSheetData = {
    classroomId: cId,
    classroomName: '3ro de Secundaria A',
    date: '2026-11-17',
    totalStudents: 2,
    recordedCount: 0,
    isComplete: false,
    isSchoolDay: true,
    counts: {
      PRESENT: 0,
      ABSENT_JUSTIFIED: 0,
      ABSENT_UNJUSTIFIED: 0,
      LATE_JUSTIFIED: 0,
      LATE_UNJUSTIFIED: 0,
      UNRECORDED: 2,
    },
    students: [
      {
        enrollmentId: enrollment1,
        studentId: student1,
        studentName: 'Ana Quispe',
        documentId: '71234567',
        status: null,
        attendanceId: null,
        origin: null,
        notes: null,
        checkInTime: null,
      },
      {
        enrollmentId: enrollment2,
        studentId: student2,
        studentName: 'Luis Mamani',
        documentId: '72345678',
        status: null,
        attendanceId: null,
        origin: null,
        notes: null,
        checkInTime: null,
      },
    ],
  };

  return {
    saveSheet: vi.fn().mockResolvedValue({ count: 2 }),
    closeAttendance: vi.fn().mockResolvedValue({}),
    sheetState: {
      data: defaultSheet as any,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    },
    CLASSROOM_ID: cId,
    E1: enrollment1,
    E2: enrollment2,
    mockSheet: defaultSheet,
  };
});

vi.mock('@/features/attendance/api/useAttendance', () => ({
  useAttendanceSheet: () => sheetState,
  useSaveAttendanceSheet: () => ({
    mutate: saveSheet,
    mutateAsync: saveSheet,
    isPending: false,
  }),
  useCloseAttendance: () => ({
    mutate: closeAttendance,
    mutateAsync: closeAttendance,
    isPending: false,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('AttendanceSheetView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sheetState.data = mockSheet;
    sheetState.isLoading = false;
    sheetState.isError = false;
  });

  afterEach(() => {
    cleanup();
  });

  it('lista los alumnos', () => {
    renderWithProviders(<AttendanceSheetView classroomId={CLASSROOM_ID} date="2026-11-17" />);

    expect(screen.getAllByText('Ana Quispe').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Luis Mamani').length).toBeGreaterThan(0);
  });

  it('guarda todos presentes', async () => {
    renderWithProviders(<AttendanceSheetView classroomId={CLASSROOM_ID} date="2026-11-17" />);

    fireEvent.click(screen.getByText('Todos Presentes'));

    const saveButton = screen.getByRole('button', { name: /Guardar Asistencia \(2\)/ });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(saveSheet).toHaveBeenCalledWith(
        expect.objectContaining({
          classroomId: CLASSROOM_ID,
          date: '2026-11-17',
          records: [
            expect.objectContaining({ enrollmentId: E1, status: 'PRESENT' }),
            expect.objectContaining({ enrollmentId: E2, status: 'PRESENT' }),
          ],
        }),
        expect.anything(),
      );
    });
  });

  it('solo lectura no guarda', () => {
    renderWithProviders(<AttendanceSheetView classroomId={CLASSROOM_ID} date="2026-11-17" canWrite={false} />);

    const saveButton = screen.queryByRole('button', { name: /Guardar Asistencia/ });
    expect(saveButton).toBeNull();
  });
});
