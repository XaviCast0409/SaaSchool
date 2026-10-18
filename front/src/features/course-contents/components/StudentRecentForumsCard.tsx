import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  MessagesSquare,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetStudentTasks } from '../api/useCourseContents';

interface StudentRecentForumsCardProps {
  studentId?: string | null;
}

export const StudentRecentForumsCard: React.FC<StudentRecentForumsCardProps> = ({ studentId }) => {
  const navigate = useNavigate();
  const { data: tasksData, isLoading } = useGetStudentTasks(studentId);

  const forums = tasksData?.forums || [];

  if (isLoading) {
    return (
      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
        <CardContent className="space-y-3">
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
            <MessagesSquare className="w-4 h-4 text-emerald-500" />
            <span>Foros de Debate y Preguntas</span>
          </CardTitle>
          <Badge variant="secondary" className="text-[10px] font-bold">
            {forums.length} {forums.length === 1 ? 'activo' : 'activos'}
          </Badge>
        </div>
        <CardDescription className="text-xs text-muted-foreground mt-1">
          Participa y comparte tus opiniones con tus compañeros y profesores.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {forums.length === 0 ? (
          <div className="p-5 rounded-2xl bg-secondary/20 border border-border/50 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mx-auto text-muted-foreground">
              <MessageSquare className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-foreground">No hay foros abiertos por el momento</p>
            <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
              Cuando tus profesores abran un tema de debate o preguntas en clase, aparecerá aquí.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {forums.map((forum) => {
              const areaName = forum.courseAssignment?.area?.name || 'Asignatura';
              const commentCount = forum._count?.comments || 0;

              return (
                <div
                  key={forum.id}
                  className="p-3.5 rounded-xl bg-secondary/30 hover:bg-secondary/50 border border-border/60 transition-all space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 font-bold border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5"
                        >
                          {areaName}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground font-semibold">
                          Bimestre {forum.bimester}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-foreground leading-snug">
                        {forum.title}
                      </h4>
                      {forum.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-2">
                          {forum.description}
                        </p>
                      )}
                    </div>

                    <Badge
                      variant="secondary"
                      className="shrink-0 text-[10px] gap-1 font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>{commentCount} aportes</span>
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px]">
                    <span className="text-muted-foreground flex items-center gap-1 font-medium">
                      <Sparkles className="w-3 h-3 text-emerald-500" />
                      <span>Debate de aula</span>
                    </span>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(`/virtual-classroom?courseId=${forum.courseAssignmentId}`)}
                      className="h-6 px-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 gap-1"
                    >
                      <span>Participar</span>
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
