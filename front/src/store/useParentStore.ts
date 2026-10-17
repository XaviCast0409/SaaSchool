import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ParentState {
  selectedChildId: string | null;
  setSelectedChildId: (id: string) => void;
}

export const useParentStore = create<ParentState>()(
  persist(
    (set) => ({
      selectedChildId: null,
      setSelectedChildId: (id: string) => set({ selectedChildId: id }),
    }),
    {
      name: 'saaschool-parent-selected-child',
    },
  ),
);
