import {
  BookOpenCheck,
  CalendarCheck,
  CalendarDays,
  Clock3,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
} from 'lucide-react';
import type { NavSection } from './types';

// Menú exclusivo y seguro para Estudiantes (Cero Deudas / Cero Finanzas)
export const studentNavSections: NavSection[] = [
  {
    title: 'Mochila del Alumno',
    items: [
      {
        label: 'Mi mochila digital',
        path: '/dashboard',
        icon: LayoutDashboard,
        roles: ['STUDENT', 'PARENT'],
        minPlan: 'BASIC',
      },
      {
        label: 'Aula virtual / Cursos',
        path: '/virtual-classroom',
        icon: GraduationCap,
        roles: ['STUDENT', 'PARENT'],
        minPlan: 'PRO',
        keywords: 'tareas',
      },
      {
        label: 'Mis calificaciones',
        path: '/grades',
        icon: BookOpenCheck,
        roles: ['STUDENT', 'PARENT'],
        minPlan: 'PRO',
        keywords: 'notas',
      },
      {
        label: 'Mi asistencia',
        path: '/attendance',
        icon: CalendarCheck,
        roles: ['STUDENT', 'PARENT'],
        minPlan: 'BASIC',
      },
      { label: 'Mi horario', path: '/schedule', icon: Clock3, roles: ['STUDENT'], minPlan: 'BASIC' },
      { label: 'Calendario', path: '/calendar', icon: CalendarDays, roles: ['STUDENT'], minPlan: 'BASIC' },
      {
        label: 'Avisos y comunicados',
        path: '/announcements',
        icon: Megaphone,
        roles: ['STUDENT', 'PARENT'],
        minPlan: 'BASIC',
      },
    ],
  },
];
