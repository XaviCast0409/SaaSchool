import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, cleanup } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createAppQueryClient } from '@/lib/queryClient';
import { api } from '@/lib/axios';
import { useCreateJustification, useReviewJustification } from '../useJustifications';

vi.mock('@/lib/axios', () => ({
  api: {
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useJustifications mutations', () => {
  let queryClient: ReturnType<typeof createAppQueryClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createAppQueryClient();
  });

  afterEach(cleanup);

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('useCreateJustification refreshes all attendance views and not non-existent student-attendance', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        status: 'success',
        data: {
          id: 'j1',
          schoolId: 's1',
          enrollmentId: 'e1',
          date: '2026-03-01',
          status: 'APPROVED',
        },
      },
    });

    const { result } = renderHook(() => useCreateJustification(), { wrapper });

    result.current.mutate({
      enrollmentId: 'e1',
      date: '2026-03-01',
      reason: 'Medical',
    } as any);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['attendance-justifications'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['attendance'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['attendance-sheet'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['attendance-summary'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['attendance-matrix'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['student-attendance-detail'] });
    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: ['student-attendance'] });
  });

  it('useReviewJustification refreshes all attendance views and not non-existent student-attendance', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    vi.mocked(api.patch).mockResolvedValueOnce({
      data: {
        status: 'success',
        data: {
          id: 'j1',
          schoolId: 's1',
          enrollmentId: 'e1',
          date: '2026-03-01',
          status: 'APPROVED',
        },
      },
    });

    const { result } = renderHook(() => useReviewJustification(), { wrapper });

    result.current.mutate({
      id: 'j1',
      payload: { decision: 'APPROVED' },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['attendance-justifications'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['attendance'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['attendance-sheet'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['attendance-summary'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['attendance-matrix'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['student-attendance-detail'] });
    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: ['student-attendance'] });
  });
});
