import { formatMoney } from '@/lib/format';
import { getApiErrorMessage } from '@/lib/errors';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { UserCheck } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { useAcademicYears, pickEnrollmentTargetYear } from '@/features/academic-years/api/useAcademicYears';
import { useClassroomsForYear } from '@/features/classrooms/api/useClassrooms';
import { SchedulePreviewCard } from '@/features/payments/components/SchedulePreviewCard';
import { classroomLabel, useRollover, type EnrollmentCondition } from '@/features/enrollments/api/useRollover';

export interface QuickEnrollStudent {
  id: string;
  name: string;
  documentId?: string | null;
}

const selectCls =
  'w-full text-xs rounded-xl border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring';

/**
 * Matrícula rápida de un alumno que ya existe (p. ej. matricularlo en el año siguiente): solo año,
 * aula y condición, con la vista previa de su cronograma de cuotas. No se vuelve a llenar la ficha.
 */
export const QuickEnrollModal: React.FC<{ student: QuickEnrollStudent | null; onClose: () => void }> = ({
  student,
  onClose,
}) => {
  const { data: years = [] } = useAcademicYears();
  const rollover = useRollover();
  const [yearId, setYearId] = useState('');
  const { data: classrooms = [] } = useClassroomsForYear(yearId || undefined);
  const [classroomId, setClassroomId] = useState('');
  const [condition, setCondition] = useState<EnrollmentCondition>('CONTINUO');
  const [repeatingGrade, setRepeatingGrade] = useState(false);

  useEffect(() => {
    if (!student) return;
    const target = pickEnrollmentTargetYear(years) ?? years.find((y) => y.isActive);
    setYearId(target?.id ?? '');
    setClassroomId('');
    setCondition('CONTINUO');
    setRepeatingGrade(false);
  }, [student, years]);

  const year = years.find((y) => y.id === yearId);

  const submit = () => {
    if (!student) return;
    rollover.mutate(
      { toAcademicYearId: yearId, items: [{ studentId: student.id, classroomId, condition, repeatingGrade }] },
      {
        onSuccess: (res) => {
          const r = res.results[0];
          if (!r?.ok) {
            toast.error(r?.error || 'No se pudo matricular.');
            return;
          }
          if (r.warning) toast.warning(r.warning, { duration: 8000 });
          toast.success(
            `${student.name} matriculado en ${res.year}${r.cuotas ? ` · ${r.cuotas} cuotas por ${formatMoney(r.total ?? 0)}` : ''}.`,
          );
          onClose();
        },
        onError: (err: any) => toast.error(getApiErrorMessage(err, 'No se pudo matricular.')),
      },
    );
  };

  return (
    <Modal
      open={!!student}
      onClose={onClose}
      title={`Matricular en ${year?.year ?? '...'}`}
      description={
        student
          ? `${student.name}${student.documentId ? ` · DNI ${student.documentId}` : ''}. Sus datos y apoderados se mantienen.`
          : undefined
      }
      size="md"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            size="sm"
            disabled={!yearId || !classroomId}
            isLoading={rollover.isPending}
            onClick={submit}
            className="gap-1.5"
          >
            <UserCheck className="w-3.5 h-3.5" /> Matricular
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="block font-semibold">Año lectivo *</span>
            <select className={selectCls} value={yearId} onChange={(e) => setYearId(e.target.value)}>
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.year}
                  {y.enrollmentOpen ? ' (matrícula abierta)' : y.isActive ? ' (vigente)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="block font-semibold">Condición</span>
            <select
              className={selectCls}
              value={condition}
              onChange={(e) => setCondition(e.target.value as EnrollmentCondition)}
            >
              <option value="CONTINUO">Continuo / promovido</option>
              <option value="REENTRANTE">Reentrante</option>
              <option value="TRASLADO">Traslado</option>
              <option value="INGRESANTE">Ingresante</option>
            </select>
          </label>
        </div>
        <label className="space-y-1 block">
          <span className="block font-semibold">Aula *</span>
          <select className={selectCls} value={classroomId} onChange={(e) => setClassroomId(e.target.value)}>
            <option value="">-- Elige aula --</option>
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>
                {classroomLabel(c)} ({c.enrolledCount ?? 0}/{c.capacity})
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 font-semibold cursor-pointer">
          <input
            type="checkbox"
            checked={repeatingGrade}
            onChange={(e) => setRepeatingGrade(e.target.checked)}
            className="w-4 h-4 rounded"
          />
          Repite el grado
        </label>
        <SchedulePreviewCard
          academicYearId={yearId || undefined}
          classroomId={classroomId || undefined}
          condition={condition}
        />
      </div>
    </Modal>
  );
};
