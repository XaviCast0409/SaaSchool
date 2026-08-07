import React, { useState } from 'react';
import { Plus, Search, Megaphone, Bell, AlertTriangle } from 'lucide-react';
import { useGetAnnouncements, useDeleteAnnouncement } from '../api/useAnnouncements';
import { AnnouncementCard } from '../components/AnnouncementCard';
import { CreateAnnouncementModal } from '../components/CreateAnnouncementModal';
import { Pagination } from '@/components/ui/Pagination';
import { useAuthStore } from '@/store/useAuthStore';
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
    currentUser?.role === 'TEACHER';

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar este comunicado?')) {
      await deleteAnnouncement(id);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header Sección */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 rounded-2xl border border-primary/20">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider mb-1">
            <Megaphone className="w-4 h-4" />
            Muro Oficial del Colegio
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Comunicados y Avisos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Reemplaza el caos de WhatsApp con anuncios institucionales seguros y verificados.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all shrink-0"
          >
            <Plus className="w-5 h-5" />
            Nuevo Comunicado
          </button>
        )}
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar comunicados..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { label: 'Todos', value: undefined },
            { label: 'Urgentes', value: 'URGENT' },
            { label: 'Importantes', value: 'IMPORTANT' },
            { label: 'Normales', value: 'NORMAL' },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => {
                setPriority(item.value as AnnouncementPriority | undefined);
                setPage(1);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                priority === item.value
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-card text-muted-foreground border-border hover:bg-secondary'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido del Muro */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-xl bg-card border border-border animate-pulse p-6">
              <div className="h-4 bg-muted rounded w-1/4 mb-4"></div>
              <div className="h-6 bg-muted rounded w-2/3 mb-2"></div>
              <div className="h-4 bg-muted rounded w-full mb-1"></div>
              <div className="h-4 bg-muted rounded w-4/5"></div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="p-8 text-center rounded-2xl border border-destructive/20 bg-destructive/5 text-destructive">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-80" />
          <p className="font-semibold">Ocurrió un error al cargar los comunicados.</p>
        </div>
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
      ) : (
        <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card">
          <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <h3 className="text-lg font-bold text-foreground">No hay comunicados disponibles</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            Los avisos e informados oficiales del colegio aparecerán publicados en este muro.
          </p>
        </div>
      )}

      {/* Modal para Crear Comunicado */}
      <CreateAnnouncementModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};
