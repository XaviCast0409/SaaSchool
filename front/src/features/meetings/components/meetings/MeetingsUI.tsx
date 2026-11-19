import React from 'react';
import { Video, Phone, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPeruDate } from '@/lib/dateUtils';
import { MODE_LABEL, type MeetingMode } from '../../api/useMeetings';

export const ModeIcon: React.FC<{ mode: MeetingMode; className?: string }> = ({ mode, className }) =>
  mode === 'VIRTUAL' ? (
    <Video className={className} aria-hidden />
  ) : mode === 'PHONE' ? (
    <Phone className={className} aria-hidden />
  ) : (
    <MapPin className={className} aria-hidden />
  );

export const PanelHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  description?: string;
  right?: React.ReactNode;
}> = ({ icon, title, description, right }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-3 sm:px-5">
    <div className="flex min-w-0 items-center gap-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="min-w-0">
        <h2 className="text-sm font-black tracking-tight text-foreground">{title}</h2>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
    </div>
    {right}
  </div>
);

export interface UnderlineTab<T extends string> {
  key: T;
  label: string;
  count?: number;
}

export function UnderlineTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: UnderlineTab<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-1 border-b border-border" role="tablist">
      {tabs.map((tab) => {
        const isActive = value === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className={cn(
              '-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-bold transition-colors',
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-xs font-bold leading-none',
                  isActive ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export const EmptyBlock: React.FC<{ icon: React.ReactNode; title: string; children?: React.ReactNode }> = ({
  icon,
  title,
  children,
}) => (
  <div className="space-y-2 p-10 text-center text-muted-foreground">
    <div className="mx-auto flex w-fit opacity-30 [&>svg]:h-10 [&>svg]:w-10">{icon}</div>
    <p className="text-sm font-bold text-foreground">{title}</p>
    {children && <p className="mx-auto max-w-md text-xs text-muted-foreground">{children}</p>}
  </div>
);

export const ModeBadge: React.FC<{ mode: MeetingMode }> = ({ mode }) => (
  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-secondary-foreground">
    <ModeIcon mode={mode} className="h-3 w-3" /> {MODE_LABEL[mode]}
  </span>
);

export const StatTile: React.FC<{ label: string; value: number; icon: React.ReactNode; tone: string }> = ({
  label,
  value,
  icon,
  tone,
}) => (
  <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-4">
    <div className={cn('hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:flex', tone)}>{icon}</div>
    <div className="min-w-0">
      <p className="text-xl font-black leading-none text-foreground">{value}</p>
      <p className="mt-1 truncate text-xs font-semibold text-muted-foreground">{label}</p>
    </div>
  </div>
);

/** Bloque con día y mes, para listas cronológicas. */
export const DateChip: React.FC<{ iso: string }> = ({ iso }) => (
  <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary">
    <span className="text-lg font-black leading-none">{formatPeruDate(iso, { day: 'numeric' })}</span>
    <span className="mt-0.5 text-xs font-bold uppercase tracking-wider">
      {formatPeruDate(iso, { month: 'short' }).replace('.', '')}
    </span>
  </div>
);
