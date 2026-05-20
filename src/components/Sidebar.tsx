import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  BarChart3,
  Users,
  MessageSquare,
  Zap,
  Settings,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Shield,
  Crown,
  User,
  FolderKanban,
} from 'lucide-react';
import { useUIStore } from '@stores/uiStore';
import { useUserStore } from '@stores/userStore';
import { useChatStore } from '@stores/chatStore';
import { useProjectStore } from '@stores/projectStore';
import { useTaskStore } from '@stores/taskStore';
import { Tip, showMobileToast } from '@components/Tip';
import { useSettingsStore } from '@stores/settingsStore';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  badge?: number;
  adminOnly?: boolean;
  managerUp?: boolean; // admin + manager
  tip?: string;
}

const navItems: NavItem[] = [
  { icon: <LayoutDashboard size={20} />, label: 'Dashboard', href: '#dashboard', tip: 'Overview of your tasks, productivity, and team activity' },
  { icon: <FolderKanban size={20} />, label: 'Projects', href: '#projects', tip: 'Manage projects, assign tasks, and track progress' },
  { icon: <CheckSquare size={20} />, label: 'Tasks', href: '#tasks', tip: 'Your personal task board — drag to change status' },
  { icon: <Calendar size={20} />, label: 'Calendar', href: '#calendar', tip: 'View tasks and events on a calendar timeline' },
  { icon: <BarChart3 size={20} />, label: 'Analytics', href: '#analytics', tip: 'Productivity metrics, trends, and team velocity' },
  { icon: <Users size={20} />, label: 'Team', href: '#team', tip: 'View team members, roles, and workload' },
  { icon: <MessageSquare size={20} />, label: 'Chat', href: '#chat', tip: 'Direct messages, task discussions, and announcements' },
  { icon: <Zap size={20} />, label: 'AI Insights', href: '#ai-insights', tip: 'AI-powered recommendations and forecasts' },
];

const roleConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  admin: { label: 'Admin', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', icon: <Shield size={10} /> },
  manager: { label: 'Manager', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', icon: <Crown size={10} /> },
  user: { label: 'Member', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', icon: <User size={10} /> },
};

const bottomItems: NavItem[] = [
  { icon: <Settings size={20} />, label: 'Settings', href: '#settings' },
];

export const Sidebar: React.FC = () => {
  const { sidebarOpen, toggleSidebar, setSidebarOpen, darkMode, toggleDarkMode } = useUIStore();
  const { user, logout } = useUserStore();
  const totalUnread = useChatStore((s) => s.getTotalUnread());
  const projectCount = useProjectStore((s) => s.projects.length);
  const { canViewAllTasks, getEffectiveUserId } = useUserStore();
  const taskCount = useTaskStore((s) => {
    if (canViewAllTasks()) return s.tasks.filter((t) => t.status !== 'completed').length;
    return s.tasks.filter((t) => t.assignedTo === getEffectiveUserId() && t.status !== 'completed').length;
  });
  const showTips = useSettingsStore((s) => s.showTips);
  const [activePage, setActivePage] = useState(window.location.hash || '#dashboard');

  useEffect(() => {
    const onHashChange = () => setActivePage(window.location.hash || '#dashboard');
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={toggleSidebar}
        className="fixed left-4 top-4 z-50 lg:hidden p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors"
        aria-label="Toggle menu"
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar backdrop on mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed left-0 top-0 h-[100dvh] w-64',
          'bg-white border-r border-gray-200',
          'dark:bg-gradient-to-b dark:from-slate-900 dark:to-slate-950 dark:border-slate-800',
          'flex flex-col transition-all duration-300 z-40',
          'lg:translate-x-0',
          !sidebarOpen && '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-center h-20 px-6 border-b border-gray-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
              <Zap size={24} className="text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-gray-900 dark:text-white text-lg">Purple Bee</span>
              <span className="text-xs text-gray-400 dark:text-slate-500">v1.0</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 overflow-y-auto">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const isActive = activePage === item.href;
              const badge =
                item.href === '#chat' && totalUnread > 0 ? totalUnread
                : item.href === '#projects' && projectCount > 0 ? projectCount
                : item.href === '#tasks' && taskCount > 0 ? taskCount
                : item.badge;
              const closeMobile = () => {
                if (window.innerWidth < 1024) setSidebarOpen(false);
                if (window.innerWidth < 768 && item.tip && showTips) showMobileToast(item.tip);
              };
              const link = (
                <a
                  href={item.href}
                  onClick={closeMobile}
                  className={clsx(
                    'flex items-center gap-3 px-4 py-3 rounded-lg',
                    'transition-colors duration-200',
                    'relative',
                    isActive
                      ? 'bg-purple-50 text-purple-700 font-semibold dark:bg-purple-600/20 dark:text-purple-300'
                      : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900 dark:hover:bg-slate-800 dark:text-slate-300 dark:hover:text-slate-100'
                  )}
                >
                  <span className={isActive ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400 dark:text-slate-400'}>{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  {badge ? (
                    <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-semibold rounded-full bg-purple-600 text-white">
                      {badge}
                    </span>
                  ) : null}
                </a>
              );
              return (
                <li key={item.href}>
                  {item.tip ? (
                    <Tip content={item.tip} position="right">
                      {link}
                    </Tip>
                  ) : link}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-slate-800" />

        {/* Bottom Actions */}
        <nav className="px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] overflow-y-auto flex-shrink-0">
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className={clsx(
              'w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2',
              'transition-colors duration-200',
              'hover:bg-gray-100 text-gray-600 hover:text-gray-900',
              'dark:hover:bg-slate-800 dark:text-slate-300 dark:hover:text-slate-100'
            )}
          >
            <span className="text-gray-400 dark:text-slate-400">
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </span>
            <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          <ul className="space-y-2 mb-4">
            {bottomItems.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  onClick={() => { if (window.innerWidth < 1024) setSidebarOpen(false); }}
                  className={clsx(
                    'flex items-center gap-3 px-4 py-3 rounded-lg',
                    'transition-colors duration-200',
                    'hover:bg-gray-100 text-gray-600 hover:text-gray-900',
                    'dark:hover:bg-slate-800 dark:text-slate-300 dark:hover:text-slate-100'
                  )}
                >
                  <span className="text-gray-400 dark:text-slate-400">{item.icon}</span>
                  <span>{item.label}</span>
                </a>
              </li>
            ))}
          </ul>

          {/* User Profile */}
          {user && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 dark:bg-slate-800/50 dark:border-slate-700/50">
              <div className="flex items-center gap-3 mb-3">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-10 h-10 rounded-full"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">
                      {user.name}
                    </p>
                    <span className={clsx(
                      'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase flex-shrink-0',
                      roleConfig[user.role]?.color
                    )}>
                      {roleConfig[user.role]?.icon}
                      {roleConfig[user.role]?.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-500 truncate">{user.email}</p>
                </div>
              </div>
              <button
                onClick={logout}
                className={clsx(
                  'w-full flex items-center justify-center gap-2',
                  'px-3 py-2 rounded-lg text-sm font-medium',
                  'bg-red-50 text-red-600 hover:bg-red-100',
                  'dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30',
                  'transition-colors duration-200'
                )}
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          )}
        </nav>
      </aside>
    </>
  );
};
