import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Check, ChevronDown, ExternalLink, ImagePlus, Inbox, Loader2, Settings2, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatPeruDateTime, formatPeruShortDate } from '@/lib/dateUtils';
import { apiErrorMessage } from '@/features/academic/api';
import { useResolvedFileUrl } from '@/features/course-contents/api/useResolvedFileUrl';
import {
  METHOD_LABEL,
  usePaymentInstructions,
  useReviewReport,
  useSavePaymentInstructions,
  useTreasuryReports,
  useUploadVoucher,
  type ReportStatus,
  type TreasuryReport,
} from '../api/usePaymentReports';

const Voucher: React.FC<{ url: string | null }> = ({ url }) => {
  const { data: resolved, isLoading } = useResolvedFileUrl(url);
  if (!url) return <div className="flex h-40 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">Sin voucher</div>;
  if (isLoading || !resolved) return <Skeleton className="h-40 w-full" />;
  return (
    <a href={resolved} target="_blank" rel="noreferrer" className="group relative block">
      <img src={resolved} alt="Voucher de pago" className="max-h-72 w-full rounded-lg border border-border bg-white object-contain" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
      <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded bg-background/90 px-1.5 py-0.5 text-[11px] text-foreground opacity-0 group-hover:opacity-100">
        Abrir <ExternalLink className="h-3 w-3" aria-hidden />
      </span>
    </a>
  );
};

/** Datos de cobro que ven las familias: QR de Yape/Plin e instrucciones. */
const InstructionsEditor: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
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
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button
            disabled={save.isPending}
            onClick={() => save.mutate({ paymentQrFileUrl: qr, paymentInstructions: text }, { onSuccess: () => (toast.success('Datos de cobro guardados'), onClose()), onError: (e) => toast.error(apiErrorMessage(e)) })}
          >
            Guardar
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          {qrPreview ? <img src={qrPreview} alt="QR de pago" className="h-24 w-24 rounded-lg border border-border bg-white object-contain p-1" /> : <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-muted text-[11px] text-muted-foreground">Sin QR</div>}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload.mutate({ file: f, purpose: 'SCHOOL_ASSET' }, { onSuccess: (r) => setQr(r.url), onError: (err) => toast.error(apiErrorMessage(err)) });
          }} />
          <div className="flex flex-col gap-1.5">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => fileRef.current?.click()} disabled={upload.isPending}>
              {upload.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" aria-hidden />} Subir QR de Yape/Plin
            </Button>
            {qr && <Button size="sm" variant="ghost" onClick={() => setQr(null)}>Quitar QR</Button>}
          </div>
        </div>
        <label className="block text-xs text-muted-foreground">
          Instrucciones
          <Textarea rows={6} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} placeholder={'Yape/Plin: 987 654 321 (Colegio Innova SAC)\nBCP soles: 191-1234567-0-12 · CCI 002-191-001234567012-55\nIndica en el concepto el nombre del alumno.'} />
        </label>
      </div>
    </Modal>
  );
};

/** Bandeja de tesorería: pagos reportados por las familias para validar. */
/** `readOnly`: el contador ve los vouchers pero no los valida ni cambia los datos de cobro. */
export const TreasuryReportsPanel: React.FC<{ readOnly?: boolean }> = ({ readOnly = false }) => {
  const [open, setOpen] = useState(true);
  const [status, setStatus] = useState<ReportStatus>('PENDING');
  const { data: reports = [], isLoading } = useTreasuryReports(status, true);
  const { data: pending = [] } = useTreasuryReports('PENDING', status !== 'PENDING');
  const pendingCount = status === 'PENDING' ? reports.length : pending.length;
  const review = useReviewReport();
  const [selected, setSelected] = useState<TreasuryReport | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);

  const close = () => {
    setSelected(null);
    setRejecting(false);
    setReason('');
  };
  const act = (action: 'approve' | 'reject') => {
    if (!selected) return;
    review.mutate(
      { id: selected.id, action, reason },
      {
        onSuccess: (r) => {
          toast.success(action === 'approve' ? `Pago validado${r?.receiptNumber ? ` · Recibo ${r.receiptNumber}` : ''}. Se avisó a la familia.` : 'Reporte rechazado. Se avisó a la familia.');
          close();
        },
        onError: (e) => toast.error(apiErrorMessage(e)),
      },
    );
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <button type="button" onClick={() => setOpen(!open)} className="flex flex-1 items-center gap-2 text-left" aria-expanded={open}>
          <Inbox className="h-4 w-4 text-primary" aria-hidden />
          <span className="text-sm font-semibold text-foreground">Pagos reportados por las familias</span>
          {pendingCount > 0 && <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white">{pendingCount} por validar</span>}
          <ChevronDown className={cn('ml-auto h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} aria-hidden />
        </button>
        {!readOnly && (
          <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs" onClick={() => setSettingsOpen(true)}>
            <Settings2 className="h-3.5 w-3.5" aria-hidden /> Datos de cobro (QR)
          </Button>
        )}
      </div>
      {open && (
        <div className="border-t border-border p-4">
          <div className="mb-3 inline-flex rounded-lg border border-border p-0.5 text-xs">
            {(['PENDING', 'APPROVED', 'REJECTED'] as ReportStatus[]).map((s) => (
              <button key={s} type="button" onClick={() => setStatus(s)} className={cn('rounded-md px-3 py-1 font-semibold', status === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>
                {s === 'PENDING' ? 'Por validar' : s === 'APPROVED' ? 'Validados' : 'Rechazados'}
              </button>
            ))}
          </div>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : reports.length === 0 ? (
            <p className="text-sm text-muted-foreground">{status === 'PENDING' ? 'No hay pagos por validar. 🎉' : 'Sin registros.'}</p>
          ) : (
            <ul className="divide-y divide-border">
              {reports.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">
                      {r.student} <span className="text-xs font-normal text-muted-foreground">· {r.classroom}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.obligation.title} · <strong className="text-foreground">S/ {r.amount.toFixed(2)}</strong> por {METHOD_LABEL[r.method]} · op. {r.operationNumber} · {formatPeruShortDate(r.paidOn.slice(0, 10))}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Reportó {r.reportedBy} · {formatPeruDateTime(r.createdAt)}
                      {r.status !== 'PENDING' && r.reviewedBy ? ` · revisó ${r.reviewedBy}` : ''}
                      {r.receiptNumber ? ` · ${r.receiptNumber}` : ''}
                      {r.rejectionReason ? ` · motivo: ${r.rejectionReason}` : ''}
                    </p>
                  </div>
                  <Button size="sm" variant={r.status === 'PENDING' ? 'default' : 'outline'} className="h-8 text-xs" onClick={() => setSelected(r)}>
                    {r.status === 'PENDING' ? 'Revisar' : 'Ver'}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Modal
        open={Boolean(selected)}
        onClose={close}
        title={selected ? `${selected.student} · S/ ${selected.amount.toFixed(2)}` : ''}
        description={selected ? `${selected.obligation.title} · saldo actual S/ ${selected.obligation.balance.toFixed(2)}` : undefined}
        size="lg"
        footer={
          selected?.status === 'PENDING' && !readOnly ? (
            rejecting ? (
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setRejecting(false)}>Volver</Button>
                <Button variant="destructive" disabled={reason.trim().length < 5 || review.isPending} onClick={() => act('reject')}>Rechazar y avisar</Button>
              </div>
            ) : (
              <div className="flex justify-end gap-2">
                <Button variant="outline" className="gap-1.5" onClick={() => setRejecting(true)}>
                  <X className="h-4 w-4" aria-hidden /> Rechazar
                </Button>
                <Button className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700" disabled={review.isPending} onClick={() => act('approve')}>
                  {review.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />} Validar y emitir recibo
                </Button>
              </div>
            )
          ) : undefined
        }
      >
        {selected && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Voucher url={selected.voucherFileUrl} />
            <dl className="space-y-1.5 text-sm">
              {[
                ['Medio', METHOD_LABEL[selected.method]],
                ['N.° de operación', selected.operationNumber],
                ['Fecha de pago', formatPeruShortDate(selected.paidOn.slice(0, 10))],
                ['Monto', `S/ ${selected.amount.toFixed(2)}`],
                ['Reportó', `${selected.reportedBy}${selected.reportedByPhone ? ` · ${selected.reportedByPhone}` : ''}`],
                ['Comentario', selected.note || '—'],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[11px] text-muted-foreground">{k}</dt>
                  <dd className="font-medium text-foreground">{v}</dd>
                </div>
              ))}
              <p className="pt-2 text-[11px] text-muted-foreground">Verifica en tu app de Yape, Plin o del banco que el abono llegó con este número de operación antes de validar.</p>
            </dl>
            {rejecting && (
              <label className="text-xs text-muted-foreground sm:col-span-2">
                Motivo (lo verá la familia)
                <Textarea rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej.: no encontramos el abono con ese número de operación." />
              </label>
            )}
          </div>
        )}
      </Modal>
      <InstructionsEditor open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </Card>
  );
};
