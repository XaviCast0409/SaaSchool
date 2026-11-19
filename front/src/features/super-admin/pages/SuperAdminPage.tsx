import { useUrlFilters } from '@/lib/useUrlFilters';
import { confirmDialog } from '@/components/ui/confirm';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';
import {
  useGetAllSchools,
  useDeactivateSchool,
  useReactivateSchool,
  usePlanCatalog,
  useBillingSummary,
} from '../api/useSuperAdmin';
import { SchoolWithStats } from '../types';
import { MfaSetupCard } from '../components/MfaSetupCard';
import { Button } from '@/components/ui/button';
import { TONE_RANK } from '../constants';
import { getQuotaOf, getQuotaPercent, getAttentionReasons } from '../utils/superAdminFormat';
import { SuperAdminKpiCards } from '../components/super-admin/SuperAdminKpiCards';
import { AttentionListCard } from '../components/super-admin/AttentionListCard';
import { SchoolsTable } from '../components/super-admin/SchoolsTable';
import { SuperAdminModals } from '../components/super-admin/SuperAdminModals';

export const SuperAdminPage: React.FC = () => {
  const navigate = useNavigate();
  const setImpersonatedSchool = useAuthStore((state) => state.setImpersonatedSchool);

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

  const filteredSchools = schools.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.documentId.includes(searchTerm) ||
      (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesPlan = filterPlan === 'ALL' || s.plan === filterPlan;
    return matchesSearch && matchesPlan;
  });

  const totalSchools = schools.length;
  const activeSchools = schools.filter((s) => s.isActive).length;
  const totalStudentsInPlatform = schools.reduce((acc, s) => acc + (s._count?.students || 0), 0);
  const estimatedMRR = schools
    .filter((s) => s.isActive && s.planStatus?.access !== 'BLOCKED')
    .reduce((acc, s) => acc + feeOf(s), 0);
  const overdueSchools = schools.filter((s) => s.isActive && s.planStatus && s.planStatus.access !== 'ACTIVE').length;
  const { data: billing, isLoading: isBillingLoading } = useBillingSummary();

  const attentionSchools = schools
    .map((s) => ({ school: s, reasons: getAttentionReasons(s, catalog) }))
    .filter((x) => x.reasons.length > 0)
    .sort(
      (a, b) =>
        Math.min(...a.reasons.map((r) => TONE_RANK[r.tone])) - Math.min(...b.reasons.map((r) => TONE_RANK[r.tone])),
    );

  const handleToggleStatus = async (school: SchoolWithStats) => {
    if (school.isActive) {
      const confirmed = await confirmDialog({
        title: `¿Suspender a "${school.name}"?`,
        description: 'El colegio perderá el acceso a la plataforma hasta que lo reactives.',
        confirmText: 'Suspender acceso',
        variant: 'danger',
      });
      if (confirmed) {
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Panel de Control SuperAdmin SaaS</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Torre de control centralizada para gestionar instituciones clientes, planes contratados y facturación mensual.
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

      <SuperAdminKpiCards
        isLoading={isLoading}
        activeSchools={activeSchools}
        totalSchools={totalSchools}
        estimatedMRR={estimatedMRR}
        overdueSchools={overdueSchools}
        totalStudentsInPlatform={totalStudentsInPlatform}
        isBillingLoading={isBillingLoading}
        billing={billing}
      />

      {!isLoading && (
        <AttentionListCard
          attentionSchools={attentionSchools}
          onSelectPayments={setSelectedSchoolForPayments}
          onSelectPlan={setSelectedSchoolForPlan}
        />
      )}

      <SchoolsTable
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        filterPlan={filterPlan}
        onFilterPlanChange={setFilterPlan}
        catalog={catalog}
        isLoading={isLoading}
        filteredSchools={filteredSchools}
        listPrice={listPrice}
        feeOf={feeOf}
        quotaOf={(s) => getQuotaOf(s, catalog)}
        quotaPercent={(s) => getQuotaPercent(s, catalog)}
        onImpersonate={handleImpersonate}
        onEditSchool={setSelectedSchoolForEdit}
        onResetPassword={setSelectedSchoolForReset}
        onSelectPlan={setSelectedSchoolForPlan}
        onSelectPayments={setSelectedSchoolForPayments}
        onToggleStatus={handleToggleStatus}
        isDeactivating={isDeactivating}
        isReactivating={isReactivating}
      />

      <SuperAdminModals
        isCreateModalOpen={isCreateModalOpen}
        onCloseCreate={() => setIsCreateModalOpen(false)}
        selectedSchoolForPlan={selectedSchoolForPlan}
        onClosePlan={() => setSelectedSchoolForPlan(null)}
        selectedSchoolForEdit={selectedSchoolForEdit}
        onCloseEdit={() => setSelectedSchoolForEdit(null)}
        selectedSchoolForPayments={selectedSchoolForPayments}
        onClosePayments={() => setSelectedSchoolForPayments(null)}
        selectedSchoolForReset={selectedSchoolForReset}
        onCloseReset={() => setSelectedSchoolForReset(null)}
      />
    </div>
  );
};
