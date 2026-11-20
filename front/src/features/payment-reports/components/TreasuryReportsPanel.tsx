import React, { useState } from 'react';
import { toast } from 'sonner';
import { Check, ChevronDown, Inbox, Loader2, Settings2, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatPeruDateTime, formatPeruShortDate } from '@/lib/dateUtils';
import { formatMoney } from '@/lib/format';
import { getApiErrorMessage } from '@/lib/errors';
import {
  METHOD_LABEL,
  useReviewReport,
  useTreasuryReports,
  type ReportStatus,
  type TreasuryReport,
} from '../api/usePaymentReports';
import { Voucher } from './treasury-reports/Voucher';
import { InstructionsEditor } from './treasury-reports/InstructionsEditor';

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
          toast.success(
            action === 'approve'
              ? `Pago validado${r?.receiptNumber ? ` · Recibo ${r.receiptNumber}` : ''}. Se avisó a la familia.`
              : 'Reporte rechazado. Se avisó a la familia.',
          );
          close();
        },
        onError: (e) => toast.error(getApiErrorMessage(e, 'Error al revisar reporte')),
      },
    );
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex flex-1 items-center gap-2 text-left"
          aria-expanded={open}
        >
          <Inbox className="h-4 w-4 text-primary" aria-hidden />
          <span className="text-sm font-semibold text-foreground">Pagos reportados por las familias</span>
          {pendingCount > 0 && (
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
              {pendingCount} por validar
            </span>
          )}
          <ChevronDown
            className={cn('ml-auto h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')}
            aria-hidden
          />
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
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={cn(
                  'rounded-md px-3 py-1 font-semibold',
                  status === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
                )}
              >
                {s === 'PENDING' ? 'Por validar' : s === 'APPROVED' ? 'Validados' : 'Rechazados'}
              </button>
            ))}
          </div>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : reports.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {status === 'PENDING' ? 'No hay pagos por validar. 🎉' : 'Sin registros.'}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {reports.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">
                      {r.student} <span className="text-xs font-normal text-muted-foreground">· {r.classroom}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.obligation.title} · <strong className="text-foreground">{formatMoney(r.amount)}</strong> por{' '}
                      {METHOD_LABEL[r.method]} · op. {r.operationNumber} · {formatPeruShortDate(r.paidOn.slice(0, 10))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Reportó {r.reportedBy} · {formatPeruDateTime(r.createdAt)}
                      {r.status !== 'PENDING' && r.reviewedBy ? ` · revisó ${r.reviewedBy}` : ''}
                      {r.receiptNumber ? ` · ${r.receiptNumber}` : ''}
                      {r.rejectionReason ? ` · motivo: ${r.rejectionReason}` : ''}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={r.status === 'PENDING' ? 'default' : 'outline'}
                    className="h-8 text-xs"
                    onClick={() => setSelected(r)}
                  >
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
        title={selected ? `${selected.student} · ${formatMoney(selected.amount)}` : ''}
        description={
          selected
            ? `${selected.obligation.title} · saldo actual ${formatMoney(selected.obligation.balance)}`
            : undefined
        }
        size="lg"
        footer={
          selected?.status === 'PENDING' && !readOnly ? (
            rejecting ? (
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setRejecting(false)}>
                  Volver
                </Button>
                <Button
                  variant="destructive"
                  disabled={reason.trim().length < 5 || review.isPending}
                  onClick={() => act('reject')}
                >
                  Rechazar y avisar
                </Button>
              </div>
            ) : (
              <div className="flex justify-end gap-2">
                <Button variant="outline" className="gap-1.5" onClick={() => setRejecting(true)}>
                  <X className="h-4 w-4" aria-hidden /> Rechazar
                </Button>
                <Button
                  className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
                  disabled={review.isPending}
                  onClick={() => act('approve')}
                >
                  {review.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Check className="h-4 w-4" aria-hidden />
                  )}{' '}
                  Validar y emitir recibo
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
                ['Monto', formatMoney(selected.amount)],
                [
                  'Reportó',
                  `${selected.reportedBy}${selected.reportedByPhone ? ` · ${selected.reportedByPhone}` : ''}`,
                ],
                ['Comentario', selected.note || '—'],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-muted-foreground">{k}</dt>
                  <dd className="font-medium text-foreground">{v}</dd>
                </div>
              ))}
              <p className="pt-2 text-xs text-muted-foreground">
                Verifica en tu app de Yape, Plin o del banco que el abono llegó con este número de operación antes de
                validar.
              </p>
            </dl>
            {rejecting && (
              <label className="text-xs text-muted-foreground sm:col-span-2">
                Motivo (lo verá la familia)
                <Textarea
                  rows={2}
                  maxLength={300}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ej.: no encontramos el abono con ese número de operación."
                />
              </label>
            )}
          </div>
        )}
      </Modal>
      <InstructionsEditor open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </Card>
  );
};
