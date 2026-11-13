import React from 'react';
import { Printer, X, FileCheck2, Building2 } from 'lucide-react';
import { useTransactionReceipt } from '../api/usePayments';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPeruDateTime } from '@/lib/dateUtils';
import { PrintPortal, usePrint } from '@/lib/print';

interface ReceiptModalProps {
  transactionId: string;
  onClose: () => void;
}

interface ReceiptData {
  receiptHeader: {
    receiptType: string;
    receiptNumber: string;
    paymentDate: string;
    status?: 'ACTIVE' | 'VOIDED';
    collectedBy?: string | null;
  };
  voided?: { at: string | null; reason: string | null; by: string | null } | null;
  student: {
    fullName: string;
    documentId: string;
    classroom: string;
  };
  payment: {
    title: string;
    paymentMethod: string;
    paymentMethodLabel?: string;
    operationNumber: string;
    amountPaid: number;
  };
}

export const ReceiptDocument: React.FC<{ receipt: ReceiptData; isPrint?: boolean }> = ({
  receipt,
  isPrint,
}) => {
  return (
    <div className={isPrint ? 'max-w-[120mm] mx-auto p-6 space-y-4 text-black bg-white' : 'p-6 space-y-4'}>
      {receipt.voided && (
        <div className="rounded-lg border-2 border-destructive bg-destructive/10 p-3 text-center text-destructive">
          <p className="text-lg font-extrabold tracking-widest">ANULADO</p>
          <p className="text-[11px]">
            {receipt.voided.at ? formatPeruDateTime(receipt.voided.at) : ''}
            {receipt.voided.by ? ` · por ${receipt.voided.by}` : ''}
          </p>
          {receipt.voided.reason && <p className="mt-1 text-xs font-medium">Motivo: {receipt.voided.reason}</p>}
        </div>
      )}
      {/* School Header Voucher */}
      <div className="text-center border-b border-dashed border-border pb-4 space-y-1">
        <div className="flex items-center justify-center gap-1.5 font-bold text-lg text-foreground">
          <Building2 className="w-5 h-5 text-primary" />
          <span>INSTITUCIÓN EDUCATIVA</span>
        </div>
        <p className="text-xs text-muted-foreground uppercase font-semibold">
          {receipt.receiptHeader.receiptType === 'RECIBO_INTERNO'
            ? 'Recibo interno de pago'
            : receipt.receiptHeader.receiptType}
        </p>
        <p className="text-sm font-mono font-bold text-primary">
          {receipt.receiptHeader.receiptNumber}
        </p>
        <p className="text-[11px] text-muted-foreground">
          Fecha: {formatPeruDateTime(receipt.receiptHeader.paymentDate)}
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
          <span className="text-muted-foreground">Medio de pago:</span>
          <span className="font-semibold text-foreground">
            {receipt.payment.paymentMethodLabel ?? receipt.payment.paymentMethod}
          </span>
        </div>
        {receipt.receiptHeader.collectedBy && (
          <div className="flex justify-between py-1 border-b border-border/40">
            <span className="text-muted-foreground">Atendido por:</span>
            <span className="text-foreground">{receipt.receiptHeader.collectedBy}</span>
          </div>
        )}
        <div className="flex justify-between py-1 border-b border-border/40">
          <span className="text-muted-foreground">N° Operación:</span>
          <span className="font-mono text-foreground">{receipt.payment.operationNumber}</span>
        </div>

        {/* Amount Total */}
        <div className="flex justify-between items-center py-2 bg-emerald-500/10 px-3 rounded-lg border border-emerald-500/20 mt-3">
          <span className="font-bold text-sm text-foreground">TOTAL PAGADO:</span>
          <span className={`font-extrabold text-lg text-emerald-600 dark:text-emerald-400 ${receipt.voided ? 'line-through opacity-60' : ''}`}>
            S/ {Number(receipt.payment.amountPaid).toFixed(2)}
          </span>
        </div>
      </div>

      <p className="mt-4 text-center text-[10px] leading-snug text-muted-foreground">
        Documento interno de control de pagos. No es un comprobante de pago electrónico válido ante SUNAT.
      </p>
    </div>
  );
};

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ transactionId, onClose }) => {
  const { data: receipt, isLoading, isError } = useTransactionReceipt(transactionId);

  const { print, isPrinting } = usePrint({
    pageSize: 'A4 portrait',
    margin: '10mm',
    title: `Recibo_${receipt?.receiptHeader?.receiptNumber || 'Pago'}`,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4 bg-card shrink-0">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-emerald-500" />
            <h2 className="font-bold text-base text-foreground leading-none">
              Recibo Interno de Pago
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
            Error al cargar el recibo.
          </div>
        ) : (
          <ReceiptDocument receipt={receipt} />
        )}

        {/* Footer Actions */}
        <div className="p-4 border-t border-border bg-card flex items-center justify-between shrink-0">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cerrar
          </Button>
          <Button
            size="sm"
            className="gap-2"
            onClick={print}
            disabled={isPrinting || isLoading || isError || !receipt}
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Recibo</span>
          </Button>
        </div>
      </div>

      {isPrinting && receipt && (
        <PrintPortal>
          <ReceiptDocument receipt={receipt} isPrint />
        </PrintPortal>
      )}
    </div>
  );
};
