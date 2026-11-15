import { create } from 'zustand';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'kipux:theme';

/** Tema guardado por el usuario; si nunca eligió, el del sistema operativo. */
const readInitialTheme = (): Theme => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* almacenamiento no disponible: se usa la preferencia del sistema */
  }
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
};

interface ThemeState {
  theme: Theme;
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: readInitialTheme(),
  toggle: () => {
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* sin almacenamiento el tema dura solo esta sesión */
    }
    set({ theme: next });
  },
}));

/** Aplica el tema al documento. `null` lo devuelve a claro (páginas públicas). */
export const applyTheme = (theme: Theme | null) => {
  document.documentElement.classList.toggle('dark', theme === 'dark');
};
