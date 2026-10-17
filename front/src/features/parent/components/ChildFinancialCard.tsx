import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ActiveEnrollmentInfo } from '../types';

interface ChildFinancialCardProps {
  enrollment: ActiveEnrollmentInfo | null;
}

export const ChildFinancialCard: React.FC<ChildFinancialCardProps> = ({ enrollment }) => {
  const navigate = useNavigate();
  const fin = enrollment?.financialSummary;

  const hasPending = fin?.hasPending ?? false;
  const totalPending = fin?.totalPendingAmount ?? 0;

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border/80 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground">Pensiones y Pagos</h3>
            <span className="text-[11px] text-muted-foreground">Control financiero escolar</span>
          </div>
        </div>

        <Badge
          variant="outline"
          className={`text-xs px-2.5 py-1 font-bold ${
            !hasPending
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
              : 'bg-destructive/15 text-destructive border-destructive/30'
          }`}
        >
          {!hasPending ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              <span>Al Día</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
              <span>{fin?.pendingCount} Pendiente{fin?.pendingCount && fin.pendingCount > 1 ? 's' : ''}</span>
            </>
          )}
        </Badge>
      </div>

      {/* Amount Display */}
      <div className="p-4 rounded-xl bg-secondary/30 border border-border/40 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
            {!hasPending ? 'Estado de Cuenta' : 'Total Pendiente por Pagar'}
          </span>
          <span
            className={`text-xl font-extrabold tracking-tight mt-0.5 block ${
              !hasPending ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
            }`}
          >
            {!hasPending ? 'Sin deudas registradas' : `S/ ${totalPending.toFixed(2)}`}
          </span>
        </div>

        {hasPending && fin?.nextDueDate && (
          <div className="text-right">
            <span className="text-[10px] text-muted-foreground block">Próximo Vencimiento</span>
            <span className="text-xs font-bold text-destructive block">
              {new Date(fin.nextDueDate).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
            </span>
          </div>
        )}
      </div>

      {/* Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/payments')}
        className="w-full justify-between text-xs h-9 rounded-xl hover:bg-secondary/70 text-foreground"
      >
        <span>Ver cronograma de pagos y boletas</span>
        <ArrowRight className="w-4 h-4 text-primary" />
      </Button>
    </div>
  );
};
