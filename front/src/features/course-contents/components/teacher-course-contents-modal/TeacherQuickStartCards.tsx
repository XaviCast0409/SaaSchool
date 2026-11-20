import React from 'react';
import { BookOpen, ClipboardList, MessageSquare, Plus, FolderOpen } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { ContentType } from '../../types';

interface TeacherQuickStartCardsProps {
  selectedBimester: number;
  periodLabel: string;
  onOpenPublish: (type: ContentType) => void;
}

export const TeacherQuickStartCards: React.FC<TeacherQuickStartCardsProps> = ({
  selectedBimester,
  periodLabel,
  onOpenPublish,
}) => {
  return (
    <div className="py-8 sm:py-12 space-y-6 max-w-2xl mx-auto text-center">
      <div className="space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-sm">
          <FolderOpen className="w-7 h-7" />
        </div>
        <h3 className="text-base sm:text-lg font-black text-foreground">
          Aún no hay publicaciones en el {selectedBimester}° {periodLabel}
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          Comienza a nutrir tu aula virtual. Los estudiantes podrán acceder a tus materiales digitales,
          entregar tareas y participar en foros.
        </p>
      </div>

      {/* 3 Tarjetas de Inicio Rápido */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
        <Card
          onClick={() => onOpenPublish('LESSON_MATERIAL')}
          className="p-4 bg-card border-border hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between gap-3"
        >
          <div className="space-y-1.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
              Subir Clase o PPT
            </h4>
            <p className="text-xs text-muted-foreground leading-normal">
              Sube diapositivas, fichas PDF o guías Word directo a la nube.
            </p>
          </div>
          <span className="text-xs font-bold text-primary flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
            Publicar Clase <Plus className="w-3 h-3" />
          </span>
        </Card>

        <Card
          onClick={() => onOpenPublish('HOMEWORK')}
          className="p-4 bg-card border-border hover:border-amber-500/50 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between gap-3"
        >
          <div className="space-y-1.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 flex items-center justify-center group-hover:scale-105 transition-transform">
              <ClipboardList className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-foreground group-hover:text-amber-600 transition-colors">
              Asignar Tarea
            </h4>
            <p className="text-xs text-muted-foreground leading-normal">
              Fija fecha de entrega, pautas y adjunta la ficha de trabajo.
            </p>
          </div>
          <span className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
            Crear Tarea <Plus className="w-3 h-3" />
          </span>
        </Card>

        <Card
          onClick={() => onOpenPublish('FORUM')}
          className="p-4 bg-card border-border hover:border-emerald-500/50 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between gap-3"
        >
          <div className="space-y-1.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 flex items-center justify-center group-hover:scale-105 transition-transform">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-foreground group-hover:text-emerald-600 transition-colors">
              Iniciar Foro
            </h4>
            <p className="text-xs text-muted-foreground leading-normal">
              Plantea una pregunta disparadora para debatir con tus alumnos.
            </p>
          </div>
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
            Crear Foro <Plus className="w-3 h-3" />
          </span>
        </Card>
      </div>
    </div>
  );
};
