import { getApiErrorMessage } from '@/lib/errors';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { UserMinus, UserCheck, Info } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useChangeEnrollmentState } from '@/features/enrollments/api/useEnrollments';
import type { AcademicYear } from '@/features/academic-years/api/useAcademicYears';

export interface WithdrawTarget {
  enrollmentId: string;
  studentName: string;
  /** Estado actual de la matrícula: si ya está retirado/trasladado, el modal ofrece reincorporarlo */
  enrollmentState: string;
  withdrawalDate?: string | null;
  classroomLabel?: string;
  academicYear?: Pick<AcademicYear, 'year' | 'startDate' | 'endDate' | 'periodsConfig'> | null;
}

const todayInLima = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());
const fmt = (d: string) =>
  new Date(`${d.slice(0, 10)}T12:00:00`).toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

/**
 * Retiro o traslado de un alumno a mitad de año.
 * Se pide el último día que estudió: hasta esa fecha se conservan su asistencia y las notas de los
 * periodos que ya completó (y se suben al SIAGIE). Después de esa fecha deja de aparecer en listas,
 * no se le puede poner notas ni asistencia y se anulan sus cuotas futuras.
 */
export const WithdrawStudentModal: React.FC<{ target: WithdrawTarget | null; onClose: () => void }> = ({
  target,
  onClose,
}) => {
  const change = useChangeEnrollmentState();
  const [kind, setKind] = useState<'WITHDRAWN' | 'TRANSFERRED'>('WITHDRAWN');
  const [date, setDate] = useState(todayInLima());
  const [reason, setReason] = useState('');
  const [transferSchool, setTransferSchool] = useState('');

  const isReinstate = !!target && target.enrollmentState !== 'REGISTERED';

  useEffect(() => {
    if (!target) return;
    setKind('WITHDRAWN');
    setDate(todayInLima());
    setReason('');
    setTransferSchool('');
  }, [target]);

  const minDate = target?.academicYear?.startDate?.slice(0, 10);
  const maxDate = [todayInLima(), target?.academicYear?.endDate?.slice(0, 10)].filter(Boolean).sort()[0];

  // Periodos que el alumno completó antes de irse (solo si el año tiene fechas de periodos configuradas)
  const periodsPreview = useMemo(() => {
    const cfg = target?.academicYear?.periodsConfig;
    if (!cfg || cfg.length === 0 || !date) return null;
    const sorted = [...cfg].sort((a, b) => a.periodNumber - b.periodNumber);
    return {
      kept: sorted
        .filter((p) => p.endDate && p.endDate.slice(0, 10) <= date)
        .map((p) => p.name || `Periodo ${p.periodNumber}`),
      dropped: sorted
        .filter((p) => !p.endDate || p.endDate.slice(0, 10) > date)
        .map((p) => p.name || `Periodo ${p.periodNumber}`),
    };
  }, [target, date]);

  const submit = () => {
    if (!target) return;
    if (isReinstate) {
      change.mutate(
        { enrollmentId: target.enrollmentId, enrollmentState: 'REGISTERED' },
        {
          onSuccess: () => {
            toast.success(
              `${target.studentName} fue reincorporado(a). Las cuotas anuladas no se restauran solas: revísalas en Pagos.`,
              { duration: 8000 },
            );
            onClose();
          },
          onError: (err: any) => toast.error(getApiErrorMessage(err, 'No se pudo reincorporar.')),
        },
      );
      return;
    }
    change.mutate(
      {
        enrollmentId: target.enrollmentId,
        enrollmentState: kind,
        stateChangeDate: date,
        withdrawalReason: reason.trim() || null,
        transferSchool: kind === 'TRANSFERRED' ? transferSchool.trim() || null : null,
      },
      {
        onSuccess: (res) => {
          const cuotas = res.cancelledObligations
            ? ` Se anularon ${res.cancelledObligations} cuota(s) que vencían después.`
            : '';
          toast.success(
            `${target.studentName} quedó ${kind === 'WITHDRAWN' ? 'retirado(a)' : 'trasladado(a)'} desde el ${fmt(date)}.${cuotas}`,
            { duration: 8000 },
          );
          onClose();
        },
        onError: (err: any) => toast.error(getApiErrorMessage(err, 'No se pudo registrar el retiro.')),
      },
    );
  };

  if (isReinstate && target) {
    return (
      <Modal
        open
        onClose={onClose}
        title="Reincorporar estudiante"
        description={`${target.studentName}${target.classroomLabel ? ` · ${target.classroomLabel}` : ''}`}
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button size="sm" isLoading={change.isPending} onClick={submit} className="gap-1.5">
              <UserCheck className="w-3.5 h-3.5" /> Reincorporar
            </Button>
          </>
        }
      >
        <div className="space-y-2 text-xs">
          <p>
            Está {target.enrollmentState === 'TRANSFERRED' ? 'trasladado(a)' : 'retirado(a)'}
            {target.withdrawalDate ? ` desde el ${fmt(target.withdrawalDate)}` : ''}. Al reincorporarlo vuelve a las
            listas, a la asistencia y a todos los periodos de notas.
          </p>
          <p className="text-muted-foreground">
            Las cuotas que se anularon por el retiro no se restauran automáticamente.
          </p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={!!target}
      onClose={onClose}
      title="Retirar o trasladar estudiante"
      description={
        target ? `${target.studentName}${target.classroomLabel ? ` · ${target.classroomLabel}` : ''}` : undefined
      }
      size="md"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={!date}
            isLoading={change.isPending}
            onClick={submit}
            className="gap-1.5"
          >
            <UserMinus className="w-3.5 h-3.5" /> {kind === 'WITHDRAWN' ? 'Registrar retiro' : 'Registrar traslado'}
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-xs">
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de salida">
          {(
            [
              ['WITHDRAWN', 'Retiro', 'Deja de estudiar en el colegio.'],
              ['TRANSFERRED', 'Traslado', 'Se va a otro colegio.'],
            ] as const
          ).map(([value, label, hint]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={kind === value}
              onClick={() => setKind(value)}
              className={`text-left rounded-xl border px-3 py-2 transition-colors ${
                kind === value ? 'border-primary bg-primary/10' : 'border-input hover:bg-muted'
              }`}
            >
              <span className="block font-semibold">{label}</span>
              <span className="block text-muted-foreground">{hint}</span>
            </button>
          ))}
        </div>

        <label className="space-y-1 block">
          <span className="block font-semibold">Último día que estudió *</span>
          <Input
            type="date"
            value={date}
            min={minDate}
            max={maxDate}
            onChange={(e) => setDate(e.target.value)}
            className="text-xs"
          />
        </label>

        {kind === 'TRANSFERRED' && (
          <label className="space-y-1 block">
            <span className="block font-semibold">Colegio de destino</span>
            <Input
              value={transferSchool}
              onChange={(e) => setTransferSchool(e.target.value)}
              placeholder="Nombre o código modular"
              className="text-xs"
            />
          </label>
        )}

        <label className="space-y-1 block">
          <span className="block font-semibold">Motivo</span>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Opcional"
            className="text-xs"
            maxLength={500}
          />
        </label>

        <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-1.5">
          <p className="flex items-center gap-1.5 font-semibold">
            <Info className="w-3.5 h-3.5 text-primary" /> Qué pasará
          </p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>
              Su asistencia hasta el {date ? fmt(date) : '…'} se conserva y se puede corregir; después ya no se le toma.
            </li>
            {periodsPreview ? (
              <>
                {periodsPreview.kept.length > 0 && (
                  <li>
                    Se mantienen y se suben al SIAGIE sus notas de:{' '}
                    <strong className="text-foreground">{periodsPreview.kept.join(', ')}</strong>.
                  </li>
                )}
                {periodsPreview.dropped.length > 0 && (
                  <li>
                    No recibe notas en: <strong className="text-foreground">{periodsPreview.dropped.join(', ')}</strong>
                    .
                  </li>
                )}
              </>
            ) : (
              <li>
                Se mantienen las notas de los periodos que terminaron hasta esa fecha; en los siguientes ya no recibe
                notas.
              </li>
            )}
            <li>Sale de la lista de matriculados, de tareas, comunicados y avisos automáticos.</li>
            <li>Se anulan sus cuotas que vencen después de esa fecha (la deuda anterior se mantiene).</li>
          </ul>
        </div>
      </div>
    </Modal>
  );
};
