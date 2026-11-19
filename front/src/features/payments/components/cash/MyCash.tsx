import React, { useState } from 'react';
import { toast } from 'sonner';
import { Lock, MinusCircle, Unlock, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPeruDateTime, getPeruToday } from '@/lib/dateUtils';
import { formatMoney } from '@/lib/format';
import { getApiErrorMessage } from '@/lib/errors';
import {
  useCurrentCash,
  useOpenCash,
  useVoidExpense,
} from '../../api/useCash';
import { type CashExpense } from '../../types';
import { ExpensesList, MethodTotals, PaymentsList } from '../CashMovements';
import { ReasonDialog } from '../ReasonDialog';
import { ReceiptModal } from '../ReceiptModal';
import { CloseCashModal } from './CloseCashModal';
import { DifferenceText } from './DifferenceText';
import { ExpenseModal } from './ExpenseModal';
import { SESSION_STATUS } from './constants';

/** Mi caja: apertura con fondo, cobros del turno, egresos y cierre con arqueo. */
export const MyCash: React.FC<{ canManage: boolean }> = ({ canManage }) => {
  const { data, isLoading } = useCurrentCash();
  const open = useOpenCash();
  const voidExpense = useVoidExpense();
  const [fund, setFund] = useState('');
  const [note, setNote] = useState('');
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [expenseToVoid, setExpenseToVoid] = useState<CashExpense | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);

  if (isLoading) return <Skeleton className="h-48 w-full rounded-xl" />;
  const s = data?.session;

  if (!s) {
    const last = data?.lastSession;
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Unlock className="h-4 w-4 text-primary" /> Abrir mi caja
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Antes de cobrar en efectivo, abre tu caja indicando el fondo inicial (sencillo para dar vuelto). Todo lo que
            cobres quedará a tu nombre.
          </p>
          {last && (
            <p className="text-xs text-muted-foreground">
              Tu última caja: abierta el {formatPeruDateTime(last.openedAt)} — {SESSION_STATUS[last.status].label}
              {last.status !== 'OPEN' && (
                <>
                  {' · '}
                  <DifferenceText value={last.difference} />
                </>
              )}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-[180px_1fr_auto] sm:items-end">
            <label className="space-y-1 text-xs font-semibold">
              Fondo inicial (S/)
              <Input
                type="number"
                step="0.01"
                min="0"
                value={fund}
                onChange={(e) => setFund(e.target.value)}
                placeholder="0.00"
              />
            </label>
            <label className="space-y-1 text-xs font-semibold">
              Nota (opcional)
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ej: Fondo entregado por tesorería"
              />
            </label>
            <Button
              isLoading={open.isPending}
              disabled={fund.trim() === '' || Number(fund) < 0}
              onClick={() =>
                open.mutate(
                  { openingAmount: Number(fund), openingNote: note.trim() || undefined },
                  {
                    onSuccess: () => {
                      toast.success('Caja abierta. Ya puedes cobrar.');
                      setFund('');
                      setNote('');
                    },
                    onError: (e) => toast.error(getApiErrorMessage(e, 'No se pudo abrir la caja.')),
                  },
                )
              }
            >
              Abrir caja
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const openedToday = getPeruToday(new Date(s.openedAt)) === getPeruToday();
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="h-4 w-4 text-primary" /> Mi caja <Badge variant="warning">Abierta</Badge>
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">Abierta el {formatPeruDateTime(s.openedAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setExpenseOpen(true)}>
            <MinusCircle className="h-3.5 w-3.5" /> Registrar egreso
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setCloseOpen(true)}>
            <Lock className="h-3.5 w-3.5" /> Cerrar caja
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!openedToday && (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-800 dark:text-amber-300">
            Esta caja se abrió otro día. Ciérrala y abre una nueva para que cada día tenga su propio arqueo.
          </p>
        )}
        {/* Arqueo ciego: mientras la caja está abierta no se muestra cuánto efectivo debería haber;
            se revela al cerrar, después de contar. */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ['Fondo inicial', formatMoney(s.totals.openingAmount)],
            ['Cobros en efectivo', `${s.totals.countByMethod?.CASH ?? 0} cobro(s)`],
            ['Egresos', formatMoney(s.totals.expensesTotal)],
            ['Efectivo esperado', 'Se muestra al cerrar'],
          ].map(([label, value], i) => (
            <div
              key={label}
              className={`rounded-lg border p-3 ${i === 3 ? 'border-primary/30 bg-primary/5' : 'border-border'}`}
            >
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={i === 3 ? 'text-sm font-semibold text-muted-foreground' : 'text-lg font-bold'}>{value}</p>
            </div>
          ))}
        </div>
        <MethodTotals byMethod={s.totals.byMethod} countByMethod={s.totals.countByMethod} hideCashTotal />
        <section className="space-y-2">
          <h3 className="text-xs font-bold uppercase text-muted-foreground">Mis cobros de este turno</h3>
          <PaymentsList transactions={s.transactions} onOpenReceipt={setReceiptId} />
        </section>
        <section className="space-y-2">
          <h3 className="text-xs font-bold uppercase text-muted-foreground">Egresos de caja chica</h3>
          <ExpensesList expenses={s.expenses} onVoid={canManage ? setExpenseToVoid : undefined} />
        </section>
      </CardContent>

      <ExpenseModal open={expenseOpen} availableCash={s.totals.expectedCash} onClose={() => setExpenseOpen(false)} />
      <CloseCashModal
        open={closeOpen}
        sessionId={s.id}
        expectedCash={s.totals.expectedCash}
        onClose={() => setCloseOpen(false)}
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
    </Card>
  );
};
