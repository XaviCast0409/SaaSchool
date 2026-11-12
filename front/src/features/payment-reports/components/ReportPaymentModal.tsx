import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, ImagePlus, Loader2, Smartphone } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { getPeruToday } from '@/lib/dateUtils';
import { apiErrorMessage } from '@/features/academic/api';
import { useResolvedFileUrl } from '@/features/course-contents/api/useResolvedFileUrl';
import { METHOD_LABEL, usePaymentInstructions, useReportPayment, useUploadVoucher, type ReportMethod } from '../api/usePaymentReports';

export interface ReportableObligation {
  id: string;
  title: string;
  balance: number;
  studentName?: string;
}

/** Datos de cobro del colegio: QR de Yape/Plin e instrucciones. */
export const SchoolPaymentInfo: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { data } = usePaymentInstructions();
  const { data: qrUrl } = useResolvedFileUrl(data?.paymentQrFileUrl);
  if (!data?.paymentQrFileUrl && !data?.paymentInstructions) {
    return <p className="text-xs text-muted-foreground">El colegio aún no publica sus datos de Yape, Plin o cuentas bancarias. Consulta en secretaría.</p>;
  }
  return (
    <div className={cn('flex gap-4', compact ? 'items-start' : 'flex-col items-center text-center sm:flex-row sm:text-left')}>
      {qrUrl && <img src={qrUrl} alt="Código QR de pago del colegio" className={cn('shrink-0 rounded-lg border border-border bg-white object-contain p-1', compact ? 'h-24 w-24' : 'h-40 w-40')} />}
      {data.paymentInstructions && <p className="min-w-0 flex-1 whitespace-pre-line text-sm text-foreground">{data.paymentInstructions}</p>}
    </div>
  );
};

export const ReportPaymentModal: React.FC<{ obligation: ReportableObligation | null; onClose: () => void }> = ({ obligation, onClose }) => {
  const upload = useUploadVoucher();
  const report = useReportPayment();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ amount: '', method: 'YAPE' as ReportMethod, operationNumber: '', paidOn: getPeruToday(), note: '' });
  const [voucher, setVoucher] = useState<{ url: string; name: string; preview?: string } | null>(null);

  useEffect(() => {
    if (obligation) {
      setForm({ amount: obligation.balance.toFixed(2), method: 'YAPE', operationNumber: '', paidOn: getPeruToday(), note: '' });
      setVoucher(null);
    }
  }, [obligation]);

  const onFile = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return toast.error('La imagen supera 10 MB.');
    const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
    upload.mutate(
      { file, purpose: 'PAYMENT_VOUCHER' },
      {
        onSuccess: (r) => setVoucher({ url: r.url, name: r.fileName, preview }),
        onError: (e) => toast.error(apiErrorMessage(e)),
      },
    );
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!obligation) return;
    if (!voucher) return toast.error('Adjunta la captura del voucher.');
    report.mutate(
      {
        obligationId: obligation.id,
        amount: Number(form.amount),
        method: form.method,
        operationNumber: form.operationNumber,
        paidOn: form.paidOn,
        voucherFileUrl: voucher.url,
        note: form.note || undefined,
      },
      {
        onSuccess: () => {
          toast.success('¡Listo! Tesorería validará tu pago y te avisaremos.');
          onClose();
        },
        onError: (err) => toast.error(apiErrorMessage(err)),
      },
    );
  };

  return (
    <Modal
      open={Boolean(obligation)}
      onClose={onClose}
      title="Reportar pago"
      description={obligation ? `${obligation.title}${obligation.studentName ? ` · ${obligation.studentName}` : ''} · saldo S/ ${obligation.balance.toFixed(2)}` : undefined}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="report-payment-form" disabled={report.isPending || upload.isPending || !voucher} className="gap-2">
            {report.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Enviar a tesorería
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Smartphone className="h-3.5 w-3.5" aria-hidden /> 1. Paga al colegio
          </p>
          <SchoolPaymentInfo compact />
        </div>

        <form id="report-payment-form" onSubmit={submit} className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">2. Cuéntanos cómo pagaste</p>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {(Object.keys(METHOD_LABEL) as ReportMethod[]).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={form.method === m}
                onClick={() => setForm({ ...form, method: m })}
                className={cn('rounded-lg border px-2 py-2 text-xs font-semibold', form.method === m ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted')}
              >
                {METHOD_LABEL[m]}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <label className="text-xs text-muted-foreground">
              Monto pagado (S/)
              <Input type="number" step="0.01" min="0.01" max={obligation?.balance} required className="h-9" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </label>
            <label className="text-xs text-muted-foreground">
              Fecha del pago
              <Input type="date" required max={getPeruToday()} className="h-9" value={form.paidOn} onChange={(e) => setForm({ ...form, paidOn: e.target.value })} />
            </label>
            <label className="col-span-2 text-xs text-muted-foreground sm:col-span-1">
              N.° de operación
              <Input required minLength={4} maxLength={40} inputMode="numeric" className="h-9" placeholder="Ej.: 12345678" value={form.operationNumber} onChange={(e) => setForm({ ...form, operationNumber: e.target.value })} />
            </label>
          </div>

          <div>
            <p className="mb-1 text-xs text-muted-foreground">Captura del voucher</p>
            <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={cn('flex w-full items-center gap-3 rounded-xl border-2 border-dashed p-3 text-left text-sm', voucher ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-border hover:bg-muted/40')}
            >
              {upload.isPending ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
              ) : voucher?.preview ? (
                <img src={voucher.preview} alt="Vista previa del voucher" className="h-16 w-16 rounded-md object-cover" />
              ) : voucher ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-600" aria-hidden />
              ) : (
                <ImagePlus className="h-6 w-6 text-muted-foreground" aria-hidden />
              )}
              <span className="min-w-0">
                <span className="block font-medium text-foreground">{voucher ? 'Voucher adjunto' : 'Toca para subir la captura'}</span>
                <span className="block truncate text-xs text-muted-foreground">{voucher ? voucher.name : 'Foto o captura de Yape, Plin o del banco (JPG, PNG o PDF)'}</span>
              </span>
            </button>
          </div>
          <label className="block text-xs text-muted-foreground">
            Comentario (opcional)
            <Input className="h-9" maxLength={300} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </label>
        </form>
      </div>
    </Modal>
  );
};
