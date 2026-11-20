import {
  BookOpenCheck,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  Clock3,
  CreditCard,
  FileText,
  GraduationCap,
  Megaphone,
  MessagesSquare,
  Users,
} from 'lucide-react';
import type { NavSection } from './types';

// Menú exclusivo y directo para Apoderados (Portal Familiar)
export const parentNavSections: NavSection[] = [
  {
    title: 'Portal Familiar',
    items: [
      { label: 'Inicio (Mis hijos)', path: '/dashboard', icon: Users, roles: ['PARENT'], minPlan: 'BASIC' },
      { label: 'Asistencia escolar', path: '/attendance', icon: CalendarCheck, roles: ['PARENT'], minPlan: 'BASIC' },
      { label: 'Comunicados', path: '/announcements', icon: Megaphone, roles: ['PARENT'], minPlan: 'BASIC' },
      { label: 'Horario', path: '/schedule', icon: Clock3, roles: ['PARENT'], minPlan: 'BASIC' },
      { label: 'Calendario', path: '/calendar', icon: CalendarDays, roles: ['PARENT'], minPlan: 'BASIC' },
      { label: 'Mensajes', path: '/messages', icon: MessagesSquare, roles: ['PARENT'], minPlan: 'BASIC' },
      { label: 'Entrevistas', path: '/meetings', icon: CalendarClock, roles: ['PARENT'], minPlan: 'BASIC' },
      { label: 'Mis pagos y pensiones', path: '/payments', icon: CreditCard, roles: ['PARENT'], minPlan: 'BASIC' },
      { label: 'Trámites', path: '/procedures', icon: FileText, roles: ['PARENT'], minPlan: 'BASIC' },
      {
        label: 'Libreta de calificaciones',
        path: '/grades',
        icon: BookOpenCheck,
        roles: ['PARENT'],
        minPlan: 'PRO',
        keywords: 'notas',
      },
      {
        label: 'Aula virtual / Clases',
        path: '/virtual-classroom',
        icon: GraduationCap,
        roles: ['PARENT'],
        minPlan: 'PRO',
        keywords: 'tareas',
      },
    ],
  },
];
