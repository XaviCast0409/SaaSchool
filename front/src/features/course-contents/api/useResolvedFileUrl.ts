import { useQuery } from '@tanstack/react-query';
import { resolveFileUrl } from '../utils/fileUrls';

export const useResolvedFileUrl = (url?: string | null) =>
  useQuery({
    queryKey: ['file-link', url],
    queryFn: () => resolveFileUrl(url as string),
    enabled: Boolean(url),
    staleTime: 8 * 60 * 1000,
    gcTime: 9 * 60 * 1000,
  });
