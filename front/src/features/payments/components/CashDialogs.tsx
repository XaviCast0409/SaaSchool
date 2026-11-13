import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, RotateCcw } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPeruDateTime } from '@/lib/dateUtils';
import {
  apiError,
  useCashSession,
  useCloseCash,
  useCreateExpense,
  useReopenCash,
  useReviewCash,
  useVoidExpense,
} from '../api/useCash';
import { EXPENSE_CATEGORY_LABEL, EXPENSE_DOCUMENT_LABEL, personName, type CashExpense, type CashSessionStatus } from '../types';
import { ExpensesList, MethodTotals, PaymentsList, soles } from './CashMovements';
import { ReasonDialog } from './ReasonDialog';
import { ReceiptModal } from './ReceiptModal';

const selectCls =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

export const SESSION_STATUS: Record<CashSessionStatus, { label: string; variant: 'success' | 'warning' | 'secondary' }> = {
  OPEN: { label: 'Abierta', variant: 'warning' },
  CLOSED: { label: 'Cerrada (por revisar)', variant: 'secondary' },
  REVIEWED: { label: 'Revisada', variant: 'success' },
};

/** Texto y color de una diferencia de arqueo. */
export const DifferenceText: React.FC<{ value: number | null | undefined }> = ({ value }) => {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  const v = Number(value);
  if (v === 0) return <span className="font-semibold text-emerald-600 dark:text-emerald-400">Cuadrada</span>;
  return (
    <span className="font-semibold text-destructive">
      {v > 0 ? 'Sobrante' : 'Faltante'} {soles(Math.abs(v))}
    </span>
  );
};

// ──────────────────────────────────────────────────────────────────
// Registrar egreso de caja chica
// ──────────────────────────────────────────────────────────────────
export const ExpenseModal: React.FC<{ open: boolean; availableCash: number; onClose: () => void }> = ({
  open,
  availableCash,
  onClose,
}) => {
  const create = useCreateExpense();
  const [form, setForm] = useState({ category: 'UTILES_OFICINA', description: '', amount: '', beneficiary: '', documentType: 'BOLETA', documentNumber: '' });
  useEffect(() => {
    if (open) setForm({ category: 'UTILES_OFICINA', description: '', amount: '', beneficiary: '', documentType: 'BOLETA', documentNumber: '' });
  }, [open]);
  const amount = Number(form.amount);
  const tooMuch = amount > availableCash;
  const valid = form.description.trim().length >= 3 && amount > 0 && !tooMuch;

  const submit = () =>
    create.mutate(
      {
        category: form.category,
        description: form.description.trim(),
        amount,
        beneficiary: form.beneficiary.trim() || undefined,
        documentType: form.documentType || undefined,
        documentNumber: form.documentNumber.trim() || undefined,
      },
      {
        onSuccess: (e) => {
          toast.success(`Egreso ${e.expenseNumber} registrado.`);
          onClose();
        },
        onError: (e) => toast.error(apiError(e, 'No se pudo registrar el egreso.')),
      },
    );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar egreso de caja chica"
      description={`Sale en efectivo de tu caja. Disponible: ${soles(availableCash)}`}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button size="sm" disabled={!valid} isLoading={create.isPending} onClick={submit}>
            Registrar egreso
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs font-semibold sm:col-span-2">
          Descripción
          <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ej: Compra de papel bond A4" />
        </label>
        <label className="space-y-1 text-xs font-semibold">
          Categoría
          <select className={selectCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {Object.entries(EXPENSE_CATEGORY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs font-semibold">
          Monto (S/)
          <Input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          {tooMuch && <span className="block font-normal text-destructive">Supera el efectivo disponible en tu caja.</span>}
        </label>
        <label className="space-y-1 text-xs font-semibold">
          Pagado a (opcional)
          <Input value={form.beneficiary} onChange={(e) => setForm({ ...form, beneficiary: e.target.value })} placeholder="Ej: Librería San Martín" />
        </label>
        <label className="space-y-1 text-xs font-semibold">
          Comprobante
          <select className={selectCls} value={form.documentType} onChange={(e) => setForm({ ...form, documentType: e.target.value })}>
            {Object.entries(EXPENSE_DOCUMENT_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        {form.documentType !== 'SIN_COMPROBANTE' && (
          <label className="space-y-1 text-xs font-semibold sm:col-span-2">
            N° de comprobante (opcional)
            <Input value={form.documentNumber} onChange={(e) => setForm({ ...form, documentNumber: e.target.value })} placeholder="Ej: B001-000123" />
          </label>
        )}
      </div>
    </Modal>
  );
};

// ──────────────────────────────────────────────────────────────────
// Cerrar caja con arqueo
// ──────────────────────────────────────────────────────────────────
export const CloseCashModal: React.FC<{
  open: boolean;
  sessionId: string;
  expectedCash: number;
  onClose: () => void;
}> = ({ open, sessionId, expectedCash, onClose }) => {
  const close = useCloseCash();
  const [counted, setCounted] = useState('');
  const [note, setNote] = useState('');
  useEffect(() => {
    if (open) {
      setCounted('');
      setNote('');
    }
  }, [open]);
  const hasValue = counted.trim() !== '' && Number(counted) >= 0;
  const diff = hasValue ? Math.round((Number(counted) - expectedCash) * 100) / 100 : null;

  const submit = () =>
    close.mutate(
      { id: sessionId, countedCash: Number(counted), closingNote: note.trim() || undefined },
      {
        onSuccess: (s) => {
          const d = Number(s.difference ?? 0);
          toast.success(d === 0 ? 'Caja cerrada y cuadrada.' : `Caja cerrada con ${d > 0 ? 'sobrante' : 'faltante'} de ${soles(Math.abs(d))}. Se avisó a tesorería.`);
          onClose();
        },
        onError: (e) => toast.error(apiError(e, 'No se pudo cerrar la caja.')),
      },
    );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cerrar caja (arqueo)"
      description="Cuenta el efectivo que tienes físicamente, incluido el fondo inicial."
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button size="sm" disabled={!hasValue || (diff !== 0 && note.trim().length < 5)} isLoading={close.isPending} onClick={submit}>
            Cerrar caja
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3 text-sm">
          <span className="text-muted-foreground">Efectivo esperado</span>
          <span className="font-bold">{soles(expectedCash)}</span>
        </div>
        <label className="block space-y-1 text-xs font-semibold">
          Efectivo contado (S/)
          <Input type="number" step="0.01" min="0" autoFocus value={counted} onChange={(e) => setCounted(e.target.value)} />
        </label>
        {diff !== null && (
          <div className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
            <span className="text-muted-foreground">Diferencia</span>
            <DifferenceText value={diff} />
          </div>
        )}
        <label className="block space-y-1 text-xs font-semibold">
          Observación {diff !== null && diff !== 0 ? '(obligatoria si hay diferencia)' : '(opcional)'}
          <textarea
            rows={2}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-normal"
            placeholder="Ej: Faltan S/ 2 de vuelto que se dio a un apoderado"
          />
        </label>
        <p className="text-[11px] text-muted-foreground">
          Después de cerrar ya no podrás cobrar en esta caja ni anular sus movimientos. Si hubo un error, el tesorero puede reabrirla.
        </p>
      </div>
    </Modal>
  );
};

// ──────────────────────────────────────────────────────────────────
// Detalle de una caja (para tesorería, contador y el propio cajero)
// ──────────────────────────────────────────────────────────────────
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
  const canReview = canManage && s?.status === 'CLOSED' && (!isOwn || isAdmin);
  const hasDiff = s?.difference != null && Number(s.difference) !== 0;

  return (
    <>
      <Modal
        open
        onClose={onClose}
        size="xl"
        title={s ? `Caja de ${personName(s.cashier)}` : 'Caja'}
        description={s ? `Abierta el ${formatPeruDateTime(s.openedAt)}${s.closedAt ? ` · Cerrada el ${formatPeruDateTime(s.closedAt)}` : ''}` : undefined}
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
                ['Fondo inicial', soles(s.openingAmount)],
                ['Cobrado (todos los medios)', soles(s.totals.totalCollected)],
                ['Egresos', soles(s.totals.expensesTotal)],
                ['Efectivo esperado', soles(s.status === 'OPEN' ? s.totals.expectedCash : s.expectedCash)],
                ['Efectivo contado', s.countedCash == null ? '—' : soles(s.countedCash)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-border p-2.5">
                  <p className="text-[11px] text-muted-foreground">{label}</p>
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
                {s.openingNote && <p><strong>Nota de apertura:</strong> {s.openingNote}</p>}
                {s.closingNote && <p><strong>Observación del cierre:</strong> {s.closingNote}</p>}
                {s.reviewNote && <p><strong>Observación de la revisión:</strong> {s.reviewNote}</p>}
              </div>
            )}

            <MethodTotals byMethod={s.totals.byMethod} countByMethod={s.totals.countByMethod} />

            <section className="space-y-2">
              <h3 className="text-xs font-bold uppercase text-muted-foreground">Cobros ({s.totals.paymentsCount} vigentes, {s.totals.voidedCount} anulados)</h3>
              <PaymentsList transactions={s.transactions} onOpenReceipt={setReceiptId} />
            </section>
            <section className="space-y-2">
              <h3 className="text-xs font-bold uppercase text-muted-foreground">Egresos de caja chica</h3>
              <ExpensesList expenses={s.expenses} onVoid={canManage && s.status === 'OPEN' ? setExpenseToVoid : undefined} />
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
                      placeholder={hasDiff ? 'Obligatorio: explica la diferencia (p. ej. faltante descontado al cajero)' : 'Observación (opcional)'}
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
                              onError: (e) => toast.error(apiError(e, 'No se pudo revisar el cierre.')),
                            },
                          )
                        }
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Marcar como revisada
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Otra persona (tesorería o Dirección) debe revisar tu propio cierre.</p>
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
              onError: (e) => toast.error(apiError(e, 'No se pudo reabrir la caja.')),
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
              onError: (e) => toast.error(apiError(e, 'No se pudo anular el egreso.')),
            },
          )
        }
      />

      {receiptId && <ReceiptModal transactionId={receiptId} onClose={() => setReceiptId(null)} />}
    </>
  );
};
