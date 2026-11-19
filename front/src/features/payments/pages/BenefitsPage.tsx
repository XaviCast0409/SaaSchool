import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, GraduationCap, Percent, Scale } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useFinanceAccess } from '../api/usePayments';
import { ScholarshipsTab } from '../components/benefits/ScholarshipsTab';
import { LateFeesTab } from '../components/benefits/LateFeesTab';

export const BenefitsPage: React.FC = () => {
  const { data: access, isLoading } = useFinanceAccess();
  const [tab, setTab] = useState<'becas' | 'moras'>('becas');
  if (isLoading || !access) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (!access.can.view && !access.can.manage) {
    return (
      <p className="text-sm text-muted-foreground">Solo tesorería, el contador y Dirección pueden ver becas y moras.</p>
    );
  }
  return (
    <div className="space-y-6 pb-8">
      <div className="border-b border-border pb-4">
        <Link
          to="/payments"
          className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Pagos y cobranzas
        </Link>
        <div className="flex items-center gap-2">
          <Percent className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Becas y moras</h1>
          <Badge variant="outline">{access.label}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Becas recurrentes por alumno y cálculo del interés moratorio, con trazabilidad de cada ajuste.
        </p>
      </div>
      <div className="inline-flex rounded-lg border border-border p-0.5 text-sm">
        <button
          type="button"
          onClick={() => setTab('becas')}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-semibold ${tab === 'becas' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
        >
          <GraduationCap className="h-4 w-4" /> Becas
        </button>
        <button
          type="button"
          onClick={() => setTab('moras')}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-semibold ${tab === 'moras' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
        >
          <Scale className="h-4 w-4" /> Moras
        </button>
      </div>
      {tab === 'becas' ? (
        <ScholarshipsTab canManage={access.can.manage} />
      ) : (
        <LateFeesTab canManage={access.can.manage} />
      )}
    </div>
  );
};
