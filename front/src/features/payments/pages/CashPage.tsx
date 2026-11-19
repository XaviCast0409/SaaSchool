import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Receipt, Wallet } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useFinanceAccess } from '../api/usePayments';
import { DailyCashCloseModal } from '../components/DailyCashCloseModal';
import { MyCash } from '../components/cash/MyCash';
import { SessionsHistory } from '../components/cash/SessionsHistory';

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
          <Link
            to="/payments"
            className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
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
        <SessionsHistory
          canView={can.view}
          canManage={can.manage}
          isAdmin={access.level === 'ADMIN'}
          userId={user?.id}
        />
      )}
      {!can.collect && !can.view && (
        <p className="text-sm text-muted-foreground">No tienes acceso a caja y tesorería.</p>
      )}

      {dailyOpen && <DailyCashCloseModal isOpen={dailyOpen} onClose={() => setDailyOpen(false)} />}
    </div>
  );
};
