import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { useFinanceAccess } from '../api/usePayments';
import { TABS, type Tab } from '../components/finance-reports/constants';
import { StatementTab } from '../components/finance-reports/StatementTab';
import { CollectionsTab } from '../components/finance-reports/CollectionsTab';
import { AgingTab } from '../components/finance-reports/AgingTab';
import { MonthlyTab } from '../components/finance-reports/MonthlyTab';
import { AdjustmentsTab } from '../components/finance-reports/AdjustmentsTab';
import { ExpensesTab } from '../components/finance-reports/ExpensesTab';

export const FinanceReportsPage: React.FC = () => {
  const { data: access, isLoading } = useFinanceAccess();
  const [tab, setTab] = useState<Tab>('statement');
  if (isLoading || !access) return <Skeleton className="h-64 w-full rounded-xl" />;
  const canReports = access.can.view;
  const visible = TABS.filter(([k]) => canReports || k === 'statement');

  return (
    <div className="space-y-6 pb-8">
      <div className="border-b border-border pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/payments">
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Volver a Finanzas">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-foreground">
                <BarChart3 className="h-6 w-6 text-primary" /> Reportes contables y financieros
              </h1>
              <p className="text-xs text-muted-foreground">
                Estados de cuenta, libro de ingresos, morosidad acumulada, descuentos y resumen anual.
              </p>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-1">
          {visible.map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                tab === k
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6">
          {tab === 'statement' && <StatementTab />}
          {tab === 'collections' && <CollectionsTab />}
          {tab === 'aging' && <AgingTab />}
          {tab === 'monthly' && <MonthlyTab />}
          {tab === 'adjustments' && <AdjustmentsTab />}
          {tab === 'expenses' && <ExpensesTab />}
        </CardContent>
      </Card>
    </div>
  );
};
