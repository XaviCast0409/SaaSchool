import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/useAuthStore';
import { useGetActiveSchool } from '@/features/schools/api/useSchool';
import { useSecretariatSettings } from '../api/useSecretariat';
import { AdmissionsTab } from '../components/AdmissionsTab';
import { ComplaintsTab, DocumentsTab, PublicLinksCard, RatificationTab } from '../components/SecretariatTabs';

type Tab = 'admission' | 'ratification' | 'documents' | 'complaints';
const TABS: Tab[] = ['admission', 'ratification', 'documents', 'complaints'];

/** Secretaría digital: admisión, ratificación de matrícula, trámites y Libro de Reclamaciones. */
export const SecretariatPage: React.FC = () => {
  const role = useAuthStore((s) => s.user?.role);
  const isManager = role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN';
  const [params, setParams] = useSearchParams();
  const tab = (TABS.includes(params.get('tab') as Tab) ? params.get('tab') : 'admission') as Tab;
  const setTab = (t: Tab) => setParams({ tab: t }, { replace: true });
  const { data: settings, isLoading } = useSecretariatSettings();
  const { data: school } = useGetActiveSchool();

  return (
    <div className="space-y-4">
      <PageHeader title="Secretaría" description="Postulantes, ratificación de matrícula, constancias y certificados, y Libro de Reclamaciones en un solo lugar." />
      {isLoading || !settings ? (
        <Skeleton className="h-28" />
      ) : (
        school?.id && <PublicLinksCard key={`${settings.admissionsOpen}-${settings.ratificationOpen}-${settings.admissionsYear}`} schoolId={school.id} settings={settings} canEdit={isManager} />
      )}
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        items={[
          { value: 'admission', label: 'Admisión', count: settings?.pending.admissions || undefined },
          { value: 'ratification', label: 'Ratificación' },
          { value: 'documents', label: 'Trámites', count: settings?.pending.documents || undefined },
          { value: 'complaints', label: 'Libro de Reclamaciones', count: settings?.pending.complaints || undefined },
        ]}
      />
      {tab === 'admission' && <AdmissionsTab key={settings?.admissionsYear ?? 'all'} defaultYear={settings?.admissionsYear ?? null} />}
      {tab === 'ratification' && <RatificationTab open={Boolean(settings?.ratificationOpen)} />}
      {tab === 'documents' && <DocumentsTab />}
      {tab === 'complaints' && <ComplaintsTab canRespond={isManager} />}
    </div>
  );
};
