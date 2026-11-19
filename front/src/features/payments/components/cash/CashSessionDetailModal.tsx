import React, { useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, RotateCcw } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPeruDateTime } from '@/lib/dateUtils';
import { formatMoney } from '@/lib/format';
import { getApiErrorMessage } from '@/lib/errors';
import {
  useCashSession,
  useReopenCash,
  useReviewCash,
  useVoidExpense,
} from '../../api/useCash';
import { personName, type CashExpense } from '../../types';
import { ExpensesList, MethodTotals, PaymentsList } from '../CashMovements';
import { ReasonDialog } from '../ReasonDialog';
import { ReceiptModal } from '../ReceiptModal';
import { SESSION_STATUS } from './constants';
import { DifferenceText } from './DifferenceText';

export const CashSessionDetailModal: React.FC<{
  sessionId: string;
  canManage: boolean;
  currentUserId?: string;
  isAdmin: boolean;
  onClose: () => void;
}> = ({ sessionId, canManage, currentUserId, isAdmin, onClose }) => {
  const { data: s, isLoading } = useCashSession(sessionId);
  const review = useReviewCash();
  const reopen = useReopenCash();
  const voidExpense = useVoidExpense();
  const [reviewNote, setReviewNote] = useState('');
  const [reopenOpen, setReopenOpen] = useState(false);
  const [expenseToVoid, setExpenseToVoid] = useState<CashExpense | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);

  const isOwn = s?.cashierId === currentUserId;
  // Arqueo ciego: quien tiene su caja abierta no ve los totales hasta cerrarla
  const blind = isOwn && s?.status === 'OPEN';
  const canReview = canManage && s?.status === 'CLOSED' && (!isOwn || isAdmin);
  const hasDiff = s?.difference != null && Number(s.difference) !== 0;

  return (
    <>
      <Modal
        open
        onClose={onClose}
        size="xl"
        title={s ? `Caja de ${personName(s.cashier)}` : 'Caja'}
        description={
          s
            ? `Abierta el ${formatPeruDateTime(s.openedAt)}${s.closedAt ? ` · Cerrada el ${formatPeruDateTime(s.closedAt)}` : ''}`
            : undefined
        }
      >
        {isLoading || !s ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={SESSION_STATUS[s.status].variant}>{SESSION_STATUS[s.status].label}</Badge>
              {s.reopenCount > 0 && <Badge variant="outline">Reabierta {s.reopenCount} vez/veces</Badge>}
              {s.reviewedBy && (
                <span className="text-xs text-muted-foreground">
                  Revisada por {personName(s.reviewedBy)} el {s.reviewedAt ? formatPeruDateTime(s.reviewedAt) : ''}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {[
                ['Fondo inicial', formatMoney(s.openingAmount)],
                ['Cobrado (todos los medios)', blind ? 'Al cerrar' : formatMoney(s.totals.totalCollected)],
                ['Egresos', formatMoney(s.totals.expensesTotal)],
                [
                  'Efectivo esperado',
                  blind ? 'Al cerrar' : formatMoney(s.status === 'OPEN' ? s.totals.expectedCash : s.expectedCash),
                ],
                ['Efectivo contado', s.countedCash == null ? '—' : formatMoney(s.countedCash)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-border p-2.5">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-bold">{value}</p>
                </div>
              ))}
            </div>
            {s.status !== 'OPEN' && (
              <p className="text-sm">
                Diferencia de arqueo: <DifferenceText value={s.difference} />
              </p>
            )}

            {(s.openingNote || s.closingNote || s.reviewNote) && (
              <div className="space-y-1 rounded-lg border border-border bg-muted/30 p-3 text-xs">
                {s.openingNote && (
                  <p>
                    <strong>Nota de apertura:</strong> {s.openingNote}
                  </p>
                )}
                {s.closingNote && (
                  <p>
                    <strong>Observación del cierre:</strong> {s.closingNote}
                  </p>
                )}
                {s.reviewNote && (
                  <p>
                    <strong>Observación de la revisión:</strong> {s.reviewNote}
                  </p>
                )}
              </div>
            )}

            <MethodTotals byMethod={s.totals.byMethod} countByMethod={s.totals.countByMethod} hideCashTotal={blind} />

            <section className="space-y-2">
              <h3 className="text-xs font-bold uppercase text-muted-foreground">
                Cobros ({s.totals.paymentsCount} vigentes, {s.totals.voidedCount} anulados)
              </h3>
              <PaymentsList transactions={s.transactions} onOpenReceipt={setReceiptId} />
            </section>
            <section className="space-y-2">
              <h3 className="text-xs font-bold uppercase text-muted-foreground">Egresos de caja chica</h3>
              <ExpensesList
                expenses={s.expenses}
                onVoid={canManage && s.status === 'OPEN' ? setExpenseToVoid : undefined}
              />
            </section>

            {canManage && s.status === 'CLOSED' && (
              <div className="space-y-2 rounded-lg border border-border p-3">
                <h3 className="text-sm font-semibold">Revisión de tesorería</h3>
                {canReview ? (
                  <>
                    <textarea
                      rows={2}
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      placeholder={
                        hasDiff
                          ? 'Obligatorio: explica la diferencia (p. ej. faltante descontado al cajero)'
                          : 'Observación (opcional)'
                      }
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setReopenOpen(true)}>
                        <RotateCcw className="h-3.5 w-3.5" /> Reabrir caja
                      </Button>
                      <Button
                        size="sm"
                        className="gap-1.5"
                        disabled={hasDiff && reviewNote.trim().length < 3}
                        isLoading={review.isPending}
                        onClick={() =>
                          review.mutate(
                            { id: s.id, reviewNote: reviewNote.trim() || undefined },
                            {
                              onSuccess: () => toast.success('Cierre revisado. Esta caja ya no se puede modificar.'),
                              onError: (e) => toast.error(getApiErrorMessage(e, 'No se pudo revisar el cierre.')),
                            },
                          )
                        }
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Marcar como revisada
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Otra persona (tesorería o Dirección) debe revisar tu propio cierre.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      <ReasonDialog
        open={reopenOpen}
        title="Reabrir caja"
        warning="La caja vuelve a quedar abierta para corregir cobros o egresos; luego el cajero debe cerrarla de nuevo. El cierre anterior queda en la auditoría."
        confirmLabel="Reabrir"
        isPending={reopen.isPending}
        onClose={() => setReopenOpen(false)}
        onConfirm={(reason) =>
          reopen.mutate(
            { id: sessionId, reason },
            {
              onSuccess: () => {
                toast.success('Caja reabierta.');
                setReopenOpen(false);
              },
              onError: (e) => toast.error(getApiErrorMessage(e, 'No se pudo reabrir la caja.')),
            },
          )
        }
      />

      <ReasonDialog
        open={!!expenseToVoid}
        title={`Anular egreso ${expenseToVoid?.expenseNumber ?? ''}`}
        warning="El egreso no se borra: queda como ANULADO y el dinero vuelve a contar como efectivo de la caja."
        confirmLabel="Anular egreso"
        isPending={voidExpense.isPending}
        onClose={() => setExpenseToVoid(null)}
        onConfirm={(reason) =>
          expenseToVoid &&
          voidExpense.mutate(
            { id: expenseToVoid.id, reason },
            {
              onSuccess: () => {
                toast.success('Egreso anulado.');
                setExpenseToVoid(null);
              },
              onError: (e) => toast.error(getApiErrorMessage(e, 'No se pudo anular el egreso.')),
            },
          )
        }
      />

      {receiptId && <ReceiptModal transactionId={receiptId} onClose={() => setReceiptId(null)} />}
    </>
  );
};
