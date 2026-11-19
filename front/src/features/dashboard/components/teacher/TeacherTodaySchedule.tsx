import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, School } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getSubjectTheme } from '@/features/course-contents/utils/subjectThemes';
import { formatEducationLevel } from '@/lib/utils';
import type { CourseAssignment } from '@/features/course-assignments/api/useCourseAssignments';

export interface ClassroomSummary {
  id: string;
  grade: number;
  section: string;
  educationLevel: string;
  count: number;
}

export interface TeacherTodayScheduleProps {
  myCourses: CourseAssignment[];
  loadingCourses: boolean;
  availableClassrooms: ClassroomSummary[];
}

export const TeacherTodaySchedule: React.FC<TeacherTodayScheduleProps> = ({
  myCourses,
  loadingCourses,
  availableClassrooms,
}) => {
  const navigate = useNavigate();
  const [selectedDashboardClassroom, setSelectedDashboardClassroom] = useState<string>('');
  const totalCourses = myCourses.length;

  const displayedCourses = useMemo(() => {
    if (selectedDashboardClassroom) {
      return myCourses.filter((c) => c.classroomId === selectedDashboardClassroom);
    }
    return myCourses.slice(0, 3);
  }, [myCourses, selectedDashboardClassroom]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-primary" />
            <span>Mis Cursos a Cargo ({totalCourses})</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {selectedDashboardClassroom
              ? `Mostrando cursos del aula seleccionada (${displayedCourses.length} materias)`
              : 'Acceso directo a tus materias principales'}
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/my-courses')}
          className="text-xs font-bold text-primary hover:bg-primary/10 h-7 self-start sm:self-auto"
        >
          <span>Ver todos los cursos ({totalCourses})</span>
          <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      </div>

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
              {c.grade}° "{c.section}" {formatEducationLevel(c.educationLevel)} ({c.count})
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
                        <Badge variant="outline" className={`text-xs font-bold py-0 h-4 ${theme.badgeStyle}`}>
                          {theme.category}
                        </Badge>
                        <h4 className="text-sm font-extrabold text-foreground truncate mt-1">{course.area.name}</h4>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t border-border/50">
                    <School className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="font-semibold text-foreground">
                      {course.classroom.grade}° "{course.classroom.section}" •{' '}
                      {formatEducationLevel(course.classroom.educationLevel)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-3 mt-3 border-t border-border">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate('/my-courses')}
                    className="text-xs font-bold h-8 rounded-xl border-primary/30 text-primary hover:bg-primary/10"
                  >
                    Aula Virtual
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => navigate(`/gradebook/${course.id}`)}
                    className="text-xs font-bold h-8 rounded-xl shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    Notas
                  </Button>
                </div>
              </Card>
            );
          })}

          {!selectedDashboardClassroom && totalCourses > 3 && (
            <Card
              onClick={() => navigate('/my-courses')}
              className="bg-card/50 border-dashed border-border hover:border-primary/50 transition-all p-5 flex flex-col items-center justify-center text-center cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <BookOpen className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-foreground">+{totalCourses - 3} materias adicionales</p>
              <p className="text-xs text-muted-foreground mt-0.5">En tus otras aulas asignadas</p>
              <span className="text-xs font-bold text-primary mt-2 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                Explorar todo en Mis Cursos <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
