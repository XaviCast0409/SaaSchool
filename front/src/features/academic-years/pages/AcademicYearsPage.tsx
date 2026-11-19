import React, { useState } from 'react';
import {
  Calendar,
  CalendarDays,
  Clock,
  Plus,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { confirmDialog } from '@/components/ui/confirm';
import { Skeleton } from '@/components/ui/skeleton';
import { getApiErrorMessage } from '@/lib/errors';
import { useAuthStore } from '@/store/useAuthStore';
import {
  useAcademicYears,
  useCreateAcademicYear,
  useDeleteAcademicYear,
  useSetEnrollmentOpen,
  useUpdateAcademicYear,
  type AcademicYear,
} from '../api/useAcademicYears';
import { FinalSituationModal } from '../components/FinalSituationModal';
import { AcademicYearCard } from '../components/academic-years/AcademicYearCard';
import { AcademicYearFormModal, type AcademicYearFormData } from '../components/academic-years/AcademicYearFormModal';
import { CloseYearDialog } from '../components/academic-years/CloseYearDialog';
import {
  formatDateDisplay,
  formatDateInput,
  getDefaultPeriods,
} from '../utils/academicYearDates';

export const AcademicYearsPage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'SCHOOL_ADMIN' || user?.role === 'SUPER_ADMIN';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);

  const currentYearNum = new Date().getFullYear();
  const [formData, setFormData] = useState<AcademicYearFormData>({
    year: currentYearNum,
    name: `Año Escolar ${currentYearNum}`,
    startDate: `${currentYearNum}-03-01`,
    endDate: `${currentYearNum}-12-20`,
    isActive: false,
    periodType: 'BIMESTER',
    annualCalculationMode: 'LAST_PERIOD',
    periodsConfig: getDefaultPeriods('BIMESTER', currentYearNum),
  });

  const { data: years = [], isLoading, isError, refetch } = useAcademicYears();
  const { mutateAsync: createYear, isPending: isCreating } = useCreateAcademicYear();
  const { mutateAsync: updateYear, isPending: isUpdating } = useUpdateAcademicYear();
  const { mutateAsync: deleteYear } = useDeleteAcademicYear();
  const setEnrollmentOpen = useSetEnrollmentOpen();

  const [yearToActivate, setYearToActivate] = useState<AcademicYear | null>(null);
  const [finalYear, setFinalYear] = useState<AcademicYear | null>(null);

  const toggleEnrollment = (ay: AcademicYear) =>
    setEnrollmentOpen.mutate(
      { id: ay.id, open: !ay.enrollmentOpen },
      {
        onSuccess: () =>
          toast.success(
            ay.enrollmentOpen
              ? `Matrícula ${ay.year} cerrada.`
              : `Matrícula ${ay.year} abierta: ya puedes matricular y re-matricular para ${ay.year} sin cambiar el año vigente.`,
          ),
        onError: (err: unknown) => toast.error(getApiErrorMessage(err, 'No se pudo cambiar la matrícula.')),
      },
    );

  const activeYearObj = years.find((y) => y.isActive) || years[0] || null;

  const handleOpenCreateModal = () => {
    const nextYear = (years[0]?.year || currentYearNum) + 1;
    setEditingYear(null);
    setFormData({
      year: nextYear,
      name: `Año Escolar ${nextYear}`,
      startDate: `${nextYear}-03-01`,
      endDate: `${nextYear}-12-20`,
      isActive: false,
      periodType: 'BIMESTER',
      annualCalculationMode: 'LAST_PERIOD',
      periodsConfig: getDefaultPeriods('BIMESTER', nextYear),
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (ay: AcademicYear) => {
    const pType = ay.periodType || 'BIMESTER';
    const periods =
      ay.periodsConfig && ay.periodsConfig.length > 0
        ? ay.periodsConfig.map((p) => ({
            periodNumber: p.periodNumber,
            name: p.name,
            startDate: formatDateInput(p.startDate),
            endDate: formatDateInput(p.endDate),
          }))
        : getDefaultPeriods(pType, ay.year);

    setEditingYear(ay);
    setFormData({
      year: ay.year,
      name: ay.name || `Año Escolar ${ay.year}`,
      startDate: formatDateInput(ay.startDate),
      endDate: formatDateInput(ay.endDate),
      isActive: ay.isActive,
      periodType: pType,
      annualCalculationMode: ay.annualCalculationMode || 'LAST_PERIOD',
      periodsConfig: periods,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        year: Number(formData.year),
        name: formData.name,
        startDate: formData.startDate,
        endDate: formData.endDate,
        periodType: formData.periodType,
        annualCalculationMode: formData.annualCalculationMode,
        periodsConfig: formData.periodsConfig,
      };

      if (editingYear) {
        await updateYear({ id: editingYear.id, payload });
        toast.success('Año Lectivo actualizado con éxito.');
      } else {
        await createYear(payload);
        toast.success('✨ Nuevo Año Lectivo registrado con éxito.');
      }
      setIsModalOpen(false);
      refetch();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Error al guardar el Año Lectivo.'));
    }
  };

  const handleDelete = async (ay: AcademicYear) => {
    if (
      await confirmDialog({
        title: `¿Eliminar el Año Lectivo "${ay.name || ay.year}"?`,
        confirmText: 'Eliminar',
        variant: 'danger',
      })
    ) {
      try {
        await deleteYear(ay.id);
        toast.success('Año Lectivo eliminado.');
        refetch();
      } catch (err: unknown) {
        toast.error(getApiErrorMessage(err, 'Error al eliminar el Año Lectivo.'));
      }
    }
  };

  const handleConfirmActivate = async () => {
    if (!yearToActivate) return;
    try {
      await updateYear({ id: yearToActivate.id, payload: { isActive: true } });
      toast.success(`Año Lectivo ${yearToActivate.year} activado.`);
      setYearToActivate(null);
      refetch();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'No se pudo activar el Año Lectivo.'));
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Gestión de Años Lectivos</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Configuración de períodos lectivos, fechas de inicio y término del año escolar.
          </p>
        </div>

        {isAdmin && (
          <Button size="sm" className="gap-2 text-xs font-bold" onClick={handleOpenCreateModal}>
            <Plus className="w-4 h-4" />
            <span>Crear Año Lectivo</span>
          </Button>
        )}
      </div>

      {/* KPI Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Año Lectivo Activo</CardTitle>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-foreground">
              {activeYearObj ? activeYearObj.year : 'Sin año activo'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {activeYearObj ? activeYearObj.name || `Año Escolar ${activeYearObj.year}` : 'Crea un período lectivo'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Total Años Registrados</CardTitle>
            <CalendarDays className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-foreground">{years.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Histórico escolar</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Período Vigente</CardTitle>
            <Clock className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-sm font-bold ${activeYearObj ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}
            >
              {activeYearObj
                ? `${formatDateDisplay(activeYearObj.startDate)} ── ${formatDateDisplay(activeYearObj.endDate)}`
                : 'Sin vigencia'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Calendario escolar</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Años Lectivos */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      ) : isError ? (
        <div className="p-6 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-center space-y-3">
          <p className="font-semibold">Error al cargar los Años Lectivos.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      ) : years.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground border border-dashed border-border rounded-xl space-y-3 bg-card p-6">
          <Calendar className="w-10 h-10 text-primary mx-auto opacity-60" />
          <div className="space-y-1">
            <h3 className="font-bold text-base text-foreground">No hay Años Lectivos registrados</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Haz clic en <strong className="text-foreground">"Crear Año Lectivo"</strong> para habilitar matrículas y
              registros académicos para el nuevo período.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {years.map((ay) => (
            <AcademicYearCard
              key={ay.id}
              academicYear={ay}
              isAdmin={isAdmin}
              onEdit={handleOpenEditModal}
              onDelete={handleDelete}
              onFinalSituation={setFinalYear}
              onToggleEnrollment={toggleEnrollment}
              onActivate={setYearToActivate}
              isEnrollmentBusy={setEnrollmentOpen.isPending}
            />
          ))}
        </div>
      )}

      {/* Modal Crear / Editar Año Lectivo */}
      <AcademicYearFormModal
        isOpen={isModalOpen}
        editingYear={editingYear}
        formData={formData}
        isLoading={isCreating || isUpdating}
        onClose={() => setIsModalOpen(false)}
        onChange={setFormData}
        onSubmit={handleSave}
      />

      <FinalSituationModal year={finalYear} onClose={() => setFinalYear(null)} />

      <CloseYearDialog
        yearToActivate={yearToActivate}
        activeYearObj={activeYearObj}
        isLoading={isUpdating}
        onClose={() => setYearToActivate(null)}
        onConfirm={handleConfirmActivate}
      />
    </div>
  );
};
