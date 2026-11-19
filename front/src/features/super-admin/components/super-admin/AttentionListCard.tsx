import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Sparkles, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SchoolWithStats } from '../../types';
import { AttentionReason } from '../../constants';

interface AttentionListCardProps {
  attentionSchools: Array<{ school: SchoolWithStats; reasons: AttentionReason[] }>;
  onSelectPayments: (school: SchoolWithStats) => void;
  onSelectPlan: (school: SchoolWithStats) => void;
}

export const AttentionListCard: React.FC<AttentionListCardProps> = ({
  attentionSchools,
  onSelectPayments,
  onSelectPlan,
}) => {
  if (attentionSchools.length === 0) return null;

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Requiere atención
          <Badge variant="secondary" className="text-xs">
            {attentionSchools.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-border">
          {attentionSchools.map(({ school, reasons }) => (
            <li
              key={school.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-6 py-3"
            >
              <div className="min-w-0 space-y-1">
                <Link
                  to={`/super-admin/schools/${school.id}`}
                  className="block text-sm font-semibold text-foreground truncate hover:text-primary hover:underline"
                >
                  {school.name}
                </Link>
                <div className="flex flex-wrap gap-1.5">
                  {reasons.map((r) => (
                    <Badge
                      key={r.label}
                      variant={r.tone === 'danger' ? 'destructive' : r.tone === 'warn' ? 'warning' : 'secondary'}
                      className="text-xs whitespace-nowrap"
                    >
                      {r.label}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  onClick={() => onSelectPayments(school)}
                >
                  <Wallet className="w-3.5 h-3.5 text-primary" />
                  Registrar pago
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs gap-1"
                  onClick={() => onSelectPlan(school)}
                >
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Plan
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};
