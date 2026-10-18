import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  GraduationCap,
  Search,
  LayoutGrid,
  List,
  Layers,
  AlertCircle,
  X,
} from 'lucide-react';
import { useParentStore } from '@/store/useParentStore';
import { useGetMyChildren } from '@/features/students/api/useStudents';
import { useGetStudentCourses, useGetStudentTasks } from '../api/useCourseContents';
import type { StudentCourseAssignment } from '../types';
import { StudentCourseCard } from '../components/StudentCourseCard';
import { StudentCourseStats } from '../components/StudentCourseStats';
import { StudentCourseDetailView } from '../components/StudentCourseDetailView';
import { ChildSwitcher } from '@/features/parent/components/ChildSwitcher';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/useAuthStore';
import { VirtualClassroomSupervisionView } from '../components/supervision/VirtualClassroomSupervisionView';

export const StudentCoursesPage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdminOrStaff =
    user?.role === 'SCHOOL_ADMIN' ||
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'ADMINISTRATIVE';

  if (isAdminOrStaff) {
    return <VirtualClassroomSupervisionView />;
  }

  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedChildId, setSelectedChildId } = useParentStore();
  const { data: children = [], isLoading: loadingChildren } = useGetMyChildren();

  // Auto-seleccionar primer hijo si no hay ninguno seleccionado
  useEffect(() => {
    if (children.length > 0) {
      const exists = children.some((c) => c.id === selectedChildId);
      if (!selectedChildId || !exists) {
        setSelectedChildId(children[0].id);
      }
    }
  }, [children, selectedChildId, setSelectedChildId]);

  const activeChild = children.find((c) => c.id === selectedChildId) || children[0] || null;

  const { data: studentCourses, isLoading: loadingCourses } = useGetStudentCourses(
    activeChild?.id,
  );
  const { data: studentTasks } = useGetStudentTasks(activeChild?.id);

  const [selectedCourse, setSelectedCourse] = useState<StudentCourseAssignment | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'tasks' | 'forums'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const classroom = studentCourses?.classroom;
  const assignments = useMemo(() => classroom?.assignments || [], [classroom]);

  // Deep linking: abrir curso automáticamente si está en query params ?courseId=...
  useEffect(() => {
    const courseIdParam = searchParams.get('courseId') || searchParams.get('assignmentId');
    if (courseIdParam && assignments.length > 0) {
      const match = assignments.find((a) => a.id === courseIdParam);
      if (match) setSelectedCourse(match);
    }
  }, [searchParams, assignments]);

  // Contadores por curso para tareas y foros
  const tasksPerCourse = useMemo(() => {
    const map = new Map<string, number>();
    (studentTasks?.homeworks || []).forEach((hw) => {
      const current = map.get(hw.courseAssignmentId) || 0;
      map.set(hw.courseAssignmentId, current + 1);
    });
    return map;
  }, [studentTasks?.homeworks]);

  const forumsPerCourse = useMemo(() => {
    const map = new Map<string, number>();
    (studentTasks?.forums || []).forEach((forum) => {
      const current = map.get(forum.courseAssignmentId) || 0;
      map.set(forum.courseAssignmentId, current + 1);
    });
    return map;
  }, [studentTasks?.forums]);

  // Filtro y búsqueda
  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        a.area.name.toLowerCase().includes(q) ||
        (a.teacher && `${a.teacher.firstName} ${a.teacher.lastNamePaternal}`.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (activeFilter === 'tasks') {
        return (tasksPerCourse.get(a.id) || 0) > 0;
      }
      if (activeFilter === 'forums') {
        return (forumsPerCourse.get(a.id) || 0) > 0;
      }

      return true;
    });
  }, [assignments, searchQuery, activeFilter, tasksPerCourse, forumsPerCourse]);

  const totalPublications = useMemo(() => {
    return assignments.reduce((acc, a) => acc + (a._count?.contents || 0), 0);
  }, [assignments]);

  if (loadingChildren) {
    return (
      <div className="space-y-6 pb-8 animate-in fade-in duration-200">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="p-8 rounded-2xl bg-card border border-border text-center space-y-4 my-6 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto text-muted-foreground">
          <AlertCircle className="w-6 h-6 text-amber-500" />
        </div>
        <h2 className="text-lg font-bold text-foreground">No se encontraron alumnos vinculados</h2>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Comunícate con la administración de tu colegio para vincular tu cuenta con la matrícula de tu hijo.
        </p>
      </div>
    );
  }

  // Si hay un curso seleccionado, mostramos la vista inmersiva del aula de clase
  if (selectedCourse && classroom) {
    return (
      <StudentCourseDetailView
        assignment={selectedCourse}
        classroomLabel={`${classroom.grade}° "${classroom.section}" • ${classroom.educationLevel}`}
        onBack={() => {
          setSelectedCourse(null);
          if (searchParams.has('courseId') || searchParams.has('assignmentId')) {
            const nextParams = new URLSearchParams(searchParams);
            nextParams.delete('courseId');
            nextParams.delete('assignmentId');
            setSearchParams(nextParams);
          }
        }}
      />
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-150">
      {/* 1. Banner Principal */}
      <div className="p-5 sm:p-7 rounded-2xl bg-card border border-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/10 text-primary border-primary/20 gap-1 text-[11px] font-bold">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Aula Virtual Escolar</span>
            </Badge>
            {classroom && (
              <Badge variant="outline" className="text-[11px] font-bold">
                {classroom.grade}° "{classroom.section}" • {classroom.educationLevel}
              </Badge>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            Asignaturas de {activeChild?.firstNames}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Accede a diapositivas PPT, guías Word, tareas con fecha límite y participa en debates académicos.
          </p>
        </div>
      </div>

      {/* 2. Selector Multi-Hijo si aplica */}
      {children.length > 1 && (
        <ChildSwitcher
          childrenList={children}
          selectedId={activeChild?.id || ''}
          onSelect={setSelectedChildId}
        />
      )}

      {/* 3. Barra de Estadísticas y Métricas Clave */}
      <StudentCourseStats
        totalCourses={assignments.length}
        totalPendingTasks={studentTasks?.homeworks?.length || 0}
        totalForums={studentTasks?.forums?.length || 0}
        totalPublications={totalPublications}
        activeFilter={activeFilter}
        onFilterTasks={() => setActiveFilter((prev) => (prev === 'tasks' ? 'all' : 'tasks'))}
        onFilterForums={() => setActiveFilter((prev) => (prev === 'forums' ? 'all' : 'forums'))}
      />

      {/* 4. Barra de Filtros, Búsqueda y Modo de Vista */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border">
        {/* Buscador */}
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

        {/* Filtros rápidos y cambio de vista */}
        <div className="flex items-center gap-2 justify-between sm:justify-end flex-wrap">
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant={activeFilter === 'all' ? 'default' : 'ghost'}
              onClick={() => setActiveFilter('all')}
              className="h-8 text-xs font-bold rounded-xl"
            >
              Todas
            </Button>
            <Button
              size="sm"
              variant={activeFilter === 'tasks' ? 'default' : 'ghost'}
              onClick={() => setActiveFilter('tasks')}
              className="h-8 text-xs font-bold rounded-xl text-amber-700 dark:text-amber-300"
            >
              Tareas ({studentTasks?.homeworks?.length || 0})
            </Button>
            <Button
              size="sm"
              variant={activeFilter === 'forums' ? 'default' : 'ghost'}
              onClick={() => setActiveFilter('forums')}
              className="h-8 text-xs font-bold rounded-xl text-emerald-700 dark:text-emerald-300"
            >
              Foros ({studentTasks?.forums?.length || 0})
            </Button>
          </div>

          <div className="h-5 w-px bg-border hidden sm:block" />

          {/* Toggle Grid / List */}
          <div className="flex items-center border border-border rounded-xl p-0.5 bg-muted/40">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
              title="Vista en cuadrícula"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
              title="Vista en lista"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Cuadrícula / Lista de Asignaturas */}
      {loadingCourses ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-2xl" />
          ))}
        </div>
      ) : assignments.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-border bg-card">
          <Layers className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-base font-bold text-foreground">No hay materias configuradas aún</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
            El colegio todavía no ha asignado docentes a las asignaturas de esta sección para el año escolar actual.
          </p>
        </Card>
      ) : filteredAssignments.length === 0 ? (
        <Card className="p-10 text-center border-dashed border-border bg-card">
          <Search className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-foreground">No se encontraron materias</h3>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-1">
            No hay materias que coincidan con los filtros seleccionados.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSearchQuery('');
              setActiveFilter('all');
            }}
            className="mt-3 text-xs font-bold rounded-xl"
          >
            Restablecer Filtros
          </Button>
        </Card>
      ) : (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
              : 'space-y-3'
          }
        >
          {filteredAssignments.map((assignment) => (
            <StudentCourseCard
              key={assignment.id}
              assignment={assignment}
              viewMode={viewMode}
              pendingTasksCount={tasksPerCourse.get(assignment.id) || 0}
              activeForumsCount={forumsPerCourse.get(assignment.id) || 0}
              onSelect={(item) => setSelectedCourse(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
