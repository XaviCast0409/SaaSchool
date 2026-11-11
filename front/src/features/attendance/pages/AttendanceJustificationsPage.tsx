import React, { useState } from 'react';
import {
  FileCheck2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/Pagination';
import { openFile } from '@/features/course-contents/utils/fileUrls';
import { useJustifications, useReviewJustification } from '../api/useJustifications';
import type { AttendanceJustification, JustificationStatus } from '../types';

const REASON_LABELS: Record<string, string> = {
  MEDICAL: 'Salud / cita médica',
  FAMILY: 'Motivo familiar',
  BEREAVEMENT: 'Duelo',
  TRANSPORT: 'Problema de transporte',
  OTHER: 'Otro motivo',
};

const LEVEL_LABELS: Record<string, string> = {
  INITIAL: 'Inicial',
  PRIMARY: 'Primaria',
  SECONDARY: 'Secundaria',
};

export const AttendanceJustificationsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<JustificationStatus>('PENDING');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

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

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'America/Lima',
    });
  };

  const formatDateTime = (iso: string) => {
    return new Date(iso).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Lima',
    });
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
              <h1 className="text-2xl font-black text-foreground tracking-tight">
                Justificaciones de asistencia
              </h1>
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
            <p className="text-sm font-bold text-foreground">
              No hay justificaciones en esta sección
            </p>
            <p className="text-xs text-muted-foreground">
              {activeTab === 'PENDING'
                ? 'Todas las solicitudes han sido atendidas.'
                : 'No se encontraron registros archivados.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Estudiante</th>
                  <th className="px-4 py-3">Aula</th>
                  <th className="px-4 py-3">Fechas</th>
                  <th className="px-4 py-3">Motivo</th>
                  <th className="px-4 py-3">Descripción</th>
                  <th className="px-4 py-3 text-center">Sustento</th>
                  <th className="px-4 py-3">Enviado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {justifications.map((item) => {
                  const student = item.enrollment?.student;
                  const classroom = item.enrollment?.classroom;
                  const studentName = student
                    ? `${student.lastNamePaternal} ${student.lastNameMaternal}, ${student.firstNames}`
                    : 'Estudiante';
                  const classroomLabel = classroom
                    ? `${classroom.grade}° "${classroom.section}" - ${LEVEL_LABELS[classroom.educationLevel] || classroom.educationLevel}`
                    : '—';

                  const fromStr = formatDate(item.dateFrom);
                  const toStr = formatDate(item.dateTo);
                  const datesDisplay = fromStr === toStr ? fromStr : `${fromStr} – ${toStr}`;

                  return (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-bold text-foreground whitespace-nowrap">
                        {studentName}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {classroomLabel}
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">
                        {datesDisplay}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary text-secondary-foreground">
                          {REASON_LABELS[item.reason] || item.reason}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-xs">
                        <span className="line-clamp-2" title={item.description}>
                          {item.description}
                        </span>
                        {item.reviewNote && item.status === 'REJECTED' && (
                          <span className="block text-[10px] text-destructive mt-0.5">
                            Nota: {item.reviewNote}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {item.fileUrl ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => item.fileUrl && void openFile(item.fileUrl)}
                            className="h-7 text-[11px] font-bold text-primary hover:text-primary gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Ver</span>
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-[11px]">
                        {formatDateTime(item.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {item.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              disabled={isReviewing}
                              onClick={() => handleApprove(item)}
                              className="h-7 px-2.5 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Aprobar</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isReviewing}
                              onClick={() => {
                                setRejectingItem(item);
                                setRejectNote('');
                              }}
                              className="h-7 px-2.5 text-[11px] font-bold text-destructive hover:bg-destructive/10 border-destructive/30 rounded-lg gap-1"
                            >
                              <XCircle className="w-3 h-3" />
                              <span>Rechazar</span>
                            </Button>
                          </div>
                        ) : item.status === 'APPROVED' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                            Aprobada
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive/15 text-destructive">
                            Rechazada
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
      {rejectingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl p-5 space-y-4">
            <div>
              <h3 className="text-base font-black text-foreground">
                Rechazar Justificación
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Indica opcionalmente el motivo del rechazo para informar a la familia.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                Motivo / Observación
              </label>
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Ej. El certificado adjunto no corresponde a las fechas solicitadas..."
                rows={3}
                className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRejectingItem(null)}
                disabled={isReviewing}
                className="rounded-xl text-xs font-bold"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={isReviewing}
                onClick={handleConfirmReject}
                className="rounded-xl text-xs font-bold gap-1.5"
              >
                {isReviewing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirmar rechazo</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
