import { useUrlFilters } from '@/lib/useUrlFilters';
import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/Pagination';
import { useAuthStore } from '@/store/useAuthStore';
import { useAttendanceAlerts, useAttendAlert, useCiteFamily, useEvaluateAlerts } from '../api/useAttendanceAlerts';
import type { AttendanceAlert } from '../types';
import { AttendAlertModal } from './attendance-alerts/AttendAlertModal';
import { CiteFamilyModal } from './attendance-alerts/CiteFamilyModal';
import { AlertsCardGrid } from './attendance-alerts/AlertsCardGrid';

export const AttendanceAlertsPage: React.FC = () => {
  const { user } = useAuthStore();
  const isSchoolAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'SCHOOL_ADMIN';

  // Filtros en la URL
  const [urlFilters, setUrlFilters] = useUrlFilters({ tab: 'OPEN', page: 1, limit: 20 });
  const { page, limit } = urlFilters;
  const activeTab: 'OPEN' | 'ATTENDED' = urlFilters.tab === 'ATTENDED' ? 'ATTENDED' : 'OPEN';
  const setActiveTab = (value: 'OPEN' | 'ATTENDED') => setUrlFilters({ tab: value });
  const setPage = (value: number) => setUrlFilters({ page: value });
  const setLimit = (value: number) => setUrlFilters({ limit: value });

  // Modales
  const [attendItem, setAttendItem] = useState<AttendanceAlert | null>(null);
  const [attendNote, setAttendNote] = useState('');

  const [citeItem, setCiteItem] = useState<AttendanceAlert | null>(null);
  const [citationDate, setCitationDate] = useState('');
  const [citationNote, setCitationNote] = useState('');

  const { data, isLoading } = useAttendanceAlerts({
    status: activeTab,
    page,
    limit,
  });

  const { mutateAsync: attendAlert, isPending: isAttending } = useAttendAlert();
  const { mutateAsync: citeFamily, isPending: isCiting } = useCiteFamily();
  const { mutateAsync: evaluateAlerts, isPending: isEvaluating } = useEvaluateAlerts();

  const handleTabChange = (tab: 'OPEN' | 'ATTENDED') => {
    setActiveTab(tab);
    setPage(1);
  };

  const handleConfirmAttend = async () => {
    if (!attendItem || !attendNote.trim()) return;
    await attendAlert({ id: attendItem.id, note: attendNote.trim() });
    setAttendItem(null);
    setAttendNote('');
  };

  const handleConfirmCite = async () => {
    if (!citeItem || !citationDate) return;
    const isoCitation = new Date(citationDate).toISOString();
    await citeFamily({
      id: citeItem.id,
      citationDate: isoCitation,
      note: citationNote.trim() || undefined,
    });
    setCiteItem(null);
    setCitationDate('');
    setCitationNote('');
  };

  const alerts = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1, page: 1, limit: 20 };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-sm">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground tracking-tight">Alerta temprana de asistencia</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Estudiantes con señales de ausentismo en los últimos 30 días. Atiéndelos a tiempo para prevenir la
                deserción escolar.
              </p>
            </div>
          </div>
        </div>

        {isSchoolAdmin && (
          <Button
            size="sm"
            onClick={() => evaluateAlerts()}
            disabled={isEvaluating}
            className="rounded-xl text-xs font-bold gap-1.5 shrink-0"
          >
            {isEvaluating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            <span>Evaluar ahora</span>
          </Button>
        )}
      </div>

      {/* Pestañas de Estado */}
      <div className="flex items-center gap-2 border-b border-border">
        {(
          [
            { key: 'OPEN', label: 'Abiertas' },
            { key: 'ATTENDED', label: 'Atendidas' },
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

      {/* Grid de Tarjetas */}
      {isLoading ? (
        <div className="p-16 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span>Analizando alertas de asistencia...</span>
        </div>
      ) : alerts.length === 0 ? (
        <div className="p-16 text-center text-muted-foreground space-y-2 rounded-2xl border border-dashed border-border bg-card">
          <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 opacity-80" />
          <p className="text-sm font-bold text-foreground">
            {activeTab === 'OPEN'
              ? '¡Excelente! No hay alertas abiertas en este momento.'
              : 'No hay alertas atendidas en el historial.'}
          </p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {activeTab === 'OPEN'
              ? 'Ningún estudiante supera los umbrales de faltas consecutivas, ausentismo mensual o tardanzas.'
              : 'Las alertas que marques como atendidas aparecerán aquí para seguimiento.'}
          </p>
        </div>
      ) : (
        <AlertsCardGrid
          alerts={alerts}
          onAttend={(item) => {
            setAttendItem(item);
            setAttendNote('');
          }}
          onCite={(item) => {
            setCiteItem(item);
            setCitationDate('');
            setCitationNote('');
          }}
        />
      )}

      {/* Paginación */}
      {meta.totalPages > 1 && (
        <div className="p-3 rounded-2xl bg-card border border-border">
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

      {/* Modal: Marcar como Atendida */}
      <AttendAlertModal
        alert={attendItem}
        note={attendNote}
        isPending={isAttending}
        onNoteChange={setAttendNote}
        onClose={() => setAttendItem(null)}
        onConfirm={handleConfirmAttend}
      />

      {/* Modal: Citar a la Familia */}
      <CiteFamilyModal
        alert={citeItem}
        citationDate={citationDate}
        note={citationNote}
        isPending={isCiting}
        onCitationDateChange={setCitationDate}
        onNoteChange={setCitationNote}
        onClose={() => setCiteItem(null)}
        onConfirm={handleConfirmCite}
      />
    </div>
  );
};
