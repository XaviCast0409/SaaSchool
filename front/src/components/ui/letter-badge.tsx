import React from 'react';
import { cn } from '@/lib/utils';

const LETTER_STYLES: Record<string, string> = {
  AD: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  A: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  B: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  C: 'bg-red-500/15 text-red-700 dark:text-red-300',
  EXO: 'bg-muted text-muted-foreground',
};

export const LetterBadge: React.FC<{ letter?: string | null; className?: string; title?: string }> = ({ letter, className, title }) => {
  if (!letter) return <span className={cn('text-muted-foreground', className)}>—</span>;
  return (
    <span title={title} className={cn('inline-flex min-w-[2rem] justify-center rounded-md px-1.5 py-0.5 text-xs font-semibold', LETTER_STYLES[letter] ?? 'bg-muted', className)}>
      {letter}
    </span>
  );
};

const STATUS: Record<string, { label: string; cls: string }> = {
  OPEN: { label: 'Abierto', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  REVIEW: { label: 'En revisión', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
  CLOSED: { label: 'Cerrado', cls: 'bg-muted text-muted-foreground' },
};

export const PeriodStatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', STATUS[status]?.cls)}>{STATUS[status]?.label ?? status}</span>
);

export const ProgressBar: React.FC<{ percent: number }> = ({ percent }) => (
  <div className="flex items-center gap-2">
    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
      <div
        className={cn('h-full rounded-full', percent >= 100 ? 'bg-emerald-500' : percent >= 50 ? 'bg-sky-500' : 'bg-amber-500')}
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
    <span className="text-xs tabular-nums text-muted-foreground">{percent}%</span>
  </div>
);

