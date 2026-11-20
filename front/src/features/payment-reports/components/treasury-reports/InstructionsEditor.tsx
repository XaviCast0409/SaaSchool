import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ImagePlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Modal } from '@/components/ui/modal';
import { getApiErrorMessage } from '@/lib/errors';
import { useResolvedFileUrl } from '@/features/course-contents/api/useResolvedFileUrl';
import {
  usePaymentInstructions,
  useSavePaymentInstructions,
  useUploadVoucher,
} from '../../api/usePaymentReports';

interface InstructionsEditorProps {
  open: boolean;
  onClose: () => void;
}

/** Datos de cobro que ven las familias: QR de Yape/Plin e instrucciones. */
export const InstructionsEditor: React.FC<InstructionsEditorProps> = ({ open, onClose }) => {
  const { data } = usePaymentInstructions();
  const save = useSavePaymentInstructions();
  const upload = useUploadVoucher();
  const fileRef = useRef<HTMLInputElement>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [text, setText] = useState('');
  const { data: qrPreview } = useResolvedFileUrl(qr);

  useEffect(() => {
    if (open && data) {
      setQr(data.paymentQrFileUrl);
      setText(data.paymentInstructions ?? '');
    }
  }, [open, data]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Datos de cobro para las familias"
      description="Aparecen cuando una familia va a reportar su pago."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={save.isPending}
            onClick={() =>
              save.mutate(
                { paymentQrFileUrl: qr, paymentInstructions: text },
                {
                  onSuccess: () => {
                    toast.success('Datos de cobro guardados');
                    onClose();
                  },
                  onError: (e) => toast.error(getApiErrorMessage(e, 'Error al guardar datos de cobro')),
                },
              )
            }
          >
            Guardar
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          {qrPreview ? (
            <img
              src={qrPreview}
              alt="QR de pago"
              className="h-24 w-24 rounded-lg border border-border bg-white object-contain p-1"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
              Sin QR
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f)
                upload.mutate(
                  { file: f, purpose: 'SCHOOL_ASSET' },
                  {
                    onSuccess: (r) => setQr(r.url),
                    onError: (err) => toast.error(getApiErrorMessage(err, 'Error al subir QR')),
                  },
                );
            }}
          />
          <div className="flex flex-col gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => fileRef.current?.click()}
              disabled={upload.isPending}
            >
              {upload.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ImagePlus className="h-3.5 w-3.5" aria-hidden />
              )}{' '}
              Subir QR de Yape/Plin
            </Button>
            {qr && (
              <Button size="sm" variant="ghost" onClick={() => setQr(null)}>
                Quitar QR
              </Button>
            )}
          </div>
        </div>
        <label className="block text-xs text-muted-foreground">
          Instrucciones
          <Textarea
            rows={6}
            maxLength={2000}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              'Yape/Plin: 987 654 321 (Colegio Innova SAC)\nBCP soles: 191-1234567-0-12 · CCI 002-191-001234567012-55\nIndica en el concepto el nombre del alumno.'
            }
          />
        </label>
      </div>
    </Modal>
  );
};
