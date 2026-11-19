import React from 'react';
import { Loader2, CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';

interface RequestMeetingModalProps {
  requesting: { id: string; name: string } | null;
  onClose: () => void;
  requestMessage: string;
  onRequestMessageChange: (message: string) => void;
  onConfirm: () => void;
  isPending: boolean;
}

export const RequestMeetingModal: React.FC<RequestMeetingModalProps> = ({
  requesting,
  onClose,
  requestMessage,
  onRequestMessageChange,
  onConfirm,
  isPending,
}) => (
  <Modal
    open={Boolean(requesting)}
    onClose={onClose}
    title="Pedir horario de entrevista"
    description={
      requesting
        ? `Le avisaremos a ${requesting.name} que quieres conversar. Cuando publique horarios, te llegará un aviso para reservar.`
        : undefined
    }
    footer={
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" className="rounded-xl text-xs font-bold" onClick={onClose}>
          Volver
        </Button>
        <Button size="sm" onClick={onConfirm} disabled={isPending} className="gap-1.5 rounded-xl text-xs font-bold">
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <CalendarPlus className="h-3.5 w-3.5" aria-hidden />
          )}{' '}
          Pedir horario
        </Button>
      </div>
    }
  >
    <label className="mb-1 block text-xs font-bold text-foreground" htmlFor="meeting-request-message">
      Motivo (opcional)
    </label>
    <Textarea
      id="meeting-request-message"
      className="rounded-xl text-sm"
      rows={3}
      maxLength={500}
      value={requestMessage}
      onChange={(e) => onRequestMessageChange(e.target.value)}
      placeholder="Ej.: quisiera conversar sobre sus notas del bimestre."
    />
    <p className="mt-1 text-right text-xs text-muted-foreground">{requestMessage.length}/500</p>
  </Modal>
);
