import React from 'react';
import {
  ChevronRight,
  ClipboardList,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import type { StudentCourseAssignment } from '../types';
import { getSubjectTheme } from '../utils/subjectThemes';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface StudentCourseCardProps {
  assignment: StudentCourseAssignment;
  onSelect: (assignment: StudentCourseAssignment) => void;
  pendingTasksCount?: number;
  activeForumsCount?: number;
  viewMode?: 'grid' | 'list';
}

export const StudentCourseCard: React.FC<StudentCourseCardProps> = ({
  assignment,
  onSelect,
  pendingTasksCount = 0,
  activeForumsCount = 0,
  viewMode = 'grid',
}) => {
  const theme = getSubjectTheme(assignment.area.name);
  const IconComponent = theme.icon;
  const teacherFullName = assignment.teacher
    ? `${assignment.teacher.firstName} ${assignment.teacher.lastNamePaternal}`
    : 'Docente por asignar';
  const teacherInitials = assignment.teacher
    ? `${assignment.teacher.firstName[0]}${assignment.teacher.lastNamePaternal[0]}`.toUpperCase()
    : 'D';
  const contentsCount = assignment._count?.contents || 0;

  if (viewMode === 'list') {
    return (
      <Card
        onClick={() => onSelect(assignment)}
        className="group bg-card border-border hover:border-primary/40 hover:shadow-md transition-all duration-200 cursor-pointer"
      >
        <CardContent className="p-3 sm:p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <IconComponent className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={`text-[10px] font-bold py-0 h-4 ${theme.badgeStyle}`}>
                  {theme.category}
                </Badge>
                {pendingTasksCount > 0 && (
                  <Badge className="text-[10px] font-bold py-0 h-4 bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 gap-1">
                    <ClipboardList className="w-2.5 h-2.5" />
                    <span>{pendingTasksCount} tarea{pendingTasksCount > 1 ? 's' : ''}</span>
                  </Badge>
                )}
                {activeForumsCount > 0 && (
                  <Badge className="text-[10px] font-bold py-0 h-4 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 gap-1">
                    <MessageSquare className="w-2.5 h-2.5" />
                    <span>Foro</span>
                  </Badge>
                )}
              </div>
              <h3 className="text-sm sm:text-base font-bold text-foreground truncate mt-1 group-hover:text-primary transition-colors">
                {assignment.area.name}
              </h3>
              <p className="text-xs text-muted-foreground truncate">
                Prof. {teacherFullName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline-block text-xs font-semibold text-muted-foreground">
              {contentsCount} {contentsCount === 1 ? 'recurso' : 'recursos'}
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors h-9 px-3 text-xs font-bold gap-1 rounded-xl"
            >
              <span className="hidden sm:inline">Entrar</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Vista Grid (LMS Card moderna de alta fidelidad)
  return (
    <Card
      onClick={() => onSelect(assignment)}
      className="group bg-card border-border hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden"
    >
      <div className="p-4 sm:p-5 space-y-3.5 flex-1 flex flex-col justify-between">
        <div>
          {/* Top meta tags */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <IconComponent className="w-5 h-5" />
              </div>
              <div>
                <Badge variant="outline" className={`text-[10px] font-bold py-0.5 ${theme.badgeStyle}`}>
                  {theme.category}
                </Badge>
              </div>
            </div>

            <Badge variant="secondary" className="text-[10px] font-bold shrink-0">
              {contentsCount > 0 ? `${contentsCount} publicaciones` : 'Sin materiales'}
            </Badge>
          </div>

          {/* Area title */}
          <h3 className="text-base font-extrabold text-foreground group-hover:text-primary transition-colors line-clamp-1">
            {assignment.area.name}
          </h3>

          {/* Teacher metadata */}
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
            <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0 border border-border">
              {teacherInitials}
            </div>
            <p className="text-xs text-muted-foreground truncate font-medium">
              Prof. {teacherFullName}
            </p>
          </div>
        </div>

        {/* Live indicators */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-1.5 flex-wrap min-h-[22px]">
            {pendingTasksCount > 0 ? (
              <Badge className="text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 gap-1">
                <ClipboardList className="w-3 h-3" />
                <span>{pendingTasksCount} tarea{pendingTasksCount > 1 ? 's' : ''} pendiente{pendingTasksCount > 1 ? 's' : ''}</span>
              </Badge>
            ) : null}
            {activeForumsCount > 0 ? (
              <Badge className="text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 gap-1">
                <MessageSquare className="w-3 h-3" />
                <span>Foro activo</span>
              </Badge>
            ) : null}
            {pendingTasksCount === 0 && activeForumsCount === 0 && contentsCount > 0 ? (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                <Sparkles className="w-3 h-3 text-primary" />
                <span>Materiales de clase listos</span>
              </span>
            ) : null}
          </div>

          {/* Action button */}
          <Button
            size="sm"
            className="w-full text-xs font-bold justify-between bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-200 shadow-none h-9 rounded-xl"
          >
            <span>Ingresar al Aula</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
