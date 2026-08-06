import React from 'react';
import { Printer, X, FileCheck2, Building2 } from 'lucide-react';
import { useTransactionReceipt } from '../api/usePayments';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface ReceiptModalProps {
  transactionId: string;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ transactionId, onClose }) => {
  const { data: receipt, isLoading, isError } = useTransactionReceipt(transactionId);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4 bg-card shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-emerald-500" />
            <h2 className="font-bold text-base text-foreground leading-none">
              Comprobante de Pago
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Voucher Content */}
        {isLoading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : isError || !receipt ? (
          <div className="p-6 text-center text-sm text-destructive font-medium">
            Error al cargar la boleta/recibo.
          </div>
        ) : (
          <div className="p-6 space-y-4 print:p-0">
            {/* School Header Voucher */}
            <div className="text-center border-b border-dashed border-border pb-4 space-y-1">
              <div className="flex items-center justify-center gap-1.5 font-bold text-lg text-foreground">
                <Building2 className="w-5 h-5 text-primary" />
                <span>INSTITUCIÓN EDUCATIVA</span>
              </div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">
                {receipt.receiptHeader.receiptType}
              </p>
              <p className="text-sm font-mono font-bold text-primary">
                {receipt.receiptHeader.receiptNumber}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Fecha: {new Date(receipt.receiptHeader.paymentDate).toLocaleString('es-PE')}
              </p>
            </div>

            {/* Student Info */}
            <div className="space-y-1 bg-muted/30 p-3 rounded-lg border border-border/60 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground font-semibold">Estudiante:</span>
                <span className="font-bold text-foreground">{receipt.student.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-semibold">Documento/DNI:</span>
                <span className="font-mono text-foreground">{receipt.student.documentId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-semibold">Sección:</span>
                <span className="text-foreground">{receipt.student.classroom}</span>
              </div>
            </div>

            {/* Payment Details */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Concepto:</span>
                <span className="font-semibold text-foreground">{receipt.payment.title}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Método de Pago:</span>
                <span className="font-semibold text-foreground">{receipt.payment.paymentMethod}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">N° Operación:</span>
                <span className="font-mono text-foreground">{receipt.payment.operationNumber}</span>
              </div>

              {/* Amount Total */}
              <div className="flex justify-between items-center py-2 bg-emerald-500/10 px-3 rounded-lg border border-emerald-500/20 mt-3">
                <span className="font-bold text-sm text-foreground">TOTAL PAGADO:</span>
                <span className="font-extrabold text-lg text-emerald-600 dark:text-emerald-400">
                  S/ {receipt.payment.amountPaid.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-4 border-t border-border bg-card flex items-center justify-between shrink-0 print:hidden">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cerrar
          </Button>
          <Button size="sm" className="gap-2" onClick={handlePrint} disabled={isLoading || isError}>
            <Printer className="w-4 h-4" />
            <span>Imprimir Recibo</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
