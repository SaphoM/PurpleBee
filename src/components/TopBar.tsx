import React from 'react';
import clsx from 'clsx';
import { Search, Bell, Settings, Zap, ChevronDown, Shield, Crown, User, ArrowRightLeft, Eye, X, Check, CheckCheck, Trash2, BellOff, MessageCircle, FileText, FolderKanban, Users } from 'lucide-react';
import { useNotificationStore, notificationCategoryConfig } from '@stores/notificationStore';
import { useUserStore } from '@stores/userStore';
import { useChatStore } from '@stores/chatStore';
import { useSettingsStore } from '@stores/settingsStore';
import { useUIStore } from '@stores/uiStore';
import { useTaskStore } from '@stores/taskStore';
import { useProjectStore } from '@stores/projectStore';
import { Notification, NotificationType } from '@/types/index';
import { Tip } from '@components/Tip';

// ── Search result types ───────────────────────────────────────────────
interface SearchResult {
  id: string;
  label: string;
  subtitle: string;
  category: 'task' | 'project' | 'person';
  page: string; // hash to navigate to
}


const roleBadgeConfig: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  admin: { label: 'Admin', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700/50', icon: <Shield size={14} className="text-red-500" /> },
  manager: { label: 'Manager', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-700/50', icon: <Crown size={14} className="text-amber-500" /> },
  user: { label: 'Member', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700/50', icon: <User size={14} className="text-blue-500" /> },
};

// ── Relative time helper ───────────────────────────────────────────────
const relativeTime = (date: Date): string => {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

// ── Group order for notification panel ─────────────────────────────────
const groupOrder = ['Tasks', 'Social', 'AI', 'System'];

export const TopBar: React.FC = () => {
  const {
    notifications, unreadCount, markAsRead, markAllAsRead,
    markGroupAsRead, removeNotification, clearRead, getGroupedNotifications,
    preferences: notifPrefs, hydrateFromDb: refreshNotifications,
  } = useNotificationStore();
  const { user, viewAs, clearViewAs, isViewingOther, getViewingProfile, canManageTeam } = useUserStore();
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const keepMockData = useSettingsStore((s) => s.keepMockData);
  const showTips = useSettingsStore((s) => s.showTips);
  const dockChat = useChatStore((s) => s.dockChat);
  const tasks = useTaskStore((s) => s.tasks);
  const projects = useProjectStore((s) => s.projects);
  const teamMembersChat = useChatStore((s) => s.teamMembers);
  const assignableMembers = useUserStore((s) => s.assignableMembers);
  const [showNotifications, setShowNotifications] = React.useState(false);
  // Refresh from DB each time the bell is opened in live mode
  React.useEffect(() => {
    if (showNotifications && !keepMockData && user?.id) {
      refreshNotifications(user.id);
    }
  }, [showNotifications]);
  const [showRoleSwitcher, setShowRoleSwitcher] = React.useState(false);
  const [notifFilter, setNotifFilter] = React.useState<'all' | 'unread'>('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showSearchResults, setShowSearchResults] = React.useState(false);
  const searchRef = React.useRef<HTMLDivElement>(null);
  const roleRef = React.useRef<HTMLDivElement>(null);
  const notifRef = React.useRef<HTMLDivElement>(null);

  // ── Global search logic ─────────────────────────────────────────────
  const searchResults = React.useMemo((): SearchResult[] => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || q.length < 2) return [];

    const results: SearchResult[] = [];

    // Search tasks
    tasks.forEach((task) => {
      if (task.title.toLowerCase().includes(q) || task.description?.toLowerCase().includes(q)) {
        results.push({
          id: task.id,
          label: task.title,
          subtitle: `${task.status} · ${task.priority} priority`,
          category: 'task',
          page: '#tasks',
        });
      }
    });

    // Search projects
    projects.forEach((project) => {
      if (project.name.toLowerCase().includes(q) || project.description?.toLowerCase().includes(q)) {
        results.push({
          id: project.id,
          label: project.name,
          subtitle: project.description || 'Project',
          category: 'project',
          page: '#projects',
        });
      }
    });

    // Search team members
    teamMembersChat.forEach((member) => {
      if (member.name.toLowerCase().includes(q)) {
        results.push({
          id: member.userId,
          label: member.name,
          subtitle: member.role === 'admin' ? 'Admin' : 'Member',
          category: 'person',
          page: '#team',
        });
      }
    });

    // Also search assignableMembers (always available)
    if (results.filter((r) => r.category === 'person').length === 0) {
      assignableMembers.forEach((profile) => {
        if (profile.name.toLowerCase().includes(q) || profile.email.toLowerCase().includes(q)) {
          results.push({
            id: profile.id,
            label: profile.name,
            subtitle: `${profile.title} · ${profile.department}`,
            category: 'person',
            page: '#team',
          });
        }
      });
    }

    return results.slice(0, 10); // Limit to 10 results
  }, [searchQuery, tasks, projects, teamMembersChat]);

  const handleSearchSelect = (result: SearchResult) => {
    window.location.hash = result.page;
    setSearchQuery('');
    setShowSearchResults(false);
  };

  const categoryIcon = (cat: SearchResult['category']) => {
    switch (cat) {
      case 'task': return <FileText size={14} className="text-purple-500" />;
      case 'project': return <FolderKanban size={14} className="text-blue-500" />;
      case 'person': return <Users size={14} className="text-green-500" />;
    }
  };

  const categoryLabel = (cat: SearchResult['category']) => {
    switch (cat) {
      case 'task': return 'Tasks';
      case 'project': return 'Projects';
      case 'person': return 'People';
    }
  };

  // Close dropdowns on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (roleRef.current && !roleRef.current.contains(e.target as Node)) {
        setShowRoleSwitcher(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Grouped & filtered notifications
  const grouped = getGroupedNotifications();
  const filteredGrouped = React.useMemo(() => {
    const result: Record<string, Notification[]> = {};
    for (const [group, items] of Object.entries(grouped)) {
      const filtered = notifFilter === 'unread' ? items.filter((n) => !n.read) : items;
      if (filtered.length > 0) result[group] = filtered;
    }
    return result;
  }, [grouped, notifFilter]);

  const sortedGroups = groupOrder.filter((g) => filteredGrouped[g]);

  return (
    <header className={clsx(
      'fixed top-0 right-0 left-0 z-20 transition-[left] duration-300',
      sidebarCollapsed ? 'lg:left-[4.5rem]' : 'lg:left-64',
      'bg-white border-b border-gray-200',
      'dark:bg-slate-900 dark:border-slate-800'
    )}>
      <div className="px-3 sm:px-4 md:px-6 flex flex-wrap lg:flex-nowrap items-center justify-between py-2 lg:py-0 lg:h-20">
        {/* Spacer for hamburger button on mobile */}
        <div className="order-1 w-10 lg:hidden" />
        {/* Search Bar — second row on mobile, inline on desktop */}
        <div ref={searchRef} className="order-3 lg:order-1 w-full lg:w-auto lg:flex-1 max-w-2xl relative pb-2 pt-1 lg:py-0 ml-0 lg:ml-0">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => { if (searchQuery.trim().length >= 2) setShowSearchResults(true); }}
              placeholder="Search tasks, projects, people..."
              className={clsx(
                'w-full rounded-lg',
                'bg-gray-100 border border-gray-200 text-gray-800 placeholder-gray-400',
                'dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-500',
                'pl-10 pr-4 py-2.5 text-sm',
                'focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20',
                'transition-all duration-200'
              )}
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setShowSearchResults(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showSearchResults && searchQuery.trim().length >= 2 && (
            <div className={clsx(
              'absolute top-full left-0 right-0 mt-2 rounded-xl shadow-2xl overflow-hidden z-50 max-h-[400px] overflow-y-auto',
              'bg-white border border-gray-200',
              'dark:bg-slate-800 dark:border-slate-700'
            )}>
              {searchResults.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Search size={24} className="mx-auto text-gray-300 dark:text-slate-600 mb-2" />
                  <p className="text-sm text-gray-500 dark:text-slate-400">No results for "{searchQuery}"</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Try searching for tasks, projects, or team members</p>
                </div>
              ) : (
                <div className="py-2">
                  {/* Group results by category */}
                  {(['task', 'project', 'person'] as const).map((cat) => {
                    const catResults = searchResults.filter((r) => r.category === cat);
                    if (catResults.length === 0) return null;
                    return (
                      <div key={cat}>
                        <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                          {categoryLabel(cat)}
                        </div>
                        {catResults.map((result) => (
                          <button
                            key={result.id}
                            onClick={() => handleSearchSelect(result)}
                            className={clsx(
                              'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                              'hover:bg-gray-50 dark:hover:bg-slate-700/50'
                            )}
                          >
                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                              {categoryIcon(result.category)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">{result.label}</p>
                              <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{result.subtitle}</p>
                            </div>
                            <span className="text-[10px] text-gray-400 dark:text-slate-500 flex-shrink-0">
                              {result.page.replace('#', '')}
                            </span>
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Actions */}
        <div className="order-2 flex items-center gap-2 sm:gap-4 ml-auto">
          {/* Notifications */}
          <div ref={notifRef} className="relative">
            <Tip content="View notifications — assignments, mentions, and updates" position="bottom" beacon>
              <button
                onClick={() => notifPrefs.inApp && setShowNotifications(!showNotifications)}
                className={clsx(
                  'relative p-2.5 rounded-lg transition-colors',
                  !notifPrefs.inApp
                    ? 'text-gray-400 dark:text-slate-500 cursor-default'
                    : showNotifications
                      ? 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                )}
                aria-label="Notifications"
              >
                {notifPrefs.inApp ? <Bell size={20} /> : <BellOff size={20} />}
                {notifPrefs.inApp && unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            </Tip>

            {/* ── Notification Dropdown ── */}
            {showNotifications && notifPrefs.inApp && (
              <div className={clsx(
                'fixed sm:absolute top-[4.5rem] sm:top-full right-2 sm:right-0 sm:mt-2 w-[calc(100vw-1rem)] sm:w-[420px] rounded-2xl shadow-2xl overflow-hidden z-50',
                'bg-white border border-gray-200',
                'dark:bg-slate-800 dark:border-slate-700'
              )}>
                {/* Header */}
                <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100">Notifications</h3>
                      {unreadCount > 0 && (
                        <span className="min-w-[20px] h-[20px] px-1.5 flex items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 text-[10px] font-bold">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {unreadCount > 0 && (
                        <button
                          onClick={() => markAllAsRead()}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-900/20 transition-colors"
                          title="Mark all as read"
                        >
                          <CheckCheck size={12} />
                          Mark all read
                        </button>
                      )}
                      {notifications.some((n) => n.read) && (
                        <button
                          onClick={() => clearRead()}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                          title="Clear read notifications"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Filter tabs */}
                  <div className="flex gap-1 bg-gray-100 dark:bg-slate-700/50 rounded-lg p-0.5">
                    {(['all', 'unread'] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setNotifFilter(f)}
                        className={clsx(
                          'flex-1 py-1.5 rounded-md text-[11px] font-semibold transition-all capitalize',
                          notifFilter === f
                            ? 'bg-white text-gray-900 shadow-sm dark:bg-slate-600 dark:text-slate-100'
                            : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
                        )}
                      >
                        {f === 'unread' ? `Unread (${unreadCount})` : 'All'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notification List */}
                <div className="max-h-[460px] overflow-y-auto">
                  {sortedGroups.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4">
                      <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-slate-700/50 flex items-center justify-center mb-3">
                        <BellOff size={22} className="text-gray-400 dark:text-slate-500" />
                      </div>
                      <p className="text-sm font-medium text-gray-500 dark:text-slate-400">
                        {notifFilter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">You're all caught up!</p>
                    </div>
                  ) : (
                    sortedGroups.map((groupName) => {
                      const items = filteredGrouped[groupName];
                      const groupUnread = items.filter((n) => !n.read).length;
                      return (
                        <div key={groupName}>
                          {/* Group Header */}
                          <div className="flex items-center justify-between px-5 py-2 bg-gray-50/80 dark:bg-slate-800/80 sticky top-0 z-10">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                              {groupName}
                              {groupUnread > 0 && (
                                <span className="ml-1.5 text-purple-500 dark:text-purple-400">
                                  ({groupUnread} new)
                                </span>
                              )}
                            </span>
                            {groupUnread > 0 && (
                              <button
                                onClick={() => {
                                  // Mark all in this group as read
                                  const types = items.map((n) => n.type);
                                  const uniqueTypes = [...new Set(types)];
                                  uniqueTypes.forEach((t) => markGroupAsRead(t));
                                }}
                                className="text-[10px] font-semibold text-gray-400 hover:text-purple-600 dark:text-slate-500 dark:hover:text-purple-400 transition-colors"
                              >
                                Mark read
                              </button>
                            )}
                          </div>

                          {/* Notification Items */}
                          {items.map((notif) => {
                            const cfg = notificationCategoryConfig[notif.type];
                            return (
                              <div
                                key={notif.id}
                                className={clsx(
                                  'flex items-start gap-3 px-5 py-3 transition-colors cursor-pointer group',
                                  !notif.read
                                    ? 'bg-purple-50/40 hover:bg-purple-50 dark:bg-purple-900/10 dark:hover:bg-purple-900/20'
                                    : 'hover:bg-gray-50 dark:hover:bg-slate-700/30'
                                )}
                                onClick={() => {
                                  markAsRead(notif.id);
                                  if (notif.actionUrl) {
                                    window.location.hash = notif.actionUrl.replace('#', '');
                                    setShowNotifications(false);
                                  } else if (notif.conversationId) {
                                    dockChat(notif.conversationId);
                                    setShowNotifications(false);
                                  } else if (notif.taskId) {
                                    window.location.hash = `tasks?taskId=${notif.taskId}`;
                                    setShowNotifications(false);
                                  }
                                }}
                              >
                                {/* Icon */}
                                <div className={clsx(
                                  'flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-base',
                                  cfg?.bgColor || 'bg-gray-100 dark:bg-slate-700/50'
                                )}>
                                  {cfg?.emoji || '🔔'}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className={clsx(
                                      'text-xs leading-relaxed',
                                      !notif.read
                                        ? 'font-semibold text-gray-900 dark:text-slate-100'
                                        : 'text-gray-600 dark:text-slate-300'
                                    )}>
                                      {notif.message}
                                    </p>

                                    {/* Actions — show on hover */}
                                    <div className="flex-shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                      {!notif.read && (
                                        <button
                                          onClick={(e) => { e.stopPropagation(); markAsRead(notif.id); }}
                                          className="p-1 rounded text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                                          title="Mark as read"
                                        >
                                          <Check size={12} />
                                        </button>
                                      )}
                                      <button
                                        onClick={(e) => { e.stopPropagation(); removeNotification(notif.id); }}
                                        className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                        title="Dismiss"
                                      >
                                        <X size={12} />
                                      </button>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 mt-1">
                                    <span className={clsx(
                                      'text-[10px] font-semibold',
                                      cfg?.color || 'text-gray-500'
                                    )}>
                                      {cfg?.label}
                                    </span>
                                    <span className="text-[10px] text-gray-400 dark:text-slate-500">
                                      {relativeTime(notif.createdAt)}
                                    </span>
                                    {!notif.read && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500 flex-shrink-0" />
                                    )}
                                    {(notif.actionUrl || notif.conversationId || notif.taskId) && (
                                      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-purple-500 dark:text-purple-400">
                                        {notif.conversationId && !notif.actionUrl ? (
                                          <><MessageCircle size={10} /> Open chat</>
                                        ) : notif.taskId ? (
                                          <><Eye size={10} /> View task</>
                                        ) : (
                                          <><Eye size={10} /> Open</>
                                        )}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50">
                  <a
                    href="#settings"
                    onClick={() => setShowNotifications(false)}
                    className="flex items-center justify-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                  >
                    <Settings size={12} />
                    Notification Settings
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Mock Data Indicator */}
          {keepMockData && (
            <a
              href="#settings?tab=general"
              title="Using demo data — nothing is saved to the database. Click to manage in Settings."
              className={clsx(
                'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all',
                'bg-amber-50 border-amber-200 text-amber-700',
                'dark:bg-amber-900/20 dark:border-amber-700/40 dark:text-amber-400',
                'hover:bg-amber-100 dark:hover:bg-amber-900/30',
              )}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              </span>
              <span className="text-[11px] font-semibold hidden sm:inline">Demo Mode</span>
            </a>
          )}

          {/* Settings */}
          <Tip content="Notifications, appearance, and account settings" position="bottom">
            <a
              href="#settings"
              className={clsx(
                'p-2.5 rounded-lg transition-colors',
                'text-gray-500 hover:bg-gray-100 hover:text-gray-700',
                'dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
              )}
              aria-label="Settings"
            >
              <Settings size={20} />
            </a>
          </Tip>

          {/* Role Switcher — admin/manager only, hidden when mock data is off */}
          {canManageTeam() && keepMockData && <div ref={roleRef} className="relative hidden sm:block">
            {/* "Viewing as" indicator OR default role badge */}
            {isViewingOther() ? (
              <div className="flex items-center gap-2">
                <div className={clsx(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all',
                  'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-700/50'
                )}>
                  <Eye size={14} className="text-purple-500" />
                  <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                    Viewing as {getViewingProfile()?.name?.split(' ')[0]}
                  </span>
                  <button
                    onClick={() => clearViewAs()}
                    className="p-0.5 rounded hover:bg-purple-200 dark:hover:bg-purple-800/40 transition-colors"
                    title="Return to your view"
                  >
                    <X size={14} className="text-purple-500" />
                  </button>
                </div>
                <button
                  onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
                  className={clsx(
                    'p-2 rounded-lg border transition-all',
                    'bg-gray-50 border-gray-200 hover:bg-gray-100',
                    'dark:bg-slate-800/50 dark:border-slate-700 dark:hover:bg-slate-700/50'
                  )}
                  title="Switch view"
                >
                  <ArrowRightLeft size={14} className="text-gray-400 dark:text-slate-500" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
                className={clsx(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all',
                  user ? roleBadgeConfig[user.role]?.bg : 'bg-gray-50 border-gray-200'
                )}
              >
                {user && roleBadgeConfig[user.role]?.icon}
                <span className={clsx('text-sm font-medium', user ? roleBadgeConfig[user.role]?.color : '')}>
                  {user ? roleBadgeConfig[user.role]?.label : 'Guest'} View
                </span>
                <ArrowRightLeft size={14} className="text-gray-400 dark:text-slate-500" />
              </button>
            )}

            {showRoleSwitcher && (
              <div className={clsx(
                'absolute top-full right-0 mt-2 w-64 sm:w-72 rounded-xl shadow-xl overflow-hidden z-50',
                'bg-white border border-gray-200',
                'dark:bg-slate-800 dark:border-slate-700'
              )}>
                <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700">
                  <p className="text-xs font-semibold text-gray-900 dark:text-slate-100">Switch View</p>
                  <p className="text-[10px] text-gray-400 dark:text-slate-500">See the app from a different role's perspective</p>
                </div>
                <div className="py-1 max-h-64 overflow-y-auto">
                  {assignableMembers.map((profile) => {
                    const isLoggedIn = user?.id === profile.id;
                    const isViewing = isViewingOther() ? getViewingProfile()?.id === profile.id : isLoggedIn;
                    const cfg = roleBadgeConfig[profile.role];
                    return (
                      <button
                        key={profile.id}
                        onClick={() => { viewAs(profile.id); setShowRoleSwitcher(false); }}
                        className={clsx(
                          'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                          isViewing
                            ? 'bg-purple-50 dark:bg-purple-900/20'
                            : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'
                        )}
                      >
                        <img src={profile.avatar} alt={profile.name} className="w-8 h-8 rounded-full flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-gray-800 dark:text-slate-200 truncate">{profile.name}</span>
                            {isLoggedIn && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" title="You" />}
                            {isViewing && !isLoggedIn && (
                              <span className="text-[9px] font-bold text-purple-500 dark:text-purple-400 flex-shrink-0">VIEWING</span>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-400 dark:text-slate-500">{profile.title}</span>
                        </div>
                        <span className={clsx(
                          'px-1.5 py-0.5 rounded text-[9px] font-bold uppercase flex-shrink-0',
                          cfg?.color.replace('text-', 'bg-').replace('-600', '-100').replace('-400', '-900/30'),
                          cfg?.color
                        )}>
                          {cfg?.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>}
        </div>
      </div>

    </header>
  );
};
