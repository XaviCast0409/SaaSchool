import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  BookOpenCheck,
  CalendarCheck,
  Megaphone,
  School,
  Sparkles,
  Award,
  ChevronRight,
  ArrowRight,
  GraduationCap,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useMyCourseAssignments } from '@/features/course-assignments/api/useCourseAssignments';
import { useClassrooms } from '@/features/classrooms/api/useClassrooms';
import { useGetAnnouncements } from '@/features/announcements/api/useAnnouncements';
import { getSubjectTheme } from '@/features/course-contents/utils/subjectThemes';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const LEVEL_LABEL: Record<string, string> = {
  INITIAL: 'Inicial',
  PRIMARY: 'Primaria',
  SECONDARY: 'Secundaria',
};

export const TeacherDashboardView: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const { data: myCourses = [], isLoading: loadingCourses } = useMyCourseAssignments();
  const { data: classrooms = [] } = useClassrooms();
  const { data: announcementsData } = useGetAnnouncements({ page: 1, limit: 3 });

  const [selectedDashboardClassroom, setSelectedDashboardClassroom] = React.useState<string>('');

  // Aulas donde es tutor
  const tutoredClassrooms = classrooms.filter(
    (c) => c.tutorTeacherId === user?.id || c.tutorTeacher?.id === user?.id,
  );
  const isTutor = tutoredClassrooms.length > 0;
  const tutorClassroom = tutoredClassrooms[0];

  // Cálculo de métricas
  const totalCourses = myCourses.length;
  const uniqueClassrooms = new Set(myCourses.map((c) => c.classroomId)).size;
  const totalCompetences = myCourses.reduce(
    (acc, curr) => acc + (curr.area.competences?.length || 0),
    0,
  );
  const announcementsCount = announcementsData?.meta?.total ?? announcementsData?.data?.length ?? 0;

  // Aulas agrupadas con conteo de asignaturas
  const availableClassrooms = React.useMemo(() => {
    const map = new Map<string, { id: string; grade: number; section: string; educationLevel: string; count: number }>();
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

  // Cursos a mostrar: máximo 3 en vista general o los del aula seleccionada (nunca desborda el dashboard)
  const displayedCourses = React.useMemo(() => {
    if (selectedDashboardClassroom) {
      return myCourses.filter((c) => c.classroomId === selectedDashboardClassroom);
    }
    return myCourses.slice(0, 3);
  }, [myCourses, selectedDashboardClassroom]);

  const quickActions = [
    {
      title: 'Mis Cursos & Aula Virtual',
      desc: 'Sube diapositivas PPT, guías Word y tareas con Google Drive (5 TB)',
      icon: BookOpen,
      path: '/teacher-assignments',
      color: 'bg-primary/10 text-primary border-primary/20',
      actionLabel: 'Abrir Cursos',
    },
    {
      title: 'Registro de Calificaciones',
      desc: 'Ingreso de notas CNEB (AD, A, B, C) y conclusiones descriptivas',
      icon: BookOpenCheck,
      path: '/grades',
      color: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20',
      actionLabel: 'Ingresar Notas',
    },
    {
      title: 'Control de Asistencia',
      desc: isTutor
        ? `Toma de asistencia para tu aula tutoriada (${tutorClassroom.grade}° "${tutorClassroom.section}")`
        : 'Pase de lista diario, tardanzas y justificaciones escolares',
      icon: CalendarCheck,
      path: '/attendance',
      color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
      actionLabel: 'Tomar Asistencia',
    },
    {
      title: 'Muro de Comunicados',
      desc: 'Emite avisos oficiales verificados a las familias y estudiantes',
      icon: Megaphone,
      path: '/announcements',
      color: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
      actionLabel: 'Ver Avisos',
    },
  ];

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-150">
      {/* 1. Hero Header */}
      <div className="p-6 sm:p-8 rounded-2xl bg-card border border-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-primary/10 text-primary border-primary/20 gap-1 text-[11px] font-bold">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Panel Docente • SaaSchool</span>
            </Badge>

            {isTutor && tutorClassroom && (
              <Badge variant="outline" className="text-[11px] font-bold border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 gap-1">
                <School className="w-3 h-3" />
                <span>Docente Tutor: {tutorClassroom.grade}° "{tutorClassroom.section}" • {tutorClassroom.educationLevel}</span>
              </Badge>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            ¡Hola, Prof. {user?.firstName} {user?.lastNamePaternal}!
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Bienvenido a tu centro de trabajo docente. Organiza tus sesiones de aprendizaje, comparte recursos digitales en la nube y evalúa a tus estudiantes de manera ágil.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={() => navigate('/teacher-assignments')}
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
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Mis Asignaturas</p>
              <p className="text-xl sm:text-2xl font-black text-foreground">{totalCourses}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Carga horaria a cargo</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
              <School className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Aulas Asignadas</p>
              <p className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-300">{uniqueClassrooms}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Secciones activas</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-700 dark:text-sky-300 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Competencias CNEB</p>
              <p className="text-xl sm:text-2xl font-black text-foreground">{totalCompetences}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">A evaluar en el ciclo</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Comunicados</p>
              <p className="text-xl sm:text-2xl font-black text-foreground">{announcementsCount}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Circulares oficiales</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Centro de Acciones Rápidas */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>Acciones Principales del Docente</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Card
                key={action.path}
                onClick={() => navigate(action.path)}
                className="group bg-card border-border hover:border-primary/40 hover:shadow-md transition-all duration-200 cursor-pointer p-5 flex flex-col justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform border ${action.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <h3 className="text-base font-extrabold text-foreground group-hover:text-primary transition-colors">
                      {action.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {action.desc}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end pt-2 border-t border-border/50 text-xs font-bold text-primary group-hover:translate-x-1 transition-transform">
                  <span>{action.actionLabel}</span>
                  <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* 4. Resumen de Cursos a Cargo (Anti-scroll infinito) */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-primary" />
              <span>Mis Cursos a Cargo ({totalCourses})</span>
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {selectedDashboardClassroom
                ? `Mostrando cursos del aula seleccionada (${displayedCourses.length} materias)`
                : 'Acceso directo a tus materias principales'}
            </p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/teacher-assignments')}
            className="text-xs font-bold text-primary hover:bg-primary/10 h-7 self-start sm:self-auto"
          >
            <span>Ver todos los cursos ({totalCourses})</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>

        {/* Pestañas de Aulas para evitar scroll vertical largo */}
        {availableClassrooms.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedDashboardClassroom('')}
              className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-colors shrink-0 ${
                selectedDashboardClassroom === ''
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              Destacados (3)
            </button>
            {availableClassrooms.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedDashboardClassroom(c.id)}
                className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-colors shrink-0 ${
                  selectedDashboardClassroom === c.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {c.grade}° "{c.section}" {LEVEL_LABEL[c.educationLevel] || c.educationLevel} ({c.count})
              </button>
            ))}
          </div>
        )}

        {loadingCourses ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 w-full rounded-2xl" />
            ))}
          </div>
        ) : myCourses.length === 0 ? (
          <Card className="p-8 text-center border-dashed border-border bg-card">
            <p className="text-sm font-bold text-foreground">Aún no tienes asignaturas configuradas</p>
            <p className="text-xs text-muted-foreground mt-1">
              Comunícate con la dirección académica para que configuren tu carga horaria.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedCourses.map((course) => {
              const theme = getSubjectTheme(course.area.name);
              const IconComponent = theme.icon;
              return (
                <Card
                  key={course.id}
                  className="bg-card border-border hover:border-primary/40 hover:shadow-md transition-all duration-200 flex flex-col justify-between p-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <Badge variant="outline" className={`text-[10px] font-bold py-0 h-4 ${theme.badgeStyle}`}>
                            {theme.category}
                          </Badge>
                          <h4 className="text-sm font-extrabold text-foreground truncate mt-1">
                            {course.area.name}
                          </h4>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t border-border/50">
                      <School className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="font-semibold text-foreground">
                        {course.classroom.grade}° "{course.classroom.section}" • {LEVEL_LABEL[course.classroom.educationLevel] || course.classroom.educationLevel}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-3 mt-3 border-t border-border">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate('/teacher-assignments')}
                      className="text-xs font-bold h-8 rounded-xl border-primary/30 text-primary hover:bg-primary/10"
                    >
                      Aula Virtual
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        navigate(`/grades?courseAssignmentId=${course.id}&classroomId=${course.classroomId}`)
                      }
                      className="text-xs font-bold h-8 rounded-xl shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      Notas
                    </Button>
                  </div>
                </Card>
              );
            })}

            {/* Tarjeta indicadora cuando hay más cursos y estamos en vista general */}
            {!selectedDashboardClassroom && totalCourses > 3 && (
              <Card
                onClick={() => navigate('/teacher-assignments')}
                className="bg-card/50 border-dashed border-border hover:border-primary/50 transition-all p-5 flex flex-col items-center justify-center text-center cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <BookOpen className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-foreground">+{totalCourses - 3} materias adicionales</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">En tus otras aulas asignadas</p>
                <span className="text-[11px] font-bold text-primary mt-2 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  Explorar todo en Mis Cursos <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
