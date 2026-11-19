import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { formatPeruShortDate, formatPeruDateTime } from '@/lib/dateUtils';
import { getApiErrorMessage } from '@/lib/errors';
import { formatMoney } from '@/lib/format';
import { useRespondComplaint, type Complaint } from '../../api/useSecretariat';

export const ComplaintModal: React.FC<{ c: Complaint | null; onClose: () => void; canRespond: boolean }> = ({
  c,
  onClose,
  canRespond,
}) => {
  const respond = useRespondComplaint();
  const [text, setText] = useState('');
  useEffect(() => setText(''), [c]);
  if (!c) return null;
  return (
    <Modal
      open
      onClose={onClose}
      title={`${c.code} · ${c.kind === 'RECLAMO' ? 'Reclamo' : 'Queja'}`}
      description={`Registrado el ${formatPeruDateTime(c.createdAt)} · vence el ${formatPeruShortDate(c.dueDate.slice(0, 10))}`}
      size="lg"
      footer={
        c.status === 'OPEN' && canRespond ? (
          <Button
            disabled={respond.isPending || text.trim().length < 10}
            onClick={() =>
              respond.mutate(
                { id: c.id, response: text },
                {
                  onSuccess: () => {
                    toast.success('Respuesta enviada al correo del consumidor');
                    onClose();
                  },
                  onError: (e) => toast.error(getApiErrorMessage(e)),
                },
              )
            }
          >
            {respond.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enviar respuesta
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-4 text-sm">
        <dl className="grid gap-x-4 gap-y-1.5 sm:grid-cols-[150px_1fr]">
          <dt className="text-muted-foreground">Consumidor</dt>
          <dd>
            {c.consumerName} · {c.consumerDocType} {c.consumerDocId}
            {c.isMinor ? ` (menor; apoderado: ${c.guardianName})` : ''}
          </dd>
          <dt className="text-muted-foreground">Contacto</dt>
          <dd>
            {c.consumerEmail}
            {c.consumerPhone ? ` · ${c.consumerPhone}` : ''}
            {c.consumerAddress ? ` · ${c.consumerAddress}` : ''}
          </dd>
          <dt className="text-muted-foreground">Bien ({c.itemType.toLowerCase()})</dt>
          <dd>
            {c.itemDescription}
            {c.amount ? ` · ${formatMoney(c.amount)}` : ''}
          </dd>
          <dt className="text-muted-foreground">Detalle</dt>
          <dd className="whitespace-pre-line">{c.detail}</dd>
          <dt className="text-muted-foreground">Pedido</dt>
          <dd className="whitespace-pre-line">{c.request}</dd>
        </dl>
        {c.status === 'ANSWERED' ? (
          <div className="rounded-md bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">
              Respondido por {c.respondedBy} el {formatPeruDateTime(c.respondedAt!)}
            </p>
            <p className="mt-1 whitespace-pre-line">{c.response}</p>
          </div>
        ) : canRespond ? (
          <label className="block space-y-1">
            <span className="text-xs font-medium uppercase text-muted-foreground">
              Respuesta (se envía por correo y queda registrada)
            </span>
            <Textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} maxLength={5000} />
          </label>
        ) : (
          <p className="text-xs text-muted-foreground">La respuesta la envía la Dirección.</p>
        )}
      </div>
    </Modal>
  );
};
