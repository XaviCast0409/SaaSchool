import React, { useState, useMemo } from 'react';
import {
  BookOpenCheck,
  AlertCircle,
  Search,
  LayoutGrid,
  List,
  Award,
  Sparkles,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useParentStore } from '@/store/useParentStore';
import { useGetMyChildren } from '@/features/students/api/useStudents';
import { useReportCard } from '@/features/grades/api/useGrades';
import { StudentGradeCard, GradeBadge } from '@/features/grades/components/StudentGradeCard';
import { ChildSwitcher } from './ChildSwitcher';

export const ParentGradesView: React.FC = () => {
  const { selectedChildId, setSelectedChildId } = useParentStore();
  const { data: children = [], isLoading: loadingChildren } = useGetMyChildren();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const activeChild =
    children.find((c) => c.id === selectedChildId) || children[0] || null;
  const enrollmentId = activeChild?.activeEnrollment?.id;

  const { data: reportCard, isLoading: loadingReportCard } = useReportCard(enrollmentId || '');
  const courses = useMemo(() => reportCard?.courses || [], [reportCard]);

  // Filtro de búsqueda
  const filteredCourses = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return courses;
    return courses.filter(
      (c) =>
        c.areaName.toLowerCase().includes(q) ||
        (c.teacherName && c.teacherName.toLowerCase().includes(q)),
    );
  }, [courses, searchQuery]);

  // KPIs de Calificaciones
  const stats = useMemo(() => {
    let adCount = 0;
    let aCount = 0;
    let bCount = 0;
    courses.forEach((c) => {
      const annual = c.annualSiagie?.letter;
      if (annual === 'AD') adCount++;
      else if (annual === 'A') aCount++;
      else if (annual === 'B') bCount++;
    });
    return { adCount, aCount, bCount, total: courses.length };
  }, [courses]);

  if (loadingChildren) {
    return (
      <div className="space-y-4 p-4 animate-in fade-in duration-150">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!activeChild) {
    return (
      <div className="p-8 text-center bg-card border border-border rounded-2xl space-y-2 shadow-sm">
        <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
        <h3 className="font-bold text-sm text-foreground">Sin estudiantes asignados</h3>
        <p className="text-xs text-muted-foreground">
          No hay alumnos vinculados a tu cuenta de usuario.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-150">
      {/* 1. Cabecera Principal */}
      <div className="p-5 sm:p-7 rounded-2xl bg-card border border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-primary/10 text-primary border-primary/20 gap-1 text-[11px] font-bold">
              <BookOpenCheck className="w-3.5 h-3.5" />
              <span>Libreta de Calificaciones</span>
            </Badge>
            <Badge variant="outline" className="text-[11px] font-bold">
              {activeChild.activeEnrollment?.classroom.label || 'Sin aula'} • Año Lectivo{' '}
              {activeChild.activeEnrollment?.academicYear || 2026}
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            Calificaciones de {activeChild.firstNames}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Evaluación formativa por competencias oficiales del Currículo Nacional (CNEB / SIAGIE).
          </p>
        </div>
      </div>

      {/* 2. Selector Multi-Hijo si aplica */}
      {children.length > 1 && (
        <ChildSwitcher
          childrenList={children}
          selectedId={activeChild.id}
          onSelect={setSelectedChildId}
        />
      )}

      {/* 3. Barra de Estadísticas de Rendimiento */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-black text-base shrink-0">
              AD
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Logro Destacado</p>
              <p className="text-xl font-black text-foreground">{stats.adCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-700 dark:text-sky-300 flex items-center justify-center font-black text-base shrink-0">
              A
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Logro Esperado</p>
              <p className="text-xl font-black text-foreground">{stats.aCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 flex items-center justify-center font-black text-base shrink-0">
              B
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">En Proceso</p>
              <p className="text-xl font-black text-foreground">{stats.bCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Áreas Totales</p>
              <p className="text-xl font-black text-foreground">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Barra de Herramientas y Buscador */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar materia o docente..."
            className="pl-9 pr-8 h-9 text-xs rounded-xl bg-background"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Toggle Grid / Table */}
        <div className="flex items-center border border-border rounded-xl p-0.5 bg-muted/40 self-end sm:self-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold px-2.5 ${
              viewMode === 'grid' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Tarjetas</span>
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold px-2.5 ${
              viewMode === 'table' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Matriz Oficial</span>
          </button>
        </div>
      </div>

      {/* 5. Contenido Principal */}
      {loadingReportCard ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-44 w-full rounded-2xl" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-border bg-card">
          <Award className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-base font-bold text-foreground">Sin calificaciones registradas aún</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
            Los docentes aún no han cerrado periodos de notas para este ciclo escolar.
          </p>
        </Card>
      ) : filteredCourses.length === 0 ? (
        <Card className="p-10 text-center border-dashed border-border bg-card">
          <Search className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-foreground">No se encontraron asignaturas</h3>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-1">
            No hay materias que coincidan con la búsqueda "{searchQuery}".
          </p>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCourses.map((c) => (
            <StudentGradeCard key={c.assignmentId} course={c} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground font-bold">
                  <th className="p-3.5 text-left min-w-[200px]">Área Curricular / Asignatura</th>
                  <th className="p-3.5 text-center w-16">1° Bim</th>
                  <th className="p-3.5 text-center w-16">2° Bim</th>
                  <th className="p-3.5 text-center w-16">3° Bim</th>
                  <th className="p-3.5 text-center w-16">4° Bim</th>
                  <th className="p-3.5 text-center w-24">Promedio Anual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredCourses.map((course) => {
                  const b1 = course.periods.find((p) => p.periodNumber === 1)?.siagie?.letter;
                  const b2 = course.periods.find((p) => p.periodNumber === 2)?.siagie?.letter;
                  const b3 = course.periods.find((p) => p.periodNumber === 3)?.siagie?.letter;
                  const b4 = course.periods.find((p) => p.periodNumber === 4)?.siagie?.letter;
                  const annual = course.annualSiagie?.letter;

                  return (
                    <tr key={course.assignmentId} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3.5 font-bold text-foreground">
                        <div>{course.areaName}</div>
                        {course.teacherName && (
                          <div className="text-[10px] text-muted-foreground font-normal">
                            Prof. {course.teacherName}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 text-center font-bold">
                        <GradeBadge letter={b1} size="sm" />
                      </td>
                      <td className="p-3.5 text-center font-bold">
                        <GradeBadge letter={b2} size="sm" />
                      </td>
                      <td className="p-3.5 text-center font-bold">
                        <GradeBadge letter={b3} size="sm" />
                      </td>
                      <td className="p-3.5 text-center font-bold">
                        <GradeBadge letter={b4} size="sm" />
                      </td>
                      <td className="p-3.5 text-center font-bold">
                        <GradeBadge letter={annual} size="md" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Leyenda de Escala MINEDU */}
      <div className="p-4 rounded-2xl bg-card border border-border space-y-2 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-foreground">
          <Sparkles className="w-4 h-4 text-primary" />
          <span>Escala de Calificación Cualitativa Nacional (CNEB)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-muted-foreground text-[11px] pt-1">
          <div className="p-2 rounded-xl bg-secondary/30 border border-border/50">
            <span className="font-extrabold text-emerald-700 dark:text-emerald-300 mr-1.5">AD</span>
            <span>Logro Destacado (nivel superior al esperado)</span>
          </div>
          <div className="p-2 rounded-xl bg-secondary/30 border border-border/50">
            <span className="font-extrabold text-sky-700 dark:text-sky-300 mr-1.5">A</span>
            <span>Logro Esperado (alcanza la competencia)</span>
          </div>
          <div className="p-2 rounded-xl bg-secondary/30 border border-border/50">
            <span className="font-extrabold text-amber-700 dark:text-amber-300 mr-1.5">B</span>
            <span>En Proceso (próximo o cerca de alcanzarla)</span>
          </div>
          <div className="p-2 rounded-xl bg-secondary/30 border border-border/50">
            <span className="font-extrabold text-rose-700 dark:text-rose-300 mr-1.5">C</span>
            <span>En Inicio (muestra progresos mínimos)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
