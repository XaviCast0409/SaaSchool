import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAcademicYears } from '@/features/academic-years/api/useAcademicYears';
import { useCopyPlan, useCopyTeachingLoad, useSetupStatus } from '../api';
import { gradeLabel } from '../types';

export const AcademicHomePage: React.FC = () => {
  const { data, isLoading } = useSetupStatus();
  const { data: years = [] } = useAcademicYears();
  const copyPlan = useCopyPlan();
  const copyLoad = useCopyTeachingLoad();
  const [fromYearId, setFromYearId] = useState('');

  if (isLoading || !data) return <div className="space-y-3 p-2"><Skeleton className="h-8 w-64" /><Skeleton className="h-64 w-full" /></div>;

  const steps = [
    {
      title: 'Año lectivo y periodos',
      ok: data.academicYear.hasPeriods,
      detail: `Año ${data.academicYear.year} · ${data.academicYear.periodType === 'TRIMESTER' ? '3 trimestres' : '4 bimestres'}${data.academicYear.hasPeriods ? '' : ' · faltan las fechas de los periodos'}`,
      to: '/academic-years',
    },
    {
      title: 'Plan de estudios',
      ok: data.gradesInUse > 0 && data.invalidPlans.length === 0,
      detail: data.invalidPlans.length
        ? `Revisa: ${data.invalidPlans.map((p) => gradeLabel(p.level, p.grade)).join(', ')}`
        : 'Todos los grados con aulas tienen su plan completo',
      to: '/academic/study-plan',
    },
    {
      title: 'Aulas y tutores',
      ok: data.classrooms > 0 && data.classroomsWithoutTutor === 0,
      detail: `${data.classrooms} aulas · ${data.classroomsWithoutTutor} sin tutor(a)`,
      to: '/classrooms',
    },
    {
      title: 'Carga docente',
      ok: data.coursesWithoutTeacher === 0 && data.classrooms > 0,
      detail: `${data.coursesWithoutTeacher} cursos sin docente · ${data.teachersWithoutLoad} docentes sin cursos`,
      to: '/academic/teaching-load',
    },
    {
      title: 'Evaluación y cierre',
      ok: false,
      neutral: true,
      detail: 'Sigue el avance de notas y cierra cada periodo',
      to: '/academic/progress',
    },
  ];
  const otherYears = years.filter((y) => y.id !== data.academicYear.id);

  return (
    <div className="max-w-4xl">
      <PageHeader title="Inicio académico" description={`Prepara el año ${data.academicYear.year} en cinco pasos.`} />
      <Card className="divide-y divide-border">
        {steps.map((s, i) => (
          <div key={s.title} className="flex items-center gap-4 px-5 py-4">
            {s.ok ? <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" /> : <Circle className="h-5 w-5 text-muted-foreground shrink-0" />}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{i + 1}. {s.title}</p>
              <p className="text-sm text-muted-foreground">{s.detail}</p>
            </div>
            <Button asChild variant={s.ok || s.neutral ? 'ghost' : 'outline'} size="sm">
              <Link to={s.to}>{s.ok ? 'Ver' : 'Completar'} <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
            </Button>
          </div>
        ))}
      </Card>

      {otherYears.length > 0 && (
        <Card className="mt-6 p-5">
          <p className="text-sm font-medium">Copiar desde otro año</p>
          <p className="text-sm text-muted-foreground">Trae el plan de estudios y la carga docente de un año anterior. No reemplaza lo que ya existe.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Select value={fromYearId} onChange={(e) => setFromYearId(e.target.value)}>
              <option value="">Elige un año…</option>
              {otherYears.map((y) => <option key={y.id} value={y.id}>{y.year}</option>)}
            </Select>
            <Button variant="outline" size="sm" disabled={!fromYearId || copyPlan.isPending}
              onClick={() => copyPlan.mutate({ fromAcademicYearId: fromYearId, toAcademicYearId: data.academicYear.id })}>
              Copiar plan de estudios
            </Button>
            <Button variant="outline" size="sm" disabled={!fromYearId || copyLoad.isPending}
              onClick={() => copyLoad.mutate({ fromAcademicYearId: fromYearId, toAcademicYearId: data.academicYear.id })}>
              Copiar carga docente
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
