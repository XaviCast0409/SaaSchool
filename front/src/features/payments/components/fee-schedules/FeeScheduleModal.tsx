import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { getApiErrorMessage } from '@/lib/errors';
import { formatMoney } from '@/lib/format';
import {
  feeSummary,
  MONTH_SHORT,
  useSaveFeeSchedule,
  type EducationLevel,
  type FeeSchedule,
} from '../../api/useFeeSchedules';
import { FeeScheduleFormFields, type FeeScheduleFormState } from './FeeScheduleFormFields';

export interface FeeScheduleModalProps {
  open: boolean;
  onClose: () => void;
  academicYearId: string;
  editing: FeeSchedule | null;
  initialLevel: EducationLevel;
  gradesByLevel: Record<EducationLevel, number[]>;
  /** Tras registrar un tarifario nuevo: revisar si hay matrículas sin cuotas. */
  onCreated?: () => void;
}

export const FeeScheduleModal: React.FC<FeeScheduleModalProps> = ({
  open,
  onClose,
  academicYearId,
  editing,
  initialLevel,
  gradesByLevel,
  onCreated,
}) => {
  const save = useSaveFeeSchedule();
  const [applyToPending, setApplyToPending] = useState(false);
  const [f, setF] = useState<FeeScheduleFormState>({
    educationLevel: initialLevel,
    grade: '',
    enrollmentFee: '',
    admissionFee: '',
    monthlyFee: '',
    firstMonth: 3,
    lastMonth: 12,
    dueDay: '31',
  });

  useEffect(() => {
    if (!open) return;
    setApplyToPending(false);
    setF(
      editing
        ? {
            educationLevel: editing.educationLevel,
            grade: editing.grade === null ? '' : String(editing.grade),
            enrollmentFee: String(editing.enrollmentFee),
            admissionFee: String(editing.admissionFee),
            monthlyFee: String(editing.monthlyFee),
            firstMonth: editing.firstMonth,
            lastMonth: editing.lastMonth,
            dueDay: String(editing.dueDay),
          }
        : {
            educationLevel: initialLevel,
            grade: '',
            enrollmentFee: '',
            admissionFee: '0',
            monthlyFee: '',
            firstMonth: 3,
            lastMonth: 12,
            dueDay: '31',
          },
    );
  }, [open, editing, initialLevel]);

  const nums = {
    enrollmentFee: Number(f.enrollmentFee || 0),
    admissionFee: Number(f.admissionFee || 0),
    monthlyFee: Number(f.monthlyFee || 0),
    dueDay: Number(f.dueDay),
  };
  const errors: string[] = [];
  if (nums.monthlyFee < 0 || nums.enrollmentFee < 0 || nums.admissionFee < 0) {
    errors.push('El monto no puede ser negativo.');
  } else if (f.monthlyFee === '' || nums.monthlyFee === 0) {
    errors.push('Ingresa la pensión mensual.');
  }
  if (f.firstMonth > f.lastMonth) errors.push('El primer mes no puede ser posterior al último.');
  if (!Number.isInteger(nums.dueDay) || nums.dueDay < 1 || nums.dueDay > 31)
    errors.push('El día de vencimiento va de 1 a 31.');
  const summary = feeSummary({ ...nums, firstMonth: f.firstMonth, lastMonth: f.lastMonth });
  const grades = gradesByLevel[f.educationLevel] ?? [];

  const submit = () =>
    save.mutate(
      {
        id: editing?.id,
        applyToPending: !!editing && applyToPending,
        body: {
          academicYearId,
          educationLevel: f.educationLevel,
          grade: f.grade === '' ? null : Number(f.grade),
          enrollmentFee: nums.enrollmentFee,
          admissionFee: nums.admissionFee,
          monthlyFee: nums.monthlyFee,
          firstMonth: f.firstMonth,
          lastMonth: f.lastMonth,
          dueDay: nums.dueDay,
        },
      },
      {
        onSuccess: (r) => {
          toast.success(
            editing
              ? `Tarifario actualizado${applyToPending ? ` · ${r.repriced ?? 0} cuotas pendientes actualizadas` : ''}.`
              : 'Tarifario registrado.',
          );
          onClose();
          if (!editing) onCreated?.();
        },
        onError: (e) => toast.error(getApiErrorMessage(e, 'No se pudo guardar el tarifario.')),
      },
    );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar tarifario' : 'Nuevo tarifario'}
      description="Los montos aplican a las matrículas nuevas. Al editar, puedes llevarlos también a las cuotas pendientes ya generadas."
      size="lg"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button size="sm" disabled={errors.length > 0} isLoading={save.isPending} onClick={submit}>
            Guardar tarifario
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-xs">
        <FeeScheduleFormFields form={f} onChange={setF} editing={editing} grades={grades} />

        {/* Resumen en vivo */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex flex-wrap items-center gap-x-6 gap-y-1">
          <span>
            <strong className="text-foreground">{summary.months}</strong> pensiones ({MONTH_SHORT[f.firstMonth - 1]}–
            {MONTH_SHORT[f.lastMonth - 1]})
          </span>
          <span>
            Total anual por alumno: <strong className="text-foreground font-mono">{formatMoney(summary.annual)}</strong>
          </span>
          {nums.admissionFee > 0 && (
            <span className="text-muted-foreground">+ {formatMoney(nums.admissionFee)} si es ingresante</span>
          )}
        </div>
        {editing && (
          <label className="flex items-start gap-2 rounded-xl border border-border p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={applyToPending}
              onChange={(e) => setApplyToPending(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded"
            />
            <span>
              <strong className="text-foreground">Actualizar también las cuotas pendientes ya generadas</strong>
              <span className="block text-muted-foreground">
                Cambia el monto (y el día de vencimiento de las pensiones) de las cuotas sin cobros, descuentos, becas
                ni moras de este nivel
                {editing.grade !== null ? ' y grado' : ''}. Las pagadas, con ajustes o con pensión personalizada no se
                tocan. No agrega ni quita meses.
              </span>
            </span>
          </label>
        )}
        {errors.length > 0 && !(errors[0] === 'Ingresa la pensión mensual.' && f.monthlyFee === '') && (
          <p className="text-xs text-destructive font-medium">{errors[0]}</p>
        )}
      </div>
    </Modal>
  );
};
