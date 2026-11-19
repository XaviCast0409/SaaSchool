// Paleta para distinguir cursos de un vistazo (clases estáticas para que Tailwind las incluya).
export const COURSE_TONES = [
  'from-indigo-500 to-violet-500',
  'from-emerald-500 to-teal-500',
  'from-sky-500 to-cyan-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-500',
  'from-fuchsia-500 to-purple-500',
  'from-lime-500 to-green-500',
  'from-blue-500 to-indigo-500',
];

export const AVATAR_TONES = [
  'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
  'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  'bg-rose-500/15 text-rose-700 dark:text-rose-300',
  'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300',
];

export const hash = (s: string) => [...s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
