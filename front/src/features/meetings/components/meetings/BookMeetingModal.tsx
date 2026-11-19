import React from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';

interface BookMeetingModalProps {
  picked: { id: string; label: string } | null;
  onClose: () => void;
  reason: string;
  onReasonChange: (reason: string) => void;
  onConfirm: () => void;
  isPending: boolean;
}

export const BookMeetingModal: React.FC<BookMeetingModalProps> = ({
  picked,
  onClose,
  reason,
  onReasonChange,
  onConfirm,
  isPending,
}) => (
  <Modal
    open={Boolean(picked)}
    onClose={onClose}
    title="Confirmar entrevista"
    description={picked?.label}
    footer={
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" className="rounded-xl text-xs font-bold" onClick={onClose}>
          Volver
        </Button>
        <Button
          size="sm"
          onClick={onConfirm}
          disabled={reason.trim().length < 3 || isPending}
          className="gap-1.5 rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
          )}{' '}
          Reservar
        </Button>
      </div>
    }
  >
    <label className="mb-1 block text-xs font-bold text-foreground" htmlFor="meeting-reason">
      ¿Sobre qué te gustaría conversar?
    </label>
    <Textarea
      id="meeting-reason"
      className="rounded-xl text-sm"
      rows={3}
      maxLength={500}
      value={reason}
      onChange={(e) => onReasonChange(e.target.value)}
      placeholder="Ej.: quisiera saber cómo va en Matemática y cómo apoyarlo en casa."
    />
    <p className="mt-1 text-right text-xs text-muted-foreground">{reason.length}/500</p>
  </Modal>
);
