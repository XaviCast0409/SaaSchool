import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  GraduationCap,
  User as UserIcon,
  ChevronRight,
  Layers,
  AlertCircle,
} from 'lucide-react';
import { useParentStore } from '@/store/useParentStore';
import { useGetMyChildren } from '@/features/students/api/useStudents';
import { useGetStudentCourses } from '../api/useCourseContents';
import type { StudentCourseAssignment } from '../types';
import { CourseTimelineModal } from '../components/CourseTimelineModal';
import { ChildSwitcher } from '@/features/parent/components/ChildSwitcher';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export const StudentCoursesPage: React.FC = () => {
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

  const [selectedCourse, setSelectedCourse] = useState<StudentCourseAssignment | null>(null);

  const classroom = studentCourses?.classroom;
  const assignments = classroom?.assignments || [];

  if (loadingChildren) {
    return (
      <div className="space-y-6 pb-8 animate-in fade-in duration-200">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-44 w-full rounded-2xl" />
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

  return (
    <div className="space-y-6 pb-8 animate-in fade-in duration-150">
      {/* Banner Principal */}
      <div className="p-5 sm:p-7 rounded-2xl bg-gradient-to-r from-primary/15 via-primary/5 to-card border border-primary/20 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
            <GraduationCap className="w-4 h-4" />
            <span>Aula Virtual • Materiales, Tareas y Foros</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
            Asignaturas de {activeChild?.firstNames}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {classroom
              ? `${classroom.grade}° "${classroom.section}" • Nivel ${classroom.educationLevel}`
              : 'Descarga diapositivas PPT, guías Word, tareas y debate en los foros de clase.'}
          </p>
        </div>
      </div>

      {/* Selector Multi-Hijo si aplica */}
      {children.length > 1 && (
        <ChildSwitcher
          childrenList={children}
          selectedId={activeChild?.id || ''}
          onSelect={setSelectedChildId}
        />
      )}

      {/* Grid de Asignaturas del Estudiante */}
      {loadingCourses ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-44 w-full rounded-2xl" />
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assignments.map((assignment) => {
            const teacherFullName = assignment.teacher
              ? `${assignment.teacher.firstName} ${assignment.teacher.lastNamePaternal}`
              : 'Docente no asignado';
            const contentsCount = assignment._count?.contents || 0;

            return (
              <Card
                key={assignment.id}
                className="bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <Badge variant="outline" className="text-[10px] uppercase font-bold border-primary/20 text-primary">
                      {classroom?.educationLevel || 'Curso'}
                    </Badge>
                    {contentsCount > 0 ? (
                      <Badge className="text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                        {contentsCount} {contentsCount === 1 ? 'publicación' : 'publicaciones'}
                      </Badge>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">Sin publicaciones</span>
                    )}
                  </div>

                  <CardTitle className="text-base font-bold text-foreground line-clamp-1 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-primary shrink-0" />
                    <span>{assignment.area.name}</span>
                  </CardTitle>

                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
                    <UserIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">Prof. {teacherFullName}</span>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="border-t border-border pt-3">
                    <Button
                      onClick={() => setSelectedCourse(assignment)}
                      size="sm"
                      className="w-full text-xs font-bold gap-2 shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground justify-between"
                    >
                      <div className="flex items-center gap-1.5">
                        <GraduationCap className="w-4 h-4" />
                        <span>Ver Clases y Tareas</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de Muro de Contenidos por Bimestre del Curso */}
      {selectedCourse && classroom && (
        <CourseTimelineModal
          isOpen={!!selectedCourse}
          onClose={() => setSelectedCourse(null)}
          assignmentId={selectedCourse.id}
          areaName={selectedCourse.area.name}
          teacherName={
            selectedCourse.teacher
              ? `${selectedCourse.teacher.firstName} ${selectedCourse.teacher.lastNamePaternal}`
              : null
          }
          classroomLabel={`${classroom.grade}° "${classroom.section}"`}
        />
      )}
    </div>
  );
};
