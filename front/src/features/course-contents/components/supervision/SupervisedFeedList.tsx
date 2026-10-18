import React from 'react';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SupervisedContentCard } from './SupervisedContentCard';
import type { SupervisedContentItem } from '../../types';

interface SupervisedFeedListProps {
  items: SupervisedContentItem[];
  total: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  onPageChange: (newPage: number) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

export const SupervisedFeedList: React.FC<SupervisedFeedListProps> = ({
  items,
  total,
  page,
  totalPages,
  isLoading,
  onPageChange,
  onDelete,
  isDeleting,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="p-12 text-center border-dashed border-border bg-card">
        <div className="w-12 h-12 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto mb-3">
          <Inbox className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-foreground">
          No se encontraron materiales publicados
        </h4>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 leading-relaxed">
          No hay guías, tareas o foros que coincidan con los filtros seleccionados para este ciclo académico.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span className="font-semibold">
          Mostrando <strong className="text-foreground">{items.length}</strong> de{' '}
          <strong className="text-foreground">{total}</strong> publicaciones
        </span>
        {totalPages > 1 && (
          <span>
            Página <strong className="text-foreground">{page}</strong> de{' '}
            <strong className="text-foreground">{totalPages}</strong>
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((item) => (
          <SupervisedContentCard
            key={item.id}
            item={item}
            onDelete={onDelete}
            isDeleting={isDeleting}
          />
        ))}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="h-8 px-3 text-xs gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Anterior</span>
          </Button>

          <span className="text-xs font-bold text-foreground px-3">
            {page} / {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="h-8 px-3 text-xs gap-1"
          >
            <span>Siguiente</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
