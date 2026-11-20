export const USER_FORM_ROLE_LABELS: Record<string, string> = {
  SCHOOL_ADMIN: 'Director / Promotor (Administrador General)',
  ADMINISTRATIVE: 'Personal Administrativo (Secretaría / Caja)',
  TEACHER: 'Profesor(a)',
  PARENT: 'Apoderado / Padre de Familia',
};

export const USER_TABLE_ROLE_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  TEACHER: {
    label: 'Profesor / Docente',
    badgeClass: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30 font-bold',
  },
  ADMINISTRATIVE: {
    label: 'Administrativo',
    badgeClass: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 font-bold',
  },
  SCHOOL_ADMIN: {
    label: 'Director / Promotor',
    badgeClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30 font-bold',
  },
  SUPER_ADMIN: {
    label: 'Soporte KIPUX',
    badgeClass: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30 font-bold',
  },
  PARENT: {
    label: 'Apoderado',
    badgeClass: 'bg-muted text-muted-foreground border-border',
  },
};
