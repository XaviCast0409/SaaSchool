import React, { useState } from 'react';
import { BookOpenCheck, Printer, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useParentStore } from '@/store/useParentStore';
import { useGetMyChildren } from '@/features/students/api/useStudents';
import { useReportCard } from '@/features/grades/api/useGrades';
import { ReportCardModal } from '@/features/grades/components/ReportCardModal';
import { ChildSwitcher } from './ChildSwitcher';

export const ParentGradesView: React.FC = () => {
  const { selectedChildId, setSelectedChildId } = useParentStore();
  const { data: children = [], isLoading: loadingChildren } = useGetMyChildren();
  const [isReportCardOpen, setIsReportCardOpen] = useState(false);

  const activeChild =
    children.find((c) => c.id === selectedChildId) || children[0] || null;
  const enrollmentId = activeChild?.activeEnrollment?.id;

  const { data: reportCard, isLoading: loadingReportCard } = useReportCard(enrollmentId || '');

  if (loadingChildren) {
    return (
      <div className="space-y-4 p-4 animate-in fade-in duration-150">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
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
          No hay alumnos vinculados a tu cuenta de apoderado.
        </p>
      </div>
    );
  }

  const courses = reportCard?.courses || [];

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-150">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <BookOpenCheck className="w-6 h-6 text-primary" />
            <span>Libreta de Calificaciones de {activeChild.firstNames}</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {activeChild.activeEnrollment?.classroom.label || 'Sin aula'} • Año Lectivo{' '}
            {activeChild.activeEnrollment?.academicYear || 2026}
          </p>
        </div>

        {enrollmentId && (
          <Button
            size="sm"
            onClick={() => setIsReportCardOpen(true)}
            className="gap-2 text-xs font-bold shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Boleta Oficial (PDF)</span>
          </Button>
        )}
      </div>

      {/* Selector Multi-Hijo si tiene más de 1 */}
      <ChildSwitcher
        childrenList={children}
        selectedId={activeChild.id}
        onSelect={setSelectedChildId}
      />

      {/* Tabla de Calificaciones Oficiales */}
      <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-secondary/20 flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
              Evaluación por Áreas Curriculares (CNEB / SIAGIE)
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Escala oficial: AD (Logro Destacado), A (Logro Esperado), B (En Proceso), C (En Inicio)
            </p>
          </div>
        </div>

        {loadingReportCard ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            Cargando calificaciones del estudiante...
          </div>
        ) : courses.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">Sin calificaciones registradas</p>
            <p>Los docentes aún no han cerrado periodos de notas para este ciclo escolar.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-secondary/30 text-muted-foreground font-semibold">
                  <th className="p-3.5 text-left min-w-[200px]">Área Curricular / Asignatura</th>
                  <th className="p-3.5 text-center w-16">1° Bim</th>
                  <th className="p-3.5 text-center w-16">2° Bim</th>
                  <th className="p-3.5 text-center w-16">3° Bim</th>
                  <th className="p-3.5 text-center w-16">4° Bim</th>
                  <th className="p-3.5 text-center w-24">Promedio Anual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {courses.map((course) => {
                  const b1 = course.periods.find((p) => p.periodNumber === 1)?.siagie?.letter;
                  const b2 = course.periods.find((p) => p.periodNumber === 2)?.siagie?.letter;
                  const b3 = course.periods.find((p) => p.periodNumber === 3)?.siagie?.letter;
                  const b4 = course.periods.find((p) => p.periodNumber === 4)?.siagie?.letter;
                  const annual = course.annualSiagie?.letter;

                  return (
                    <tr key={course.assignmentId} className="hover:bg-secondary/20 transition-colors">
                      <td className="p-3.5 font-bold text-foreground">
                        <div>{course.areaName}</div>
                        {course.teacherName && (
                          <div className="text-[10px] text-muted-foreground font-normal">
                            {course.teacherName}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 text-center font-bold">
                        <GradePill letter={b1} />
                      </td>
                      <td className="p-3.5 text-center font-bold">
                        <GradePill letter={b2} />
                      </td>
                      <td className="p-3.5 text-center font-bold">
                        <GradePill letter={b3} />
                      </td>
                      <td className="p-3.5 text-center font-bold">
                        <GradePill letter={b4} />
                      </td>
                      <td className="p-3.5 text-center font-bold">
                        <GradePill letter={annual} isAnnual />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Impresión Oficial MINEDU */}
      {isReportCardOpen && enrollmentId && (
        <ReportCardModal
          isOpen={isReportCardOpen}
          onClose={() => setIsReportCardOpen(false)}
          enrollmentId={enrollmentId}
        />
      )}
    </div>
  );
};

const GradePill: React.FC<{ letter?: string | null; isAnnual?: boolean }> = ({ letter, isAnnual }) => {
  if (!letter) {
    return <span className="text-muted-foreground font-normal text-[11px]">—</span>;
  }

  let badgeColor = 'bg-secondary text-secondary-foreground border-border';
  if (letter === 'AD') badgeColor = 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
  else if (letter === 'A') badgeColor = 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30';
  else if (letter === 'B') badgeColor = 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
  else if (letter === 'C') badgeColor = 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30';

  return (
    <Badge
      variant="outline"
      className={`text-xs px-2 py-0.5 font-black ${badgeColor} ${isAnnual ? 'shadow-sm text-sm px-2.5' : ''}`}
    >
      {letter}
    </Badge>
  );
};
