import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ScheduleBlock } from '../../api/useSchedule';

interface WeeklyHoursSummaryCardProps {
  courses: Array<{
    id: string;
    name: string;
    isTransversal?: boolean;
  }>;
  blocks: ScheduleBlock[];
}

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

export const WeeklyHoursSummaryCard: React.FC<WeeklyHoursSummaryCardProps> = ({ courses, blocks }) => {
  return (
    <Card className="p-4">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Horas por curso a la semana
      </h3>
      <div className="flex flex-wrap gap-2">
        {courses
          .filter((c) => !c.isTransversal)
          .map((c) => {
            const minutes = blocks
              .filter((b) => b.courseAssignmentId === c.id)
              .reduce((s, b) => s + toMin(b.endTime) - toMin(b.startTime), 0);
            return (
              <span
                key={c.id}
                className={cn(
                  'rounded-lg px-2.5 py-1 text-xs',
                  minutes ? 'bg-muted text-foreground' : 'bg-amber-500/10 text-amber-800 dark:text-amber-200',
                )}
              >
                {c.name}:{' '}
                <strong>
                  {minutes
                    ? `${Math.floor(minutes / 60)} h ${minutes % 60 ? `${minutes % 60} min` : ''}`
                    : 'sin horas'}
                </strong>
              </span>
            );
          })}
      </div>
    </Card>
  );
};
