import React from 'react';
import { BookOpen, ClipboardCheck, MessageSquare, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface StudentCourseStatsProps {
  totalCourses: number;
  totalPendingTasks: number;
  totalForums: number;
  totalPublications: number;
  onFilterTasks?: () => void;
  onFilterForums?: () => void;
  activeFilter?: 'all' | 'tasks' | 'forums';
}

export const StudentCourseStats: React.FC<StudentCourseStatsProps> = ({
  totalCourses,
  totalPendingTasks,
  totalForums,
  totalPublications,
  onFilterTasks,
  onFilterForums,
  activeFilter = 'all',
}) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* 1. Asignaturas */}
      <Card className="bg-card border-border hover:border-primary/30 transition-all duration-200 shadow-sm">
        <CardContent className="p-3 sm:p-4 flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs font-semibold text-muted-foreground truncate">
              Materias de Clase
            </p>
            <p className="text-lg sm:text-2xl font-extrabold text-foreground tracking-tight">
              {totalCourses}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 2. Tareas Pendientes */}
      <Card
        onClick={onFilterTasks}
        className={`bg-card border transition-all duration-200 shadow-sm cursor-pointer ${
          activeFilter === 'tasks'
            ? 'border-amber-500 ring-2 ring-amber-500/20'
            : 'border-border hover:border-amber-500/40'
        }`}
      >
        <CardContent className="p-3 sm:p-4 flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs font-semibold text-muted-foreground truncate">
              Tareas Pendientes
            </p>
            <div className="flex items-center gap-1.5">
              <span className="text-lg sm:text-2xl font-extrabold text-foreground tracking-tight">
                {totalPendingTasks}
              </span>
              {totalPendingTasks > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/20">
                  Por entregar
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Foros de Debate */}
      <Card
        onClick={onFilterForums}
        className={`bg-card border transition-all duration-200 shadow-sm cursor-pointer ${
          activeFilter === 'forums'
            ? 'border-emerald-500 ring-2 ring-emerald-500/20'
            : 'border-border hover:border-emerald-500/40'
        }`}
      >
        <CardContent className="p-3 sm:p-4 flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs font-semibold text-muted-foreground truncate">
              Foros de Debate
            </p>
            <div className="flex items-center gap-1.5">
              <span className="text-lg sm:text-2xl font-extrabold text-foreground tracking-tight">
                {totalForums}
              </span>
              {totalForums > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/20">
                  Activos
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Total de Recursos */}
      <Card className="bg-card border-border hover:border-primary/30 transition-all duration-200 shadow-sm">
        <CardContent className="p-3 sm:p-4 flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs font-semibold text-muted-foreground truncate">
              Recursos Publicados
            </p>
            <p className="text-lg sm:text-2xl font-extrabold text-foreground tracking-tight">
              {totalPublications}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
