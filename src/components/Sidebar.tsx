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
  PanelLeftClose,
  PanelLeftOpen,
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
  const { sidebarOpen, toggleSidebar, setSidebarOpen, darkMode, toggleDarkMode, sidebarCollapsed, toggleSidebarCollapse } = useUIStore();
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
          'fixed left-0 top-0 h-[100dvh]',
          sidebarCollapsed ? 'lg:w-[4.5rem]' : 'w-64',
          'w-64', // always full-width on mobile overlay
          'bg-white border-r border-gray-200',
          'dark:bg-gradient-to-b dark:from-slate-900 dark:to-slate-950 dark:border-slate-800',
          'flex flex-col transition-all duration-300 z-40',
          'lg:translate-x-0',
          !sidebarOpen && '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className={clsx('flex flex-col items-center justify-center h-20 border-b border-gray-200 dark:border-slate-800', sidebarCollapsed ? 'px-2' : 'px-6')}>
          {sidebarCollapsed ? (
            <img src="/logo.png" alt="PurpleBee" className="h-12 w-12 object-contain" />
          ) : (
            <>
              <img src="/logo.png" alt="PurpleBee Task Manager" className="h-14 object-contain" />
              <span className="text-xs text-gray-400 dark:text-slate-500 mt-1">v1.2</span>
            </>
          )}
        </div>

        {/* Navigation */}
        <nav className={clsx('flex-1 py-6 overflow-y-auto', sidebarCollapsed ? 'px-2' : 'px-4')}>
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
                  title={sidebarCollapsed ? item.label : undefined}
                  className={clsx(
                    'flex items-center rounded-lg',
                    'transition-colors duration-200',
                    'relative group',
                    sidebarCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-4 py-3',
                    isActive
                      ? 'bg-accent-50 text-accent-700 font-semibold dark:bg-accent-600/20 dark:text-accent-300'
                      : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900 dark:hover:bg-slate-800 dark:text-slate-300 dark:hover:text-slate-100'
                  )}
                >
                  <span className={clsx('flex-shrink-0', isActive ? 'text-accent-600 dark:text-accent-400' : 'text-gray-400 dark:text-slate-400')}>{item.icon}</span>
                  {!sidebarCollapsed && <span className="flex-1">{item.label}</span>}
                  {badge ? (
                    sidebarCollapsed ? (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-accent-600 text-white text-[9px] font-bold flex items-center justify-center">
                        {badge}
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-semibold rounded-full bg-accent-600 text-white">
                        {badge}
                      </span>
                    )
                  ) : null}
                  {/* Tooltip for collapsed mode */}
                  {sidebarCollapsed && (
                    <span className="absolute left-full ml-2 px-2 py-1 rounded-md bg-gray-900 text-white text-xs whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 dark:bg-slate-700">
                      {item.label}
                    </span>
                  )}
                </a>
              );
              return (
                <li key={item.href}>
                  {item.tip && !sidebarCollapsed ? (
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
        <nav className={clsx('py-4 pb-[max(1rem,env(safe-area-inset-bottom))] overflow-y-auto flex-shrink-0', sidebarCollapsed ? 'px-2' : 'px-4')}>
          {/* Collapse Toggle (desktop only) */}
          <button
            onClick={toggleSidebarCollapse}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={clsx(
              'hidden lg:flex w-full items-center rounded-lg mb-2',
              'transition-colors duration-200',
              'hover:bg-gray-100 text-gray-600 hover:text-gray-900',
              'dark:hover:bg-slate-800 dark:text-slate-300 dark:hover:text-slate-100',
              sidebarCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-4 py-3'
            )}
          >
            <span className="text-gray-400 dark:text-slate-400">
              {sidebarCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
            </span>
            {!sidebarCollapsed && <span>{sidebarCollapsed ? 'Expand' : 'Collapse'}</span>}
          </button>

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            title={sidebarCollapsed ? (darkMode ? 'Light Mode' : 'Dark Mode') : undefined}
            className={clsx(
              'w-full flex items-center rounded-lg mb-2 relative group',
              'transition-colors duration-200',
              'hover:bg-gray-100 text-gray-600 hover:text-gray-900',
              'dark:hover:bg-slate-800 dark:text-slate-300 dark:hover:text-slate-100',
              sidebarCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-4 py-3'
            )}
          >
            <span className="text-gray-400 dark:text-slate-400">
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </span>
            {!sidebarCollapsed && <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>}
            {sidebarCollapsed && (
              <span className="absolute left-full ml-2 px-2 py-1 rounded-md bg-gray-900 text-white text-xs whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 dark:bg-slate-700">
                {darkMode ? 'Light Mode' : 'Dark Mode'}
              </span>
            )}
          </button>

          <ul className="space-y-2 mb-4">
            {bottomItems.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  onClick={() => { if (window.innerWidth < 1024) setSidebarOpen(false); }}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={clsx(
                    'flex items-center rounded-lg relative group',
                    'transition-colors duration-200',
                    'hover:bg-gray-100 text-gray-600 hover:text-gray-900',
                    'dark:hover:bg-slate-800 dark:text-slate-300 dark:hover:text-slate-100',
                    sidebarCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-4 py-3'
                  )}
                >
                  <span className="text-gray-400 dark:text-slate-400">{item.icon}</span>
                  {!sidebarCollapsed && <span>{item.label}</span>}
                  {sidebarCollapsed && (
                    <span className="absolute left-full ml-2 px-2 py-1 rounded-md bg-gray-900 text-white text-xs whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 dark:bg-slate-700">
                      {item.label}
                    </span>
                  )}
                </a>
              </li>
            ))}
          </ul>

          {/* User Profile */}
          {user && (
            sidebarCollapsed ? (
              <div className="flex flex-col items-center gap-2">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-9 h-9 rounded-full ring-2 ring-gray-200 dark:ring-slate-700"
                  title={user.name}
                />
                <button
                  onClick={logout}
                  title="Logout"
                  className={clsx(
                    'p-2 rounded-lg relative group',
                    'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20',
                    'transition-colors duration-200'
                  )}
                >
                  <LogOut size={18} />
                  <span className="absolute left-full ml-2 px-2 py-1 rounded-md bg-gray-900 text-white text-xs whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 dark:bg-slate-700">
                    Logout
                  </span>
                </button>
              </div>
            ) : (
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
            )
          )}
        </nav>
      </aside>
    </>
  );
};
