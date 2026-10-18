import React from 'react';
import { User as UserIcon } from 'lucide-react';
import type { ReportCardCourse } from '../types';
import { getSubjectTheme } from '@/features/course-contents/utils/subjectThemes';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface StudentGradeCardProps {
  course: ReportCardCourse;
}

export const GradeBadge: React.FC<{ letter?: string | null; size?: 'sm' | 'md' | 'lg' }> = ({
  letter,
  size = 'md',
}) => {
  if (!letter) {
    return <span className="text-muted-foreground font-semibold text-xs">—</span>;
  }

  let style = 'bg-secondary text-secondary-foreground border-border';
  if (letter === 'AD') {
    style = 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-black';
  } else if (letter === 'A') {
    style = 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30 font-black';
  } else if (letter === 'B') {
    style = 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-black';
  } else if (letter === 'C') {
    style = 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 font-black';
  }

  const sizeClass =
    size === 'lg'
      ? 'text-sm px-3 py-1 shadow-sm'
      : size === 'sm'
      ? 'text-[10px] px-1.5 py-0'
      : 'text-xs px-2.5 py-0.5';

  return (
    <Badge variant="outline" className={`rounded-lg ${style} ${sizeClass}`}>
      {letter}
    </Badge>
  );
};

export const StudentGradeCard: React.FC<StudentGradeCardProps> = ({ course }) => {
  const theme = getSubjectTheme(course.areaName);
  const IconComponent = theme.icon;

  const b1 = course.periods.find((p) => p.periodNumber === 1)?.siagie?.letter;
  const b2 = course.periods.find((p) => p.periodNumber === 2)?.siagie?.letter;
  const b3 = course.periods.find((p) => p.periodNumber === 3)?.siagie?.letter;
  const b4 = course.periods.find((p) => p.periodNumber === 4)?.siagie?.letter;
  const annual = course.annualSiagie?.letter;

  return (
    <Card className="group bg-card border-border hover:border-primary/40 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between">
      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <IconComponent className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <Badge variant="outline" className={`text-[10px] font-bold py-0 h-4 ${theme.badgeStyle}`}>
                {theme.category}
              </Badge>
              <h3 className="text-sm sm:text-base font-extrabold text-foreground truncate mt-1">
                {course.areaName}
              </h3>
            </div>
          </div>

          {/* Promedio Anual */}
          <div className="text-right shrink-0">
            <span className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">
              Anual
            </span>
            <GradeBadge letter={annual} size="lg" />
          </div>
        </div>

        {/* Desglose por Bimestres */}
        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-border/60">
          {[
            { bim: '1° Bim', letter: b1 },
            { bim: '2° Bim', letter: b2 },
            { bim: '3° Bim', letter: b3 },
            { bim: '4° Bim', letter: b4 },
          ].map((item) => (
            <div
              key={item.bim}
              className="p-2 rounded-xl bg-secondary/30 border border-border/40 text-center space-y-1"
            >
              <span className="text-[10px] font-semibold text-muted-foreground block">
                {item.bim}
              </span>
              <div className="flex justify-center">
                <GradeBadge letter={item.letter} size="sm" />
              </div>
            </div>
          ))}
        </div>

        {/* Docente a cargo */}
        {course.teacherName && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
            <UserIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="truncate">Prof. {course.teacherName}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
