import React, { useState } from 'react';
import {
  Calendar,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  Sparkles,
  Clock,
  CalendarDays,
} from 'lucide-react';
import {
  useAcademicYears,
  useCreateAcademicYear,
  useUpdateAcademicYear,
  useDeleteAcademicYear,
  type AcademicYear,
} from '../api/useAcademicYears';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';

function formatDateDisplay(dateString: string): string {
  if (!dateString) return '──';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

function formatDateInput(dateString: string): string {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    return d.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

export const AcademicYearsPage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'SCHOOL_ADMIN' || user?.role === 'SUPER_ADMIN';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);

  // Form State
  const currentYearNum = new Date().getFullYear();
  const [formData, setFormData] = useState({
    year: currentYearNum,
    name: `Año Escolar ${currentYearNum}`,
    startDate: `${currentYearNum}-03-01`,
    endDate: `${currentYearNum}-12-20`,
    isActive: true,
  });

  // Queries & Mutations
  const { data: years = [], isLoading, isError, refetch } = useAcademicYears();
  const { mutateAsync: createYear, isPending: isCreating } = useCreateAcademicYear();
  const { mutateAsync: updateYear, isPending: isUpdating } = useUpdateAcademicYear();
  const { mutateAsync: deleteYear } = useDeleteAcademicYear();

  const activeYearObj = years.find((y) => y.isActive) || years[0] || null;

  const handleOpenCreateModal = () => {
    const nextYear = (years[0]?.year || currentYearNum) + 1;
    setEditingYear(null);
    setFormData({
      year: nextYear,
      name: `Año Escolar ${nextYear}`,
      startDate: `${nextYear}-03-01`,
      endDate: `${nextYear}-12-20`,
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (ay: AcademicYear) => {
    setEditingYear(ay);
    setFormData({
      year: ay.year,
      name: ay.name || `Año Escolar ${ay.year}`,
      startDate: formatDateInput(ay.startDate),
      endDate: formatDateInput(ay.endDate),
      isActive: ay.isActive,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingYear) {
        await updateYear({
          id: editingYear.id,
          payload: {
            year: Number(formData.year),
            name: formData.name,
            startDate: formData.startDate,
            endDate: formData.endDate,
            isActive: formData.isActive,
          },
        });
        toast.success('Año Lectivo actualizado con éxito.');
      } else {
        await createYear({
          year: Number(formData.year),
          name: formData.name,
          startDate: formData.startDate,
          endDate: formData.endDate,
          isActive: formData.isActive,
        });
        toast.success('✨ Nuevo Año Lectivo registrado con éxito.');
      }
      setIsModalOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al guardar el Año Lectivo.');
    }
  };

  const handleDelete = async (ay: AcademicYear) => {
    if (window.confirm(`¿Estás seguro de eliminar el Año Lectivo "${ay.name || ay.year}"?`)) {
      try {
        await deleteYear(ay.id);
        toast.success('Año Lectivo eliminado.');
        refetch();
      } catch (err: any) {
        toast.error(err?.response?.data?.message || 'Error al eliminar el Año Lectivo.');
      }
    }
  };

  const handleToggleActive = async (ay: AcademicYear) => {
    try {
      await updateYear({
        id: ay.id,
        payload: { isActive: !ay.isActive },
      });
      toast.success(`Año Lectivo ${ay.year} ${!ay.isActive ? 'activado' : 'desactivado'}.`);
      refetch();
    } catch {
      toast.error('Error al cambiar el estado del Año Lectivo.');
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Gestión de Años Lectivos
            </h1>
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
            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
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
              Haz clic en <strong className="text-foreground">"Crear Año Lectivo"</strong> para habilitar matrículas y registros académicos para el nuevo período.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {years.map((ay) => (
            <Card key={ay.id} className="bg-card hover:border-primary/40 transition-all">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-extrabold text-base ${
                      ay.isActive
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {ay.year}
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-foreground">
                        {ay.name || `Año Escolar ${ay.year}`}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge
                          variant={ay.isActive ? 'default' : 'secondary'}
                          className={`text-[10px] font-bold ${
                            ay.isActive ? 'bg-emerald-500 text-white' : 'text-muted-foreground'
                          }`}
                        >
                          {ay.isActive ? 'Activo' : 'Inactivo / Cerrado'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs text-primary hover:bg-primary/10"
                        onClick={() => handleOpenEditModal(ay)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(ay)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-muted/30 border border-border flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span>Inicio: <strong className="text-foreground">{formatDateDisplay(ay.startDate)}</strong></span>
                  </div>
                  <span>──</span>
                  <div className="flex items-center gap-1.5">
                    <span>Fin: <strong className="text-foreground">{formatDateDisplay(ay.endDate)}</strong></span>
                  </div>
                </div>

                {isAdmin && (
                  <div className="pt-2 flex justify-end">
                    <Button
                      variant={ay.isActive ? 'outline' : 'default'}
                      size="sm"
                      className="h-7 text-xs gap-1 font-semibold"
                      onClick={() => handleToggleActive(ay)}
                    >
                      {ay.isActive ? (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>Desactivar Año</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Establecer como Activo</span>
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Crear / Editar Año Lectivo */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <span>{editingYear ? 'Editar Año Lectivo' : 'Nuevo Año Lectivo'}</span>
            </h2>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                  Número de Año (Ej: 2026) *
                </label>
                <input
                  type="number"
                  required
                  min={2000}
                  max={2100}
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                  Nombre del Año Lectivo *
                </label>
                <input
                  type="text"
                  required
                  placeholder='Ej: "Año Escolar 2026"'
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                    Fecha Inicio *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                    Fecha Término *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="isActiveToggle" className="text-xs font-semibold text-foreground cursor-pointer">
                  Establecer como Año Lectivo Activo
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" size="sm" isLoading={isCreating || isUpdating} className="gap-2 font-bold">
                  <span>Guardar Año Lectivo</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
