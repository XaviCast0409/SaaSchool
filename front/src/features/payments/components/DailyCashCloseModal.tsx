import React, { useState } from 'react';
import {
  X,
  Printer,
  Calendar,
  Banknote,
  Building2,
  CreditCard,
  Receipt,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useDailyCashClose } from '../api/usePayments';

interface DailyCashCloseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const getTodayLocal = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const DailyCashCloseModal: React.FC<DailyCashCloseModalProps> = ({ isOpen, onClose }) => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayLocal);

  React.useEffect(() => {
    if (isOpen) {
      setSelectedDate(getTodayLocal());
    }
  }, [isOpen]);

  const { data, isLoading, refetch, isFetching } = useDailyCashClose(selectedDate);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

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
                Arqueo de Caja Diario
              </h2>
              <p className="text-xs text-muted-foreground">
                Control de ingresos y balance por método de cobro
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
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
              <span className="text-xs font-bold text-foreground">Fecha del Arqueo:</span>
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
          ) : (
            <>
              {/* Tarjetas de Balance por Método */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {/* Total Recaudado */}
                <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-primary uppercase">
                    <span>Total Recaudado</span>
                    <Receipt className="w-4 h-4" />
                  </div>
                  <p className="text-xl sm:text-2xl font-black text-foreground">
                    S/ {(data?.totalCollected || 0).toFixed(2)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {data?.transactionsCount || 0} operaciones
                  </p>
                </div>

                {/* Efectivo */}
                <div className="p-4 rounded-xl bg-card border border-border space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                    <span>Efectivo</span>
                    <Banknote className="w-4 h-4" />
                  </div>
                  <p className="text-lg font-black text-foreground">
                    S/ {(data?.byMethod?.CASH || 0).toFixed(2)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Caja física</p>
                </div>

                {/* Transferencia */}
                <div className="p-4 rounded-xl bg-card border border-border space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">
                    <span>Transferencia</span>
                    <Building2 className="w-4 h-4" />
                  </div>
                  <p className="text-lg font-black text-foreground">
                    S/ {(data?.byMethod?.BANK_TRANSFER || 0).toFixed(2)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Bancos / Depósitos</p>
                </div>

                {/* Tarjeta */}
                <div className="p-4 rounded-xl bg-card border border-border space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-purple-600 dark:text-purple-400 uppercase">
                    <span>Tarjeta</span>
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <p className="text-lg font-black text-foreground">
                    S/ {(data?.byMethod?.CREDIT_CARD || 0).toFixed(2)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">POS / Débito / Crédito</p>
                </div>
              </div>

              {/* Detalle de Cobros / Transacciones */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Transacciones Registradas ({data?.transactions?.length || 0})
                  </h3>
                </div>

                {(!data?.transactions || data.transactions.length === 0) ? (
                  <div className="py-12 text-center border-2 border-dashed border-border rounded-xl bg-card p-6">
                    <Receipt className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-muted-foreground">
                      No se registraron cobros en la fecha seleccionada ({selectedDate}).
                    </p>
                  </div>
                ) : (
                  <div className="border border-border rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                          <tr>
                            <th className="p-2.5">Recibo / Código</th>
                            <th className="p-2.5">Estudiante / Aula</th>
                            <th className="p-2.5">Concepto</th>
                            <th className="p-2.5">Método</th>
                            <th className="p-2.5 text-right">Monto</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {data.transactions.map((tx) => {
                            const student = tx.obligation?.enrollment?.student;
                            const studentName = student
                              ? `${student.lastNamePaternal} ${student.firstNames}`
                              : '—';
                            const classroom = tx.obligation?.enrollment?.classroom;
                            const classroomLabel = classroom
                              ? `${classroom.grade}° "${classroom.section}"`
                              : '';

                            return (
                              <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                                <td className="p-2.5">
                                  <div className="font-mono font-bold text-foreground">
                                    {tx.receiptNumber || '—'}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground">
                                    {new Date(tx.paymentDate).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </div>
                                </td>
                                <td className="p-2.5">
                                  <div className="font-semibold text-foreground truncate max-w-[180px]">
                                    {studentName}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground">
                                    {classroomLabel}
                                  </div>
                                </td>
                                <td className="p-2.5">
                                  <div className="font-medium text-foreground">
                                    {tx.obligation?.title || 'Obligación'}
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0 font-bold uppercase tracking-wider">
                                      {tx.obligation?.concept || 'GENERAL'}
                                    </Badge>
                                  </div>
                                </td>
                                <td className="p-2.5">
                                  <Badge variant="outline" className="text-[10px]">
                                    {tx.paymentMethod === 'CASH'
                                      ? 'Efectivo'
                                      : tx.paymentMethod === 'BANK_TRANSFER'
                                      ? 'Transferencia'
                                      : 'Tarjeta'}
                                  </Badge>
                                </td>
                                <td className="p-2.5 text-right font-black text-foreground">
                                  S/ {tx.amountPaid.toFixed(2)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-border bg-muted/20">
          <Button variant="outline" onClick={onClose} className="text-xs font-bold">
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
};

