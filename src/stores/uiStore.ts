import { create } from 'zustand';
import { UIState } from '@/types/index';

interface UIStore extends UIState {
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleDarkMode: () => void;
  setDarkMode: (dark: boolean) => void;
  openModal: (type: UIState['modalType']) => void;
  closeModal: () => void;
  setViewMode: (mode: UIState['viewMode']) => void;
  setSelectedTask: (taskId: string | undefined) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: typeof window !== 'undefined' && window.innerWidth >= 1024,
  darkMode: false,
  isModalOpen: false,
  viewMode: 'kanban',
  selectedFilter: {},

  toggleSidebar: () =>
    set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  toggleDarkMode: () =>
    set((state) => ({ darkMode: !state.darkMode })),

  setDarkMode: (dark) => set({ darkMode: dark }),

  openModal: (type) =>
    set({ isModalOpen: true, modalType: type }),

  closeModal: () =>
    set({ isModalOpen: false, modalType: undefined }),

  setViewMode: (mode) => set({ viewMode: mode }),

  setSelectedTask: (taskId) => set({ selectedTaskId: taskId }),
}));
