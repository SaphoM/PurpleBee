import { create } from 'zustand';
import { Notification, NotificationType } from '@/types/index';
import { v4 as uuidv4 } from 'uuid';
import { notificationDb } from '@/lib/dataService';
import { useSettingsStore } from '@stores/settingsStore';

/**
 * Returns true when mock/sample data mode is active.
 * When true, all DB reads and writes are skipped — data lives in-memory only.
 */
const isMockMode = () => useSettingsStore.getState().keepMockData;

// ─── Notification preferences ───────────────────────────────────────────
export interface NotificationPreferences {
  // Per-category toggles
  taskAssigned: boolean;
  taskDue: boolean;
  taskCompleted: boolean;
  projectInvite: boolean;
  mentions: boolean;
  updates: boolean;
  aiInsights: boolean;

  // Delivery
  inApp: boolean;
  email: boolean;
  sound: boolean;
  desktop: boolean;

  // Quiet hours
  quietHoursEnabled: boolean;
  quietHoursStart: string; // "22:00"
  quietHoursEnd: string;   // "07:00"
}

const defaultPreferences: NotificationPreferences = {
  taskAssigned: true,
  taskDue: true,
  taskCompleted: true,
  projectInvite: true,
  mentions: true,
  updates: true,
  aiInsights: true,
  inApp: true,
  email: true,
  sound: true,
  desktop: false,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
};

// ─── Category config (shared with UI) ───────────────────────────────────
export const notificationCategoryConfig: Record<
  NotificationType,
  { label: string; group: string; color: string; bgColor: string; emoji: string }
> = {
  'task-assigned': {
    label: 'Task Assigned',
    group: 'Tasks',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    emoji: '📋',
  },
  'task-due': {
    label: 'Due Soon',
    group: 'Tasks',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    emoji: '⏰',
  },
  'task-completed': {
    label: 'Completed',
    group: 'Tasks',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    emoji: '✅',
  },
  'project-invite': {
    label: 'Project Invite',
    group: 'Tasks',
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-100 dark:bg-violet-900/30',
    emoji: '📂',
  },
  'mention': {
    label: 'Mention',
    group: 'Social',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    emoji: '💬',
  },
  'update': {
    label: 'Update',
    group: 'System',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-slate-700/50',
    emoji: '🔄',
  },
  'ai-insight': {
    label: 'AI Insight',
    group: 'AI',
    color: 'text-pink-600 dark:text-pink-400',
    bgColor: 'bg-pink-100 dark:bg-pink-900/30',
    emoji: '🤖',
  },
};

// ─── Store ──────────────────────────────────────────────────────────────
interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  preferences: NotificationPreferences;

  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  markGroupAsRead: (type: NotificationType) => void;
  clearAll: () => void;
  clearRead: () => void;
  loadForUser: (userId: string, userName: string) => void;

  // Preferences
  updatePreferences: (prefs: Partial<NotificationPreferences>) => void;
  resetPreferences: () => void;

  // Mock data control
  clearMockData: () => void;
  restoreMockData: (userId: string, userName: string) => void;
  hydrateFromDb: (userId: string) => Promise<void>;

  // Computed helpers
  getGroupedNotifications: () => Record<string, Notification[]>;
  getUnreadByType: () => Record<NotificationType, number>;
}

// ─── User-specific notification generator ──────────────────────────────
interface TeamMember {
  id: string;
  name: string;
  firstName: string;
}

const teamMembers: TeamMember[] = [
  { id: 'user-1', name: 'Sapho Maqhwazima', firstName: 'Sapho' },
  { id: 'user-2', name: 'Thando Nkosi', firstName: 'Thando' },
  { id: 'user-3', name: 'Lerato Molefe', firstName: 'Lerato' },
  { id: 'user-4', name: 'Kabelo Dlamini', firstName: 'Kabelo' },
  { id: 'user-5', name: 'Naledi Khumalo', firstName: 'Naledi' },
];

function getOtherMembers(userId: string): TeamMember[] {
  return teamMembers.filter((m) => m.id !== userId);
}

function generateNotificationsForUser(userId: string, userName: string): Notification[] {
  const now = Date.now();
  const min = 60 * 1000;
  const hr = 60 * min;
  const others = getOtherMembers(userId);
  const firstName = userName.split(' ')[0];

  const pick = (arr: TeamMember[]) => arr[Math.floor(Math.random() * arr.length)];
  const o1 = others[0], o2 = others[1], o3 = others[2], o4 = others[3 % others.length];

  const notifications: Notification[] = [
    {
      id: uuidv4(),
      userId,
      type: 'task-assigned',
      title: 'New task assigned to you',
      message: `${o1.firstName} assigned "Prepare quarterly report" to you`,
      read: false,
      createdAt: new Date(now - 12 * min),
      taskId: '1',
      actionUrl: '#tasks?taskId=1',
    },
    {
      id: uuidv4(),
      userId,
      type: 'task-due',
      title: 'Task due tomorrow',
      message: '"Update vendor contracts" is due in 1 day',
      read: false,
      createdAt: new Date(now - 1 * hr),
      taskId: '2',
      actionUrl: '#tasks?taskId=2',
    },
    {
      id: uuidv4(),
      userId,
      type: 'task-completed',
      title: 'Task completed',
      message: `${o2.firstName} completed "Finalise brand guidelines"`,
      read: false,
      createdAt: new Date(now - 2 * hr),
      taskId: '5',
      actionUrl: '#tasks?taskId=5',
    },
    {
      id: uuidv4(),
      userId,
      type: 'task-assigned',
      title: 'Task reassigned',
      message: `${o3.firstName} reassigned "Onboard new team members" to ${o4.firstName}`,
      read: true,
      createdAt: new Date(now - 5 * hr),
      taskId: '4',
      actionUrl: '#tasks?taskId=4',
    },
    {
      id: uuidv4(),
      userId,
      type: 'project-invite',
      title: 'Added to project',
      message: `You've been added to a new project — 2 tasks assigned to you`,
      read: false,
      createdAt: new Date(now - 20 * min),
      actionUrl: '#projects',
    },
    {
      id: uuidv4(),
      userId,
      type: 'mention',
      title: 'You were mentioned',
      message: `${o3.firstName} mentioned you in #general: "Loop in @${firstName} on the vendor review"`,
      read: false,
      createdAt: new Date(now - 35 * min),
      conversationId: 'conv-team-general',
    },
    {
      id: uuidv4(),
      userId,
      type: 'mention',
      title: 'Reply in thread',
      message: `${o1.firstName} replied to your message in the team chat`,
      read: true,
      createdAt: new Date(now - 8 * hr),
      conversationId: 'conv-team-general',
    },
    {
      id: uuidv4(),
      userId,
      type: 'update',
      title: 'Sprint review tomorrow',
      message: 'Weekly sprint review is scheduled for tomorrow at 10:00 AM',
      read: false,
      createdAt: new Date(now - 3 * hr),
      actionUrl: '#calendar',
    },
    {
      id: uuidv4(),
      userId,
      type: 'update',
      title: 'New team member',
      message: `${o4.firstName} ${teamMembers.find(m => m.id === o4.id)?.name.split(' ')[1] || ''} has joined the team`,
      read: true,
      createdAt: new Date(now - 24 * hr),
      actionUrl: '#team',
    },
    {
      id: uuidv4(),
      userId,
      type: 'ai-insight',
      title: 'Productivity insight',
      message: 'You completed 40% more tasks this week compared to last. Keep the momentum!',
      read: false,
      createdAt: new Date(now - 4 * hr),
      actionUrl: '#ai-insights',
    },
    {
      id: uuidv4(),
      userId,
      type: 'ai-insight',
      title: 'Bottleneck detected',
      message: '3 tasks in "Review" for over 48 hours. Consider addressing the review queue.',
      read: false,
      createdAt: new Date(now - 6 * hr),
      actionUrl: '#ai-insights',
    },
  ];

  return notifications;
}

// Load persisted notification preferences
function loadNotifPrefs(): NotificationPreferences {
  try {
    const raw = localStorage.getItem('purplebee-notif-prefs');
    if (raw) return { ...defaultPreferences, ...JSON.parse(raw) };
  } catch {}
  return { ...defaultPreferences };
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  preferences: loadNotifPrefs(),

  addNotification: (notification) => {
    const prefs = get().preferences;

    // Check if this notification type is enabled
    const typeMap: Record<NotificationType, keyof NotificationPreferences> = {
      'task-assigned': 'taskAssigned',
      'task-due': 'taskDue',
      'task-completed': 'taskCompleted',
      'project-invite': 'projectInvite',
      'mention': 'mentions',
      'update': 'updates',
      'ai-insight': 'aiInsights',
    };
    if (!prefs[typeMap[notification.type]]) return; // silently skip disabled types

    const newNotification: Notification = {
      ...notification,
      id: uuidv4(),
      createdAt: new Date(),
    };

    set((state) => ({
      notifications: [newNotification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));

    // Persist to DB only when mock mode is OFF. Notifications are user-scoped
    // (each member has their own inbox) — so we write to the recipient's row.
    notificationDb.insert(
      {
        id: newNotification.id,
        userId: newNotification.userId,
        type: newNotification.type,
        title: newNotification.title,
        message: newNotification.message,
        read: newNotification.read,
        actionUrl: newNotification.actionUrl,
      },
      isMockMode(),
    );
  },

  removeNotification: (id) => {
    set((state) => {
      const notification = state.notifications.find((n) => n.id === id);
      return {
        notifications: state.notifications.filter((n) => n.id !== id),
        unreadCount: notification && !notification.read ? state.unreadCount - 1 : state.unreadCount,
      };
    });
  },

  markAsRead: (id) => {
    set((state) => {
      const wasUnread = state.notifications.find((n) => n.id === id && !n.read);
      return {
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        ),
        unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
      };
    });
    notificationDb.markRead(id, isMockMode());
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },

  markGroupAsRead: (type) => {
    set((state) => {
      const unreadOfType = state.notifications.filter((n) => n.type === type && !n.read).length;
      return {
        notifications: state.notifications.map((n) =>
          n.type === type ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - unreadOfType),
      };
    });
  },

  clearAll: () => {
    set({ notifications: [], unreadCount: 0 });
  },

  clearRead: () => {
    set((state) => ({
      notifications: state.notifications.filter((n) => !n.read),
    }));
  },

  loadForUser: (userId, userName) => {
    // Delegates to restoreMockData — same sample data generation.
    get().restoreMockData(userId, userName);
  },

  updatePreferences: (prefs) => {
    const updated = { ...get().preferences, ...prefs };
    set({ preferences: updated });
    try { localStorage.setItem('purplebee-notif-prefs', JSON.stringify(updated)); } catch {}
  },

  resetPreferences: () => {
    set({ preferences: { ...defaultPreferences } });
    try { localStorage.removeItem('purplebee-notif-prefs'); } catch {}
  },

  clearMockData: () => {
    set({ notifications: [], unreadCount: 0 });
  },

  restoreMockData: (userId, userName) => {
    const notifications = generateNotificationsForUser(userId, userName);
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
    });
  },

  /**
   * Pull the user's notification inbox from Supabase (mock mode OFF only).
   * Each user has their own row scope (user_id = auth.uid()).
   *
   * Always completes — even when the DB returns 0 rows, we set the
   * notifications array (empty) so the UI shows the correct empty state
   * and addNotification can create new ones.
   */
  hydrateFromDb: async (userId: string) => {
    if (isMockMode()) return;
    const rows = await notificationDb.fetchAll(userId, false);
    // rows may be null (DB error) or [] (no notifications yet) — both are fine
    const mapped: Notification[] = (rows as Array<Record<string, any>> || []).map((r) => ({
      id: r.id,
      userId: r.user_id,
      type: r.type as NotificationType,
      title: r.title,
      message: r.message,
      read: !!r.read,
      createdAt: new Date(r.created_at),
      taskId: r.task_id || undefined,
      conversationId: r.conversation_id || undefined,
      actionUrl: r.action_url || undefined,
    }));
    set({
      notifications: mapped,
      unreadCount: mapped.filter((n) => !n.read).length,
    });
  },

  getGroupedNotifications: () => {
    const { notifications } = get();
    const groups: Record<string, Notification[]> = {};
    notifications.forEach((n) => {
      const group = notificationCategoryConfig[n.type]?.group || 'Other';
      if (!groups[group]) groups[group] = [];
      groups[group].push(n);
    });
    return groups;
  },

  getUnreadByType: () => {
    const { notifications } = get();
    const counts = {} as Record<NotificationType, number>;
    notifications.forEach((n) => {
      if (!n.read) {
        counts[n.type] = (counts[n.type] || 0) + 1;
      }
    });
    return counts;
  },
}));
