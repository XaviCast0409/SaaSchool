import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ClipboardCheck, Loader2, Lock } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatPeruShortDate, getPeruToday } from '@/lib/dateUtils';
import { getApiErrorMessage } from '@/lib/errors';
import {
  INTERVENTION_LABEL,
  useCreateIntervention,
  useInterventions,
  useSetInterventionStatus,
  type RiskRow,
} from '../../api/useInsights';

const dateOnly = (iso: string) => formatPeruShortDate(iso.slice(0, 10));

export const TutoringModal: React.FC<{ row: RiskRow | null; onClose: () => void }> = ({ row, onClose }) => {
  const { data: list = [], isLoading } = useInterventions(row?.enrollmentId ?? null);
  const create = useCreateIntervention(row?.enrollmentId ?? null);
  const setStatus = useSetInterventionStatus();
  const [form, setForm] = useState({
    type: 'ENTREVISTA_ESTUDIANTE',
    date: getPeruToday(),
    notes: '',
    agreements: '',
    followUpDate: '',
  });
  useEffect(() => {
    if (row)
      setForm({ type: 'ENTREVISTA_ESTUDIANTE', date: getPeruToday(), notes: '', agreements: '', followUpDate: '' });
  }, [row]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate(
      {
        type: form.type,
        date: form.date,
        notes: form.notes,
        agreements: form.agreements || null,
        followUpDate: form.followUpDate || null,
      },
      {
        onSuccess: () => {
          toast.success('Intervención registrada');
          setForm({ ...form, notes: '', agreements: '', followUpDate: '' });
        },
        onError: (err) => toast.error(getApiErrorMessage(err)),
      },
    );
  };

  return (
    <Modal
      open={Boolean(row)}
      onClose={onClose}
      title={`Plan de tutoría · ${row?.name ?? ''}`}
      description={row ? `${row.classroom} · ${row.reasons.join(' · ') || 'Sin alertas'}` : undefined}
      size="xl"
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <form onSubmit={submit} className="space-y-3">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" aria-hidden /> Información reservada: solo la ven la Dirección y el tutor del
            aula. La familia no la ve.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2 text-xs text-muted-foreground sm:col-span-1">
              Tipo
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {Object.entries(INTERVENTION_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="col-span-2 text-xs text-muted-foreground sm:col-span-1">
              Fecha
              <Input
                type="date"
                className="h-9"
                max={getPeruToday()}
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </label>
          </div>
          <label className="block text-xs text-muted-foreground">
            ¿Qué se conversó o hizo?
            <Textarea
              rows={4}
              required
              minLength={5}
              maxLength={4000}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>
          <label className="block text-xs text-muted-foreground">
            Acuerdos (opcional)
            <Textarea
              rows={2}
              maxLength={2000}
              value={form.agreements}
              onChange={(e) => setForm({ ...form, agreements: e.target.value })}
            />
          </label>
          <label className="block text-xs text-muted-foreground">
            Volver a revisar el (opcional)
            <Input
              type="date"
              className="h-9"
              min={getPeruToday()}
              value={form.followUpDate}
              onChange={(e) => setForm({ ...form, followUpDate: e.target.value })}
            />
          </label>
          <Button type="submit" disabled={create.isPending} className="gap-2">
            {create.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <ClipboardCheck className="h-4 w-4" aria-hidden />
            )}{' '}
            Registrar intervención
          </Button>
        </form>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Historial</h3>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : list.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay intervenciones registradas.</p>
          ) : (
            <ul className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
              {list.map((i) => (
                <li key={i.id} className="rounded-lg border border-border p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-foreground">{INTERVENTION_LABEL[i.type] ?? i.type}</p>
                    <span className="text-xs text-muted-foreground">
                      {dateOnly(i.date)} · {i.authorName}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-line text-xs text-foreground">{i.notes}</p>
                  {i.agreements && (
                    <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">
                      <strong>Acuerdos:</strong> {i.agreements}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    {i.followUpDate && (
                      <span className="text-muted-foreground">Revisar el {dateOnly(i.followUpDate)}</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setStatus.mutate({ id: i.id, status: i.status === 'OPEN' ? 'CLOSED' : 'OPEN' })}
                      className={cn(
                        'ml-auto rounded-full px-2 py-0.5 font-semibold',
                        i.status === 'OPEN'
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                          : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
                      )}
                      aria-label={i.status === 'OPEN' ? 'Marcar como cerrado' : 'Reabrir'}
                    >
                      {i.status === 'OPEN' ? 'En seguimiento' : 'Cerrado'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
};
