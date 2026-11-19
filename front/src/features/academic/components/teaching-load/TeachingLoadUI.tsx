import React from 'react';
import { cn } from '@/lib/utils';
import type { TeacherLite } from '../../types';
import { AVATAR_TONES, hash } from '../../utils/colorTones';

export const keyOf = (classroomId: string, areaId: string) => `${classroomId}|${areaId}`;

export const initials = (t: TeacherLite) => `${t.firstName[0] ?? ''}${t.lastNamePaternal[0] ?? ''}`.toUpperCase();

export const Avatar: React.FC<{ teacher?: TeacherLite | null; className?: string }> = ({ teacher, className }) => (
  <span
    className={cn(
      'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
      teacher
        ? AVATAR_TONES[hash(teacher.id) % AVATAR_TONES.length]
        : 'border border-dashed border-muted-foreground/40 text-muted-foreground',
      className,
    )}
  >
    {teacher ? initials(teacher) : '?'}
  </span>
);

export const ProgressBar: React.FC<{ value: number; className?: string }> = ({ value, className }) => (
  <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-muted', className)}>
    <div
      className={cn('h-full rounded-full transition-all duration-500', value >= 100 ? 'bg-emerald-500' : 'bg-primary')}
      style={{ width: `${Math.min(100, value)}%` }}
    />
  </div>
);

export const StatTile: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  tone?: 'default' | 'warning' | 'success';
  onClick?: () => void;
  active?: boolean;
  hint?: string;
  children?: React.ReactNode;
}> = ({ icon, label, value, tone = 'default', onClick, active, hint, children }) => {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'rounded-xl border bg-card/80 p-3 text-left shadow-sm backdrop-blur transition-all',
        onClick && 'hover:-translate-y-0.5 hover:shadow-md',
        active ? 'border-amber-500/60 ring-2 ring-amber-500/20' : 'border-border/70',
      )}
    >
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <span
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded-md',
            tone === 'warning'
              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
              : tone === 'success'
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                : 'bg-primary/10 text-primary',
          )}
        >
          {icon}
        </span>
        {label}
      </div>
      <p className="mt-1.5 text-xl font-bold tabular-nums">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {children}
    </Comp>
  );
};
