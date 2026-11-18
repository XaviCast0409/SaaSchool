import { useQuery } from '@tanstack/react-query';
import { resolveFileUrl } from '../utils/fileUrls';
import { courseContentsKeys } from './keys';

export const useResolvedFileUrl = (url?: string | null) =>
  useQuery({
    queryKey: courseContentsKeys.fileLink(url),
    queryFn: () => resolveFileUrl(url as string),
    enabled: Boolean(url),
    staleTime: 8 * 60 * 1000,
    gcTime: 9 * 60 * 1000,
  });
