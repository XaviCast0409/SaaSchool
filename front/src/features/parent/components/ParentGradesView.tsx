import React from 'react';
import { BookOpenCheck, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useParentStore } from '@/store/useParentStore';
import { useGetMyChildren } from '@/features/students/api/useStudents';
import { ReportCardView } from '@/features/academic/components/ReportCardView';
import { ChildSwitcher } from './ChildSwitcher';

export const ParentGradesView: React.FC = () => {
  const { selectedChildId, setSelectedChildId } = useParentStore();
  const { data: children = [], isLoading: loadingChildren } = useGetMyChildren();

  const activeChild =
    children.find((c) => c.id === selectedChildId) || children[0] || null;
  const enrollmentId = activeChild?.activeEnrollment?.id;

  if (loadingChildren) {
    return (
      <div className="space-y-4 p-4 animate-in fade-in duration-150">
        <Skeleton className="h-28 w-full rounded-2xl" />
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

      {/* 3. Libreta Oficial del Estudiante */}
      <ReportCardView enrollmentId={enrollmentId} />
    </div>
  );
};
