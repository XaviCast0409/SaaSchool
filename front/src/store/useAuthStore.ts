import { create } from 'zustand';

export interface User {
  id: string;
  email: string;
  role: 'SUPER_ADMIN' | 'SCHOOL_ADMIN' | 'ADMINISTRATIVE' | 'TEACHER' | 'PARENT';
  firstName: string;
  lastNamePaternal: string;
  schoolId: string;
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
      set({ token, user });
    },
    setImpersonatedSchool: (school) => {
      if (school) {
        localStorage.setItem('impersonatedSchool', JSON.stringify(school));
      } else {
        localStorage.removeItem('impersonatedSchool');
      }
      set({ impersonatedSchool: school });
    },
    logout: () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('impersonatedSchool');
      set({ token: null, user: null, impersonatedSchool: null });
    },
  };
});
