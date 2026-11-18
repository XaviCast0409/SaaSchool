import { useUrlFilters } from '@/lib/useUrlFilters';
import { confirmDialog } from '@/components/ui/confirm';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Building2,
  Users,
  DollarSign,
  Plus,
  Sparkles,
  Search,
  CheckCircle2,
  XCircle,
  Power,
  RotateCcw,
  ExternalLink,
  Pencil,
  Key,
  Wallet,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';
import {
  useGetAllSchools,
  useDeactivateSchool,
  useReactivateSchool,
  usePlanCatalog,
  useBillingSummary,
} from '../api/useSuperAdmin';
import type { PlanStatus } from '@/features/schools/types';
import { SchoolWithStats } from '../types';
import { CreateSchoolModal } from '../components/CreateSchoolModal';
import { EditSchoolPlanModal } from '../components/EditSchoolPlanModal';
import { EditSchoolInfoModal } from '../components/EditSchoolInfoModal';
import { ResetAdminPasswordModal } from '../components/ResetAdminPasswordModal';
import { SubscriptionPaymentsModal } from '../components/SubscriptionPaymentsModal';
import { MfaSetupCard } from '../components/MfaSetupCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPeruShortDate } from '@/lib/dateUtils';

const formatSoles = (n: number) => n.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** Etiqueta del estado de vigencia del plan (gracia → solo lectura → sin acceso) */
const PlanStatusBadge: React.FC<{ status?: PlanStatus }> = ({ status }) => {
  if (!status) return null;
  const { access, daysUntilExpiry, daysOverdue } = status;
  if (access === 'ACTIVE') {
    if (daysUntilExpiry === null || daysUntilExpiry > 15) return null;
    return (
      <Badge
        variant="outline"
        className="text-xs whitespace-nowrap border-amber-500/40 text-amber-700 dark:text-amber-300"
      >
        {daysUntilExpiry === 0 ? 'Vence hoy' : `Vence en ${daysUntilExpiry} d`}
      </Badge>
    );
  }
  const label =
    access === 'GRACE'
      ? `En gracia · ${daysOverdue} d vencido`
      : access === 'READ_ONLY'
        ? `Solo lectura · ${daysOverdue} d vencido`
        : `Sin acceso · ${daysOverdue} d vencido`;
  return (
    <Badge variant={access === 'GRACE' ? 'outline' : 'destructive'} className="text-xs whitespace-nowrap">
      {label}
    </Badge>
  );
};

/** "hace 5 min", "hace 3 h", "hace 12 días" */
const timeAgo = (iso: string | null | undefined, now = Date.now()): string | null => {
  if (!iso) return null;
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (minutes < 60) return minutes <= 1 ? 'hace un momento' : `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return `hace ${days} ${days === 1 ? 'día' : 'días'}`;
};

const DAY_MS = 86_400_000;
/** Días sin actividad para considerar que un colegio se está enfriando */
const INACTIVE_DAYS = 14;
/** % del cupo de alumnos a partir del cual conviene ofrecer subir de plan */
const QUOTA_WARN_PERCENT = 90;
/** Días antes del vencimiento en que el colegio aparece en "Requiere atención" */
const EXPIRY_WARN_DAYS = 15;

type AttentionReason = { tone: 'danger' | 'warn' | 'info'; label: string };
const TONE_RANK: Record<AttentionReason['tone'], number> = { danger: 0, warn: 1, info: 2 };

export const SuperAdminPage: React.FC = () => {
  const navigate = useNavigate();
  const setImpersonatedSchool = useAuthStore((state) => state.setImpersonatedSchool);

  // Filtros en la URL: sobreviven a recargar, al botón Atrás y se pueden compartir como enlace
  const [urlFilters, setUrlFilters] = useUrlFilters({ q: '', plan: 'ALL' });
  const { q: searchTerm, plan: filterPlan } = urlFilters;
  const setSearchTerm = (value: string) => setUrlFilters({ q: value });
  const setFilterPlan = (value: string) => setUrlFilters({ plan: value });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedSchoolForPlan, setSelectedSchoolForPlan] = useState<SchoolWithStats | null>(null);
  const [selectedSchoolForEdit, setSelectedSchoolForEdit] = useState<SchoolWithStats | null>(null);
  const [selectedSchoolForReset, setSelectedSchoolForReset] = useState<SchoolWithStats | null>(null);
  const [selectedSchoolForPayments, setSelectedSchoolForPayments] = useState<SchoolWithStats | null>(null);

  const handleImpersonate = (school: SchoolWithStats) => {
    setImpersonatedSchool({
      id: school.id,
      name: school.name,
      logoUrl: school.logoUrl,
      plan: school.plan,
    });
    toast.info(`Accediendo en Modo Soporte a "${school.name}".`);
    navigate('/dashboard');
  };

  const { data: schools = [], isLoading } = useGetAllSchools();
  const { data: catalog } = usePlanCatalog();
  const listPrice = (plan: string) => catalog?.plans[plan as keyof typeof catalog.plans]?.monthlyPrice ?? 0;
  const feeOf = (s: SchoolWithStats) => s.effectiveMonthlyFee ?? listPrice(s.plan);
  const { mutate: deactivateSchool, isPending: isDeactivating } = useDeactivateSchool();
  const { mutate: reactivateSchool, isPending: isReactivating } = useReactivateSchool();

  // Filter logic
  const filteredSchools = schools.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.documentId.includes(searchTerm) ||
      (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesPlan = filterPlan === 'ALL' || s.plan === filterPlan;
    return matchesSearch && matchesPlan;
  });

  // Calculate SaaS KPIs
  const totalSchools = schools.length;
  const activeSchools = schools.filter((s) => s.isActive).length;
  const totalStudentsInPlatform = schools.reduce((acc, s) => acc + (s._count?.students || 0), 0);
  // Solo cuentan los colegios que hoy pueden usar la plataforma, con su mensualidad pactada
  const estimatedMRR = schools
    .filter((s) => s.isActive && s.planStatus?.access !== 'BLOCKED')
    .reduce((acc, s) => acc + feeOf(s), 0);
  const overdueSchools = schools.filter((s) => s.isActive && s.planStatus && s.planStatus.access !== 'ACTIVE').length;
  const { data: billing, isLoading: isBillingLoading } = useBillingSummary();

  const quotaOf = (s: SchoolWithStats) => catalog?.plans[s.plan]?.studentQuota;
  const quotaPercent = (s: SchoolWithStats) => {
    const quota = quotaOf(s);
    return quota ? Math.round(((s._count?.students || 0) / quota) * 100) : null;
  };

  /** Motivos por los que un colegio activo necesita una acción: cobrar, ofrecer upgrade o reactivar su uso */
  const attentionReasons = (s: SchoolWithStats): AttentionReason[] => {
    if (!s.isActive) return [];
    const reasons: AttentionReason[] = [];
    const st = s.planStatus;
    if (st?.access === 'BLOCKED') reasons.push({ tone: 'danger', label: `Sin acceso · ${st.daysOverdue} d vencido` });
    else if (st?.access === 'READ_ONLY')
      reasons.push({ tone: 'danger', label: `Solo lectura · ${st.daysOverdue} d vencido` });
    else if (st?.access === 'GRACE') reasons.push({ tone: 'warn', label: `En gracia · ${st.daysOverdue} d vencido` });
    else if (st?.daysUntilExpiry != null && st.daysUntilExpiry <= EXPIRY_WARN_DAYS)
      reasons.push({
        tone: 'warn',
        label: st.daysUntilExpiry === 0 ? 'Vence hoy' : `Vence en ${st.daysUntilExpiry} d`,
      });

    const pct = quotaPercent(s);
    if (pct !== null && pct >= QUOTA_WARN_PERCENT) {
      reasons.push({ tone: pct >= 100 ? 'danger' : 'info', label: `Cupo de alumnos al ${pct}%` });
    }

    // Los colegios recién creados todavía no tienen por qué tener uso
    const isNew = !!s.createdAt && Date.now() - new Date(s.createdAt).getTime() < INACTIVE_DAYS * DAY_MS;
    const lastSeen = s.activity?.lastSeenAt;
    if (!isNew && (!lastSeen || Date.now() - new Date(lastSeen).getTime() > INACTIVE_DAYS * DAY_MS)) {
      reasons.push({
        tone: 'info',
        label: lastSeen ? `Sin uso desde ${formatPeruShortDate(lastSeen)}` : 'Sin uso registrado',
      });
    }
    return reasons;
  };

  const attentionSchools = schools
    .map((s) => ({ school: s, reasons: attentionReasons(s) }))
    .filter((x) => x.reasons.length > 0)
    .sort(
      (a, b) =>
        Math.min(...a.reasons.map((r) => TONE_RANK[r.tone])) - Math.min(...b.reasons.map((r) => TONE_RANK[r.tone])),
    );

  const handleToggleStatus = async (school: SchoolWithStats) => {
    if (school.isActive) {
      if (
        await confirmDialog({
          title: `¿Suspender a "${school.name}"?`,
          description: 'El colegio perderá el acceso a la plataforma hasta que lo reactives.',
          confirmText: 'Suspender acceso',
          variant: 'danger',
        })
      ) {
        deactivateSchool(school.id, {
          onSuccess: () => toast.success(`🚫 Colegio "${school.name}" suspendido por cobranza.`),
          onError: () => toast.error('Error al suspender el colegio.'),
        });
      }
    } else {
      reactivateSchool(school.id, {
        onSuccess: () => toast.success(`✅ Colegio "${school.name}" reactivado correctamente.`),
        onError: () => toast.error('Error al reactivar el colegio.'),
      });
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <MfaSetupCard />
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Panel de Control SuperAdmin SaaS</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Torre de control centralizada para gestionar instituciones clientes, planes contratados y facturación
            mensual.
          </p>
        </div>

        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="gap-2 font-bold bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Dar de Alta Nuevo Colegio</span>
        </Button>
      </div>

      {/* KPI Metrics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Colegios Clientes</CardTitle>
            <Building2 className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-extrabold text-foreground">
                {activeSchools}{' '}
                <span className="text-xs font-semibold text-muted-foreground">/ {totalSchools} activos</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Instituciones conectadas</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">MRR Estimado (S/ mes)</CardTitle>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                S/ {estimatedMRR.toFixed(2)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {overdueSchools > 0 ? (
                <span className="text-destructive font-semibold">{overdueSchools} con plan vencido</span>
              ) : (
                'Ingresos recurrentes mensuales'
              )}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Alumnos en Plataforma</CardTitle>
            <Users className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-extrabold text-foreground">{totalStudentsInPlatform}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Matrículas activas consolidadas</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Cobrado este mes</CardTitle>
            <Wallet className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isBillingLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-extrabold text-foreground">
                S/ {formatSoles(billing?.collectedThisMonth ?? 0)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {billing
                ? `${billing.paymentsThisMonth} ${billing.paymentsThisMonth === 1 ? 'pago' : 'pagos'} · mes anterior S/ ${formatSoles(billing.collectedLastMonth)}`
                : 'Pagos de suscripción registrados'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Requiere atención: vencimientos, cupo lleno y colegios sin uso */}
      {!isLoading && attentionSchools.length > 0 && (
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
                      onClick={() => setSelectedSchoolForPayments(school)}
                    >
                      <Wallet className="w-3.5 h-3.5 text-primary" />
                      Registrar pago
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs gap-1"
                      onClick={() => setSelectedSchoolForPlan(school)}
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
      )}

      {/* Main Table Section */}
      <div className="space-y-4">
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-card border border-border shadow-sm">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar colegio por RUC, nombre o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
            >
              <option value="ALL">Todos los Planes</option>
              {(['BASIC', 'PRO', 'ENTERPRISE'] as const).map((plan) => (
                <option key={plan} value={plan}>
                  Plan {plan}
                  {catalog ? ` (S/ ${formatSoles(listPrice(plan))}/mes)` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Colegio / RUC</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Plan Contratado</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Usuarios / Alumnos</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Actividad</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Vigencia Plan</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Estado Acceso</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSchools.length ? (
                  filteredSchools.map((item) => {
                    const isExpired = !!item.planStatus && item.planStatus.access !== 'ACTIVE';
                    const quota = quotaOf(item);
                    const pct = quotaPercent(item);
                    const hasCustomFee = item.monthlyFee != null;

                    return (
                      <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <div>
                            <div className="font-bold text-foreground text-sm flex items-center gap-2">
                              {item.logoUrl ? (
                                <img src={item.logoUrl} alt={item.name} className="w-5 h-5 object-contain rounded" />
                              ) : (
                                <Building2 className="w-4 h-4 text-primary" />
                              )}
                              <Link
                                to={`/super-admin/schools/${item.id}`}
                                className="hover:text-primary hover:underline"
                              >
                                {item.name}
                              </Link>
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5 font-mono">
                              <span>RUC: {item.documentId}</span>
                              {item.phone && <span>• Tel: {item.phone}</span>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              item.plan === 'PRO' ? 'default' : item.plan === 'ENTERPRISE' ? 'success' : 'secondary'
                            }
                            className="font-bold text-xs whitespace-nowrap"
                          >
                            {item.plan} (S/ {formatSoles(feeOf(item))}/mes)
                          </Badge>
                          {hasCustomFee && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              Precio pactado · lista S/ {formatSoles(listPrice(item.plan))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <div className="text-xs font-medium text-foreground">
                              <strong>{item._count?.students || 0}</strong>
                              <span className="text-muted-foreground text-xs">
                                /{quota === null ? '∞' : (quota ?? '—')} alumnos
                              </span>
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
                                <div
                                  className={`h-full rounded-full ${pct >= 100 ? 'bg-destructive' : pct >= QUOTA_WARN_PERCENT ? 'bg-amber-500' : 'bg-primary'}`}
                                  style={{ width: `${Math.min(pct, 100)}%` }}
                                />
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground">{item._count?.users || 0} usuarios</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5 whitespace-nowrap">
                            <div className="text-xs text-foreground">
                              {timeAgo(item.activity?.lastSeenAt) ?? (
                                <span className="text-muted-foreground">Sin actividad</span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {item.activity?.active7d ?? 0} activos (7 d) · {item.activity?.active30d ?? 0} (30 d)
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.planExpiresAt ? (
                            <div className="flex flex-col items-start gap-1">
                              <span
                                className={`text-xs ${isExpired ? 'text-destructive font-bold' : 'text-muted-foreground'}`}
                              >
                                {formatPeruShortDate(item.planExpiresAt)}
                              </span>
                              <PlanStatusBadge status={item.planStatus} />
                            </div>
                          ) : (
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                              Mensual Indefinido
                            </span>
                          )}
                          <div className="text-xs text-muted-foreground mt-1 whitespace-nowrap">
                            {item.lastPaymentOn
                              ? `Último pago ${formatPeruShortDate(item.lastPaymentOn)}`
                              : 'Sin pagos registrados'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.isActive ? (
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
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-7 text-xs gap-1 border border-border hover:bg-primary hover:text-primary-foreground transition-colors"
                              onClick={() => handleImpersonate(item)}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Ver Colegio</span>
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1"
                              onClick={() => setSelectedSchoolForEdit(item)}
                            >
                              <Pencil className="w-3.5 h-3.5 text-primary" />
                              <span>Editar</span>
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1"
                              onClick={() => setSelectedSchoolForReset(item)}
                            >
                              <Key className="w-3.5 h-3.5 text-amber-500" />
                              <span>Clave</span>
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1"
                              onClick={() => setSelectedSchoolForPlan(item)}
                            >
                              <Sparkles className="w-3.5 h-3.5 text-primary" />
                              <span>Plan</span>
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1"
                              onClick={() => setSelectedSchoolForPayments(item)}
                            >
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
                              onClick={() => handleToggleStatus(item)}
                              disabled={isDeactivating || isReactivating}
                            >
                              {item.isActive ? (
                                <Power className="w-3.5 h-3.5" />
                              ) : (
                                <RotateCcw className="w-3.5 h-3.5" />
                              )}
                              <span>{item.isActive ? 'Suspender' : 'Reactivar'}</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      No se encontraron colegios registrados con los filtros seleccionados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateSchoolModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />

      <EditSchoolPlanModal
        key={selectedSchoolForPlan?.id ?? 'none'}
        school={selectedSchoolForPlan}
        isOpen={!!selectedSchoolForPlan}
        onClose={() => setSelectedSchoolForPlan(null)}
      />

      <EditSchoolInfoModal
        school={selectedSchoolForEdit}
        isOpen={!!selectedSchoolForEdit}
        onClose={() => setSelectedSchoolForEdit(null)}
      />

      <SubscriptionPaymentsModal
        key={`pay-${selectedSchoolForPayments?.id ?? 'none'}`}
        school={selectedSchoolForPayments}
        isOpen={!!selectedSchoolForPayments}
        onClose={() => setSelectedSchoolForPayments(null)}
      />

      <ResetAdminPasswordModal
        school={selectedSchoolForReset}
        isOpen={!!selectedSchoolForReset}
        onClose={() => setSelectedSchoolForReset(null)}
      />
    </div>
  );
};
