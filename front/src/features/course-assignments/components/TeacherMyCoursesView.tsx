import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  CalendarCheck,
  GraduationCap,
  Layers,
  School,
  Sparkles,
} from 'lucide-react';
import { useMyCourseAssignments } from '../api/useCourseAssignments';
import { useAuthStore } from '@/store/useAuthStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const LEVEL_LABEL: Record<string, string> = {
  INITIAL: 'Inicial',
  PRIMARY: 'Primaria',
  SECONDARY: 'Secundaria',
};

export const TeacherMyCoursesView: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { data: myCourses = [], isLoading } = useMyCourseAssignments();

  // Estadísticas del docente
  const totalCourses = myCourses.length;
  const uniqueClassrooms = new Set(myCourses.map((c) => c.classroomId)).size;
  const levels = Array.from(new Set(myCourses.map((c) => c.classroom.educationLevel)));

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Mis Cursos Asignados
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Prof. {user?.firstName} {user?.lastNamePaternal} • Carga horaria académica oficial del año lectivo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => navigate('/attendance')}
            variant="outline"
            className="gap-2 text-xs"
          >
            <CalendarCheck className="w-4 h-4 text-primary" />
            <span>Control de Asistencia</span>
          </Button>
          <Button
            onClick={() => navigate('/grades')}
            className="gap-2 text-xs"
          >
            <Sparkles className="w-4 h-4" />
            <span>Registro de Notas</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">
              Cursos / Asignaturas
            </CardTitle>
            <BookOpen className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-extrabold text-foreground">{totalCourses}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Materias a tu cargo</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">
              Aulas Asignadas
            </CardTitle>
            <School className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {uniqueClassrooms}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Secciones activas</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">
              Nivel Académico
            </CardTitle>
            <GraduationCap className="w-4 h-4 text-sky-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-sm font-bold text-foreground truncate">
                {levels.length > 0
                  ? levels.map((l) => LEVEL_LABEL[l] || l).join(', ')
                  : 'Sin asignar'}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">CNEB / MINEDU</p>
          </CardContent>
        </Card>
      </div>

      {/* Grid de Cursos */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-44 w-full rounded-2xl" />
          ))}
        </div>
      ) : myCourses.length === 0 ? (
        <Card className="p-10 text-center border-dashed border-border bg-card">
          <Layers className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-base font-bold text-foreground">Aún no tienes cursos asignados</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
            La dirección académica o coordinación del colegio aún no ha configurado tu carga horaria docente para este año escolar.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {myCourses.map((course) => (
            <Card
              key={course.id}
              className="bg-card hover:border-primary/40 transition-all shadow-sm flex flex-col justify-between"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <Badge variant="outline" className="text-[10px] uppercase font-bold text-primary border-primary/30">
                    {LEVEL_LABEL[course.classroom.educationLevel]}
                  </Badge>
                  {course.area.officialCode && (
                    <span className="text-[11px] font-mono font-bold text-muted-foreground">
                      {course.area.officialCode}
                    </span>
                  )}
                </div>
                <CardTitle className="text-base font-bold text-foreground line-clamp-1">
                  {course.area.name}
                </CardTitle>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                  <School className="w-3.5 h-3.5 text-primary" />
                  <span className="font-semibold text-foreground">
                    {course.classroom.grade}° "{course.classroom.section}"
                  </span>
                  <span>• Turno {course.classroom.shift === 'MORNING' ? 'Mañana' : 'Tarde'}</span>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="border-t border-border pt-3 flex items-center gap-2">
                  <Button
                    onClick={() => navigate('/attendance')}
                    size="sm"
                    variant="outline"
                    className="w-full text-xs font-semibold gap-1.5"
                  >
                    <CalendarCheck className="w-3.5 h-3.5 text-primary" />
                    <span>Asistencia</span>
                  </Button>
                  <Button
                    onClick={() => navigate('/grades')}
                    size="sm"
                    className="w-full text-xs font-semibold gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Notas</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
