import React, { useEffect } from 'react';
import clsx from 'clsx';
import { Sidebar } from '@components/Sidebar';
import { TopBar } from '@components/TopBar';
import { Dashboard } from '@pages/Dashboard';
import { Tasks } from '@pages/Tasks';
import { CalendarPage } from '@pages/CalendarPage';
import { Analytics } from '@pages/Analytics';
import { Team } from '@pages/Team';
import { AIInsights } from '@pages/AIInsights';
import { Chat } from '@pages/Chat';
import { SettingsPage } from '@pages/SettingsPage';
import { Projects } from '@pages/Projects';
import { LoginPage } from '@pages/LoginPage';
import { ChatBot } from '@components/ChatBot';
import { DockedChats } from '@components/DockedChats';
import { ToastContainer } from '@components/Toast';
import { WelcomeTipsModal, MobileToastProvider } from '@components/Tip';
import { useUIStore } from '@stores/uiStore';
import { useUserStore, teamProfiles } from '@stores/userStore';
import { useChatStore } from '@stores/chatStore';
import { useSettingsStore } from '@stores/settingsStore';

type PageType = 'dashboard' | 'projects' | 'tasks' | 'calendar' | 'analytics' | 'team' | 'chat' | 'ai-insights' | 'settings';

const App: React.FC = () => {
  const { darkMode } = useUIStore();
  const hasDockedChats = useChatStore((s) => s.dockedChatIds.length > 0);
  const isAuthenticated = useUserStore((s) => s.isAuthenticated);
  const authChecked = useUserStore((s) => s.authChecked);
  const initSession = useUserStore((s) => s.initSession);
  const viewingAsId = useUserStore((s) => s.viewingAsId);
  const getViewingProfile = useUserStore((s) => s.getViewingProfile);
  const clearViewAs = useUserStore((s) => s.clearViewAs);
  const { showTips, hasSeenWelcomeTips, openWelcomeModal } = useSettingsStore();
  const [currentPage, setCurrentPage] = React.useState<PageType>(() => {
    const hash = window.location.hash.slice(1).split('?')[0];
    return (hash || 'dashboard') as PageType;
  });

  // Restore Supabase session on app load
  useEffect(() => {
    initSession();
  }, [initSession]);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    const handleNavigation = () => {
      const hash = window.location.hash.slice(1).split('?')[0] || 'dashboard';
      setCurrentPage(hash as PageType);
    };

    window.addEventListener('hashchange', handleNavigation);
    return () => window.removeEventListener('hashchange', handleNavigation);
  }, []);

  // Show welcome tips on first login when tips are enabled
  useEffect(() => {
    if (isAuthenticated && showTips && !hasSeenWelcomeTips) {
      // Small delay so the dashboard renders first
      const t = setTimeout(() => openWelcomeModal(), 800);
      return () => clearTimeout(t);
    }
  }, [isAuthenticated, showTips, hasSeenWelcomeTips]);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'projects':
        return <Projects />;
      case 'tasks':
        return <Tasks />;
      case 'calendar':
        return <CalendarPage />;
      case 'analytics':
        return <Analytics />;
      case 'team':
        return <Team />;
      case 'chat':
        return <Chat />;
      case 'ai-insights':
        return <AIInsights />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <Dashboard />;
    }
  };

  // Show loading spinner while checking session
  if (!authChecked) {
    return (
      <div className={clsx(
        'min-h-screen flex items-center justify-center',
        'bg-gray-50 dark:bg-slate-950'
      )}>
        <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return (
      <div className={clsx(
        'min-h-screen',
        'bg-gray-50 text-gray-800',
        'dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950',
        'dark:text-slate-100'
      )}>
        <LoginPage />
      </div>
    );
  }

  return (
    <div className={clsx(
      'min-h-screen',
      'bg-gray-50 text-gray-800',
      'dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950',
      'dark:text-slate-100'
    )}>
      <Sidebar />
      <TopBar />

      <main className="lg:ml-64 mt-[7.5rem] lg:mt-20 p-3 sm:p-6 lg:p-8 transition-[padding] duration-300" style={{ paddingBottom: hasDockedChats ? 480 : undefined }}>
        <div className="max-w-7xl mx-auto">
          {/* Quick View banner */}
          {viewingAsId && (() => {
            const vp = getViewingProfile();
            return vp ? (
              <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl bg-purple-50 border border-purple-200 dark:bg-purple-900/20 dark:border-purple-700/40">
                <img src={vp.avatar} alt={vp.name} className="w-8 h-8 rounded-full ring-2 ring-purple-300 dark:ring-purple-600" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                    Viewing as {vp.name}
                  </p>
                  <p className="text-xs text-purple-500 dark:text-purple-400">
                    {vp.title} &middot; {vp.department} &middot; You're previewing this member's dashboard
                  </p>
                </div>
                <button
                  onClick={() => clearViewAs()}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 text-white hover:bg-purple-700 transition-colors"
                >
                  Back to my view
                </button>
              </div>
            ) : null;
          })()}
          {renderPage()}
        </div>
      </main>

      <DockedChats />
      {currentPage !== 'chat' && <ChatBot />}
      <ToastContainer />
      <MobileToastProvider />
      <WelcomeTipsModal />
    </div>
  );
};

export default App;
