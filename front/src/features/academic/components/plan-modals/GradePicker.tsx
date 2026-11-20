import React from 'react';
import { cn } from '@/lib/utils';
import type { Level } from '../../types';
import { gradeLabel } from '../../types';

interface GradePickerProps {
  level: Level;
  grades: number[];
  value: number[];
  onChange: (v: number[]) => void;
}

export const GradePicker: React.FC<GradePickerProps> = ({
  level,
  grades,
  value,
  onChange,
}) => (
  <div className="flex flex-wrap gap-2">
    {grades.map((g) => {
      const on = value.includes(g);
      return (
        <button
          key={g}
          type="button"
          onClick={() => onChange(on ? value.filter((x) => x !== g) : [...value, g].sort((a, b) => a - b))}
          className={cn(
            'rounded-full border px-3 py-1 text-sm',
            on ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground',
          )}
        >
          {gradeLabel(level, g)}
        </button>
      );
    })}
  </div>
);
