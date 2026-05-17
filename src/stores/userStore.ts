import { create } from 'zustand';
import { User } from '@/types/index';
import { useNotificationStore } from '@stores/notificationStore';
import { useChatStore } from '@stores/chatStore';
import { useSettingsStore } from '@stores/settingsStore';
import { useTaskStore } from '@stores/taskStore';
import { useProjectStore } from '@stores/projectStore';
import { isDbConnected } from '@/lib/supabase';

export type AppRole = 'admin' | 'manager' | 'user';

export interface TeamProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: AppRole;
  title: string;
  department: string;
}

// All available team profiles
export const teamProfiles: TeamProfile[] = [
  {
    id: 'user-1',
    name: 'Sapho Maqhwazima',
    email: 'sapho@xspark.co.za',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sapho',
    role: 'admin',
    title: 'Project Lead',
    department: 'Engineering',
  },
  {
    id: 'user-2',
    name: 'Thando Nkosi',
    email: 'thando@xspark.co.za',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Thando',
    role: 'user',
    title: 'UI Designer',
    department: 'Design',
  },
  {
    id: 'user-3',
    name: 'Lerato Molefe',
    email: 'lerato@xspark.co.za',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lerato',
    role: 'user',
    title: 'Backend Developer',
    department: 'Engineering',
  },
  {
    id: 'user-4',
    name: 'Kabelo Dlamini',
    email: 'kabelo@xspark.co.za',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kabelo',
    role: 'manager',
    title: 'Engineering Manager',
    department: 'Engineering',
  },
  {
    id: 'user-5',
    name: 'Naledi Khumalo',
    email: 'naledi@xspark.co.za',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Naledi',
    role: 'user',
    title: 'Full-Stack Developer',
    department: 'Engineering',
  },
];

interface UserStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // "View As" — admin/manager peek at a member's dashboard
  viewingAsId: string | null; // null = viewing own data

  // Actions
  login: (profileId: string, password: string) => boolean;
  setUser: (user: User) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Quick View actions
  viewAs: (profileId: string) => void;
  clearViewAs: () => void;
  getViewingProfile: () => TeamProfile | null;
  isViewingOther: () => boolean;

  // The effective user ID for data scoping (respects viewAs)
  getEffectiveUserId: () => string;

  // RBAC helpers (always based on the REAL logged-in user, not viewAs)
  isAdmin: () => boolean;
  isManager: () => boolean;
  isMember: () => boolean;
  canManageTeam: () => boolean;
  canDeleteTasks: () => boolean;
  canViewAllTasks: () => boolean;
  canInviteMembers: () => boolean;
  canAssignTasks: () => boolean;
}

export const useUserStore = create<UserStore>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  viewingAsId: null,

  login: (profileId, _password) => {
    const profile = teamProfiles.find((p) => p.id === profileId);
    if (!profile) {
      set({ error: 'User not found' });
      return false;
    }
    set({
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        role: profile.role,
        avatar: profile.avatar,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      isAuthenticated: true,
      viewingAsId: null,
      error: null,
    });
    const { keepMockData } = useSettingsStore.getState();

    if (keepMockData) {
      // ── Mock data ON: populate in-memory stores only, never touch DB ──
      useNotificationStore.getState().restoreMockData(profile.id, profile.name);
      useChatStore.getState().restoreMockData(profile.id);
      useTaskStore.getState().restoreMockData();
      useProjectStore.getState().restoreMockData();
    } else if (isDbConnected()) {
      // ── Mock data OFF + DB connected: hydrate from Supabase ──
      useTaskStore.getState().hydrateFromDb(profile.id);
      useChatStore.getState().hydrateFromDb(profile.id);
      // Future: projectStore.hydrateFromDb, notificationStore.hydrateFromDb, etc.
    } else {
      // ── Mock data OFF + no DB: start with clean empty state ──
      useTaskStore.getState().clearMockData();
      useProjectStore.getState().clearMockData();
      useChatStore.getState().clearMockData();
      useNotificationStore.getState().clearMockData();
      get().clearViewAs();
    }
    return true;
  },

  setUser: (user) =>
    set({ user, isAuthenticated: true, error: null }),

  logout: () =>
    set({ user: null, isAuthenticated: false, viewingAsId: null, error: null }),

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  // Quick View — peek at a member's data without switching identity
  viewAs: (profileId) => {
    // Can only view as someone else if you're admin/manager
    if (!get().canManageTeam()) return;
    // If selecting yourself, clear the view
    if (profileId === get().user?.id) {
      set({ viewingAsId: null });
    } else {
      set({ viewingAsId: profileId });
    }
  },

  clearViewAs: () => set({ viewingAsId: null }),

  getViewingProfile: () => {
    const id = get().viewingAsId;
    if (!id) return null;
    return teamProfiles.find((p) => p.id === id) || null;
  },

  isViewingOther: () => get().viewingAsId !== null,

  // When viewing as another user, scope data to them; otherwise scope to self
  getEffectiveUserId: () => {
    const viewingId = get().viewingAsId;
    if (viewingId) return viewingId;
    return get().user?.id || '';
  },

  // RBAC — always based on the REAL logged-in user
  isAdmin: () => get().user?.role === 'admin',
  isManager: () => get().user?.role === 'manager',
  isMember: () => get().user?.role === 'user',

  canManageTeam: () => {
    const role = get().user?.role;
    return role === 'admin' || role === 'manager';
  },

  canDeleteTasks: () => {
    const role = get().user?.role;
    return role === 'admin' || role === 'manager';
  },

  canViewAllTasks: () => {
    const role = get().user?.role;
    // When viewing as someone, show only their tasks
    if (get().viewingAsId) return false;
    return role === 'admin' || role === 'manager';
  },

  canInviteMembers: () => get().user?.role === 'admin',

  canAssignTasks: () => {
    const role = get().user?.role;
    return role === 'admin' || role === 'manager';
  },
}));
