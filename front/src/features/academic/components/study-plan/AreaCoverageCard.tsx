import React from 'react';
import { Lock, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { CnebArea, PlanCourse, PlanCoverage } from '../../types';
import { HoursInput } from './HoursInput';

interface AreaCoverageCardProps {
  cov: PlanCoverage;
  spec: CnebArea;
  courses: PlanCourse[];
  onSplitArea: (spec: CnebArea) => void;
  onEditCourse: (params: { course: PlanCourse; area: CnebArea }) => void;
  onRemoveCourse: (course: PlanCourse) => void;
}

export const AreaCoverageCard: React.FC<AreaCoverageCardProps> = ({
  cov,
  spec,
  courses,
  onSplitArea,
  onEditCourse,
  onRemoveCourse,
}) => {
  const isSplit = courses.some((c) => c.kind === 'SUBCOURSE');

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{cov.name}</h3>
          {cov.isTransversal && (
            <span className="text-xs text-muted-foreground">· las registra el tutor o tutora</span>
          )}
          {cov.missing.length === 0 && !cov.conflict ? (
            <span className="text-xs text-emerald-600">Completa</span>
          ) : (
            <span className="text-xs text-red-600">Incompleta</span>
          )}
        </div>
        {!cov.isTransversal && !isSplit && (
          <Button variant="ghost" size="sm" onClick={() => onSplitArea(spec)}>
            Dividir en cursos
          </Button>
        )}
      </div>
      <div className="mt-3 divide-y divide-border">
        {courses.map((course) => (
          <div key={course.planCourseId} className="flex flex-wrap items-center gap-3 py-2">
            <div className="min-w-[10rem] flex-1">
              <p className="text-sm">
                {course.name}
                {course.kind === 'SUBCOURSE' && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {course.catalogKey?.startsWith('REST_')
                      ? course.officialAreaCode === 'TRANS'
                        ? 'lo registra el tutor'
                        : 'resto del área'
                      : course.catalogKey
                        ? 'curso del catálogo'
                        : 'curso del área'}
                  </span>
                )}
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {course.competences.map((k) => (
                  <span
                    key={k.id}
                    className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                  >
                    {k.shortName}
                    {k.weight !== 1 ? ` ×${k.weight}` : ''}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              h/sem <HoursInput course={course} />
            </div>
            {course.hasGrades && (
              <span
                className="flex items-center gap-1 text-xs text-muted-foreground"
                title="Tiene notas: no se puede quitar"
              >
                <Lock className="h-3.5 w-3.5" />
                Con notas
              </span>
            )}
            {course.kind === 'SUBCOURSE' && (
              <Button variant="ghost" size="sm" onClick={() => onEditCourse({ course, area: spec })}>
                Competencias
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              disabled={course.hasGrades}
              onClick={() => onRemoveCourse(course)}
              aria-label={`Quitar ${course.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
};
