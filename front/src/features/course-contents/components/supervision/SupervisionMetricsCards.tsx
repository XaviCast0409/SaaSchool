import React from 'react';
import { Layers, FileText, CheckCircle2, Cloud } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { SupervisionStats } from '../../types';

interface SupervisionMetricsCardsProps {
  stats?: SupervisionStats;
  isLoading: boolean;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export const SupervisionMetricsCards: React.FC<SupervisionMetricsCardsProps> = ({
  stats,
  isLoading,
}) => {
  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'Tasa de Adopción',
      value: `${stats.coveragePercentage}%`,
      subtitle: `${stats.coursesWithContentCount} de ${stats.totalAssignments} cursos con material`,
      icon: CheckCircle2,
      iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      badge: stats.coveragePercentage >= 70 ? 'Óptimo' : 'En progreso',
      badgeClass:
        stats.coveragePercentage >= 70
          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
          : 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    },
    {
      title: 'Recursos Digitales',
      value: stats.totalContents.toLocaleString(),
      subtitle: `${stats.lessonMaterialsCount} guías • ${stats.homeworksCount} tareas • ${stats.forumsCount} foros`,
      icon: Layers,
      iconBg: 'bg-primary/10 text-primary',
      badge: 'Total publicados',
      badgeClass: 'bg-primary/10 text-primary',
    },
    {
      title: 'Docentes Activos',
      value: `${stats.activeTeachersCount} / ${stats.totalTeachers}`,
      subtitle: `${Math.round(
        stats.totalTeachers > 0 ? (stats.activeTeachersCount / stats.totalTeachers) * 100 : 0,
      )}% del equipo docente`,
      icon: FileText,
      iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      badge: 'Publicando',
      badgeClass: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
    },
    {
      title: 'Almacenamiento Cloud',
      value: formatBytes(stats.totalSizeBytes),
      subtitle: 'Espacio utilizado en materiales y guías',
      icon: Cloud,
      iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
      badge: 'Almacenamiento',
      badgeClass: 'bg-purple-500/15 text-purple-700 dark:text-purple-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c, idx) => {
        const Icon = c.icon;
        return (
          <Card
            key={idx}
            className="p-4 bg-card border-border hover:shadow-sm transition-shadow flex flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {c.title}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.badgeClass}`}
              >
                {c.badge}
              </span>
            </div>

            <div className="flex items-baseline justify-between mt-3">
              <span className="text-2xl font-black text-foreground tracking-tight">
                {c.value}
              </span>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${c.iconBg}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-2 truncate font-medium">
              {c.subtitle}
            </p>
          </Card>
        );
      })}
    </div>
  );
};
