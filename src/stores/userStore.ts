import { create } from 'zustand';
import { User } from '@/types/index';
import { useNotificationStore } from '@stores/notificationStore';
import { useChatStore } from '@stores/chatStore';
import { useSettingsStore } from '@stores/settingsStore';
import { useTaskStore } from '@stores/taskStore';
import { useProjectStore } from '@stores/projectStore';
import { supabase, isDbConnected } from '@/lib/supabase';
import { authDb } from '@/lib/dataService';

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
  authChecked: boolean; // true once initSession has run
  error: string | null;

  // "View As" — admin/manager peek at a member's dashboard
  viewingAsId: string | null; // null = viewing own data

  // Actions — demo login (Quick Login)
  login: (profileId: string, password: string) => boolean;

  // Actions — Supabase Auth (real email/password)
  loginWithEmail: (email: string, password: string) => Promise<boolean>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<{ success: boolean; needsConfirmation: boolean }>;
  initSession: () => Promise<void>; // Restore session on app load

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

// ── Shared helper: populate stores after any login ────────────────────
function hydrateStores(userId: string, userName: string) {
  const { keepMockData } = useSettingsStore.getState();

  if (keepMockData) {
    // ── Mock data ON: populate in-memory stores only, never touch DB ──
    useNotificationStore.getState().restoreMockData(userId, userName);
    useChatStore.getState().restoreMockData(userId);
    useTaskStore.getState().restoreMockData();
    useProjectStore.getState().restoreMockData();
  } else if (isDbConnected()) {
    // ── Mock data OFF + DB connected: hydrate from Supabase ──
    useTaskStore.getState().hydrateFromDb(userId);
    useChatStore.getState().hydrateFromDb(userId);
    // Future: projectStore.hydrateFromDb, notificationStore.hydrateFromDb, etc.
  } else {
    // ── Mock data OFF + no DB: start with clean empty state ──
    useTaskStore.getState().clearMockData();
    useProjectStore.getState().clearMockData();
    useChatStore.getState().clearMockData();
    useNotificationStore.getState().clearMockData();
  }

  // Always ensure team members are loaded (they're core data, not mock)
  if (useChatStore.getState().teamMembers.length === 0) {
    useChatStore.getState().loadForUser(userId);
  }

  // Always ensure notifications are loaded (essential UX, not just mock)
  if (useNotificationStore.getState().notifications.length === 0) {
    useNotificationStore.getState().loadForUser(userId, userName);
  }
}

export const useUserStore = create<UserStore>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  authChecked: false,
  error: null,
  viewingAsId: null,

  // ── Demo / Quick Login (existing) ──────────────────────────────────
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
    hydrateStores(profile.id, profile.name);
    return true;
  },

  // ── Supabase Auth: email + password sign-in ────────────────────────
  loginWithEmail: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const result = await authDb.signIn(email, password);
      if (!result || !result.user) {
        set({ error: 'Invalid email or password', isLoading: false });
        return false;
      }

      const supaUser = result.user;
      // Fetch profile from profiles table
      const profile = await authDb.getProfile(supaUser.id);
      const name = profile?.name || supaUser.user_metadata?.name || email.split('@')[0];
      const avatar = profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`;
      const role: AppRole = profile?.role || 'user';

      set({
        user: {
          id: supaUser.id,
          email: supaUser.email || email,
          name,
          role,
          avatar,
          createdAt: new Date(supaUser.created_at),
          updatedAt: new Date(),
        },
        isAuthenticated: true,
        viewingAsId: null,
        error: null,
        isLoading: false,
      });

      hydrateStores(supaUser.id, name);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      set({ error: msg, isLoading: false });
      return false;
    }
  },

  // ── Supabase Auth: email + password sign-up ────────────────────────
  signUpWithEmail: async (email, password, name) => {
    set({ isLoading: true, error: null });
    try {
      const result = await authDb.signUp(email, password, name);
      if (!result || !result.user) {
        set({ error: 'Sign-up failed. Please try again.', isLoading: false });
        return { success: false, needsConfirmation: false };
      }

      // If email confirmation is required, user.identities will be empty
      // or session will be null
      const needsConfirmation = !result.session;

      set({ isLoading: false, error: null });
      return { success: true, needsConfirmation };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign-up failed';
      set({ error: msg, isLoading: false });
      return { success: false, needsConfirmation: false };
    }
  },

  // ── Restore session on app load ────────────────────────────────────
  initSession: async () => {
    if (!isDbConnected()) {
      set({ authChecked: true });
      return;
    }
    set({ isLoading: true });
    try {
      const session = await authDb.getSession();
      if (session?.user) {
        const supaUser = session.user;
        const profile = await authDb.getProfile(supaUser.id);
        const name = profile?.name || supaUser.user_metadata?.name || supaUser.email?.split('@')[0] || 'User';
        const avatar = profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`;
        const role: AppRole = profile?.role || 'user';

        set({
          user: {
            id: supaUser.id,
            email: supaUser.email || '',
            name,
            role,
            avatar,
            createdAt: new Date(supaUser.created_at),
            updatedAt: new Date(),
          },
          isAuthenticated: true,
          viewingAsId: null,
          error: null,
        });
        hydrateStores(supaUser.id, name);
      }
    } catch {
      // No session — that's fine, show login
    }
    set({ isLoading: false, authChecked: true });
  },

  setUser: (user) =>
    set({ user, isAuthenticated: true, error: null }),

  logout: () => {
    // Sign out of Supabase if connected
    if (isDbConnected()) {
      authDb.signOut().catch(() => {});
    }
    set({ user: null, isAuthenticated: false, viewingAsId: null, error: null });
  },

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
