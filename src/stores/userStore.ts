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
  pendingPasswordRecovery: boolean; // true when user arrived via password reset email
  error: string | null;

  // "View As" — admin/manager peek at a member's dashboard
  viewingAsId: string | null; // null = viewing own data

  // The team/company the logged-in user belongs to.
  // Every DB write that should be scoped to the company (tasks, projects,
  // conversations, notifications) reads this so the data rolls up correctly.
  currentTeamId: string | null;
  currentTeamName: string | null;

  // Team members who can be assigned tasks (scoped to currentTeamId)
  assignableMembers: TeamProfile[];
  loadAssignableMembers: () => Promise<void>;

  // Ensure the user has a team and stash its id. Auto-creates one if missing.
  ensureTeam: () => Promise<string | null>;
  getCurrentTeamId: () => string | null;

  // Actions — demo login (Quick Login)
  login: (profileId: string, password: string) => boolean;

  // Actions — Supabase Auth (real email/password)
  loginWithEmail: (email: string, password: string) => Promise<boolean>;
  signUpWithEmail: (email: string, password: string, name: string, companyName?: string) => Promise<{ success: boolean; needsConfirmation: boolean }>;
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

  // Returns true when the logged-in session is a demo/quick-login profile
  // (IDs 'user-1' through 'user-5'). Used to gate actions that require a
  // real Supabase account (e.g. disabling mock data).
  isQuickLoginUser: () => boolean;

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
    useTaskStore.getState().restoreMockData(userId);
    useProjectStore.getState().restoreMockData();
  } else {
    // ── Mock data OFF: hydrate from Supabase ──
    // Don't clear stores first — let hydrateFromDb replace state when it
    // resolves. This avoids a flash of empty state while the async fetch
    // runs. Stores that don't get DB data will fall back to seed/localStorage.
    if (isDbConnected()) {
      useTaskStore.getState().hydrateFromDb(userId);
      useChatStore.getState().hydrateFromDb(userId);
      useProjectStore.getState().hydrateFromDb(userId);
      useNotificationStore.getState().hydrateFromDb(userId);
    }
  }

  // Ensure team members & notifications are loaded when mock mode is ON.
  // When mock mode is OFF these contain generated/seed data, so skip them.
  if (keepMockData) {
    if (useChatStore.getState().teamMembers.length === 0) {
      useChatStore.getState().loadForUser(userId);
    }
    if (useNotificationStore.getState().notifications.length === 0) {
      useNotificationStore.getState().loadForUser(userId, userName);
    }
  }

}

export const useUserStore = create<UserStore>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  authChecked: false,
  pendingPasswordRecovery: false,
  error: null,
  viewingAsId: null,
  currentTeamId: null,
  currentTeamName: null,
  assignableMembers: [],

  // ── Load team members who can be assigned tasks ───────────────────
  loadAssignableMembers: async () => {
    const state = get();

    if (!isDbConnected() || !state.currentTeamId) {
      // No DB or no team resolved yet: use hardcoded demo profiles
      set({ assignableMembers: teamProfiles });
      return;
    }

    // Real mode: fetch accepted team_members + pending invitees, scoped to currentTeamId
    try {
      // 1. Accepted members from team_members + profiles
      const { data: tmData, error: tmError } = await supabase!
        .from('team_members')
        .select('user_id, role, profiles!inner(id, name, email, avatar, role, title, department)')
        .eq('team_id', state.currentTeamId);

      if (tmError) {
        console.error('[userStore] loadAssignableMembers team_members query', tmError);
      }

      const members: TeamProfile[] = (tmData || []).map((row: any) => {
        const p = row.profiles;
        return {
          id: p.id,
          name: p.name || p.email?.split('@')[0] || 'User',
          email: p.email || '',
          avatar: p.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name || p.id}`,
          role: (row.role || p.role || 'user') as AppRole,
          title: p.title || '',
          department: p.department || '',
        };
      });

      const seenIds = new Set(members.map((m) => m.id));

      // 2. Pending invitees — they've been invited to this team but haven't
      //    fully accepted yet. Include them so tasks can be pre-assigned.
      //    Join with profiles to get name/avatar if they've already signed up.
      const { data: inviteData, error: inviteError } = await supabase!
        .from('invites')
        .select('email, role, accepted_by')
        .eq('team_id', state.currentTeamId)
        .eq('status', 'pending');

      if (!inviteError && inviteData) {
        for (const inv of inviteData) {
          // Look up the profile for this invited email
          const { data: profileRow } = await supabase!
            .from('profiles')
            .select('id, name, email, avatar, role, title, department')
            .eq('email', inv.email)
            .single();

          if (profileRow && !seenIds.has(profileRow.id)) {
            seenIds.add(profileRow.id);
            members.push({
              id: profileRow.id,
              name: profileRow.name || profileRow.email?.split('@')[0] || 'User',
              email: profileRow.email || inv.email,
              avatar: profileRow.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profileRow.name || profileRow.id}`,
              role: (inv.role || profileRow.role || 'user') as AppRole,
              title: profileRow.title || '',
              department: profileRow.department || '',
            });
          }
        }
      }

      // Fallback: at least include the current user
      if (members.length === 0 && state.user) {
        members.push({
          id: state.user.id,
          name: state.user.name,
          email: state.user.email,
          avatar: state.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${state.user.name}`,
          role: (state.user.role as AppRole) || 'user',
          title: '',
          department: '',
        });
      }

      set({ assignableMembers: members });
    } catch (err) {
      console.error('[userStore] loadAssignableMembers error', err);
    }
  },

  ensureTeam: async () => {
    const { user } = get();
    if (!user) return null;
    if (get().currentTeamId) return get().currentTeamId;
    if (!isDbConnected()) return null;
    try {
      const team = await authDb.getOrCreateTeam(user.id, user.name);
      set({ currentTeamId: team.team_id, currentTeamName: team.team?.name || null });
      return team.team_id;
    } catch (err) {
      console.error('[userStore] ensureTeam failed', err);
      return null;
    }
  },

  getCurrentTeamId: () => get().currentTeamId,

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
      const avatar = profile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`;
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

      // Resolve (or auto-create) the team this user belongs to so every
      // DB write can be scoped to the company.
      try {
        const team = await authDb.getOrCreateTeam(supaUser.id, name);
        set({ currentTeamId: team.team_id, currentTeamName: team.team?.name || null });
        // Now that team is resolved, load real assignable members
        await get().loadAssignableMembers();
        // Re-hydrate chat + projects with team context so team members
        // and team-scoped projects are loaded correctly
        const { keepMockData } = useSettingsStore.getState();
        if (!keepMockData && isDbConnected()) {
          useChatStore.getState().hydrateFromDb(supaUser.id);
          useProjectStore.getState().hydrateFromDb(supaUser.id);
        }
      } catch (err) {
        console.warn('[userStore] could not resolve team on login', err);
        // Fallback to demo profiles
        get().loadAssignableMembers();
      }
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      set({ error: msg, isLoading: false });
      return false;
    }
  },

  // ── Supabase Auth: email + password sign-up ────────────────────────
  signUpWithEmail: async (email, password, name, companyName?) => {
    set({ isLoading: true, error: null });
    try {
      const result = await authDb.signUp(email, password, name, companyName);
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

    // Listen for PASSWORD_RECOVERY event from Supabase Auth.
    // This fires when a user clicks the reset-password link in their email.
    // We set a flag so App.tsx can show the reset form instead of the dashboard.
    if (supabase) {
      supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') {
          set({ pendingPasswordRecovery: true });
        }
      });
    }

    try {
      const session = await authDb.getSession();
      if (session?.user) {
        const supaUser = session.user;
        const profile = await authDb.getProfile(supaUser.id);
        const name = profile?.name || supaUser.user_metadata?.name || supaUser.email?.split('@')[0] || 'User';
        const avatar = profile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`;
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

        // Resolve the team this user belongs to so every DB write can be
        // scoped to the company. After accepting a pending invite below
        // we'll re-resolve so the invitee gets attached to the inviter's team.
        try {
          const team = await authDb.getOrCreateTeam(supaUser.id, name);
          set({ currentTeamId: team.team_id, currentTeamName: team.team?.name || null });
          // Now that team is resolved, load real assignable members
          await get().loadAssignableMembers();
          // Re-hydrate chat + projects with team context so team members
          // and team-scoped projects are loaded correctly
          const { keepMockData } = useSettingsStore.getState();
          if (!keepMockData && isDbConnected()) {
            useChatStore.getState().hydrateFromDb(supaUser.id);
            useProjectStore.getState().hydrateFromDb(supaUser.id);
          }
        } catch (err) {
          console.warn('[userStore] could not resolve team on session restore', err);
          // Fallback to demo profiles
          get().loadAssignableMembers();
        }

        // Auto-accept pending invite if user just signed up via invite link
        const pendingToken = sessionStorage.getItem('purplebee-invite-token');
        if (pendingToken) {
          sessionStorage.removeItem('purplebee-invite-token');
          try {
            const { inviteDb } = await import('@/lib/dataService');
            await inviteDb.accept(pendingToken, supaUser.id);
            // Re-resolve team after invite acceptance so the invitee is
            // scoped to the inviter's company (not a freshly auto-created one).
            try {
              const team = await authDb.getTeamForUser(supaUser.id);
              if (team) set({ currentTeamId: team.team_id, currentTeamName: team.team?.name || null });
            } catch {}
            // Send new invitees to onboarding (set password, preferences)
            window.location.hash = '#onboard';
          } catch {
            // Non-critical — invite may already be accepted by the trigger
          }
        }
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
    set({ user: null, isAuthenticated: false, viewingAsId: null, error: null, currentTeamId: null, currentTeamName: null });
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

  isQuickLoginUser: () => {
    const id = get().user?.id;
    if (!id) return false;
    return ['user-1', 'user-2', 'user-3', 'user-4', 'user-5'].includes(id);
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
