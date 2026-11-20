import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { useUpdatePlanCourse } from '../../api';
import type { PlanCourse } from '../../types';

interface HoursInputProps {
  course: PlanCourse;
}

export const HoursInput: React.FC<HoursInputProps> = ({ course }) => {
  const update = useUpdatePlanCourse();
  const [value, setValue] = useState(course.weeklyHours?.toString() ?? '');
  useEffect(() => setValue(course.weeklyHours?.toString() ?? ''), [course.weeklyHours]);
  return (
    <Input
      type="number"
      min={0}
      max={40}
      className="h-8 w-16 text-center"
      aria-label={`Horas semanales de ${course.name}`}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        const next = value === '' ? null : Number(value);
        if (next !== course.weeklyHours) update.mutate({ planCourseId: course.planCourseId, weeklyHours: next });
      }}
    />
  );
};
