import { getApiErrorMessage } from '@/lib/errors';
import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getPeruToday } from '@/lib/dateUtils';
import { useUsers } from '../api/useUsers';
import { useReplaceTeacher, useReplacementPreview, type ReplacementBody } from '../api/useTeacherReplacement';
import type { DirectoryUser } from '../types';

const selectCls =
  'w-full text-xs rounded-xl border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring';

/**
 * Reemplazar a un docente a mitad de año: el entrante recibe sus cursos (con notas, criterios,
 * asistencia, horario y contenidos), su tutoría y una copia de sus rúbricas. Queda el historial de
 * quién dictó cada parte del año para actas y libretas.
 */
export const ReplaceTeacherModal: React.FC<{ teacher: DirectoryUser; onClose: () => void }> = ({
  teacher,
  onClose,
}) => {
  const { data: preview, isLoading } = useReplacementPreview(teacher.id);
  const { data: teachers = [] } = useUsers({ role: 'TEACHER', yearScope: 'all' });
  const replace = useReplaceTeacher();
  const today = getPeruToday();
  const [f, setF] = useState<Omit<ReplacementBody, 'outgoingTeacherId'>>({
    incomingTeacherId: '',
    kind: 'PERMANENT',
    effectiveDate: today,
    untilDate: null,
    reason: '',
    outgoingAction: 'DEACTIVATE',
    copyRubrics: true,
  });

  const candidates = useMemo(
    () =>
      teachers
        .filter((t) => t.id !== teacher.id && t.isActive)
        .sort((a, b) =>
          `${a.lastNamePaternal} ${a.firstName}`.localeCompare(`${b.lastNamePaternal} ${b.firstName}`, 'es'),
        ),
    [teachers, teacher.id],
  );
  const pendingTotal = preview?.courses.reduce((a, c) => a + c.pendingSubmissions, 0) ?? 0;
  const nothing = !!preview && preview.courses.length === 0 && preview.tutorOf.length === 0;
  const valid =
    !!f.incomingTeacherId &&
    f.reason.trim().length >= 5 &&
    !!f.effectiveDate &&
    (f.kind === 'PERMANENT' || (!!f.untilDate && f.untilDate >= f.effectiveDate)) &&
    !nothing;
  const outgoingName = `${teacher.firstName} ${teacher.lastNamePaternal}`;

  const submit = () =>
    replace.mutate(
      {
        ...f,
        outgoingTeacherId: teacher.id,
        outgoingAction: f.kind === 'TEMPORARY' ? 'KEEP' : f.outgoingAction,
        untilDate: f.kind === 'TEMPORARY' ? f.untilDate : null,
      },
      {
        onSuccess: (r) => {
          const incoming = candidates.find((c) => c.id === f.incomingTeacherId);
          toast.success(
            `${incoming ? `${incoming.firstName} ${incoming.lastNamePaternal}` : 'El nuevo docente'} recibió ${r.transferred.courses} curso(s)${r.transferred.tutorships ? ' y la tutoría' : ''}${r.transferred.rubricsCopied ? ` y ${r.transferred.rubricsCopied} rúbricas` : ''}.`,
          );
          onClose();
        },
        onError: (err: any) => toast.error(getApiErrorMessage(err, 'No se pudo hacer el reemplazo.')),
      },
    );

  return (
    <Modal
      open
      onClose={onClose}
      title={`Reemplazar a ${outgoingName}`}
      description="El docente entrante recibe sus cursos con todo lo avanzado (notas, criterios, asistencia, horario, contenidos y tareas) y su tutoría. Actas y libretas mostrarán a cada docente en los periodos que dictó."
      size="xl"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button size="sm" disabled={!valid} isLoading={replace.isPending} onClick={submit}>
            {f.kind === 'TEMPORARY' ? 'Asignar suplencia' : 'Reemplazar docente'}
          </Button>
        </>
      }
    >
      <div className="grid gap-5 lg:grid-cols-2 text-xs">
        {/* Qué se transfiere */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-foreground">
            Lo que recibe el nuevo docente {preview ? `(${preview.year.year})` : ''}
          </h3>
          {isLoading || !preview ? (
            <div className="p-6 flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-primary" /> Revisando sus cursos...
            </div>
          ) : nothing ? (
            <p className="rounded-xl border border-dashed border-border p-4 text-muted-foreground">
              {outgoingName} no tiene cursos ni tutoría en {preview.year.year}. Si se va, basta con desactivarlo.
            </p>
          ) : (
            <>
              <ul className="divide-y divide-border/60 rounded-xl border border-border max-h-64 overflow-y-auto">
                {preview.courses.map((c) => (
                  <li key={c.id} className="px-3 py-2">
                    <div className="font-semibold text-foreground">
                      {c.course} · {c.classroom}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {c.grades} notas · {c.contents} contenidos · {c.attendanceSessions} sesiones de asistencia ·{' '}
                      {c.scheduleBlocks} horas en horario
                      {c.pendingSubmissions > 0 && (
                        <span className="text-amber-700 dark:text-amber-400 font-semibold">
                          {' '}
                          · {c.pendingSubmissions} entregas por calificar
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              {preview.tutorOf.length > 0 && (
                <p className="rounded-xl border border-border p-3">
                  <strong className="text-foreground">Tutoría:</strong> {preview.tutorOf.join(', ')}
                </p>
              )}
              {pendingTotal > 0 && (
                <p className="text-xs text-muted-foreground">
                  Las {pendingTotal} entregas por calificar quedarán para el nuevo docente, que podrá revisarlas y
                  calificarlas.
                </p>
              )}
            </>
          )}
        </div>

        {/* Datos del reemplazo */}
        <div className="space-y-3">
          <label className="block space-y-1">
            <span className="font-semibold">Docente entrante *</span>
            <select
              className={selectCls}
              value={f.incomingTeacherId}
              onChange={(e) => setF({ ...f, incomingTeacherId: e.target.value })}
            >
              <option value="">-- Elige al docente --</option>
              {candidates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.lastNamePaternal} {t.lastNameMaternal}, {t.firstName}
                </option>
              ))}
            </select>
            <span className="block text-xs text-muted-foreground">
              Si es nuevo en el colegio, regístralo primero con "Registrar Personal".
            </span>
          </label>

          <div className="flex gap-2">
            {(
              [
                ['PERMANENT', 'Definitivo', 'Renuncia o fin de contrato'],
                ['TEMPORARY', 'Temporal', 'Licencia o descanso médico'],
              ] as const
            ).map(([k, label, hint]) => (
              <button
                key={k}
                type="button"
                onClick={() => setF({ ...f, kind: k })}
                className={`flex-1 rounded-xl border p-2 text-left ${f.kind === k ? 'border-primary bg-primary/5' : 'border-border'}`}
              >
                <div className="font-bold text-foreground">{label}</div>
                <div className="text-xs text-muted-foreground">{hint}</div>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 items-end">
            <label className="space-y-1">
              <span className="font-semibold">Desde *</span>
              <Input
                type="date"
                className="text-xs rounded-xl"
                value={f.effectiveDate}
                onChange={(e) => setF({ ...f, effectiveDate: e.target.value })}
              />
            </label>
            {f.kind === 'TEMPORARY' && (
              <label className="space-y-1">
                <span className="font-semibold flex items-center gap-1">
                  <ArrowRight className="w-3 h-3" /> Hasta *
                </span>
                <Input
                  type="date"
                  className="text-xs rounded-xl"
                  value={f.untilDate ?? ''}
                  min={f.effectiveDate}
                  onChange={(e) => setF({ ...f, untilDate: e.target.value || null })}
                />
              </label>
            )}
          </div>

          <label className="block space-y-1">
            <span className="font-semibold">Motivo *</span>
            <textarea
              rows={2}
              value={f.reason}
              onChange={(e) => setF({ ...f, reason: e.target.value })}
              placeholder={
                f.kind === 'TEMPORARY'
                  ? 'Ej: Licencia por maternidad hasta el 30/09'
                  : 'Ej: Renuncia voluntaria presentada el 20/07'
              }
              className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </label>

          {f.kind === 'PERMANENT' ? (
            <fieldset className="space-y-1.5 rounded-xl border border-border p-3">
              <legend className="px-1 font-semibold">¿Qué pasa con {outgoingName}?</legend>
              {(
                [
                  [
                    'DEACTIVATE',
                    'Desactivar su cuenta',
                    'Deja de poder entrar al sistema. Sus notas y registros se conservan.',
                  ],
                  [
                    'REMOVE_FROM_YEAR',
                    'Quitarlo del personal del año',
                    'Sigue con acceso (p. ej. si pasa a otra función).',
                  ],
                  ['KEEP', 'Mantenerlo en el personal', 'Solo se le quitan estos cursos.'],
                ] as const
              ).map(([k, label, hint]) => (
                <label key={k} className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="outgoingAction"
                    checked={f.outgoingAction === k}
                    onChange={() => setF({ ...f, outgoingAction: k })}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-semibold text-foreground">{label}</span>
                    <span className="block text-xs text-muted-foreground">{hint}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          ) : (
            <p className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3 text-indigo-900 dark:text-indigo-200">
              {outgoingName} sigue en el colegio. Al terminar la suplencia, usa <strong>Finalizar</strong> en "Carga del
              año" y sus cursos y tutoría vuelven a él o ella con lo que avanzó el suplente.
            </p>
          )}

          {(preview?.rubrics ?? 0) > 0 && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={f.copyRubrics}
                onChange={(e) => setF({ ...f, copyRubrics: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              Copiar sus {preview?.rubrics} rúbricas al nuevo docente
            </label>
          )}
        </div>
      </div>
    </Modal>
  );
};
