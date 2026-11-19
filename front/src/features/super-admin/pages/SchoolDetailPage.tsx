import { schoolLoginUrl } from '@/lib/schoolDomain';
import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Circle,
  ExternalLink,
  Key,
  Pencil,
  Sparkles,
  Wallet,
  Copy,
  Link2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';
import { useGetAllSchools, usePlanCatalog } from '../api/useSuperAdmin';
import { useSchoolOnboarding } from '../api/usePlatform';
import { EditSchoolPlanModal } from '../components/EditSchoolPlanModal';
import { EditSchoolInfoModal } from '../components/EditSchoolInfoModal';
import { ResetAdminPasswordModal } from '../components/ResetAdminPasswordModal';
import { SubscriptionPaymentsModal } from '../components/SubscriptionPaymentsModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPeruShortDate } from '@/lib/dateUtils';
import { Row } from '../components/ui-bits';
import { SchoolSubscriptionCard } from '../components/school-detail/SchoolSubscriptionCard';
import { SchoolQuotaCard } from '../components/school-detail/SchoolQuotaCard';
import { SchoolNotesCard } from '../components/school-detail/SchoolNotesCard';

type ModalKind = 'plan' | 'edit' | 'reset' | 'payments' | null;

const ACCESS_LABEL = {
  ACTIVE: 'Vigente',
  GRACE: 'En gracia',
  READ_ONLY: 'Solo lectura',
  BLOCKED: 'Sin acceso',
} as const;

/** Ficha de un colegio para la plataforma: plan y cobros, uso, puesta en marcha y notas internas */
export const SchoolDetailPage: React.FC = () => {
  const { schoolId } = useParams<{ schoolId: string }>();
  const navigate = useNavigate();
  const setImpersonatedSchool = useAuthStore((s) => s.setImpersonatedSchool);
  const { data: schools, isLoading } = useGetAllSchools();
  const { data: catalog } = usePlanCatalog();
  const { data: onboarding, isLoading: isOnboardingLoading } = useSchoolOnboarding(schoolId);
  const [modal, setModal] = useState<ModalKind>(null);

  const school = schools?.find((s) => s.id === schoolId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!school || !schoolId) {
    return (
      <div className="space-y-3">
        <Link to="/super-admin" className="text-sm text-primary inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Volver a la Torre de Control
        </Link>
        <p className="text-sm text-muted-foreground">No se encontró el colegio.</p>
      </div>
    );
  }

  const status = school.planStatus;
  const quota = catalog?.plans[school.plan]?.studentQuota;
  const students = school._count?.students ?? 0;
  const pct = quota ? Math.round((students / quota) * 100) : null;

  const impersonate = () => {
    setImpersonatedSchool({ id: school.id, name: school.name, logoUrl: school.logoUrl, plan: school.plan });
    toast.info(`Accediendo en Modo Soporte a "${school.name}".`);
    navigate('/dashboard');
  };

  return (
    <div className="space-y-6 pb-8">
      <Link
        to="/super-admin"
        className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Torre de Control
      </Link>

      {/* Encabezado */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-start gap-3 min-w-0">
          {school.logoUrl ? (
            <img
              src={school.logoUrl}
              alt=""
              className="w-12 h-12 rounded-lg object-contain border border-border bg-background"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{school.name}</h1>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              RUC {school.documentId}
              {school.modularCode ? ` · Cód. modular ${school.modularCode}` : ''}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <Badge className="text-xs">Plan {school.plan}</Badge>
              {school.isActive ? (
                <Badge
                  variant={
                    status?.access === 'ACTIVE' ? 'success' : status?.access === 'GRACE' ? 'warning' : 'destructive'
                  }
                  className="text-xs"
                >
                  {status ? ACCESS_LABEL[status.access] : 'Activo'}
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-xs">
                  Suspendido
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button
            size="sm"
            variant="secondary"
            className="h-8 text-xs gap-1 border border-border"
            onClick={impersonate}
          >
            <ExternalLink className="w-3.5 h-3.5" /> Ver colegio
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => setModal('payments')}>
            <Wallet className="w-3.5 h-3.5 text-primary" /> Cobros
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => setModal('plan')}>
            <Sparkles className="w-3.5 h-3.5 text-primary" /> Plan
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => setModal('edit')}>
            <Pencil className="w-3.5 h-3.5 text-primary" /> Editar
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => setModal('reset')}>
            <Key className="w-3.5 h-3.5 text-amber-500" /> Clave
          </Button>
        </div>
      </div>

      {/* Código y enlace de ingreso para el colegio */}
      {school.slug && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Link2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">Código de ingreso:</span>
                <span className="text-xs font-mono font-bold bg-muted px-2 py-0.5 rounded text-primary">
                  {school.slug}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Enlace público: <span className="font-mono">{schoolLoginUrl(school.slug)}</span>
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="text-xs gap-1.5 shrink-0"
            onClick={() => {
              navigator.clipboard.writeText(schoolLoginUrl(school.slug ?? ''));
              toast.success('Enlace de ingreso copiado al portapapeles.');
            }}
          >
            <Copy className="w-3.5 h-3.5" />
            Copiar enlace
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
        <SchoolSubscriptionCard school={school} />
        <SchoolQuotaCard school={school} quota={quota} students={students} pct={pct} />

        {/* Contacto */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Correo">{school.email || '—'}</Row>
            <Row label="Teléfono">{school.phone || '—'}</Row>
            <Row label="Ubicación">
              {[school.district, school.province, school.department].filter(Boolean).join(', ') || '—'}
            </Row>
            <Row label="Cliente desde">{school.createdAt ? formatPeruShortDate(school.createdAt) : '—'}</Row>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Puesta en marcha */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-foreground">Puesta en marcha</CardTitle>
            {onboarding && (
              <span className="text-xs font-semibold text-muted-foreground">
                {onboarding.completed}/{onboarding.total} · {onboarding.percent}%
              </span>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {isOnboardingLoading || !onboarding ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <>
                <div
                  className="h-2 w-full rounded-full bg-muted overflow-hidden"
                  role="meter"
                  aria-label="Avance de la puesta en marcha"
                  aria-valuenow={onboarding.percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div className="h-full rounded-full bg-primary" style={{ width: `${onboarding.percent}%` }} />
                </div>
                {onboarding.nextStep && (
                  <p className="text-xs text-muted-foreground">
                    Siguiente paso: <strong className="text-foreground">{onboarding.nextStep.label}</strong>
                  </p>
                )}
                <ul className="space-y-1.5">
                  {onboarding.steps.map((step) => (
                    <li key={step.key} className="flex items-center gap-2 text-sm">
                      {step.done ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                      <span className={step.done ? 'text-foreground' : 'text-muted-foreground'}>{step.label}</span>
                      {step.detail && step.done && (
                        <span className="text-xs text-muted-foreground">· {step.detail}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>

        <SchoolNotesCard schoolId={schoolId} />
      </div>

      <EditSchoolPlanModal
        key={`plan-${school.id}-${modal}`}
        school={school}
        isOpen={modal === 'plan'}
        onClose={() => setModal(null)}
      />
      <EditSchoolInfoModal school={school} isOpen={modal === 'edit'} onClose={() => setModal(null)} />
      <ResetAdminPasswordModal school={school} isOpen={modal === 'reset'} onClose={() => setModal(null)} />
      <SubscriptionPaymentsModal
        key={`pay-${school.id}-${modal}`}
        school={school}
        isOpen={modal === 'payments'}
        onClose={() => setModal(null)}
      />
    </div>
  );
};
