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
  /** Shared search query — TopBar writes, all pages read to filter their content */
  globalSearchQuery: string;
  setGlobalSearchQuery: (q: string) => void;
  /**
   * Task owner filter for the Tasks page.
   * 'mine'  — show only the current user's tasks (default for admin/manager)
   * 'all'   — show every task on the team
   * <uuid>  — show tasks assigned to a specific team member
   */
  taskOwnerFilter: string;
  setTaskOwnerFilter: (f: string) => void;
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

  globalSearchQuery: '',
  setGlobalSearchQuery: (q) => set({ globalSearchQuery: q }),

  taskOwnerFilter: 'mine',
  setTaskOwnerFilter: (f) => set({ taskOwnerFilter: f }),
}));
