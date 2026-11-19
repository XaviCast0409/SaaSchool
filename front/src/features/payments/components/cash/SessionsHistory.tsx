import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPeruDateTime, getPeruToday } from '@/lib/dateUtils';
import { formatMoney } from '@/lib/format';
import {
  useCashiers,
  useCashSessions,
  type CashSessionFilters,
} from '../../api/useCash';
import { personName, type CashSessionStatus } from '../../types';
import { CashSessionDetailModal } from './CashSessionDetailModal';
import { DifferenceText } from './DifferenceText';
import { filterSelectCls as selectCls, monthStart, SESSION_STATUS } from './constants';

/** Historial de cajas: todas (tesorería, contador, Dirección) o solo las propias (cajero). */
export const SessionsHistory: React.FC<{
  canView: boolean;
  canManage: boolean;
  isAdmin: boolean;
  userId?: string;
}> = ({ canView, canManage, isAdmin, userId }) => {
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
          <label className="space-y-1 text-xs font-semibold text-muted-foreground">
            Desde
            <input
              type="date"
              className={`${selectCls} block`}
              value={filters.startDate ?? ''}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value || undefined })}
            />
          </label>
          <label className="space-y-1 text-xs font-semibold text-muted-foreground">
            Hasta
            <input
              type="date"
              className={`${selectCls} block`}
              value={filters.endDate ?? ''}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value || undefined })}
            />
          </label>
          {canView && (
            <label className="space-y-1 text-xs font-semibold text-muted-foreground">
              Cajero
              <select
                className={`${selectCls} block`}
                value={filters.cashierId ?? ''}
                onChange={(e) => setFilters({ ...filters, cashierId: e.target.value || undefined })}
              >
                <option value="">Todos</option>
                {cashiers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {personName(c)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="space-y-1 text-xs font-semibold text-muted-foreground">
            Estado
            <select
              className={`${selectCls} block`}
              value={filters.status ?? ''}
              onChange={(e) =>
                setFilters({ ...filters, status: (e.target.value || undefined) as CashSessionStatus | undefined })
              }
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
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
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
                    {/* Arqueo ciego: en la propia caja abierta no se muestran cobrado ni esperado */}
                    <td className="p-2 text-right">
                      {s.status === 'OPEN' && s.cashierId === userId ? '—' : formatMoney(s.totals.totalCollected)}
                    </td>
                    <td className="p-2 text-right">{formatMoney(s.totals.expensesTotal)}</td>
                    <td className="p-2 text-right">
                      {s.status === 'OPEN' && s.cashierId === userId
                        ? 'Al cerrar'
                        : formatMoney(s.status === 'OPEN' ? s.totals.expectedCash : s.expectedCash)}
                    </td>
                    <td className="p-2 text-right">{s.countedCash == null ? '—' : formatMoney(s.countedCash)}</td>
                    <td className="p-2 whitespace-nowrap">
                      {s.status === 'OPEN' ? '—' : <DifferenceText value={s.difference} />}
                    </td>
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
                  <td className="p-2 text-right">{formatMoney(totals.collected)}</td>
                  <td className="p-2 text-right">{formatMoney(totals.expenses)}</td>
                  <td className="p-2" colSpan={2} />
                  <td className="p-2" colSpan={3}>
                    {/* Mientras alguna caja siga abierta no hay arqueo total que mostrar. */}
                    {sessions.some((x) => x.difference == null) ? (
                      <span className="text-xs text-muted-foreground">
                        {sessions.filter((x) => x.difference == null).length} caja(s) sin cerrar
                      </span>
                    ) : (
                      <DifferenceText value={Math.round(totals.diff * 100) / 100} />
                    )}
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
