import React, { useEffect, useState } from 'react';
import { AlertTriangle, BookOpen, Lock, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { cn } from '@/lib/utils';
import { useApplyTemplate, useCatalog, useRemovePlanCourse, useStudyPlan, useUpdatePlanCourse } from '../api';
import { CourseCompetencesModal, SubcourseModal, TemplateModal, WorkshopModal } from '../components/PlanModals';
import { PreuniversityModal } from '../components/PreuniversityModal';
import { PhraseBankModal } from '../components/PhraseBankModal';
import { LEVEL_LABEL, gradeLabel, type CnebArea, type Level, type PlanCourse } from '../types';

const LEVELS: Level[] = ['INITIAL', 'PRIMARY', 'SECONDARY'];

const HoursInput: React.FC<{ course: PlanCourse }> = ({ course }) => {
  const update = useUpdatePlanCourse();
  const [value, setValue] = useState(course.weeklyHours?.toString() ?? '');
  useEffect(() => setValue(course.weeklyHours?.toString() ?? ''), [course.weeklyHours]);
  return (
    <Input type="number" min={0} max={40} className="h-8 w-16 text-center" aria-label={`Horas semanales de ${course.name}`} value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        const next = value === '' ? null : Number(value);
        if (next !== course.weeklyHours) update.mutate({ planCourseId: course.planCourseId, weeklyHours: next });
      }} />
  );
};

export const StudyPlanPage: React.FC = () => {
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

  useEffect(() => { if (catalog) setGrade(catalog.grades[level][0]); }, [catalog, level]);

  if (!catalog || grade === null) return <Skeleton className="h-64 w-full" />;
  const areaSpec = (code: string | null) => catalog.areas[level].find((a) => a.code === code);
  const workshops = plan?.courses.filter((c) => c.kind === 'WORKSHOP') ?? [];
  const problems = plan ? [
    ...plan.requiredMissing.map((n) => `Falta el área ${n}.`),
    ...plan.coverage.filter((c) => c.missing.length).map((c) => `${c.name}: falta ${c.missing.map((n) => catalog.competences[n].shortName).join(', ')}.`),
    ...plan.coverage.filter((c) => c.conflict).map((c) => `${c.name} está como área completa y dividida a la vez. Quita una de las dos.`),
  ] : [];

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Plan de estudios"
        description="Qué cursos se dictan en cada grado. Las competencias vienen del Currículo Nacional y no se editan a mano."
        actions={<>
          <Button variant="outline" onClick={() => setPhrasesOpen(true)}>Banco de frases</Button>
          {level !== 'INITIAL' && <Button variant="outline" onClick={() => setPreuniOpen(true)}>Cursos preuniversitarios</Button>}
          <Button variant="outline" onClick={() => setWorkshopOpen(true)}>Agregar taller</Button>
          <Button onClick={() => setTemplateOpen(true)}>Aplicar plantilla CNEB</Button>
        </>}
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs value={level} onChange={setLevel} items={LEVELS.map((l) => ({ value: l, label: LEVEL_LABEL[l] }))} />
        <div className="flex flex-wrap gap-1.5">
          {catalog.grades[level].map((g) => (
            <button key={g} type="button" onClick={() => setGrade(g)}
              className={cn('rounded-full border px-3 py-1 text-sm', g === grade ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground')}>
              {gradeLabel(level, g)}
            </button>
          ))}
        </div>
      </div>

      {isLoading || !plan ? <Skeleton className="h-64 w-full" /> : plan.courses.length === 0 ? (
        <EmptyState icon={<BookOpen className="h-8 w-8" />} title={`${gradeLabel(level, grade)} aún no tiene plan de estudios`}
          description="Aplica la plantilla del Currículo Nacional para crear las áreas oficiales con sus competencias."
          action={<Button onClick={() => applyTemplate.mutate({ level, grades: [grade], includeOptional: [] })}>Aplicar plantilla a este grado</Button>} />
      ) : (
        <>
          {problems.length > 0 && (
            <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
              <p className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" />El plan de este grado está incompleto</p>
              <ul className="mt-1 list-disc pl-6">{problems.map((p) => <li key={p}>{p}</li>)}</ul>
            </div>
          )}
          <div className="space-y-3">
            {plan.coverage.filter((c) => c.inPlan).map((cov) => {
              const spec = areaSpec(cov.code)!;
              const courses = plan.courses.filter((c) => c.officialAreaCode === cov.code && c.kind !== 'WORKSHOP');
              const isSplit = courses.some((c) => c.kind === 'SUBCOURSE');
              return (
                <Card key={cov.code} className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold">{cov.name}</h3>
                      {cov.isTransversal && <span className="text-xs text-muted-foreground">· las registra el tutor o tutora</span>}
                      {cov.missing.length === 0 && !cov.conflict
                        ? <span className="text-xs text-emerald-600">Completa</span>
                        : <span className="text-xs text-red-600">Incompleta</span>}
                    </div>
                    {!cov.isTransversal && !isSplit && (
                      <Button variant="ghost" size="sm" onClick={() => setSplitArea(spec)}>Dividir en cursos</Button>
                    )}
                  </div>
                  <div className="mt-3 divide-y divide-border">
                    {courses.map((course) => (
                      <div key={course.planCourseId} className="flex flex-wrap items-center gap-3 py-2">
                        <div className="min-w-[10rem] flex-1">
                          <p className="text-sm">{course.name}{course.kind === 'SUBCOURSE' && <span className="ml-2 text-xs text-muted-foreground">{course.catalogKey ? 'curso preuniversitario' : 'curso del área'}</span>}</p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {course.competences.map((k) => <span key={k.id} className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{k.shortName}{k.weight !== 1 ? ` ×${k.weight}` : ''}</span>)}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">h/sem <HoursInput course={course} /></div>
                        {course.hasGrades && <span className="flex items-center gap-1 text-xs text-muted-foreground" title="Tiene notas: no se puede quitar"><Lock className="h-3.5 w-3.5" />Con notas</span>}
                        {course.kind === 'SUBCOURSE' && <Button variant="ghost" size="sm" onClick={() => setEditCourse({ course, area: spec })}>Competencias</Button>}
                        <Button variant="ghost" size="icon" disabled={course.hasGrades} onClick={() => setToRemove(course)} aria-label={`Quitar ${course.name}`}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}

            {plan.coverage.some((c) => !c.inPlan) && (
              <Card className="p-4">
                <h3 className="text-sm font-semibold">Áreas que no están en el plan</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {plan.coverage.filter((c) => !c.inPlan).map((c) => (
                    <Button key={c.code} variant="outline" size="sm" onClick={() => applyTemplate.mutate({ level, grades: [grade], includeOptional: [c.code] })}>
                      + {c.name}{c.optional ? ' (opcional)' : ''}
                    </Button>
                  ))}
                </div>
              </Card>
            )}

            {workshops.length > 0 && (
              <Card className="p-4">
                <h3 className="text-sm font-semibold">Talleres <span className="font-normal text-muted-foreground">· no van al SIAGIE</span></h3>
                <div className="mt-2 divide-y divide-border">
                  {workshops.map((w) => (
                    <div key={w.planCourseId} className="flex items-center gap-3 py-2">
                      <p className="flex-1 text-sm">{w.name}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">h/sem <HoursInput course={w} /></div>
                      <Button variant="ghost" size="icon" disabled={w.hasGrades} onClick={() => setToRemove(w)} aria-label={`Quitar ${w.name}`}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </>
      )}

      {templateOpen && <TemplateModal open onClose={() => setTemplateOpen(false)} level={level} currentGrade={grade} catalog={catalog} />}
      {phrasesOpen && <PhraseBankModal open onClose={() => setPhrasesOpen(false)} catalog={catalog} initialLevel={level} />}
      {preuniOpen && <PreuniversityModal open onClose={() => setPreuniOpen(false)} level={level} grade={grade} catalog={catalog} />}
      {workshopOpen && <WorkshopModal open onClose={() => setWorkshopOpen(false)} level={level} currentGrade={grade} catalog={catalog} />}
      {splitArea && <SubcourseModal open onClose={() => setSplitArea(null)} level={level} currentGrade={grade} area={splitArea} catalog={catalog} />}
      {editCourse && <CourseCompetencesModal open onClose={() => setEditCourse(null)} course={editCourse.course} area={editCourse.area} catalog={catalog} />}
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

