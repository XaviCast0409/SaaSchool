import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CalendarItem } from '../../api/useCalendar';
import { WEEKDAYS, styleOf } from '../../constants';

export interface CalendarGridProps {
  ym: { y: number; m: number };
  cells: string[];
  byDay: Map<string, CalendarItem[]>;
  selected: string;
  today: string;
  isLoading: boolean;
  monthTitle: string;
  onMove: (delta: number) => void;
  onSelect: (date: string) => void;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  ym,
  cells,
  byDay,
  selected,
  today,
  isLoading,
  monthTitle,
  onMove,
  onSelect,
}) => {
  return (
    <Card className="p-3 lg:col-span-2">
      <div className="mb-3 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => onMove(-1)} aria-label="Mes anterior">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-sm font-semibold text-foreground first-letter:uppercase">{monthTitle}</h2>
        <Button variant="ghost" size="icon" onClick={() => onMove(1)} aria-label="Mes siguiente">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border text-xs">
        {WEEKDAYS.map((w) => (
          <div key={w} className="bg-muted/60 py-1.5 text-center font-semibold text-muted-foreground">
            {w}
          </div>
        ))}
        {cells.map((d) => {
          const inMonth = Number(d.slice(5, 7)) === ym.m;
          const list = byDay.get(d) ?? [];
          const isHoliday = list.some((i) => i.kind === 'HOLIDAY');
          return (
            <button
              key={d}
              type="button"
              onClick={() => onSelect(d)}
              aria-label={`${d}, ${list.length} elementos`}
              aria-pressed={selected === d}
              className={cn(
                'min-h-[64px] bg-card p-1 text-left align-top transition-colors hover:bg-muted/50 sm:min-h-[84px]',
                !inMonth && 'bg-muted/30 text-muted-foreground',
                isHoliday && 'bg-rose-500/5',
                selected === d && 'ring-2 ring-inset ring-primary',
              )}
            >
              <span
                className={cn(
                  'inline-flex h-5 w-5 items-center justify-center rounded-full text-xs',
                  d === today && 'bg-primary font-bold text-primary-foreground',
                )}
              >
                {Number(d.slice(8, 10))}
              </span>
              <div className="mt-0.5 space-y-0.5">
                {list.slice(0, 2).map((i) => (
                  <p
                    key={`${i.kind}-${i.id}`}
                    className={cn('hidden truncate rounded px-1 text-xs sm:block', styleOf(i))}
                  >
                    {i.title}
                  </p>
                ))}
                {list.length > 0 && (
                  <p className="flex gap-0.5 sm:hidden">
                    {list.slice(0, 4).map((i) => (
                      <span
                        key={`${i.kind}-${i.id}`}
                        className={cn(
                          'h-1.5 w-1.5 rounded-full',
                          styleOf(i).split(' ')[0].replace('/10', '').replace('/15', ''),
                        )}
                      />
                    ))}
                  </p>
                )}
                {list.length > 2 && (
                  <p className="hidden text-xs text-muted-foreground sm:block">+{list.length - 2} más</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
      {isLoading && <p className="mt-2 text-xs text-muted-foreground">Cargando…</p>}
    </Card>
  );
};
