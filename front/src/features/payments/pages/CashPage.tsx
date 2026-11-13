import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Lock, MinusCircle, Receipt, Unlock, Wallet } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPeruDateTime, getPeruToday } from '@/lib/dateUtils';
import { useFinanceAccess } from '../api/usePayments';
import { apiError, useCashiers, useCashSessions, useCurrentCash, useOpenCash, useVoidExpense, type CashSessionFilters } from '../api/useCash';
import { personName, type CashExpense, type CashSessionStatus } from '../types';
import { ExpensesList, MethodTotals, PaymentsList, soles } from '../components/CashMovements';
import { CashSessionDetailModal, CloseCashModal, DifferenceText, ExpenseModal, SESSION_STATUS } from '../components/CashDialogs';
import { DailyCashCloseModal } from '../components/DailyCashCloseModal';
import { ReasonDialog } from '../components/ReasonDialog';
import { ReceiptModal } from '../components/ReceiptModal';

const selectCls =
  'rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

const monthStart = () => `${getPeruToday().slice(0, 8)}01`;

/** Mi caja: apertura con fondo, cobros del turno, egresos y cierre con arqueo. */
const MyCash: React.FC<{ canManage: boolean }> = ({ canManage }) => {
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
            Antes de cobrar en efectivo, abre tu caja indicando el fondo inicial (sencillo para dar vuelto). Todo lo que cobres quedará a tu nombre.
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
              <Input type="number" step="0.01" min="0" value={fund} onChange={(e) => setFund(e.target.value)} placeholder="0.00" />
            </label>
            <label className="space-y-1 text-xs font-semibold">
              Nota (opcional)
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej: Fondo entregado por tesorería" />
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
                    onError: (e) => toast.error(apiError(e, 'No se pudo abrir la caja.')),
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
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ['Fondo inicial', soles(s.totals.openingAmount)],
            ['Cobrado en efectivo', soles(s.totals.byMethod.CASH)],
            ['Egresos', soles(s.totals.expensesTotal)],
            ['Efectivo esperado', soles(s.totals.expectedCash)],
          ].map(([label, value], i) => (
            <div key={label} className={`rounded-lg border p-3 ${i === 3 ? 'border-primary/30 bg-primary/5' : 'border-border'}`}>
              <p className="text-[11px] text-muted-foreground">{label}</p>
              <p className="text-lg font-bold">{value}</p>
            </div>
          ))}
        </div>
        <MethodTotals byMethod={s.totals.byMethod} countByMethod={s.totals.countByMethod} />
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
      <CloseCashModal open={closeOpen} sessionId={s.id} expectedCash={s.totals.expectedCash} onClose={() => setCloseOpen(false)} />
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
    </Card>
  );
};

/** Historial de cajas: todas (tesorería, contador, Dirección) o solo las propias (cajero). */
const SessionsHistory: React.FC<{ canView: boolean; canManage: boolean; isAdmin: boolean; userId?: string }> = ({
  canView,
  canManage,
  isAdmin,
  userId,
}) => {
  const [filters, setFilters] = useState<CashSessionFilters>({ startDate: monthStart(), endDate: getPeruToday() });
  const { data: sessions = [], isLoading } = useCashSessions(filters);
  const { data: cashiers = [] } = useCashiers(canView);
  const [detailId, setDetailId] = useState<string | null>(null);

  const totals = sessions.reduce(
    (acc, s) => {
      acc.collected += s.totals.totalCollected;
      acc.expenses += s.totals.expensesTotal;
      if (s.difference != null) acc.diff += Number(s.difference);
      return acc;
    },
    { collected: 0, expenses: 0, diff: 0 },
  );
  const pendingReview = sessions.filter((s) => s.status === 'CLOSED').length;

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">{canView ? 'Cierres de caja' : 'Mis cierres de caja'}</CardTitle>
          {canManage && pendingReview > 0 && <Badge variant="warning">{pendingReview} por revisar</Badge>}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="space-y-1 text-[11px] font-semibold text-muted-foreground">
            Desde
            <input type="date" className={`${selectCls} block`} value={filters.startDate ?? ''} onChange={(e) => setFilters({ ...filters, startDate: e.target.value || undefined })} />
          </label>
          <label className="space-y-1 text-[11px] font-semibold text-muted-foreground">
            Hasta
            <input type="date" className={`${selectCls} block`} value={filters.endDate ?? ''} onChange={(e) => setFilters({ ...filters, endDate: e.target.value || undefined })} />
          </label>
          {canView && (
            <label className="space-y-1 text-[11px] font-semibold text-muted-foreground">
              Cajero
              <select className={`${selectCls} block`} value={filters.cashierId ?? ''} onChange={(e) => setFilters({ ...filters, cashierId: e.target.value || undefined })}>
                <option value="">Todos</option>
                {cashiers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {personName(c)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="space-y-1 text-[11px] font-semibold text-muted-foreground">
            Estado
            <select
              className={`${selectCls} block`}
              value={filters.status ?? ''}
              onChange={(e) => setFilters({ ...filters, status: (e.target.value || undefined) as CashSessionStatus | undefined })}
            >
              <option value="">Todos</option>
              <option value="OPEN">Abierta</option>
              <option value="CLOSED">Cerrada (por revisar)</option>
              <option value="REVIEWED">Revisada</option>
            </select>
          </label>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : sessions.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No hay cajas en el rango elegido.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
                <tr>
                  <th className="p-2">Cajero</th>
                  <th className="p-2">Apertura</th>
                  <th className="p-2">Cierre</th>
                  <th className="p-2 text-right">Cobrado</th>
                  <th className="p-2 text-right">Egresos</th>
                  <th className="p-2 text-right">Esperado</th>
                  <th className="p-2 text-right">Contado</th>
                  <th className="p-2">Diferencia</th>
                  <th className="p-2">Estado</th>
                  <th className="p-2" />
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="p-2 whitespace-nowrap">{personName(s.cashier)}</td>
                    <td className="p-2 whitespace-nowrap">{formatPeruDateTime(s.openedAt)}</td>
                    <td className="p-2 whitespace-nowrap">{s.closedAt ? formatPeruDateTime(s.closedAt) : '—'}</td>
                    <td className="p-2 text-right">{soles(s.totals.totalCollected)}</td>
                    <td className="p-2 text-right">{soles(s.totals.expensesTotal)}</td>
                    <td className="p-2 text-right">{soles(s.status === 'OPEN' ? s.totals.expectedCash : s.expectedCash)}</td>
                    <td className="p-2 text-right">{s.countedCash == null ? '—' : soles(s.countedCash)}</td>
                    <td className="p-2 whitespace-nowrap">{s.status === 'OPEN' ? '—' : <DifferenceText value={s.difference} />}</td>
                    <td className="p-2">
                      <Badge variant={SESSION_STATUS[s.status].variant}>{SESSION_STATUS[s.status].label}</Badge>
                    </td>
                    <td className="p-2 text-right">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setDetailId(s.id)}>
                        Ver detalle
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-border bg-muted/30 font-semibold">
                <tr>
                  <td className="p-2" colSpan={3}>
                    Totales ({sessions.length} cajas)
                  </td>
                  <td className="p-2 text-right">{soles(totals.collected)}</td>
                  <td className="p-2 text-right">{soles(totals.expenses)}</td>
                  <td className="p-2" colSpan={2} />
                  <td className="p-2" colSpan={3}>
                    <DifferenceText value={Math.round(totals.diff * 100) / 100} />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </CardContent>
      {detailId && (
        <CashSessionDetailModal
          sessionId={detailId}
          canManage={canManage}
          isAdmin={isAdmin}
          currentUserId={userId}
          onClose={() => setDetailId(null)}
        />
      )}
    </Card>
  );
};

export const CashPage: React.FC = () => {
  const { user } = useAuthStore();
  const { data: access, isLoading } = useFinanceAccess();
  const [dailyOpen, setDailyOpen] = useState(false);

  if (isLoading || !access) return <Skeleton className="h-64 w-full rounded-xl" />;
  const { can } = access;

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-3 border-b border-border pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Link to="/payments" className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Pagos y cobranzas
          </Link>
          <div className="flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Caja diaria</h1>
            <Badge variant="outline">{access.label}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Apertura con fondo, cobros a nombre de cada cajero, egresos de caja chica y cierre con arqueo.
          </p>
        </div>
        {can.view && (
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setDailyOpen(true)}>
            <Receipt className="h-4 w-4 text-primary" /> Resumen del día
          </Button>
        )}
      </div>

      {can.collect && <MyCash canManage={can.manage} />}
      {(can.collect || can.view) && (
        <SessionsHistory canView={can.view} canManage={can.manage} isAdmin={access.level === 'ADMIN'} userId={user?.id} />
      )}
      {!can.collect && !can.view && <p className="text-sm text-muted-foreground">No tienes acceso a caja y tesorería.</p>}

      {dailyOpen && <DailyCashCloseModal isOpen={dailyOpen} onClose={() => setDailyOpen(false)} />}
    </div>
  );
};
