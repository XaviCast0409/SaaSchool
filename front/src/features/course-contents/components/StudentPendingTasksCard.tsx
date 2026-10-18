import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Clock,
  Download,
  CheckCircle2,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetStudentTasks } from '../api/useCourseContents';
import { getDirectDownloadUrl } from '../utils/fileUrls';

interface StudentPendingTasksCardProps {
  studentId?: string | null;
}

export const StudentPendingTasksCard: React.FC<StudentPendingTasksCardProps> = ({ studentId }) => {
  const navigate = useNavigate();
  const { data: tasksData, isLoading } = useGetStudentTasks(studentId);

  const homeworks = tasksData?.homeworks || [];

  if (isLoading) {
    return (
      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-72 mt-1" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary" />
            <span>Agenda de Tareas Escolares</span>
          </CardTitle>
          <Badge variant="secondary" className="text-[10px] font-bold">
            {homeworks.length} {homeworks.length === 1 ? 'tarea' : 'tareas'}
          </Badge>
        </div>
        <CardDescription className="text-xs text-muted-foreground mt-1">
          Entregables y actividades programadas por tus profesores de aula.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {homeworks.length === 0 ? (
          <div className="p-6 rounded-2xl bg-secondary/20 border border-border/50 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-foreground">¡Estás al día con tus tareas!</p>
            <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
              No tienes tareas pendientes por entregar en este momento. ¡Excelente trabajo!
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {homeworks.map((hw) => {
              const areaName = hw.courseAssignment?.area?.name || 'Asignatura';
              const teacher = hw.courseAssignment?.teacher;
              const formattedDate = hw.dueDate
                ? new Date(hw.dueDate).toLocaleDateString('es-PE', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : null;

              return (
                <div
                  key={hw.id}
                  className="p-3.5 rounded-xl bg-secondary/30 hover:bg-secondary/50 border border-border/60 transition-all space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 font-bold border-primary/30 text-primary bg-primary/5"
                        >
                          {areaName}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground font-semibold">
                          Bimestre {hw.bimester}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-foreground leading-snug">
                        {hw.title}
                      </h4>
                      {hw.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-2">
                          {hw.description}
                        </p>
                      )}
                    </div>

                    {formattedDate && (
                      <div className="shrink-0 text-right">
                        <Badge
                          variant="secondary"
                          className="text-[10px] gap-1 font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                        >
                          <Clock className="w-3 h-3" />
                          <span>Entrega: {formattedDate}</span>
                        </Badge>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
                    <span>
                      {teacher ? `Prof. ${teacher.firstName} ${teacher.lastNamePaternal}` : 'Profesor de Aula'}
                    </span>

                    <div className="flex items-center gap-2">
                      {hw.fileUrl && (
                        <a
                          href={getDirectDownloadUrl(hw.fileUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                        >
                          <Download className="w-3 h-3" />
                          <span>Guía Adjunta</span>
                        </a>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(`/virtual-classroom?courseId=${hw.courseAssignmentId}`)}
                        className="h-6 px-2 text-[11px] font-bold text-primary hover:bg-primary/10 gap-1"
                      >
                        <span>Ver Curso</span>
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Button
          onClick={() => navigate('/virtual-classroom')}
          variant="outline"
          size="sm"
          className="w-full text-xs font-bold gap-1.5 border-dashed"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Explorar Todas las Materias y Clases</span>
        </Button>
      </CardContent>
    </Card>
  );
};
