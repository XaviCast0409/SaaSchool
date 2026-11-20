import { useUrlFilters } from '@/lib/useUrlFilters';
import React, { useState } from 'react';
import {
  ShieldAlert,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/Pagination';
import { useAuthStore } from '@/store/useAuthStore';
import { useIncidents, useRegisterSiseve } from '../api/useIncidents';
import { useClassrooms } from '@/features/classrooms/api/useClassrooms';
import { CreateIncidentModal } from '../components/CreateIncidentModal';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/errors';
import { IncidentsFilterBar } from './incidents-page/IncidentsFilterBar';
import { IncidentsList } from './incidents-page/IncidentsList';

export const IncidentsPage: React.FC = () => {
  const { user } = useAuthStore();
  const canCreate =
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'SCHOOL_ADMIN' ||
    user?.role === 'ADMINISTRATIVE' ||
    user?.role === 'TEACHER';

  const canManageSiseve =
    user?.role === 'SUPER_ADMIN' || user?.role === 'SCHOOL_ADMIN' || user?.role === 'ADMINISTRATIVE';

  // Filtros en la URL: sobreviven a recargar, al botón Atrás y se pueden compartir como enlace
  const [urlFilters, setUrlFilters] = useUrlFilters({
    page: 1,
    limit: 20,
    type: 'ALL',
    severity: 'ALL',
    classroomId: '',
  });
  const { page, limit, type: selectedType, severity: selectedSeverity, classroomId: selectedClassroomId } = urlFilters;
  const setPage = (value: number) => setUrlFilters({ page: value });
  const setLimit = (value: number) => setUrlFilters({ limit: value });
  const setSelectedType = (value: string) => setUrlFilters({ type: value });
  const setSelectedSeverity = (value: string) => setUrlFilters({ severity: value });
  const setSelectedClassroomId = (value: string) => setUrlFilters({ classroomId: value });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [siseveModalIncidentId, setSiseveModalIncidentId] = useState<string | null>(null);
  const [siseveInputCode, setSiseveInputCode] = useState('');

  const registerSiseveMutation = useRegisterSiseve();

  const handleSaveSiseve = async () => {
    if (!siseveModalIncidentId || !siseveInputCode.trim()) return;
    try {
      await registerSiseveMutation.mutateAsync({
        id: siseveModalIncidentId,
        siseveCode: siseveInputCode.trim(),
      });
      toast.success('Código SíseVe registrado correctamente.');
      setSiseveModalIncidentId(null);
      setSiseveInputCode('');
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al registrar el código SíseVe.'));
    }
  };

  const { data: classrooms = [] } = useClassrooms();

  const { data: incidentsResponse, isLoading } = useIncidents({
    page,
    limit,
    type: selectedType !== 'ALL' ? selectedType : undefined,
    severity: selectedSeverity !== 'ALL' ? selectedSeverity : undefined,
    classroomId: selectedClassroomId || undefined,
  });

  const incidents = incidentsResponse?.data || [];
  const meta = incidentsResponse?.meta;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* 1. Header */}
      <div className="p-5 sm:p-7 rounded-2xl bg-card border border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">Agenda e incidencias</h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Bitácora de conducta, atenciones de enfermería, méritos y citaciones escolares
          </p>
        </div>

        {canCreate && (
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="gap-2 text-xs font-black bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Incidencia</span>
          </Button>
        )}
      </div>

      {/* 2. Barra de Filtros */}
      <IncidentsFilterBar
        selectedType={selectedType}
        selectedSeverity={selectedSeverity}
        selectedClassroomId={selectedClassroomId}
        classrooms={classrooms}
        onSelectType={(t) => {
          setSelectedType(t);
          setPage(1);
        }}
        onSelectSeverity={(s) => {
          setSelectedSeverity(s);
          setPage(1);
        }}
        onSelectClassroom={(c) => {
          setSelectedClassroomId(c);
          setPage(1);
        }}
      />

      {/* 3. Lista de Incidencias */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : incidents.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-border rounded-2xl bg-card p-6 space-y-2">
          <ShieldAlert className="w-12 h-12 text-muted-foreground/40 mx-auto" />
          <h3 className="text-sm font-bold text-foreground">Sin incidencias registradas</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            No se encontraron eventos o citaciones con los filtros aplicados.
          </p>
        </div>
      ) : (
        <>
          <IncidentsList
            incidents={incidents}
            canManageSiseve={canManageSiseve}
            onOpenSiseveModal={(id) => {
              setSiseveModalIncidentId(id);
              setSiseveInputCode('');
            }}
          />

          {meta && (
            <Pagination
              currentPage={page}
              totalPages={meta.totalPages}
              totalItems={meta.total}
              limit={limit}
              onPageChange={(p) => setPage(p)}
              onLimitChange={(l) => {
                setLimit(l);
                setPage(1);
              }}
            />
          )}
        </>
      )}

      {/* Modal de Registro */}
      {isCreateModalOpen && (
        <CreateIncidentModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
      )}

      {/* Modal para Registrar Código SíseVe */}
      {siseveModalIncidentId && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="bg-card w-full max-w-sm rounded-2xl border border-border p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-foreground">Registrar Código SíseVe</h3>
            <p className="text-xs text-muted-foreground">
              Ingresa el código asignado por el portal del MINEDU (siseve.minedu.gob.pe).
            </p>
            <Input
              value={siseveInputCode}
              onChange={(e) => setSiseveInputCode(e.target.value)}
              placeholder="Ej: SIS-2026-00123"
              className="text-xs h-9 font-mono"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSiseveModalIncidentId(null)}
                className="text-xs font-semibold"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSaveSiseve}
                disabled={siseveInputCode.trim().length < 3 || registerSiseveMutation.isPending}
                className="text-xs font-bold"
              >
                {registerSiseveMutation.isPending ? 'Guardando...' : 'Guardar Código'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
