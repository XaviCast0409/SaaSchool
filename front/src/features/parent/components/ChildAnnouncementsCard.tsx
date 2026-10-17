import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone, ArrowRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGetAnnouncements } from '@/features/announcements/api/useAnnouncements';

export const ChildAnnouncementsCard: React.FC = () => {
  const navigate = useNavigate();
  const { data: announcementsData, isLoading } = useGetAnnouncements({ page: 1, limit: 2 });
  const announcements = announcementsData?.data || [];

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border/80 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground">Muro de Comunicados</h3>
            <span className="text-[11px] text-muted-foreground">Circulares y avisos oficiales</span>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/announcements')}
          className="text-xs h-7 px-2 text-primary hover:text-primary hover:bg-primary/10"
        >
          <span>Ver todos</span>
        </Button>
      </div>

      {/* List */}
      <div className="space-y-2.5">
        {isLoading ? (
          <div className="p-4 text-center text-xs text-muted-foreground">Cargando comunicados...</div>
        ) : announcements.length === 0 ? (
          <div className="p-4 rounded-xl bg-secondary/30 border border-border/40 text-center">
            <p className="text-xs text-muted-foreground">No hay nuevos comunicados oficiales publicados</p>
          </div>
        ) : (
          announcements.map((item) => (
            <div
              key={item.id}
              onClick={() => navigate('/announcements')}
              className="p-3 rounded-xl bg-secondary/20 hover:bg-secondary/50 border border-border/40 transition-colors cursor-pointer space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-foreground truncate max-w-[220px]">
                  {item.title}
                </h4>
                {item.priority === 'URGENT' ? (
                  <Badge variant="destructive" className="text-[9px] px-1.5 py-0 font-bold shrink-0">
                    Urgente
                  </Badge>
                ) : item.priority === 'IMPORTANT' ? (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-bold border-amber-500/40 text-amber-600 shrink-0">
                    Importante
                  </Badge>
                ) : null}
              </div>

              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {item.content}
              </p>

              <div className="flex items-center gap-1 text-[10px] text-muted-foreground pt-0.5">
                <Calendar className="w-2.5 h-2.5" />
                <span>{new Date(item.publishedAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/announcements')}
        className="w-full justify-between text-xs h-9 rounded-xl hover:bg-secondary/70 text-foreground"
      >
        <span>Ir al muro de comunicados</span>
        <ArrowRight className="w-4 h-4 text-primary" />
      </Button>
    </div>
  );
};
