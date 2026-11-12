import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  Bot,
  CalendarClock,
  CheckCircle2,
  History,
  Lock,
  Mail,
  Play,
  Users,
  XCircle,
  Loader2,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/utils';
import { formatPeruDateTime } from '@/lib/dateUtils';
import { apiErrorMessage } from '@/features/academic/api';
import {
  useAutomationRuns,
  useAutomations,
  useRunAutomation,
  useToggleAutomation,
  type AutomationJob,
} from '../api/useAutomations';

const Switch: React.FC<{ checked: boolean; disabled?: boolean; onChange: (v: boolean) => void; label: string }> = ({
  checked,
  disabled,
  onChange,
  label,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={cn(
      'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed',
      checked ? 'bg-primary' : 'bg-muted-foreground/30',
    )}
  >
    <span
      className={cn(
        'inline-block h-5 w-5 rounded-full bg-background shadow transition-transform',
        checked ? 'translate-x-5' : 'translate-x-0.5',
      )}
    />
  </button>
);

const LastRun: React.FC<{ job: AutomationJob }> = ({ job }) => {
  const run = job.lastRun;
  if (!run) return <span className="text-muted-foreground">Aún no se ha ejecutado</span>;
  const ok = run.status === 'SUCCESS';
  const failed = run.status === 'FAILED';
  return (
    <span className="inline-flex items-center gap-1.5">
      {ok && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden />}
      {failed && <XCircle className="h-3.5 w-3.5 text-destructive" aria-hidden />}
      {!ok && !failed && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
      <span>
        {formatPeruDateTime(run.startedAt)}
        {run.triggeredById ? ' (manual)' : ''} · {failed ? 'Falló' : run.summary ?? 'En curso'}
      </span>
    </span>
  );
};

const RunsModal: React.FC<{ job: AutomationJob | null; onClose: () => void }> = ({ job, onClose }) => {
  const { data, isLoading } = useAutomationRuns(job?.name ?? null);
  return (
    <Modal open={Boolean(job)} onClose={onClose} title={`Historial: ${job?.label ?? ''}`} size="lg">
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay ejecuciones registradas.</p>
      ) : (
        <ul className="divide-y divide-border text-sm">
          {data.map((r) => (
            <li key={r.id} className="py-2.5 flex items-start gap-3">
              {r.status === 'SUCCESS' ? (
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-600 shrink-0" aria-label="Correcta" />
              ) : r.status === 'FAILED' ? (
                <XCircle className="h-4 w-4 mt-0.5 text-destructive shrink-0" aria-label="Falló" />
              ) : (
                <Loader2 className="h-4 w-4 mt-0.5 animate-spin shrink-0" aria-label="En curso" />
              )}
              <div className="min-w-0">
                <p className="font-medium text-foreground">
                  {formatPeruDateTime(r.startedAt)} {r.triggeredById && <span className="text-xs text-muted-foreground">(manual)</span>}
                </p>
                <p className="text-muted-foreground">{r.status === 'FAILED' ? r.error : r.summary}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
};

export const AutomationsPage: React.FC = () => {
  const { data, isLoading } = useAutomations();
  const toggle = useToggleAutomation();
  const runNow = useRunAutomation();
  const [historyJob, setHistoryJob] = useState<AutomationJob | null>(null);
  const [runningName, setRunningName] = useState<string | null>(null);

  const handleToggle = (job: AutomationJob, enabled: boolean) => {
    toggle.mutate(
      { name: job.name, enabled },
      {
        onSuccess: () => toast.success(`${job.label}: ${enabled ? 'activada' : 'desactivada'}`),
        onError: (e) => toast.error(apiErrorMessage(e)),
      },
    );
  };

  const handleRun = (job: AutomationJob) => {
    setRunningName(job.name);
    runNow.mutate(job.name, {
      onSuccess: (res) => toast.success(`${job.label}: ${res.summary}`),
      onError: (e) => toast.error(apiErrorMessage(e)),
      onSettled: () => setRunningName(null),
    });
  };

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Automatizaciones"
        description="Avisos que la plataforma envía sola, sin que nadie tenga que acordarse. Todos son gratuitos: notificación en la app, push al celular y correo."
      />

      {data && (
        <Card className="mb-4 p-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="inline-flex items-center gap-2 text-muted-foreground">
            <Mail className="h-4 w-4" aria-hidden />
            Correos enviados hoy: <strong className="text-foreground">{data.email.sentToday}</strong> de {data.email.dailyLimit}
          </span>
          {data.email.pending > 0 && <span className="text-muted-foreground">En cola: {data.email.pending}</span>}
          <span className="text-xs text-muted-foreground">
            Cada familia puede elegir qué avisos recibe desde “Mis notificaciones”.
          </span>
        </Card>
      )}

      <div className="space-y-3">
        {isLoading &&
          [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}

        {data?.jobs.map((job) => {
          const locked = !job.availableInPlan;
          return (
            <Card key={job.name} className={cn('p-4 sm:p-5', locked && 'opacity-70')}>
              <div className="flex items-start gap-4">
                <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Bot className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-foreground">{job.label}</h2>
                    {locked && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                        <Lock className="h-3 w-3" aria-hidden /> Plan PRO
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{job.description}</p>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarClock className="h-3.5 w-3.5" aria-hidden /> {job.scheduleLabel}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" aria-hidden /> {job.audience} · {job.channels}
                    </span>
                  </div>
                  <div className="mt-2 text-xs">
                    <LastRun job={job} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5 text-xs"
                      disabled={locked || runningName !== null}
                      onClick={() => handleRun(job)}
                    >
                      {runningName === job.name ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      ) : (
                        <Play className="h-3.5 w-3.5" aria-hidden />
                      )}
                      Ejecutar ahora
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs" onClick={() => setHistoryJob(job)}>
                      <History className="h-3.5 w-3.5" aria-hidden /> Historial
                    </Button>
                  </div>
                </div>
                <Switch
                  checked={job.enabled && !locked}
                  disabled={locked || toggle.isPending}
                  onChange={(v) => handleToggle(job, v)}
                  label={`${job.enabled ? 'Desactivar' : 'Activar'} ${job.label}`}
                />
              </div>
            </Card>
          );
        })}
      </div>

      <RunsModal job={historyJob} onClose={() => setHistoryJob(null)} />
    </div>
  );
};
