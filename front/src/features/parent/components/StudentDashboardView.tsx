import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Sparkles,
  ArrowLeft,
  BookOpen,
  BookOpenCheck,
  CalendarCheck,
  Megaphone,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { ParentChildInfo } from '../types';
import { StudentOverviewCard } from './StudentOverviewCard';
import { ChildAttendanceCard } from './ChildAttendanceCard';
import { ChildAnnouncementsCard } from './ChildAnnouncementsCard';
import { ChildGradesPreviewCard } from './ChildGradesPreviewCard';
import { ChildVirtualClassroomCard } from './ChildVirtualClassroomCard';
import { StudentPendingTasksCard } from '@/features/course-contents/components/StudentPendingTasksCard';
import { StudentRecentForumsCard } from '@/features/course-contents/components/StudentRecentForumsCard';

interface StudentDashboardViewProps {
  child: ParentChildInfo;
  isParentViewing?: boolean;
  onSwitchToParentView?: () => void;
}

export const StudentDashboardView: React.FC<StudentDashboardViewProps> = ({
  child,
  isParentViewing = false,
  onSwitchToParentView,
}) => {
  const navigate = useNavigate();
  const classroom = child.activeEnrollment?.classroom;

  const quickShortcuts = [
    {
      title: 'Aula Virtual',
      desc: 'Clases, PPT y Guías',
      icon: BookOpen,
      path: '/virtual-classroom',
      badge: 'Cursos',
    },
    {
      title: 'Mis Calificaciones',
      desc: 'Libreta oficial CNEB',
      icon: BookOpenCheck,
      path: '/grades',
      badge: 'Notas',
    },
    {
      title: 'Mi Asistencia',
      desc: 'Control y puntualidad',
      icon: CalendarCheck,
      path: '/attendance',
      badge: 'Registro',
    },
    {
      title: 'Avisos y Muro',
      desc: 'Comunicados del colegio',
      icon: Megaphone,
      path: '/announcements',
      badge: 'Avisos',
    },
  ];

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-150">
      {/* 1. Student Welcome Banner */}
      <div className="p-5 sm:p-7 rounded-2xl bg-card border border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-primary/10 text-primary border-primary/20 gap-1 text-[11px] font-bold">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Mi Mochila Digital</span>
            </Badge>
            {classroom && (
              <Badge variant="outline" className="text-[11px] font-bold">
                {classroom.grade}° "{classroom.section}" • {classroom.educationLevel}
              </Badge>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            <span>¡Hola, {child.firstNames}!</span>
            <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Bienvenido a tu entorno de aprendizaje. Revisa tus tareas, clases, notas y asistencia en un solo lugar.
          </p>
        </div>

        {isParentViewing && onSwitchToParentView && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSwitchToParentView}
            className="gap-2 text-xs font-bold self-start sm:self-auto border-border hover:bg-secondary rounded-xl"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver a Vista Apoderado</span>
          </Button>
        )}
      </div>

      {/* 2. Accesos Rápidos Principales (Quick Shortcuts Hub) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {quickShortcuts.map((s) => {
          const Icon = s.icon;
          return (
            <Card
              key={s.path}
              onClick={() => navigate(s.path)}
              className="group bg-card border-border hover:border-primary/40 hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden"
            >
              <CardContent className="p-3.5 sm:p-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                      {s.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {s.desc}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 hidden sm:block" />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 3. Ficha de Identidad del Alumno y Aula */}
      <StudentOverviewCard child={child} />

      {/* 4. Panel Académico Modular */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Columna Izquierda: Agenda de Tareas y Control de Asistencia */}
        <div className="space-y-5">
          <StudentPendingTasksCard studentId={child.id} />
          <ChildAttendanceCard enrollment={child.activeEnrollment} />
        </div>

        {/* Columna Derecha: Aula Virtual, Foros, Avisos y Libreta */}
        <div className="space-y-5">
          <ChildVirtualClassroomCard />
          <StudentRecentForumsCard studentId={child.id} />
          <ChildAnnouncementsCard />
          <ChildGradesPreviewCard />
        </div>
      </div>
    </div>
  );
};
