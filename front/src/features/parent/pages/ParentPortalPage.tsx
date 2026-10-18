import React, { useEffect } from 'react';
import { AlertCircle, HeartHandshake, Backpack } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/useAuthStore';
import { useParentStore } from '@/store/useParentStore';
import { useGetMyChildren } from '@/features/students/api/useStudents';
import { ChildSwitcher } from '../components/ChildSwitcher';
import { ChildOverviewCard } from '../components/ChildOverviewCard';
import { ChildAttendanceCard } from '../components/ChildAttendanceCard';
import { ChildFinancialCard } from '../components/ChildFinancialCard';
import { ChildAnnouncementsCard } from '../components/ChildAnnouncementsCard';
import { ChildGradesPreviewCard } from '../components/ChildGradesPreviewCard';
import { ChildVirtualClassroomCard } from '../components/ChildVirtualClassroomCard';
import { StudentDashboardView } from '../components/StudentDashboardView';

export const ParentPortalPage: React.FC = () => {
  const { user } = useAuthStore();
  const { selectedChildId, setSelectedChildId, viewMode, setViewMode } = useParentStore();

  const isStudentUser = Boolean(
    user?.email &&
      (user.email.toLowerCase().includes('alumno') || user.email.toLowerCase().includes('estudiante')),
  );
  const effectiveMode = isStudentUser ? 'STUDENT' : viewMode;

  const { data: children = [], isLoading, isError } = useGetMyChildren();

  // Auto-seleccionar primer hijo si no hay ninguno seleccionado o si cambió la lista
  useEffect(() => {
    if (children.length > 0) {
      const exists = children.some((c) => c.id === selectedChildId);
      if (!selectedChildId || !exists) {
        setSelectedChildId(children[0].id);
      }
    }
  }, [children, selectedChildId, setSelectedChildId]);

  const activeChild = children.find((c) => c.id === selectedChildId) || children[0] || null;

  if (isLoading) {
    return (
      <div className="space-y-6 pb-8 animate-in fade-in duration-200">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-36 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || children.length === 0) {
    return (
      <div className="p-8 rounded-2xl bg-card border border-border text-center space-y-4 my-6 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto text-muted-foreground">
          <AlertCircle className="w-6 h-6 text-amber-500" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-foreground">
            No se encontraron alumnos vinculados
          </h2>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {isStudentUser
              ? `Tu cuenta de estudiante (${user?.email}) aún no tiene una matrícula activa vinculada en este colegio.`
              : `Tu cuenta de usuario apoderado (${user?.email}) aún no tiene estudiantes registrados en el sistema escolar.`}
          </p>
        </div>
      </div>
    );
  }

  // Si está en Modo Alumno (Estudiante directo o Apoderado explorando vista de alumno)
  if (effectiveMode === 'STUDENT' && activeChild) {
    return (
      <div className="space-y-6">
        {/* Selector de hijos si el padre tiene varios y está en modo alumno */}
        {!isStudentUser && children.length > 1 && (
          <ChildSwitcher
            childrenList={children}
            selectedId={activeChild.id}
            onSelect={setSelectedChildId}
          />
        )}
        <StudentDashboardView
          child={activeChild}
          isParentViewing={!isStudentUser}
          onSwitchToParentView={() => setViewMode('PARENT')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8 animate-in fade-in duration-150">
      {/* Welcome Banner del Apoderado */}
      <div className="p-5 sm:p-7 rounded-2xl bg-gradient-to-r from-primary/15 via-primary/5 to-card border border-primary/20 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
            <HeartHandshake className="w-4 h-4" />
            <span>Portal de la Familia • SaaSchool</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
            ¡Hola, {user?.firstName}!
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Revisa el estado escolar, asistencia diaria y pensiones de tus hijos en tiempo real.
          </p>
        </div>

        {/* Botón para cambiar a Vista Alumno (Mochila Digital) */}
        <Button
          onClick={() => setViewMode('STUDENT')}
          variant="outline"
          size="sm"
          className="gap-2 text-xs font-bold border-primary/30 text-primary hover:bg-primary/10 self-start sm:self-auto shrink-0 shadow-sm"
        >
          <Backpack className="w-4 h-4" />
          <span>Ver Mochila del Alumno</span>
        </Button>
      </div>

      {/* Selector Multi-Hijo (si tiene 2 o más alumnos) */}
      <ChildSwitcher
        childrenList={children}
        selectedId={activeChild?.id || ''}
        onSelect={setSelectedChildId}
      />

      {/* Tarjeta de Identidad y Aula del Alumno Seleccionado */}
      {activeChild && <ChildOverviewCard child={activeChild} />}

      {/* Grid Central de Información Esencial */}
      {activeChild && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Columna Izquierda: Asistencia y Finanzas */}
          <div className="space-y-5">
            <ChildAttendanceCard enrollment={activeChild.activeEnrollment} />
            <ChildFinancialCard enrollment={activeChild.activeEnrollment} />
          </div>

          {/* Columna Derecha: Aula Virtual, Comunicados y Libreta de Notas */}
          <div className="space-y-5">
            <ChildVirtualClassroomCard />
            <ChildAnnouncementsCard />
            <ChildGradesPreviewCard />
          </div>
        </div>
      )}
    </div>
  );
};

