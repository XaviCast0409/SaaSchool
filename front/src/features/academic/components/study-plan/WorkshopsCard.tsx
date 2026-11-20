import React from 'react';
import { Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { PlanCourse } from '../../types';
import { HoursInput } from './HoursInput';

interface WorkshopsCardProps {
  workshops: PlanCourse[];
  onRemoveCourse: (course: PlanCourse) => void;
}

export const WorkshopsCard: React.FC<WorkshopsCardProps> = ({ workshops, onRemoveCourse }) => {
  if (workshops.length === 0) return null;

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold">
        Talleres <span className="font-normal text-muted-foreground">· no van al SIAGIE</span>
      </h3>
      <div className="mt-2 divide-y divide-border">
        {workshops.map((w) => (
          <div key={w.planCourseId} className="flex items-center gap-3 py-2">
            <p className="flex-1 text-sm">{w.name}</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              h/sem <HoursInput course={w} />
            </div>
            <Button
              variant="ghost"
              size="icon"
              disabled={w.hasGrades}
              onClick={() => onRemoveCourse(w)}
              aria-label={`Quitar ${w.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
};
