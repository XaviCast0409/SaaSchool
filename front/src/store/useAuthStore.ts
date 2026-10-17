import { create } from 'zustand';
import { queryClient } from '../lib/queryClient';

export interface User {
  id: string;
  email: string;
  role: 'SUPER_ADMIN' | 'SCHOOL_ADMIN' | 'ADMINISTRATIVE' | 'TEACHER' | 'PARENT';
  firstName: string;
  lastNamePaternal: string;
  schoolId: string;
  documentId?: string | null;
  mustChangePassword?: boolean;
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
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  const savedToken = localStorage.getItem('token');
  const savedUser = localStorage.getItem('user');
  const savedImpersonated = localStorage.getItem('impersonatedSchool');

  return {
    token: savedToken || null,
    user: savedUser ? JSON.parse(savedUser) : null,
    impersonatedSchool: savedImpersonated ? JSON.parse(savedImpersonated) : null,
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
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('impersonatedSchool');
      queryClient.clear();
      set({ token: null, user: null, impersonatedSchool: null });
    },
  };
});
