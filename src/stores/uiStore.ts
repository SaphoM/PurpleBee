import { create } from 'zustand';
import { UIState } from '@/types/index';

interface UIStore extends UIState {
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  sidebarCollapsed: boolean; // icon-only mode on desktop
  toggleSidebarCollapse: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  toggleDarkMode: () => void;
  setDarkMode: (dark: boolean) => void;
  openModal: (type: UIState['modalType']) => void;
  closeModal: () => void;
  setViewMode: (mode: UIState['viewMode']) => void;
  setSelectedTask: (taskId: string | undefined) => void;
}

// Load collapsed preference
function loadCollapsed(): boolean {
  try {
    return localStorage.getItem('purplebee-sidebar-collapsed') === 'true';
  } catch { return false; }
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: typeof window !== 'undefined' && window.innerWidth >= 1024,
  sidebarCollapsed: loadCollapsed(),
  darkMode: false,
  isModalOpen: false,
  viewMode: 'kanban',
  selectedFilter: {},

  toggleSidebar: () =>
    set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  toggleSidebarCollapse: () =>
    set((state) => {
      const next = !state.sidebarCollapsed;
      try { localStorage.setItem('purplebee-sidebar-collapsed', String(next)); } catch {}
      return { sidebarCollapsed: next };
    }),

  setSidebarCollapsed: (v) => {
    try { localStorage.setItem('purplebee-sidebar-collapsed', String(v)); } catch {}
    set({ sidebarCollapsed: v });
  },

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
