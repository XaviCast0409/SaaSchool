import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  BookOpenCheck,
  CalendarCheck,
  ChevronRight,
  Megaphone,
  Sparkles,
} from 'lucide-react';
import { Card } from '@/components/ui/card';

export interface TeacherPendingTasksCardProps {
  isTutor: boolean;
  tutorClassroom?: { grade: number; section: string };
}

export const TeacherPendingTasksCard: React.FC<TeacherPendingTasksCardProps> = ({
  isTutor,
  tutorClassroom,
}) => {
  const navigate = useNavigate();

  const quickActions = [
    {
      title: 'Mis Cursos & Aula Virtual',
      desc: 'Sube diapositivas PPT, guías Word y tareas en la nube',
      icon: BookOpen,
      path: '/my-courses',
      color: 'bg-primary/10 text-primary border-primary/20',
      actionLabel: 'Abrir Cursos',
    },
    {
      title: 'Registro de Calificaciones',
      desc: 'Ingreso de notas CNEB (AD, A, B, C) y conclusiones descriptivas',
      icon: BookOpenCheck,
      path: '/my-courses',
      color: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20',
      actionLabel: 'Ingresar Notas',
    },
    {
      title: 'Control de Asistencia',
      desc: isTutor && tutorClassroom
        ? `Toma de asistencia para tu aula tutoriada (${tutorClassroom.grade}° "${tutorClassroom.section}")`
        : 'Pase de lista en tus cursos (la asistencia diaria la lleva el tutor)',
      icon: CalendarCheck,
      path: isTutor ? '/attendance' : '/course-attendance',
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
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform border ${action.color}`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <div className="space-y-1 min-w-0">
                  <h3 className="text-base font-extrabold text-foreground group-hover:text-primary transition-colors">
                    {action.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{action.desc}</p>
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
  );
};
