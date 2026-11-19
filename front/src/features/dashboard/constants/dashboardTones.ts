export const TONES = {
  primary: {
    hover: 'hover:bg-primary/10 hover:border-primary/40',
    iconTone: 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground',
  },
  emerald: {
    hover: 'hover:bg-emerald-500/10 hover:border-emerald-500/40',
    iconTone:
      'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white',
  },
  amber: {
    hover: 'hover:bg-amber-500/10 hover:border-amber-500/40',
    iconTone: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500 group-hover:text-white',
  },
  sky: {
    hover: 'hover:bg-sky-500/10 hover:border-sky-500/40',
    iconTone: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 group-hover:bg-sky-500 group-hover:text-white',
  },
} as const;
