import React from 'react';
import { MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatPeruDate } from '@/lib/dateUtils';
import { getApiErrorMessage } from '@/lib/errors';
import { useMeetingRequests, useDismissMeetingRequest } from '../../api/useMeetings';
import { panel } from './constants';
import { PanelHeader } from './MeetingsUI';

/** Familias que le pidieron horario al docente: al publicar horarios se les avisa solo. */
export const RequestsPanel: React.FC = () => {
  const { data: requests = [] } = useMeetingRequests(true);
  const dismiss = useDismissMeetingRequest();
  if (requests.length === 0) return null;
  return (
    <section className={cn(panel, 'border-amber-500/40')}>
      <PanelHeader
        icon={<MessageSquare className="h-4 w-4" />}
        title={`${requests.length} familia${requests.length === 1 ? '' : 's'} te ${requests.length === 1 ? 'pidió' : 'pidieron'} una entrevista`}
        description="Publica tus horarios abajo y les avisaremos para que reserven."
      />
      <ul className="divide-y divide-border/60">
        {requests.map((r) => (
          <li key={r.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:px-5">
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-sm font-bold text-foreground">
                {r.parent.firstName} {r.parent.lastNamePaternal}
                <span className="font-normal text-muted-foreground"> · {r.student.name}</span>
              </p>
              {r.message && <p className="text-sm text-muted-foreground">«{r.message}»</p>}
              <p className="text-xs text-muted-foreground">
                Pedido el {formatPeruDate(r.createdAt, { day: 'numeric', month: 'long' })}
                {r.parent.cellphone ? ` · Cel. ${r.parent.cellphone}` : ''}
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-9 shrink-0 self-start rounded-xl text-xs font-bold text-muted-foreground"
              disabled={dismiss.isPending}
              onClick={() =>
                dismiss.mutate(r.id, {
                  onSuccess: () => toast.success('Solicitud marcada como atendida.'),
                  onError: (e) => toast.error(getApiErrorMessage(e, 'No se pudo descartar la solicitud.')),
                })
              }
              title="Ya conversaste con la familia por otro medio"
            >
              Ya lo atendí
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
};
