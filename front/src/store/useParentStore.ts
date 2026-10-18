import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ParentState {
  selectedChildId: string | null;
  setSelectedChildId: (id: string) => void;
  viewMode: 'PARENT' | 'STUDENT';
  setViewMode: (mode: 'PARENT' | 'STUDENT') => void;
}

export const useParentStore = create<ParentState>()(
  persist(
    (set) => ({
      selectedChildId: null,
      setSelectedChildId: (id: string) => set({ selectedChildId: id }),
      viewMode: 'PARENT',
      setViewMode: (mode) => set({ viewMode: mode }),
    }),
    {
      name: 'saaschool-parent-selected-child',
    },
  ),
);
