import React, { useState } from 'react';
import { toast } from 'sonner';
import { BellRing, CheckCircle2, ClipboardCheck, Loader2, ThumbsDown, ThumbsUp, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatPeruDate, formatPeruDateTime } from '@/lib/dateUtils';
import { apiErrorMessage } from '@/features/academic/api';
import { useAnnouncementResponses, useRemindAnnouncement, useRespondAnnouncement } from '../api/useAnnouncements';
import type { Announcement } from '../types';

export const RESPONSE_LABEL: Record<string, string> = {
  ACK: 'Leído y enterado',
  AUTHORIZED: 'Autorizo',
  NOT_AUTHORIZED: 'No autorizo',
};
const labelOf = (r: string) => RESPONSE_LABEL[r] ?? r;

const TYPE_TITLE: Record<string, string> = {
  ACKNOWLEDGE: 'Confirma que leíste este comunicado',
  AUTHORIZATION: 'Se requiere tu autorización',
  POLL: 'Encuesta',
};

/** Botones de respuesta para el apoderado, uno por cada hijo involucrado. */
const ParentResponses: React.FC<{ a: Announcement; closed: boolean }> = ({ a, closed }) => {
  const respond = useRespondAnnouncement();
  const [pending, setPending] = useState<string | null>(null);
  const send = (studentId: string, response: string) => {
    setPending(`${studentId}:${response}`);
    respond.mutate(
      { id: a.id, studentId, response },
      {
        onSuccess: () => toast.success('Respuesta registrada'),
        onError: (e) => toast.error(apiErrorMessage(e)),
        onSettled: () => setPending(null),
      },
    );
  };
  const options =
    a.responseType === 'ACKNOWLEDGE'
      ? [{ value: 'ACK', label: 'Leído y enterado', icon: CheckCircle2 }]
      : a.responseType === 'AUTHORIZATION'
        ? [
            { value: 'AUTHORIZED', label: 'Autorizo', icon: ThumbsUp },
            { value: 'NOT_AUTHORIZED', label: 'No autorizo', icon: ThumbsDown },
          ]
        : (a.pollOptions ?? []).map((o) => ({ value: o, label: o, icon: undefined }));

  return (
    <div className="space-y-2.5">
      {(a.myTargets ?? []).map((t) => (
        <div key={t.studentId} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Por <strong className="text-foreground">{t.studentName}</strong>
            {t.response && (
              <span className="ml-1">
                · respondiste <strong className="text-foreground">{labelOf(t.response)}</strong>
                {t.respondedAt ? ` el ${formatPeruDateTime(t.respondedAt)}` : ''}
              </span>
            )}
          </p>
          {!closed && (
            <div className="flex flex-wrap gap-1.5">
              {options.map((o) => {
                const Icon = o.icon;
                const selected = t.response === o.value;
                const loading = pending === `${t.studentId}:${o.value}`;
                return (
                  <Button
                    key={o.value}
                    size="sm"
                    variant={selected ? 'default' : 'outline'}
                    className="h-8 gap-1.5 text-xs"
                    disabled={respond.isPending}
                    onClick={() => send(t.studentId, o.value)}
                    aria-pressed={selected}
                  >
                    {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : Icon ? <Icon className="h-3.5 w-3.5" aria-hidden /> : null}
                    {o.label}
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const ResponsesModal: React.FC<{ a: Announcement | null; onClose: () => void }> = ({ a, onClose }) => {
  const { data, isLoading } = useAnnouncementResponses(a?.id ?? null);
  const remind = useRemindAnnouncement();
  const pending = data ? data.expected - data.responded : 0;
  return (
    <Modal
      open={Boolean(a)}
      onClose={onClose}
      title={`Respuestas: ${a?.title ?? ''}`}
      size="lg"
      footer={
        data && pending > 0 ? (
          <div className="flex justify-end">
            <Button
              className="gap-2"
              disabled={remind.isPending}
              onClick={() =>
                a &&
                remind.mutate(a.id, {
                  onSuccess: (r) => toast.success(`Recordatorio enviado a ${r.reminded} familia(s)`),
                  onError: (e) => toast.error(apiErrorMessage(e)),
                })
              }
            >
              {remind.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" aria-hidden />}
              Recordar a quienes faltan ({pending})
            </Button>
          </div>
        ) : undefined
      }
    >
      {isLoading || !data ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-lg bg-muted px-3 py-1.5 text-xs">
              <strong className="text-foreground">{data.responded}</strong> de {data.expected} alumnos
            </span>
            {Object.entries(data.tally).map(([k, v]) => (
              <span key={k} className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs text-primary">
                {labelOf(k)}: <strong>{v}</strong>
              </span>
            ))}
            {data.deadline && <span className="rounded-lg bg-muted px-3 py-1.5 text-xs text-muted-foreground">Plazo: {formatPeruDate(data.deadline)}</span>}
          </div>
          <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left font-medium">Alumno</th>
                  <th scope="col" className="px-3 py-2 text-left font-medium">Respuesta</th>
                  <th scope="col" className="hidden px-3 py-2 text-left font-medium sm:table-cell">Quién y cuándo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.rows.map((r) => (
                  <tr key={r.studentId}>
                    <td className="px-3 py-2">
                      <p className="font-medium text-foreground">{r.studentName}</p>
                      <p className="text-[11px] text-muted-foreground">{r.classroom}</p>
                    </td>
                    <td className="px-3 py-2">
                      {r.response ? (
                        <span className={cn('text-xs font-semibold', r.response === 'NOT_AUTHORIZED' ? 'text-destructive' : 'text-emerald-700 dark:text-emerald-300')}>
                          {labelOf(r.response)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Pendiente</span>
                      )}
                    </td>
                    <td className="hidden px-3 py-2 text-xs text-muted-foreground sm:table-cell">
                      {r.respondedBy ? `${r.respondedBy} · ${formatPeruDateTime(r.respondedAt)}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
};

export const AnnouncementResponsePanel: React.FC<{ announcement: Announcement }> = ({ announcement: a }) => {
  const [open, setOpen] = useState<Announcement | null>(null);
  if (!a.responseType || a.responseType === 'NONE') return null;
  const closed = Boolean(a.responseDeadline && new Date(a.responseDeadline) < new Date());
  const showParent = (a.myTargets?.length ?? 0) > 0;
  const stats = a.responseStats;
  if (!showParent && !stats) return null;

  const percent = stats && stats.expected > 0 ? Math.round((stats.responded / stats.expected) * 100) : 0;

  return (
    <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-primary">
        <ClipboardCheck className="h-4 w-4" aria-hidden />
        {TYPE_TITLE[a.responseType]}
        {a.responseDeadline && (
          <span className="font-normal text-muted-foreground">
            · {closed ? 'plazo vencido' : `hasta el ${formatPeruDate(a.responseDeadline, { day: 'numeric', month: 'long' })}`}
          </span>
        )}
      </p>
      {showParent && <ParentResponses a={a} closed={closed} />}
      {stats && (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Avance de respuestas">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              <strong className="text-foreground">{stats.responded}</strong> de {stats.expected}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {Object.entries(stats.tally).map(([k, v]) => (
              <span key={k} className="text-[11px] text-muted-foreground">
                {labelOf(k)}: <strong className="text-foreground">{v}</strong>
              </span>
            ))}
            <Button size="sm" variant="outline" className="ml-auto h-7 gap-1.5 text-xs" onClick={() => setOpen(a)}>
              <Users className="h-3.5 w-3.5" aria-hidden /> Ver respuestas
            </Button>
          </div>
        </div>
      )}
      <ResponsesModal a={open} onClose={() => setOpen(null)} />
    </div>
  );
};
