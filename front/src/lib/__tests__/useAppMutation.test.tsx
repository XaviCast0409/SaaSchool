import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, cleanup } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createAppQueryClient } from '../queryClient';
import { useAppMutation } from '../useAppMutation';

const { toastSuccess, toastError } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: toastSuccess,
    error: toastError,
  },
}));

describe('useAppMutation', () => {
  let queryClient: ReturnType<typeof createAppQueryClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createAppQueryClient();
  });

  afterEach(cleanup);

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('triggers toast.success and invalidates queries on success', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const mutationFn = vi.fn().mockResolvedValue({ id: 's1' });

    const { result } = renderHook(
      () =>
        useAppMutation({
          mutationFn,
          successMessage: 'Guardado',
          invalidate: [['students']],
        }),
      { wrapper },
    );

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(toastSuccess).toHaveBeenCalledWith('Guardado');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['students'] });
  });

  it('handles error response and calls toast.error exactly once with backend message', async () => {
    const backendError = { response: { data: { message: 'DNI duplicado' } } };
    const mutationFn = vi.fn().mockRejectedValue(backendError);

    const { result } = renderHook(
      () =>
        useAppMutation({
          mutationFn,
        }),
      { wrapper },
    );

    result.current.mutate();

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(toastError).toHaveBeenCalledTimes(1);
    expect(toastError).toHaveBeenCalledWith('DNI duplicado');
  });

  it('suppresses toast.error when errorMessage is null', async () => {
    const backendError = { response: { data: { message: 'Error silenciado' } } };
    const mutationFn = vi.fn().mockRejectedValue(backendError);

    const { result } = renderHook(
      () =>
        useAppMutation({
          mutationFn,
          errorMessage: null,
        }),
      { wrapper },
    );

    result.current.mutate();

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(toastError).not.toHaveBeenCalled();
  });
});
