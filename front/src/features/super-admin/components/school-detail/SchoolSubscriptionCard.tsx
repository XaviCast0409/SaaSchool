import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPeruShortDate } from '@/lib/dateUtils';
import { formatMoney } from '@/lib/format';
import { SchoolWithStats } from '../../types';
import { Row } from '../ui-bits';

interface SchoolSubscriptionCardProps {
  school: SchoolWithStats;
}

export const SchoolSubscriptionCard: React.FC<SchoolSubscriptionCardProps> = ({ school }) => {
  const status = school.planStatus;

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Plan y cobros</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <Row label="Mensualidad">
          {formatMoney(school.effectiveMonthlyFee ?? 0)}
          {school.monthlyFee != null && <span className="text-xs text-muted-foreground"> (pactada)</span>}
        </Row>
        <Row label="Vigente hasta">
          {school.planExpiresAt ? formatPeruShortDate(school.planExpiresAt) : 'Mensual indefinido'}
        </Row>
        {status?.access !== 'ACTIVE' && status && (
          <Row label="Vencido hace">
            <span className="text-destructive font-semibold">{status.daysOverdue} días</span>
          </Row>
        )}
        {status?.access === 'ACTIVE' && status.daysUntilExpiry !== null && (
          <Row label="Faltan">{status.daysUntilExpiry} días</Row>
        )}
        <Row label="Último pago">
          {school.lastPaymentOn ? formatPeruShortDate(school.lastPaymentOn) : 'Sin pagos registrados'}
        </Row>
      </CardContent>
    </Card>
  );
};
