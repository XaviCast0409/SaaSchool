import React from 'react';
import { CheckCircle2, Clock, QrCode, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { formatPeruDateTime, formatPeruShortDate } from '@/lib/dateUtils';
import { METHOD_LABEL, useMyPaymentReports } from '../api/usePaymentReports';
import { SchoolPaymentInfo } from './ReportPaymentModal';

/** Para el apoderado: cómo pagar (QR del colegio) y el estado de sus pagos reportados. */
export const ParentPaymentReportsCard: React.FC = () => {
  const { data: reports = [] } = useMyPaymentReports(true);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-4">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
          <QrCode className="h-4 w-4 text-primary" aria-hidden /> Paga desde tu celular
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">Paga con Yape, Plin o transferencia y luego pulsa “Reportar pago” en la cuota. Tesorería lo valida y recibes tu recibo sin ir al colegio.</p>
        <SchoolPaymentInfo />
      </Card>
      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Mis pagos reportados</h2>
        {reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no has reportado pagos desde la app.</p>
        ) : (
          <ul className="divide-y divide-border">
            {reports.slice(0, 6).map((r) => (
              <li key={r.id} className="flex items-start gap-2.5 py-2 text-sm">
                {r.status === 'APPROVED' ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-label="Validado" />
                ) : r.status === 'REJECTED' ? (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-label="Rechazado" />
                ) : (
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-label="Por validar" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">
                    {r.obligation.title} · S/ {Number(r.amount).toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {METHOD_LABEL[r.method]} · op. {r.operationNumber} · pagado el {formatPeruShortDate(r.paidOn.slice(0, 10))}
                  </p>
                  <p className="text-xs">
                    {r.status === 'APPROVED' && <span className="text-emerald-700 dark:text-emerald-300">Validado{r.transaction?.receiptNumber ? ` · Recibo ${r.transaction.receiptNumber}` : ''}</span>}
                    {r.status === 'REJECTED' && <span className="text-destructive">No validado: {r.rejectionReason}</span>}
                    {r.status === 'PENDING' && <span className="text-amber-700 dark:text-amber-300">Por validar · enviado {formatPeruDateTime(r.createdAt)}</span>}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};
