import React, { useState } from 'react';
import { X, Printer, Calendar, Receipt, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useDailyCashClose } from '../api/usePayments';
import { formatPeruTime, getPeruToday } from '@/lib/dateUtils';
import { PrintPortal, usePrint } from '@/lib/print';
import { personName, type DailyCashCloseData } from '../types';
import { ExpensesList, MethodTotals, PaymentsList, soles } from './CashMovements';

interface DailyCashCloseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// "Hoy" según la hora peruana, aunque la computadora tenga otra zona horaria
const getTodayLocal = (): string => getPeruToday();

const SESSION_STATUS: Record<string, { label: string; variant: 'success' | 'warning' | 'secondary' }> = {
  OPEN: { label: 'Abierta', variant: 'warning' },
  CLOSED: { label: 'Cerrada', variant: 'secondary' },
  REVIEWED: { label: 'Revisada', variant: 'success' },
};

/** Resumen del día de todas las cajas: cobros por medio, anulados, egresos y estado de cada caja. */
export const DailyCashCloseDocument: React.FC<{
  data: DailyCashCloseData;
  selectedDate: string;
  isPrint?: boolean;
}> = ({ data, selectedDate, isPrint }) => {
  return (
    <div className={isPrint ? 'p-6 space-y-5 text-black bg-white max-w-4xl mx-auto' : 'space-y-5'}>
      {isPrint && (
        <div className="border-b-2 border-black pb-3 text-center space-y-1">
          <h1 className="text-xl font-black uppercase text-black">Resumen de caja del día</h1>
          <p className="text-xs text-gray-700">
            Fecha: <strong>{selectedDate}</strong>
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-primary/20 bg-primary/10 p-3">
          <p className="text-[11px] font-bold uppercase text-primary">Total cobrado</p>
          <p className="text-xl font-black text-foreground">{soles(data.totalCollected)}</p>
          <p className="text-[11px] text-muted-foreground">{data.transactionsCount} cobros vigentes</p>
        </div>
        <div className="rounded-xl border border-border p-3">
          <p className="text-[11px] font-bold uppercase text-muted-foreground">Egresos (caja chica)</p>
          <p className="text-xl font-black text-foreground">{soles(data.expensesTotal)}</p>
          <p className="text-[11px] text-muted-foreground">{data.expensesCount} egresos</p>
        </div>
        <div className="rounded-xl border border-border p-3">
          <p className="text-[11px] font-bold uppercase text-muted-foreground">Efectivo neto</p>
          <p className="text-xl font-black text-foreground">{soles(data.netCash)}</p>
          <p className="text-[11px] text-muted-foreground">Efectivo − egresos (sin fondos)</p>
        </div>
        <div className="rounded-xl border border-border p-3">
          <p className="text-[11px] font-bold uppercase text-muted-foreground">Recibos anulados</p>
          <p className="text-xl font-black text-foreground">{data.voidedCount}</p>
          <p className="text-[11px] text-muted-foreground">No suman al total</p>
        </div>
      </div>

      <MethodTotals byMethod={data.byMethod} countByMethod={data.countByMethod} />

      <section className="space-y-2">
        <h3 className="text-xs font-bold uppercase text-muted-foreground">Cajas del día</h3>
        {data.sessions.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nadie abrió caja este día.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
                <tr>
                  <th className="p-2">Cajero</th>
                  <th className="p-2">Apertura</th>
                  <th className="p-2">Cierre</th>
                  <th className="p-2 text-right">Esperado</th>
                  <th className="p-2 text-right">Contado</th>
                  <th className="p-2 text-right">Diferencia</th>
                  <th className="p-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {data.sessions.map((s) => {
                  const diff = s.difference == null ? null : Number(s.difference);
                  return (
                    <tr key={s.id} className="border-t border-border">
                      <td className="p-2">{personName(s.cashier)}</td>
                      <td className="p-2">{formatPeruTime(s.openedAt)}</td>
                      <td className="p-2">{s.closedAt ? formatPeruTime(s.closedAt) : '—'}</td>
                      <td className="p-2 text-right">{s.expectedCash == null ? '—' : soles(s.expectedCash)}</td>
                      <td className="p-2 text-right">{s.countedCash == null ? '—' : soles(s.countedCash)}</td>
                      <td className={`p-2 text-right font-semibold ${diff ? 'text-destructive' : ''}`}>
                        {diff == null ? '—' : diff === 0 ? 'Cuadrada' : soles(diff)}
                      </td>
                      <td className="p-2">
                        <Badge variant={SESSION_STATUS[s.status].variant}>{SESSION_STATUS[s.status].label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-bold uppercase text-muted-foreground">Cobros</h3>
        <PaymentsList transactions={data.transactions} showCashier />
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-bold uppercase text-muted-foreground">Egresos de caja chica</h3>
        <ExpensesList expenses={data.expenses} />
      </section>
    </div>
  );
};

export const DailyCashCloseModal: React.FC<DailyCashCloseModalProps> = ({ isOpen, onClose }) => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayLocal);

  React.useEffect(() => {
    if (isOpen) {
      setSelectedDate(getTodayLocal());
    }
  }, [isOpen]);

  const { data, isLoading, refetch, isFetching } = useDailyCashClose(selectedDate);

  const { print, isPrinting } = usePrint({
    pageSize: 'A4 portrait',
    margin: '10mm',
    title: `Cierre_Caja_${selectedDate}`,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-3xl rounded-2xl border border-border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-foreground">
                Resumen del día (todas las cajas)
              </h2>
              <p className="text-xs text-muted-foreground">
                Cobros por medio de pago, egresos, anulados y estado de cada caja
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={print}
              disabled={isPrinting || isLoading || !data}
              className="gap-1.5 text-xs font-bold"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Imprimir</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full h-8 w-8 hover:bg-muted"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {/* Barra de Filtro de Fecha */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-muted/30 border border-border rounded-xl">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-foreground">Fecha:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs font-semibold bg-background border border-border rounded-lg px-2.5 py-1.5 text-foreground focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
              </div>
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
          ) : data ? (
            <DailyCashCloseDocument data={data} selectedDate={selectedDate} />
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-border bg-muted/20">
          <Button variant="outline" onClick={onClose} className="text-xs font-bold">
            Cerrar
          </Button>
        </div>
      </div>

      {isPrinting && data && (
        <PrintPortal>
          <DailyCashCloseDocument data={data} selectedDate={selectedDate} isPrint />
        </PrintPortal>
      )}
    </div>
  );
};

