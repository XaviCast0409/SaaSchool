import { useSelectedAcademicYear } from '@/components/AcademicYearSwitcher';
import React, { useEffect, useState } from 'react';
import { AlertTriangle, BookOpen } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { cn } from '@/lib/utils';
import { useApplyTemplate, useCatalog, useRemovePlanCourse, useStudyPlan } from '../api';
import { CourseCompetencesModal, SubcourseModal, TemplateModal, WorkshopModal } from '../components/PlanModals';
import { PreuniversityModal } from '../components/PreuniversityModal';
import { PhraseBankModal } from '../components/PhraseBankModal';
import { LEVEL_LABEL, gradeLabel, type CnebArea, type Level, type PlanCourse } from '../types';
import { AreaCoverageCard } from '../components/study-plan/AreaCoverageCard';
import { WorkshopsCard } from '../components/study-plan/WorkshopsCard';

const LEVELS: Level[] = ['INITIAL', 'PRIMARY', 'SECONDARY'];

export const StudyPlanPage: React.FC = () => {
  // Año que se edita: el elegido en la cabecera
  const viewedYear = useSelectedAcademicYear().selected?.year;
  const { data: catalog } = useCatalog();
  const [level, setLevel] = useState<Level>('PRIMARY');
  const [grade, setGrade] = useState<number | null>(null);
  const { data: plan, isLoading } = useStudyPlan(level, grade);
  const remove = useRemovePlanCourse();
  const applyTemplate = useApplyTemplate();
  const [templateOpen, setTemplateOpen] = useState(false);
  const [workshopOpen, setWorkshopOpen] = useState(false);
  const [preuniOpen, setPreuniOpen] = useState(false);
  const [phrasesOpen, setPhrasesOpen] = useState(false);
  const [splitArea, setSplitArea] = useState<CnebArea | null>(null);
  const [editCourse, setEditCourse] = useState<{ course: PlanCourse; area: CnebArea } | null>(null);
  const [toRemove, setToRemove] = useState<PlanCourse | null>(null);

  useEffect(() => {
    if (catalog) setGrade(catalog.grades[level][0]);
  }, [catalog, level]);

  if (!catalog || grade === null) return <Skeleton className="h-64 w-full" />;
  const areaSpec = (code: string | null) => catalog.areas[level].find((a) => a.code === code);
  const workshops = plan?.courses.filter((c) => c.kind === 'WORKSHOP') ?? [];
  const problems = plan
    ? [
        ...plan.requiredMissing.map((n) => `Falta el área ${n}.`),
        ...plan.coverage
          .filter((c) => c.missing.length)
          .map((c) => `${c.name}: falta ${c.missing.map((n) => catalog.competences[n].shortName).join(', ')}.`),
        ...plan.coverage
          .filter((c) => c.conflict)
          .map((c) => `${c.name} está como área completa y dividida a la vez. Quita una de las dos.`),
      ]
    : [];

  return (
    <div className="max-w-5xl">
      <PageHeader
        title={`Plan de estudios${viewedYear ? ` ${viewedYear}` : ''}`}
        description="Qué cursos se dictan en cada grado. Las competencias vienen del Currículo Nacional y no se editan a mano."
        actions={
          <>
            <Button variant="outline" onClick={() => setPhrasesOpen(true)}>
              Banco de frases
            </Button>
            {level !== 'INITIAL' && (
              <Button variant="outline" onClick={() => setPreuniOpen(true)}>
                Cursos por área
              </Button>
            )}
            <Button variant="outline" onClick={() => setWorkshopOpen(true)}>
              Agregar taller o extra
            </Button>
            <Button onClick={() => setTemplateOpen(true)}>Aplicar plantilla CNEB</Button>
          </>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs value={level} onChange={setLevel} items={LEVELS.map((l) => ({ value: l, label: LEVEL_LABEL[l] }))} />
        <div className="flex flex-wrap gap-1.5">
          {catalog.grades[level].map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGrade(g)}
              className={cn(
                'rounded-full border px-3 py-1 text-sm',
                g === grade
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {gradeLabel(level, g)}
            </button>
          ))}
        </div>
      </div>

      {isLoading || !plan ? (
        <Skeleton className="h-64 w-full" />
      ) : plan.courses.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-8 w-8" />}
          title={`${gradeLabel(level, grade)} aún no tiene plan de estudios`}
          description="Aplica la plantilla del Currículo Nacional para crear las áreas oficiales con sus competencias."
          action={
            <Button onClick={() => applyTemplate.mutate({ level, grades: [grade], includeOptional: [] })}>
              Aplicar plantilla a este grado
            </Button>
          }
        />
      ) : (
        <>
          {problems.length > 0 && (
            <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
              <p className="flex items-center gap-2 font-medium">
                <AlertTriangle className="h-4 w-4" />
                El plan de este grado está incompleto
              </p>
              <ul className="mt-1 list-disc pl-6">
                {problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="space-y-3">
            {plan.coverage
              .filter((c) => c.inPlan)
              .map((cov) => {
                const spec = areaSpec(cov.code)!;
                const courses = plan.courses.filter((c) => c.officialAreaCode === cov.code && c.kind !== 'WORKSHOP');
                return (
                  <AreaCoverageCard
                    key={cov.code}
                    cov={cov}
                    spec={spec}
                    courses={courses}
                    onSplitArea={setSplitArea}
                    onEditCourse={setEditCourse}
                    onRemoveCourse={setToRemove}
                  />
                );
              })}

            {plan.coverage.some((c) => !c.inPlan) && (
              <Card className="p-4">
                <h3 className="text-sm font-semibold">Áreas que no están en el plan</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {plan.coverage
                    .filter((c) => !c.inPlan)
                    .map((c) => (
                      <Button
                        key={c.code}
                        variant="outline"
                        size="sm"
                        onClick={() => applyTemplate.mutate({ level, grades: [grade], includeOptional: [c.code] })}
                      >
                        + {c.name}
                        {c.optional ? ' (opcional)' : ''}
                      </Button>
                    ))}
                </div>
              </Card>
            )}

            <WorkshopsCard workshops={workshops} onRemoveCourse={setToRemove} />
          </div>
        </>
      )}

      {templateOpen && (
        <TemplateModal
          open
          onClose={() => setTemplateOpen(false)}
          level={level}
          currentGrade={grade}
          catalog={catalog}
        />
      )}
      {phrasesOpen && (
        <PhraseBankModal open onClose={() => setPhrasesOpen(false)} catalog={catalog} initialLevel={level} />
      )}
      {preuniOpen && (
        <PreuniversityModal open onClose={() => setPreuniOpen(false)} level={level} grade={grade} catalog={catalog} />
      )}
      {workshopOpen && (
        <WorkshopModal
          open
          onClose={() => setWorkshopOpen(false)}
          level={level}
          currentGrade={grade}
          catalog={catalog}
        />
      )}
      {splitArea && (
        <SubcourseModal
          open
          onClose={() => setSplitArea(null)}
          level={level}
          currentGrade={grade}
          area={splitArea}
          catalog={catalog}
        />
      )}
      {editCourse && (
        <CourseCompetencesModal
          open
          onClose={() => setEditCourse(null)}
          course={editCourse.course}
          area={editCourse.area}
          catalog={catalog}
        />
      )}
      <ConfirmDialog
        isOpen={!!toRemove}
        onClose={() => setToRemove(null)}
        onConfirm={() => toRemove && remove.mutate(toRemove.planCourseId, { onSettled: () => setToRemove(null) })}
        title={`Quitar ${toRemove?.name ?? ''} del plan`}
        description="Se quitará de este grado y sus asignaciones docentes quedarán inactivas. No se puede si ya tiene notas."
        confirmText="Quitar"
        variant="danger"
        isLoading={remove.isPending}
      />
    </div>
  );
};
