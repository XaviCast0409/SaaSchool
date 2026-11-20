import { useUrlFilters } from '@/lib/useUrlFilters';
import React, { useState } from 'react';
import { FileCheck2, Loader2 } from 'lucide-react';
import { Pagination } from '@/components/ui/Pagination';
import { useJustifications, useReviewJustification } from '../api/useJustifications';
import type { AttendanceJustification, JustificationStatus } from '../types';
import { JustificationsTable } from './attendance-justifications/JustificationsTable';
import { ReviewJustificationModal } from './attendance-justifications/ReviewJustificationModal';

export const AttendanceJustificationsPage: React.FC = () => {
  // Filtros en la URL: sobreviven a recargar, al botón Atrás y se pueden compartir como enlace
  const [urlFilters, setUrlFilters] = useUrlFilters({ tab: 'PENDING', page: 1, limit: 20 });
  const { page, limit } = urlFilters;
  const activeTab = urlFilters.tab as JustificationStatus;
  const setActiveTab = (value: JustificationStatus) => setUrlFilters({ tab: value });
  const setPage = (value: number) => setUrlFilters({ page: value });
  const setLimit = (value: number) => setUrlFilters({ limit: value });

  // Modal para rechazar
  const [rejectingItem, setRejectingItem] = useState<AttendanceJustification | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  const { data, isLoading } = useJustifications({
    status: activeTab,
    page,
    limit,
  });

  const { mutateAsync: reviewJustification, isPending: isReviewing } = useReviewJustification();

  const handleTabChange = (tab: JustificationStatus) => {
    setActiveTab(tab);
    setPage(1);
  };

  const handleApprove = async (item: AttendanceJustification) => {
    await reviewJustification({
      id: item.id,
      payload: { decision: 'APPROVED' },
    });
  };

  const handleConfirmReject = async () => {
    if (!rejectingItem) return;
    await reviewJustification({
      id: rejectingItem.id,
      payload: { decision: 'REJECTED', reviewNote: rejectNote.trim() || null },
    });
    setRejectingItem(null);
    setRejectNote('');
  };

  const justifications = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1, page: 1, limit: 20 };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-sm">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground tracking-tight">Justificaciones de asistencia</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Revisa y aprueba las justificaciones enviadas por las familias.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pestañas de Estado */}
      <div className="flex items-center gap-2 border-b border-border">
        {(
          [
            { key: 'PENDING', label: 'Pendientes' },
            { key: 'APPROVED', label: 'Aprobadas' },
            { key: 'REJECTED', label: 'Rechazadas' },
          ] as const
        ).map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors -mb-px ${
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tabla */}
      <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span>Cargando solicitudes...</span>
          </div>
        ) : justifications.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground space-y-2">
            <FileCheck2 className="w-10 h-10 mx-auto opacity-30" />
            <p className="text-sm font-bold text-foreground">No hay justificaciones en esta sección</p>
            <p className="text-xs text-muted-foreground">
              {activeTab === 'PENDING'
                ? 'Todas las solicitudes han sido atendidas.'
                : 'No se encontraron registros archivados.'}
            </p>
          </div>
        ) : (
          <JustificationsTable
            justifications={justifications}
            isReviewing={isReviewing}
            onApprove={handleApprove}
            onReject={(item) => {
              setRejectingItem(item);
              setRejectNote('');
            }}
          />
        )}

        {/* Paginación */}
        {meta.totalPages > 1 && (
          <div className="p-3 border-t border-border">
            <Pagination
              currentPage={meta.page}
              totalPages={meta.totalPages}
              totalItems={meta.total}
              limit={meta.limit}
              onPageChange={(p) => setPage(p)}
              onLimitChange={(l) => {
                setLimit(l);
                setPage(1);
              }}
            />
          </div>
        )}
      </div>

      {/* Diálogo de Rechazo con Nota */}
      <ReviewJustificationModal
        item={rejectingItem}
        note={rejectNote}
        isPending={isReviewing}
        onNoteChange={setRejectNote}
        onClose={() => setRejectingItem(null)}
        onConfirm={handleConfirmReject}
      />
    </div>
  );
};
