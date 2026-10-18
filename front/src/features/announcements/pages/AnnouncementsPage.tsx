import React, { useState } from 'react';
import { Plus, Search, Megaphone, Bell, AlertTriangle, X } from 'lucide-react';
import { useGetAnnouncements, useDeleteAnnouncement } from '../api/useAnnouncements';
import { AnnouncementCard } from '../components/AnnouncementCard';
import { CreateAnnouncementModal } from '../components/CreateAnnouncementModal';
import { Pagination } from '@/components/ui/Pagination';
import { useAuthStore } from '@/store/useAuthStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import type { AnnouncementPriority } from '../types';

export const AnnouncementsPage: React.FC = () => {
  const currentUser = useAuthStore((state) => state.user);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState<AnnouncementPriority | undefined>(undefined);

  const { data, isLoading, isError } = useGetAnnouncements({
    page,
    limit,
    search,
    priority,
  });

  const { mutateAsync: deleteAnnouncement } = useDeleteAnnouncement();

  const canCreate =
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'SCHOOL_ADMIN' ||
    currentUser?.role === 'ADMINISTRATIVE' ||
    currentUser?.role === 'TEACHER';

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar este comunicado?')) {
      await deleteAnnouncement(id);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-150">
      {/* 1. Header Sección */}
      <div className="p-5 sm:p-7 rounded-2xl bg-card border border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/10 text-primary border-primary/20 gap-1 text-[11px] font-bold">
              <Megaphone className="w-3.5 h-3.5" />
              <span>Muro Institucional Oficial</span>
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            Avisos y Comunicados Escolares
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Circulares, notas informativas y avisos institucionales oficiales verificados por el colegio.
          </p>
        </div>

        {canCreate && (
          <Button
            onClick={() => setIsModalOpen(true)}
            size="sm"
            className="gap-2 text-xs font-bold rounded-xl h-10 px-4 self-start sm:self-auto shrink-0 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Comunicado</span>
          </Button>
        )}
      </div>

      {/* 2. Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border">
        {/* Buscador */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar comunicados por título o contenido..."
            className="pl-9 pr-8 h-9 text-xs rounded-xl bg-background"
          />
          {search && (
            <button
              onClick={() => {
                setSearch('');
                setPage(1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filtros por Prioridad */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { label: 'Todos', value: undefined },
            { label: 'Urgentes', value: 'URGENT' },
            { label: 'Importantes', value: 'IMPORTANT' },
            { label: 'Informativos', value: 'NORMAL' },
          ].map((item) => (
            <Button
              key={item.label}
              size="sm"
              variant={priority === item.value ? 'default' : 'ghost'}
              onClick={() => {
                setPriority(item.value as AnnouncementPriority | undefined);
                setPage(1);
              }}
              className="h-8 text-xs font-bold rounded-xl shrink-0"
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {/* 3. Contenido del Muro */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6 rounded-2xl border-border animate-pulse space-y-3">
              <div className="h-4 bg-muted rounded-lg w-1/4" />
              <div className="h-5 bg-muted rounded-lg w-2/3" />
              <div className="h-4 bg-muted rounded-lg w-full" />
              <div className="h-4 bg-muted rounded-lg w-4/5" />
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card className="p-8 text-center rounded-2xl border-destructive/20 bg-destructive/5 text-destructive space-y-2">
          <AlertTriangle className="w-8 h-8 mx-auto opacity-80" />
          <p className="font-bold text-sm">Ocurrió un error al cargar los comunicados.</p>
          <p className="text-xs text-muted-foreground">Intenta recargar la página.</p>
        </Card>
      ) : data?.data && data.data.length > 0 ? (
        <div className="space-y-4">
          {data.data.map((announcement) => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
              onDelete={handleDelete}
            />
          ))}

          {/* Paginación */}
          <div className="pt-2">
            <Pagination
              currentPage={data.meta.page}
              totalPages={data.meta.totalPages}
              totalItems={data.meta.total}
              limit={limit}
              onPageChange={(p) => setPage(p)}
              onLimitChange={(l) => {
                setLimit(l);
                setPage(1);
              }}
            />
          </div>
        </div>
      ) : (
        <Card className="p-12 text-center rounded-2xl border-dashed border-border bg-card">
          <Bell className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-base font-bold text-foreground">No hay comunicados disponibles</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {search || priority
              ? 'No hay avisos que coincidan con la búsqueda o el filtro seleccionado.'
              : 'Los avisos e informes oficiales del colegio aparecerán publicados en este muro.'}
          </p>
          {(search || priority) && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSearch('');
                setPriority(undefined);
              }}
              className="mt-3 text-xs font-bold rounded-xl"
            >
              Restablecer Filtros
            </Button>
          )}
        </Card>
      )}

      {/* 4. Modal para Crear Comunicado */}
      <CreateAnnouncementModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};
