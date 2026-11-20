import { Activity, Inbox, Megaphone, ShieldCheck } from 'lucide-react';
import type { NavSection } from './types';

// SuperAdmin en modo SaaS puro: solo herramientas de negocio de plataforma
export const superAdminNavSections: NavSection[] = [
  {
    title: 'Plataforma SaaS',
    items: [
      {
        label: 'Torre de Control SaaS',
        path: '/super-admin',
        icon: ShieldCheck,
        roles: ['SUPER_ADMIN'],
        minPlan: 'BASIC',
        matchPrefixes: ['/super-admin/schools/'],
        keywords: 'colegios clientes',
      },
      {
        label: 'Avisos a colegios',
        path: '/super-admin/announcements',
        icon: Megaphone,
        roles: ['SUPER_ADMIN'],
        minPlan: 'BASIC',
      },
      {
        label: 'Leads de la web',
        path: '/super-admin/leads',
        icon: Inbox,
        roles: ['SUPER_ADMIN'],
        minPlan: 'BASIC',
        keywords: 'contactos ventas',
      },
      {
        label: 'Salud del sistema',
        path: '/super-admin/health',
        icon: Activity,
        roles: ['SUPER_ADMIN'],
        minPlan: 'BASIC',
      },
    ],
  },
];
