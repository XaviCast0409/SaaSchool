import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Award,
  BookOpen,
  GraduationCap,
  Megaphone,
  School,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useGetAnnouncements } from '@/features/announcements/api/useAnnouncements';
import { useClassrooms } from '@/features/classrooms/api/useClassrooms';
import { useMyCourseAssignments } from '@/features/course-assignments/api/useCourseAssignments';
import { formatEducationLevel } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';
import { TeacherPendingTasksCard } from './teacher/TeacherPendingTasksCard';
import { TeacherTodaySchedule, type ClassroomSummary } from './teacher/TeacherTodaySchedule';

export const TeacherDashboardView: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const { data: myCourses = [], isLoading: loadingCourses } = useMyCourseAssignments();
  const { data: classrooms = [] } = useClassrooms();
  const { data: announcementsData } = useGetAnnouncements({ page: 1, limit: 3 });

  // Aulas donde es tutor
  const tutoredClassrooms = classrooms.filter((c) => c.tutorTeacherId === user?.id || c.tutorTeacher?.id === user?.id);
  const isTutor = tutoredClassrooms.length > 0;
  const tutorClassroom = tutoredClassrooms[0];

  // Cálculo de métricas
  const totalCourses = myCourses.length;
  const uniqueClassrooms = new Set(myCourses.map((c) => c.classroomId)).size;
  const totalCompetences = myCourses.reduce((acc, curr) => acc + (curr.area.competences?.length || 0), 0);
  const announcementsCount = announcementsData?.meta?.total ?? announcementsData?.data?.length ?? 0;

  // Aulas agrupadas con conteo de asignaturas
  const availableClassrooms = useMemo(() => {
    const map = new Map<string, ClassroomSummary>();
    myCourses.forEach((c) => {
      const existing = map.get(c.classroomId);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(c.classroomId, {
          id: c.classroomId,
          grade: c.classroom.grade,
          section: c.classroom.section,
          educationLevel: c.classroom.educationLevel,
          count: 1,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => {
      if (a.educationLevel !== b.educationLevel) return a.educationLevel.localeCompare(b.educationLevel);
      if (a.grade !== b.grade) return a.grade - b.grade;
      return a.section.localeCompare(b.section);
    });
  }, [myCourses]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-150">
      {/* 1. Hero Header */}
      <div className="p-6 sm:p-8 rounded-2xl bg-card border border-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-primary/10 text-primary border-primary/20 gap-1 text-xs font-bold">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Panel Docente • KIPUX</span>
            </Badge>

            {isTutor && tutorClassroom && (
              <Badge
                variant="outline"
                className="text-xs font-bold border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 gap-1"
              >
                <School className="w-3 h-3" />
                <span>
                  Docente Tutor: {tutorClassroom.grade}° "{tutorClassroom.section}" •{' '}
                  {formatEducationLevel(tutorClassroom.educationLevel)}
                </span>
              </Badge>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            ¡Hola, Prof. {user?.firstName} {user?.lastNamePaternal}!
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Bienvenido a tu centro de trabajo docente. Organiza tus sesiones de aprendizaje, comparte recursos digitales
            en la nube y evalúa a tus estudiantes de manera ágil.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={() => navigate('/my-courses')}
            size="sm"
            className="gap-2 text-xs font-bold rounded-xl h-10 px-4 shadow-sm"
          >
            <BookOpen className="w-4 h-4" />
            <span>Mis Cursos Asignados</span>
          </Button>
        </div>
      </div>

      {/* 2. KPIs Docentes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase">Mis Asignaturas</p>
              <p className="text-xl sm:text-2xl font-black text-foreground">{totalCourses}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Carga horaria a cargo</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
              <School className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase">Aulas Asignadas</p>
              <p className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-300">
                {uniqueClassrooms}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Secciones activas</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-700 dark:text-sky-300 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase">Competencias CNEB</p>
              <p className="text-xl sm:text-2xl font-black text-foreground">{totalCompetences}</p>
              <p className="text-xs text-muted-foreground mt-0.5">A evaluar en el ciclo</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase">Comunicados</p>
              <p className="text-xl sm:text-2xl font-black text-foreground">{announcementsCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Circulares oficiales</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Centro de Acciones Rápidas */}
      <TeacherPendingTasksCard isTutor={isTutor} tutorClassroom={tutorClassroom} />

      {/* 4. Resumen de Cursos a Cargo */}
      <TeacherTodaySchedule
        myCourses={myCourses}
        loadingCourses={loadingCourses}
        availableClassrooms={availableClassrooms}
      />
    </div>
  );
};
