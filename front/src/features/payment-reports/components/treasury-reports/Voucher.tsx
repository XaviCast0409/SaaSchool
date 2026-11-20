import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useResolvedFileUrl } from '@/features/course-contents/api/useResolvedFileUrl';

interface VoucherProps {
  url: string | null;
}

export const Voucher: React.FC<VoucherProps> = ({ url }) => {
  const { data: resolved, isLoading } = useResolvedFileUrl(url);
  if (!url)
    return (
      <div className="flex h-40 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
        Sin voucher
      </div>
    );
  if (isLoading || !resolved) return <Skeleton className="h-40 w-full" />;
  return (
    <a href={resolved} target="_blank" rel="noreferrer" className="group relative block">
      <img
        src={resolved}
        alt="Voucher de pago"
        className="max-h-72 w-full rounded-lg border border-border bg-white object-contain"
        onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
      />
      <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded bg-background/90 px-1.5 py-0.5 text-xs text-foreground opacity-0 group-hover:opacity-100">
        Abrir <ExternalLink className="h-3 w-3" aria-hidden />
      </span>
    </a>
  );
};
