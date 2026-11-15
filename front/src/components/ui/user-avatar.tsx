import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const SIZES = {
  xs: 'h-5 w-5 text-[9px]',
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-14 w-14 text-base',
  xl: 'h-24 w-24 text-2xl',
} as const;

export const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase() || '?';

interface Props {
  name: string;
  src?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
  /** Texto alternativo; por defecto la foto es decorativa porque el nombre va al lado. */
  alt?: string;
}

/** Foto de perfil redonda; si no hay foto (o no carga) muestra las iniciales. */
export const UserAvatar: React.FC<Props> = ({ name, src, size = 'md', className, alt }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  const showImage = Boolean(src) && !failed;

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 font-semibold text-primary select-none',
        SIZES[size],
        className,
      )}
      aria-hidden={alt ? undefined : true}
    >
      {showImage ? (
        <img src={src!} alt={alt ?? ''} loading="lazy" className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        initialsOf(name)
      )}
    </span>
  );
};
