import { useMutation, useQueryClient, type QueryKey, type UseMutationResult } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface AppMutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  successMessage?: string;
  errorMessage?: string | null;
  invalidate?: QueryKey[];
  onSuccess?: (data: TData, variables: TVariables) => void | Promise<void>;
}

export function useAppMutation<TData = unknown, TVariables = void>(
  options: AppMutationOptions<TData, TVariables>,
): UseMutationResult<TData, unknown, TVariables> {
  const client = useQueryClient();

  return useMutation({
    mutationFn: options.mutationFn,
    meta:
      options.errorMessage === null
        ? undefined
        : { errorMessage: options.errorMessage ?? 'No se pudo completar la acción.' },
    onSuccess: async (data, variables) => {
      if (options.invalidate && options.invalidate.length > 0) {
        await Promise.all(options.invalidate.map((queryKey) => client.invalidateQueries({ queryKey })));
      }
      if (options.successMessage) {
        toast.success(options.successMessage);
      }
      await options.onSuccess?.(data, variables);
    },
  });
}
