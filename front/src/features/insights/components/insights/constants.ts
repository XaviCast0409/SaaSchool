export const LEVEL_STYLE: Record<string, string> = {
  ALTO: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
  MEDIO: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  BAJO: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
};

export function cellColor(pctC: number, pctB: number): string {
  if (pctC >= 25) return 'bg-rose-500/70 text-white';
  if (pctC >= 10) return 'bg-rose-400/40';
  if (pctC + pctB >= 40) return 'bg-amber-400/40';
  if (pctC + pctB >= 20) return 'bg-amber-300/25';
  return 'bg-emerald-500/20';
}
