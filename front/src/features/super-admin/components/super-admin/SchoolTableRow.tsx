import React from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  CheckCircle2,
  ExternalLink,
  Key,
  Pencil,
  Power,
  RotateCcw,
  Sparkles,
  Wallet,
  XCircle,
} from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatPeruShortDate } from '@/lib/dateUtils';
import { formatMoney } from '@/lib/format';
import { SchoolWithStats } from '../../types';
import { QUOTA_WARN_PERCENT } from '../../constants';
import { timeAgo } from '../../utils/superAdminFormat';
import { PlanStatusBadge } from './PlanStatusBadge';

const SchoolIdentityCell: React.FC<{ item: SchoolWithStats }> = ({ item }) => (
  <TableCell>
    <div>
      <div className="font-bold text-foreground text-sm flex items-center gap-2">
        {item.logoUrl ? (
          <img src={item.logoUrl} alt={item.name} className="w-5 h-5 object-contain rounded" />
        ) : (
          <Building2 className="w-4 h-4 text-primary" />
        )}
        <Link to={`/super-admin/schools/${item.id}`} className="hover:text-primary hover:underline">
          {item.name}
        </Link>
      </div>
      <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5 font-mono">
        <span>RUC: {item.documentId}</span>
        {item.phone && <span>• Tel: {item.phone}</span>}
      </div>
    </div>
  </TableCell>
);

const SchoolPlanCell: React.FC<{
  item: SchoolWithStats;
  feeOf: (s: SchoolWithStats) => number;
  listPrice: (plan: string) => number;
}> = ({ item, feeOf, listPrice }) => {
  const badgeVariant = item.plan === 'PRO' ? 'default' : item.plan === 'ENTERPRISE' ? 'success' : 'secondary';
  return (
    <TableCell>
      <Badge variant={badgeVariant} className="font-bold text-xs whitespace-nowrap">
        {item.plan} ({formatMoney(feeOf(item))}/mes)
      </Badge>
      {item.monthlyFee != null && (
        <div className="text-xs text-muted-foreground mt-0.5">
          Precio pactado · lista {formatMoney(listPrice(item.plan))}
        </div>
      )}
    </TableCell>
  );
};

const SchoolQuotaCell: React.FC<{
  item: SchoolWithStats;
  quota: number | null | undefined;
  pct: number | null;
}> = ({ item, quota, pct }) => {
  const quotaLabel = quota === null ? '∞' : (quota ?? '—');
  const barColor = pct !== null && pct >= 100 ? 'bg-destructive' : pct !== null && pct >= QUOTA_WARN_PERCENT ? 'bg-amber-500' : 'bg-primary';

  return (
    <TableCell>
      <div className="space-y-0.5">
        <div className="text-xs font-medium text-foreground">
          <strong>{item._count?.students || 0}</strong>
          <span className="text-muted-foreground text-xs"> /{quotaLabel} alumnos</span>
        </div>
        {pct !== null && (
          <div
            className="h-1.5 w-24 rounded-full bg-muted overflow-hidden"
            role="meter"
            aria-label="Uso del cupo de alumnos"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
        )}
        <div className="text-xs text-muted-foreground">{item._count?.users || 0} usuarios</div>
      </div>
    </TableCell>
  );
};

const SchoolStatusCell: React.FC<{ isActive: boolean }> = ({ isActive }) => (
  <TableCell>
    {isActive ? (
      <Badge variant="success" className="gap-1 text-xs">
        <CheckCircle2 className="w-3 h-3" />
        <span>Activo</span>
      </Badge>
    ) : (
      <Badge variant="destructive" className="gap-1 text-xs">
        <XCircle className="w-3 h-3" />
        <span>Suspendido</span>
      </Badge>
    )}
  </TableCell>
);

const SchoolActions: React.FC<{
  item: SchoolWithStats;
  onImpersonate: (school: SchoolWithStats) => void;
  onEditSchool: (school: SchoolWithStats) => void;
  onResetPassword: (school: SchoolWithStats) => void;
  onSelectPlan: (school: SchoolWithStats) => void;
  onSelectPayments: (school: SchoolWithStats) => void;
  onToggleStatus: (school: SchoolWithStats) => void;
  isDeactivating: boolean;
  isReactivating: boolean;
}> = ({
  item,
  onImpersonate,
  onEditSchool,
  onResetPassword,
  onSelectPlan,
  onSelectPayments,
  onToggleStatus,
  isDeactivating,
  isReactivating,
}) => (
  <TableCell className="text-right">
    <div className="flex items-center justify-end gap-1.5">
      <Button
        size="sm"
        variant="secondary"
        className="h-7 text-xs gap-1 border border-border hover:bg-primary hover:text-primary-foreground transition-colors"
        onClick={() => onImpersonate(item)}
      >
        <ExternalLink className="w-3.5 h-3.5" />
        <span>Ver Colegio</span>
      </Button>

      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onEditSchool(item)}>
        <Pencil className="w-3.5 h-3.5 text-primary" />
        <span>Editar</span>
      </Button>

      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onResetPassword(item)}>
        <Key className="w-3.5 h-3.5 text-amber-500" />
        <span>Clave</span>
      </Button>

      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onSelectPlan(item)}>
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        <span>Plan</span>
      </Button>

      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onSelectPayments(item)}>
        <Wallet className="w-3.5 h-3.5 text-primary" />
        <span>Cobros</span>
      </Button>

      <Button
        size="sm"
        variant={item.isActive ? 'ghost' : 'outline'}
        className={`h-7 text-xs gap-1 ${
          item.isActive
            ? 'text-destructive hover:bg-destructive/10'
            : 'text-emerald-600 hover:bg-emerald-500/10'
        }`}
        onClick={() => onToggleStatus(item)}
        disabled={isDeactivating || isReactivating}
      >
        {item.isActive ? <Power className="w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}
        <span>{item.isActive ? 'Suspender' : 'Reactivar'}</span>
      </Button>
    </div>
  </TableCell>
);

interface SchoolTableRowProps {
  item: SchoolWithStats;
  listPrice: (plan: string) => number;
  feeOf: (s: SchoolWithStats) => number;
  quotaOf: (s: SchoolWithStats) => number | null | undefined;
  quotaPercent: (s: SchoolWithStats) => number | null;
  onImpersonate: (school: SchoolWithStats) => void;
  onEditSchool: (school: SchoolWithStats) => void;
  onResetPassword: (school: SchoolWithStats) => void;
  onSelectPlan: (school: SchoolWithStats) => void;
  onSelectPayments: (school: SchoolWithStats) => void;
  onToggleStatus: (school: SchoolWithStats) => void;
  isDeactivating: boolean;
  isReactivating: boolean;
}

export const SchoolTableRow: React.FC<SchoolTableRowProps> = ({
  item,
  listPrice,
  feeOf,
  quotaOf,
  quotaPercent,
  onImpersonate,
  onEditSchool,
  onResetPassword,
  onSelectPlan,
  onSelectPayments,
  onToggleStatus,
  isDeactivating,
  isReactivating,
}) => {
  const isExpired = Boolean(item.planStatus) && item.planStatus?.access !== 'ACTIVE';

  return (
    <TableRow className="hover:bg-muted/30 transition-colors">
      <SchoolIdentityCell item={item} />
      <SchoolPlanCell item={item} feeOf={feeOf} listPrice={listPrice} />
      <SchoolQuotaCell item={item} quota={quotaOf(item)} pct={quotaPercent(item)} />
      <TableCell>
        <div className="space-y-0.5 whitespace-nowrap">
          <div className="text-xs text-foreground">
            {timeAgo(item.activity?.lastSeenAt) ?? <span className="text-muted-foreground">Sin actividad</span>}
          </div>
          <div className="text-xs text-muted-foreground">
            {item.activity?.active7d ?? 0} activos (7 d) · {item.activity?.active30d ?? 0} (30 d)
          </div>
        </div>
      </TableCell>
      <TableCell>
        {item.planExpiresAt ? (
          <div className="flex flex-col items-start gap-1">
            <span className={`text-xs ${isExpired ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
              {formatPeruShortDate(item.planExpiresAt)}
            </span>
            <PlanStatusBadge status={item.planStatus} />
          </div>
        ) : (
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">Mensual Indefinido</span>
        )}
        <div className="text-xs text-muted-foreground mt-1 whitespace-nowrap">
          {item.lastPaymentOn
            ? `Último pago ${formatPeruShortDate(item.lastPaymentOn)}`
            : 'Sin pagos registrados'}
        </div>
      </TableCell>
      <SchoolStatusCell isActive={item.isActive} />
      <SchoolActions
        item={item}
        onImpersonate={onImpersonate}
        onEditSchool={onEditSchool}
        onResetPassword={onResetPassword}
        onSelectPlan={onSelectPlan}
        onSelectPayments={onSelectPayments}
        onToggleStatus={onToggleStatus}
        isDeactivating={isDeactivating}
        isReactivating={isReactivating}
      />
    </TableRow>
  );
};
