import { create } from 'zustand';
import { queryClient } from '../lib/queryClient';
import { clearOfflineData, countPendingOffline } from '../lib/offlineData';

export type Role = 'SUPER_ADMIN' | 'SCHOOL_ADMIN' | 'ADMINISTRATIVE' | 'TEACHER' | 'PARENT' | 'STUDENT';

export interface User {
  id: string;
  email: string;
  role: Role;
  firstName: string;
  lastNamePaternal: string;
  schoolId: string;
  documentId?: string | null;
  mustChangePassword?: boolean;
  studentId?: string;
  avatarUrl?: string | null;
  /** Solo SUPER_ADMIN: si ya tiene la verificación en dos pasos activa. */
  mfaEnabled?: boolean;
}

export interface ImpersonatedSchool {
  id: string;
  name: string;
  logoUrl?: string | null;
  plan: 'BASIC' | 'PRO' | 'ENTERPRISE';
}

interface AuthState {
  token: string | null;
  user: User | null;
  impersonatedSchool: ImpersonatedSchool | null;
  setAuth: (token: string, user: User) => void;
  updateUser: (updatedFields: Partial<User>) => void;
  setImpersonatedSchool: (school: ImpersonatedSchool | null) => void;
  /** Cierre forzado (sesión vencida o sin permisos): conserva los pendientes del dueño. */
  logout: () => void;
  /** Cierre voluntario: avisa si hay datos sin sincronizar y borra todo lo guardado en el dispositivo. */
  signOut: () => Promise<void>;
}

/** Lee JSON de localStorage sin romper el arranque si está corrupto. */
function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

export const useAuthStore = create<AuthState>((set, getState) => {
  const savedToken = localStorage.getItem('token');
  const savedUser = readJson<User>('user');
  const savedImpersonated = readJson<ImpersonatedSchool>('impersonatedSchool');

  const clearSession = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('impersonatedSchool');
    queryClient.clear();
    set({ token: null, user: null, impersonatedSchool: null });
  };

  return {
    token: savedToken || null,
    user: savedUser,
    impersonatedSchool: savedImpersonated,
    setAuth: (token, user) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.removeItem('impersonatedSchool');
      queryClient.clear();
      set({ token, user, impersonatedSchool: null });
    },
    updateUser: (updatedFields) => {
      set((state) => {
        if (!state.user) return state;
        const updatedUser = { ...state.user, ...updatedFields };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        return { user: updatedUser };
      });
    },
    setImpersonatedSchool: (school) => {
      if (school) {
        localStorage.setItem('impersonatedSchool', JSON.stringify(school));
      } else {
        localStorage.removeItem('impersonatedSchool');
      }
      queryClient.clear();
      set({ impersonatedSchool: school });
    },
    logout: () => {
      void clearOfflineData({ includePending: false });
      clearSession();
    },
    signOut: async () => {
      const userId = getState().user?.id;
      const pending = userId ? await countPendingOffline(userId) : 0;
      if (pending > 0) {
        const { confirmDialog } = await import('@/components/ui/confirm');
        const ok = await confirmDialog({
          title: `Tienes ${pending} registro(s) sin sincronizar`,
          description:
            'Son notas o asistencias guardadas sin conexión que aún no llegan al servidor. Si cierras sesión ahora se borrarán de este dispositivo. Conéctate a internet y abre la pantalla correspondiente para enviarlos.',
          confirmText: 'Cerrar sesión y borrarlos',
          variant: 'danger',
        });
        if (!ok) return;
      }
      await clearOfflineData({ includePending: true });
      clearSession();
    },
  };
});
