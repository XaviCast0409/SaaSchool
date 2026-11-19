import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, CalendarRange, Copy, ListPlus, Loader2, Plus, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useAcademicYears } from '@/features/academic-years/api/useAcademicYears';
import { useClassrooms } from '@/features/classrooms/api/useClassrooms';
import { getApiErrorMessage } from '@/lib/errors';
import { formatMoney } from '@/lib/format';
import { useFinanceAccess } from '../api/usePayments';
import {
  LEVEL_LABEL,
  useDeleteFeeSchedule,
  useFeeSchedules,
  useGenerateMissing,
  type GenerateMissingResult,
  type EducationLevel,
  type FeeSchedule,
} from '../api/useFeeSchedules';
import { LEVELS, scopeLabel } from '../constants';
import { CopyFeeScheduleModal } from '../components/fee-schedules/CopyFeeScheduleModal';
import { FeeScheduleModal } from '../components/fee-schedules/FeeScheduleModal';
import { FeeScheduleQuotaTable } from '../components/fee-schedules/FeeScheduleQuotaTable';

export const FeeSchedulesPage: React.FC = () => {
  const { data: access, isLoading: accessLoading } = useFinanceAccess();
  const { data: years = [] } = useAcademicYears();
  const { data: classrooms = [] } = useClassrooms();
  const [yearId, setYearId] = useState('');
  const [modal, setModal] = useState<{ editing: FeeSchedule | null; level: EducationLevel } | null>(null);
  const [copyOpen, setCopyOpen] = useState(false);
  const [deleting, setDeleting] = useState<FeeSchedule | null>(null);
  const remove = useDeleteFeeSchedule();
  const generateMissing = useGenerateMissing();
  const [missingPreview, setMissingPreview] = useState<GenerateMissingResult | null>(null);

  const previewMissing = () =>
    generateMissing.mutate(
      { academicYearId: yearId, dryRun: true },
      {
        onSuccess: (r) =>
          r.cuotas === 0
            ? toast.info(`Todas las matrículas de ${r.year} ya tienen su cronograma completo.`)
            : setMissingPreview(r),
        onError: (e) => toast.error(getApiErrorMessage(e, 'No se pudo calcular.')),
      },
    );

  const confirmMissing = () =>
    generateMissing.mutate(
      { academicYearId: yearId, dryRun: false },
      {
        onSuccess: (r) => {
          toast.success(`Se generaron ${r.cuotas} cuotas para ${r.withMissing} matrículas (${formatMoney(r.total)}).`);
          setMissingPreview(null);
        },
        onError: (e) => toast.error(getApiErrorMessage(e, 'No se pudieron generar las cuotas.')),
      },
    );

  useEffect(() => {
    if (!yearId && years.length > 0) setYearId((years.find((y) => y.isActive) ?? years[0]).id);
  }, [years, yearId]);

  const { data: schedules = [], isLoading } = useFeeSchedules(yearId || undefined);
  const canManage = !!access?.can.manage;

  const gradesByLevel = useMemo(() => {
    const map: Record<EducationLevel, number[]> = { INITIAL: [], PRIMARY: [], SECONDARY: [] };
    for (const c of classrooms) {
      const lvl = c.educationLevel as EducationLevel;
      if (map[lvl] && !map[lvl].includes(c.grade)) map[lvl].push(c.grade);
    }
    for (const l of LEVELS) map[l].sort((a, b) => a - b);
    return map;
  }, [classrooms]);

  const levels = useMemo(() => {
    const used = LEVELS.filter((l) => gradesByLevel[l].length > 0 || schedules.some((s) => s.educationLevel === l));
    return used.length > 0 ? used : LEVELS;
  }, [gradesByLevel, schedules]);

  const yearOptions = years.map((y) => ({
    id: y.id,
    label: `${y.name || `Año Escolar ${y.year}`}${y.isActive ? ' (vigente)' : ''}`,
  }));

  if (accessLoading) {
    return (
      <div className="p-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        <span>Cargando...</span>
      </div>
    );
  }
  if (!access?.can.view && !canManage) {
    return (
      <p className="p-6 text-sm text-muted-foreground">
        Solo tesorería, el contador y Dirección pueden ver el tarifario.
      </p>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            to="/payments"
            className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" /> Pagos y cobranzas
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-sm">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground tracking-tight">Tarifario de pensiones</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Montos por año y nivel. Al matricular se genera el cronograma de cuotas automáticamente.
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={yearId}
            onChange={(e) => setYearId(e.target.value)}
            className="text-xs rounded-xl border border-input bg-background px-3 py-2 text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Año académico"
          >
            {yearOptions.map((y) => (
              <option key={y.id} value={y.id}>
                {y.label}
              </option>
            ))}
          </select>
          {canManage && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-xs font-bold gap-1.5"
                onClick={previewMissing}
                disabled={!yearId || schedules.length === 0}
                isLoading={generateMissing.isPending && !missingPreview}
                title="Crea las cuotas que les faltan a las matrículas de este año (p. ej. registradas antes de configurar el tarifario)"
              >
                <ListPlus className="w-3.5 h-3.5" /> Generar cuotas faltantes
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-xs font-bold gap-1.5"
                onClick={() => setCopyOpen(true)}
                disabled={!yearId}
              >
                <Copy className="w-3.5 h-3.5" /> Copiar de otro año
              </Button>
              <Button
                size="sm"
                className="rounded-xl text-xs font-bold gap-1.5"
                onClick={() => setModal({ editing: null, level: levels[0] })}
                disabled={!yearId}
              >
                <Plus className="w-3.5 h-3.5" /> Nuevo tarifario
              </Button>
            </>
          )}
        </div>
      </div>

      {years.length === 0 ? (
        <div className="rounded-2xl bg-card border border-border shadow-sm p-12 text-center text-muted-foreground space-y-2">
          <CalendarRange className="w-10 h-10 mx-auto opacity-30" />
          <p className="text-sm font-bold text-foreground">Primero registra un año académico</p>
        </div>
      ) : isLoading ? (
        <div className="p-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span>Cargando tarifario...</span>
        </div>
      ) : (
        <div className="grid gap-4">
          {levels.map((level) => {
            const rows = schedules.filter((s) => s.educationLevel === level);
            return (
              <FeeScheduleQuotaTable
                key={level}
                level={level}
                rows={rows}
                canManage={canManage}
                onEdit={(r) => setModal({ editing: r, level })}
                onDelete={(r) => setDeleting(r)}
                onAdd={() => setModal({ editing: null, level })}
              />
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Si un alumno se matricula a mitad de año, solo se generan las pensiones desde su mes de ingreso. Las becas
        vigentes se aplican automáticamente y, al retirar o trasladar a un alumno, se anulan sus cuotas futuras sin
        cobros.
      </p>

      {modal && yearId && (
        <FeeScheduleModal
          open
          onClose={() => setModal(null)}
          academicYearId={yearId}
          editing={modal.editing}
          initialLevel={modal.level}
          gradesByLevel={gradesByLevel}
          onCreated={previewMissing}
        />
      )}
      <CopyFeeScheduleModal open={copyOpen} onClose={() => setCopyOpen(false)} toYearId={yearId} years={yearOptions} />
      <ConfirmDialog
        isOpen={!!missingPreview}
        onClose={() => setMissingPreview(null)}
        variant="info"
        title={`Generar cuotas faltantes de ${missingPreview?.year ?? ''}`}
        description={
          missingPreview
            ? `Se crearán ${missingPreview.cuotas} cuotas por ${formatMoney(missingPreview.total)} para ${missingPreview.withMissing} de ${missingPreview.enrollments} matrículas. No se duplica ningún periodo ni se recrean cuotas anuladas.`
            : ''
        }
        details={
          missingPreview && missingPreview.withoutFeeSchedule > 0 ? (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              {missingPreview.withoutFeeSchedule} matrículas siguen sin cuotas porque su nivel no tiene tarifario.
            </p>
          ) : undefined
        }
        confirmText="Generar cuotas"
        isLoading={generateMissing.isPending}
        onConfirm={confirmMissing}
      />
      <ConfirmDialog
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        variant="danger"
        title="¿Eliminar este tarifario?"
        description={
          deleting
            ? `${LEVEL_LABEL[deleting.educationLevel]} · ${scopeLabel(deleting)}. Las cuotas ya generadas no cambian, pero las nuevas matrículas de este nivel ya no tendrán cronograma.`
            : ''
        }
        confirmText="Eliminar"
        isLoading={remove.isPending}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, {
            onSuccess: () => {
              toast.success('Tarifario eliminado.');
              setDeleting(null);
            },
            onError: (e) => toast.error(getApiErrorMessage(e, 'No se pudo eliminar.')),
          })
        }
      />
    </div>
  );
};
