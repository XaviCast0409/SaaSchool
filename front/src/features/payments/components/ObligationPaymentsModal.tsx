import React, { useState } from 'react';
import { Ban, FileText, History, Percent } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPeruDateTime, formatPeruShortDate } from '@/lib/dateUtils';
import { useCancelObligation, useObligationDetail, useVoidTransaction } from '../api/usePayments';
import { apiError } from '../api/useCash';
import { methodLabel, personName, type PaymentTransaction } from '../types';
import { ReasonDialog } from './ReasonDialog';
import { ReceiptModal } from './ReceiptModal';
import { AdjustmentDialog } from './AdjustmentDialog';
import { ADJUSTMENT_LABEL, useVoidAdjustment, type ObligationAdjustment } from '../api/useFinance';

interface Props {
  obligationId: string;
  canManage: boolean;
  onClose: () => void;
}

/**
 * Historial de cobros de una cuota: recibos vigentes y anulados (con motivo). Desde aquí el
 * tesorero anula un cobro o la cuota completa; nada se borra.
 */
export const ObligationPaymentsModal: React.FC<Props> = ({ obligationId, canManage, onClose }) => {
  const { data: obligation, isLoading } = useObligationDetail(obligationId);
  const voidTx = useVoidTransaction();
  const cancelOb = useCancelObligation();
  const [toVoid, setToVoid] = useState<PaymentTransaction | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjToVoid, setAdjToVoid] = useState<ObligationAdjustment | null>(null);
  const voidAdj = useVoidAdjustment();

  const active = obligation?.transactions ?? [];
  const voided = obligation?.voidedTransactions ?? [];
  const paid = active.reduce((s, t) => s + Number(t.amountPaid), 0);
  const balance = obligation ? Math.max(0, Number(obligation.amountDue) - paid) : 0;
  const rows = [...active, ...voided].sort((a, b) => a.paymentDate.localeCompare(b.paymentDate));
  const student = obligation?.enrollment?.student;
  const adjustments = obligation?.adjustments ?? [];
  const original = obligation ? Number(obligation.originalAmount ?? obligation.amountDue) : 0;

  return (
    <>
      <Modal
        open
        onClose={onClose}
        size="lg"
        title="Cobros y ajustes de la cuota"
        description={obligation ? `${obligation.title}${student ? ` — ${student.lastNamePaternal} ${student.lastNameMaternal}, ${student.firstNames}` : ''}` : undefined}
        footer={
          canManage && obligation && obligation.status !== 'CANCELLED' ? (
            <>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setAdjustOpen(true)}>
              <Percent className="h-3.5 w-3.5" /> Agregar ajuste
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-destructive"
              disabled={active.length > 0}
              title={active.length > 0 ? 'Primero anula los cobros vigentes' : undefined}
              onClick={() => setCancelOpen(true)}
            >
              <Ban className="h-3.5 w-3.5" /> Anular cuota
            </Button>
            </>
          ) : undefined
        }
      >
        {isLoading || !obligation ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
              <div className="rounded-lg border border-border p-2">
                <p className="text-[11px] text-muted-foreground">Monto original</p>
                <p className="font-bold">S/ {original.toFixed(2)}</p>
              </div>
              <div className="rounded-lg border border-border p-2">
                <p className="text-[11px] text-muted-foreground">Monto vigente</p>
                <p className="font-bold">S/ {Number(obligation.amountDue).toFixed(2)}</p>
              </div>
              <div className="rounded-lg border border-border p-2">
                <p className="text-[11px] text-muted-foreground">Pagado</p>
                <p className="font-bold text-emerald-600 dark:text-emerald-400">S/ {paid.toFixed(2)}</p>
              </div>
              <div className="rounded-lg border border-border p-2">
                <p className="text-[11px] text-muted-foreground">Saldo</p>
                <p className="font-bold text-amber-600 dark:text-amber-400">S/ {balance.toFixed(2)}</p>
              </div>
            </div>

            {obligation.status === 'CANCELLED' && (
              <p className="rounded-md border border-border bg-muted/40 p-2.5 text-xs">
                <strong>Cuota anulada</strong>
                {obligation.cancelledAt ? ` el ${formatPeruShortDate(obligation.cancelledAt)}` : ''}
                {obligation.cancelReason ? `. Motivo: ${obligation.cancelReason}` : ''}
              </p>
            )}

            {adjustments.length > 0 && (
              <section className="space-y-1.5">
                <h3 className="text-[11px] font-bold uppercase text-muted-foreground">Descuentos, becas, moras y notas de crédito</h3>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-xs">
                    <tbody>
                      {adjustments.map((a) => {
                        const voided = a.status === 'VOIDED';
                        const plus = a.type === 'LATE_FEE';
                        return (
                          <tr key={a.id} className={`border-t border-border first:border-t-0 align-top ${voided ? 'bg-destructive/5 text-muted-foreground' : ''}`}>
                            <td className="p-2 font-mono whitespace-nowrap">
                              <span className={voided ? 'line-through' : ''}>{a.number}</span>
                              {voided && <Badge variant="destructive" className="ml-1 text-[10px]">Anulado</Badge>}
                            </td>
                            <td className="p-2">
                              <span className="font-semibold text-foreground">{ADJUSTMENT_LABEL[a.type]}</span>
                              <span className="block text-[11px]">{a.reason}</span>
                              <span className="block text-[10px] text-muted-foreground">
                                {formatPeruDateTime(a.createdAt)} · {personName(a.createdBy)}
                                {voided ? ` · anulado por ${personName(a.voidedBy)}: ${a.voidReason}` : ''}
                              </span>
                            </td>
                            <td className={`p-2 text-right font-semibold whitespace-nowrap ${voided ? 'line-through' : plus ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}>
                              {plus ? '+' : '−'} S/ {Number(a.amount).toFixed(2)}
                            </td>
                            <td className="p-2 w-8">
                              {canManage && !voided && obligation.status !== 'CANCELLED' && (
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive" title="Anular ajuste" onClick={() => setAdjToVoid(a)}>
                                  <Ban className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {rows.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
                <History className="h-6 w-6" />
                Esta cuota todavía no tiene cobros.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
                    <tr>
                      <th className="p-2">Recibo</th>
                      <th className="p-2">Fecha</th>
                      <th className="p-2">Medio</th>
                      <th className="p-2">Cobró</th>
                      <th className="p-2 text-right">Monto</th>
                      <th className="p-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((t) => {
                      const isVoided = t.status === 'VOIDED';
                      return (
                        <React.Fragment key={t.id}>
                          <tr className={`border-t border-border ${isVoided ? 'bg-destructive/5 text-muted-foreground' : ''}`}>
                            <td className="p-2 font-mono">
                              <span className={isVoided ? 'line-through' : ''}>{t.receiptNumber ?? '—'}</span>
                              {isVoided && <Badge variant="destructive" className="ml-1.5 text-[10px]">Anulado</Badge>}
                            </td>
                            <td className="p-2">{formatPeruDateTime(t.paymentDate)}</td>
                            <td className="p-2">
                              {methodLabel(t.paymentMethod)}
                              {t.operationNumber && <span className="block font-mono text-[10px] text-muted-foreground">Op. {t.operationNumber}</span>}
                            </td>
                            <td className="p-2">{personName(t.collectedBy)}</td>
                            <td className={`p-2 text-right font-semibold ${isVoided ? 'line-through' : ''}`}>S/ {Number(t.amountPaid).toFixed(2)}</td>
                            <td className="p-2">
                              <div className="flex justify-end gap-1">
                                <Button size="sm" variant="ghost" className="h-7 px-2" title="Ver recibo" onClick={() => setReceiptId(t.id)}>
                                  <FileText className="h-3.5 w-3.5" />
                                </Button>
                                {canManage && !isVoided && (
                                  <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive" title="Anular cobro" onClick={() => setToVoid(t)}>
                                    <Ban className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                          {isVoided && (
                            <tr className="bg-destructive/5 text-[11px] text-muted-foreground">
                              <td colSpan={6} className="px-2 pb-2">
                                Anulado {t.voidedAt ? formatPeruDateTime(t.voidedAt) : ''} por {personName(t.voidedBy)} — Motivo: {t.voidReason}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ReasonDialog
        open={!!toVoid}
        title={`Anular recibo ${toVoid?.receiptNumber ?? ''}`}
        warning="El recibo no se borra: queda visible como ANULADO, con su número, y la cuota vuelve a tener saldo. Si la caja de ese cobro ya se cerró, el tesorero debe reabrirla primero."
        confirmLabel="Anular cobro"
        isPending={voidTx.isPending}
        onClose={() => setToVoid(null)}
        onConfirm={(reason) =>
          toVoid &&
          voidTx.mutate(
            { transactionId: toVoid.id, reason },
            {
              onSuccess: () => {
                toast.success('Cobro anulado. El recibo queda registrado como ANULADO.');
                setToVoid(null);
              },
              onError: (e) => toast.error(apiError(e, 'No se pudo anular el cobro.')),
            },
          )
        }
      />

      <ReasonDialog
        open={cancelOpen}
        title="Anular cuota"
        warning="La cuota deja de figurar como deuda, pero no se borra: queda como Anulada con tu motivo."
        confirmLabel="Anular cuota"
        isPending={cancelOb.isPending}
        onClose={() => setCancelOpen(false)}
        onConfirm={(reason) =>
          cancelOb.mutate(
            { obligationId, reason },
            {
              onSuccess: () => {
                toast.success('Cuota anulada.');
                setCancelOpen(false);
                onClose();
              },
              onError: (e) => toast.error(apiError(e, 'No se pudo anular la cuota.')),
            },
          )
        }
      />

      {receiptId && <ReceiptModal transactionId={receiptId} onClose={() => setReceiptId(null)} />}

      {obligation && (
        <AdjustmentDialog
          open={adjustOpen}
          obligationId={obligation.id}
          originalAmount={original}
          currentDue={Number(obligation.amountDue)}
          paid={paid}
          onClose={() => setAdjustOpen(false)}
        />
      )}

      <ReasonDialog
        open={!!adjToVoid}
        title={`Anular ajuste ${adjToVoid?.number ?? ''}`}
        warning="El ajuste no se borra: queda como ANULADO y la cuota vuelve al monto anterior."
        confirmLabel="Anular ajuste"
        isPending={voidAdj.isPending}
        onClose={() => setAdjToVoid(null)}
        onConfirm={(reason) =>
          adjToVoid &&
          voidAdj.mutate(
            { id: adjToVoid.id, reason },
            {
              onSuccess: () => {
                toast.success('Ajuste anulado.');
                setAdjToVoid(null);
              },
              onError: (e) => toast.error(apiError(e, 'No se pudo anular el ajuste.')),
            },
          )
        }
      />
    </>
  );
};
