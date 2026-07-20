import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import {
  Settings,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Mail,
  Monitor,
  Moon,
  Sun,
  Clock,
  Shield,
  User as UserIcon,
  Palette,
  Globe,
  ChevronRight,
  RotateCcw,
  Save,
  Check,
  Eye,
  EyeOff,
  Smartphone,
  Zap,
  Database,
  HelpCircle,
  Lightbulb,
  MessageCircle,
  Send,
  Link2,
  Unlink2,
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@components/Card';
import { useNotificationStore, NotificationPreferences, notificationCategoryConfig } from '@stores/notificationStore';
import { useUserStore } from '@stores/userStore';
import { useUIStore } from '@stores/uiStore';
import { useSettingsStore } from '@stores/settingsStore';
import { useTaskStore } from '@stores/taskStore';
import { useProjectStore } from '@stores/projectStore';
import { useChatStore } from '@stores/chatStore';
import { NotificationType } from '@/types/index';
import { isDbConnected } from '@/lib/supabase';

type SettingsTab = 'notifications' | 'appearance' | 'account' | 'general';

const tabs: { value: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { value: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
  { value: 'appearance', label: 'Appearance', icon: <Palette size={18} /> },
  { value: 'account', label: 'Account', icon: <UserIcon size={18} /> },
  { value: 'general', label: 'General', icon: <Settings size={18} /> },
];

// ── Toggle Switch ──────────────────────────────────────────────────────
const Toggle: React.FC<{ enabled: boolean; onChange: (v: boolean) => void; disabled?: boolean }> = ({
  enabled, onChange, disabled,
}) => (
  <button
    onClick={() => !disabled && onChange(!enabled)}
    className={clsx(
      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200',
      enabled ? 'bg-purple-600' : 'bg-gray-300 dark:bg-slate-600',
      disabled && 'opacity-50 cursor-not-allowed'
    )}
  >
    <span
      className={clsx(
        'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200',
        enabled ? 'translate-x-6' : 'translate-x-1'
      )}
    />
  </button>
);

// ── Setting Row ────────────────────────────────────────────────────────
const SettingRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  description?: string;
  children: React.ReactNode;
  noBorder?: boolean;
}> = ({ icon, label, description, children, noBorder }) => (
  <div className={clsx(
    'flex items-center justify-between py-4',
    !noBorder && 'border-b border-gray-100 dark:border-slate-700/40'
  )}>
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gray-100 dark:bg-slate-700/50 flex items-center justify-center text-gray-500 dark:text-slate-400 mt-0.5">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{label}</p>
        {description && (
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 max-w-sm">{description}</p>
        )}
      </div>
    </div>
    <div className="flex-shrink-0 ml-4">{children}</div>
  </div>
);

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(() => {
    // If navigated with ?tab=general (from Demo Mode badge), open General tab
    const hash = window.location.hash;
    if (hash.includes('tab=general')) return 'general';
    return 'notifications';
  });
  const { preferences, updatePreferences, resetPreferences } = useNotificationStore();
  const { user } = useUserStore();
  const { darkMode, toggleDarkMode } = useUIStore();
  const { keepMockData, showTips, setKeepMockData, setShowTips, openWelcomeModal } = useSettingsStore();
  const [saved, setSaved] = useState(false);

  // Listen for hash changes (e.g. clicking Demo Mode while already on Settings)
  useEffect(() => {
    const onHashChange = () => {
      if (window.location.hash.includes('tab=general')) {
        setActiveTab('general');
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Integration states
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [whatsappConnecting, setWhatsappConnecting] = useState(false);
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [telegramUsername, setTelegramUsername] = useState('');
  const [telegramConnecting, setTelegramConnecting] = useState(false);

  // Personal Telegram account link (separate from the bot-level toggle
  // above) — maps this specific user to their Telegram from.id.
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3005';
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [telegramLinkCode, setTelegramLinkCode] = useState<string | null>(null);
  const [telegramLinking, setTelegramLinking] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetch(`${API_URL}/api/telegram/link-status?userId=${user.id}`)
      .then((res) => res.json())
      .then((data) => setTelegramLinked(Boolean(data.linked)))
      .catch(() => {});
  }, [user, API_URL]);

  const handleGenerateTelegramLinkCode = async () => {
    if (!user) return;
    setTelegramLinking(true);
    try {
      const res = await fetch(`${API_URL}/api/telegram/link-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (data.success) {
        setTelegramLinkCode(data.code);
        window.open(data.deepLink, '_blank');
      } else {
        alert('Could not generate a link code: ' + (data.error || 'Unknown error'));
      }
    } catch {
      alert('Could not reach backend. Make sure your backend server is running.');
    } finally {
      setTelegramLinking(false);
    }
  };

  const handleUnlinkTelegram = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_URL}/api/telegram/unlink`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (data.success) {
        setTelegramLinked(false);
        setTelegramLinkCode(null);
      }
    } catch {
      alert('Could not reach backend. Make sure your backend server is running.');
    }
  };

  const handleConnectWhatsapp = () => {
    if (whatsappEnabled) {
      setWhatsappEnabled(false);
      setWhatsappNumber('');
      return;
    }
    if (!whatsappNumber.trim()) return;
    setWhatsappConnecting(true);
    setTimeout(() => {
      setWhatsappEnabled(true);
      setWhatsappConnecting(false);
    }, 1200);
  };

  const handleConnectTelegram = async () => {
    if (telegramEnabled) {
      setTelegramEnabled(false);
      setTelegramUsername('');
      return;
    }
    if (!telegramUsername.trim()) return;
    setTelegramConnecting(true);
    try {
      const botToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
      const res = await fetch('http://localhost:3000/api/integrations/telegram/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken }),
      });
      const data = await res.json();
      if (data.success) {
        setTelegramEnabled(true);
      } else {
        alert('Telegram verification failed: ' + (data.error || 'Invalid token'));
      }
    } catch {
      alert('Could not reach backend. Make sure your backend server is running.');
    } finally {
      setTelegramConnecting(false);
    }
  };

  // When mock data toggle changes, immediately clear or restore all stores
  //
  // ON  → populate Zustand with mock arrays (in-memory only, DB untouched)
  // OFF → clear Zustand, then hydrate from DB if connected (real data mode)
  const handleMockDataToggle = (enabled: boolean) => {
    setKeepMockData(enabled);
    if (enabled) {
      // ── Switching to mock mode: populate in-memory only, never write to DB ──
      useTaskStore.getState().restoreMockData();
      useProjectStore.getState().restoreMockData();
      if (user) {
        useNotificationStore.getState().restoreMockData(user.id, user.name);
        useChatStore.getState().restoreMockData(user.id);
      }
    } else {
      // ── Switching to real mode: clear mock data from Zustand ──
      useTaskStore.getState().clearMockData();
      useProjectStore.getState().clearMockData();
      useChatStore.getState().clearMockData();
      useNotificationStore.getState().clearMockData();
      useUserStore.getState().clearViewAs();

      // If DB is connected, hydrate stores from Supabase (real persisted data)
      if (isDbConnected() && user) {
        useTaskStore.getState().hydrateFromDb(user.id);
        useChatStore.getState().hydrateFromDb(user.id);
        // Future: projectStore.hydrateFromDb, notificationStore.hydrateFromDb, etc.
      }
    }
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Notification category toggles mapped to preference keys
  const categoryToggles: {
    type: NotificationType;
    prefKey: keyof NotificationPreferences;
    icon: React.ReactNode;
  }[] = [
    { type: 'task-assigned', prefKey: 'taskAssigned', icon: <span className="text-base">📋</span> },
    { type: 'task-due', prefKey: 'taskDue', icon: <span className="text-base">⏰</span> },
    { type: 'task-completed', prefKey: 'taskCompleted', icon: <span className="text-base">✅</span> },
    { type: 'project-invite', prefKey: 'projectInvite', icon: <span className="text-base">📂</span> },
    { type: 'mention', prefKey: 'mentions', icon: <span className="text-base">💬</span> },
    { type: 'update', prefKey: 'updates', icon: <span className="text-base">🔄</span> },
    { type: 'ai-insight', prefKey: 'aiInsights', icon: <span className="text-base">🤖</span> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Settings</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1">
            Manage notifications, preferences, and account settings
          </p>
        </div>
        <button
          onClick={handleSave}
          className={clsx(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
            saved
              ? 'bg-emerald-500 text-white'
              : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:shadow-lg hover:shadow-purple-500/25'
          )}
        >
          {saved ? <><Check size={14} /> Saved!</> : <><Save size={14} /> Save Changes</>}
        </button>
      </div>

      {/* Layout: Tabs + Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar tabs */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent>
              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => setActiveTab(tab.value)}
                    className={clsx(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left',
                      activeTab === tab.value
                        ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-slate-200'
                    )}
                  >
                    <span className={activeTab === tab.value ? 'text-purple-500 dark:text-purple-400' : 'text-gray-400 dark:text-slate-500'}>
                      {tab.icon}
                    </span>
                    {tab.label}
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* ═══ NOTIFICATIONS TAB ═══ */}
          {activeTab === 'notifications' && (
            <>
              {/* Notification Categories */}
              <Card>
                <CardHeader
                  title="Notification Types"
                  subtitle="Choose which notifications you want to receive"
                />
                <CardContent>
                  <div className="space-y-0">
                    {categoryToggles.map((item, i) => {
                      const cfg = notificationCategoryConfig[item.type];
                      return (
                        <SettingRow
                          key={item.type}
                          icon={item.icon}
                          label={cfg.label}
                          description={`Receive notifications for ${cfg.label.toLowerCase()} events`}
                          noBorder={i === categoryToggles.length - 1}
                        >
                          <Toggle
                            enabled={preferences[item.prefKey] as boolean}
                            onChange={(v) => updatePreferences({ [item.prefKey]: v })}
                          />
                        </SettingRow>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Delivery Methods */}
              <Card>
                <CardHeader
                  title="Delivery Methods"
                  subtitle="How you want to be notified"
                />
                <CardContent>
                  <SettingRow
                    icon={<Bell size={16} />}
                    label="In-App Notifications"
                    description="Show notifications in the app's notification center"
                  >
                    <Toggle
                      enabled={preferences.inApp}
                      onChange={(v) => updatePreferences({ inApp: v })}
                    />
                  </SettingRow>
                  <SettingRow
                    icon={<Mail size={16} />}
                    label="Email Notifications"
                    description="Send notification summaries to your email"
                  >
                    <Toggle
                      enabled={preferences.email}
                      onChange={(v) => updatePreferences({ email: v })}
                    />
                  </SettingRow>
                  <SettingRow
                    icon={preferences.sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
                    label="Sound Alerts"
                    description="Play a sound when you receive a notification"
                  >
                    <Toggle
                      enabled={preferences.sound}
                      onChange={(v) => updatePreferences({ sound: v })}
                    />
                  </SettingRow>
                  <SettingRow
                    icon={<Monitor size={16} />}
                    label="Desktop Notifications"
                    description="Show browser push notifications on your desktop"
                    noBorder
                  >
                    <Toggle
                      enabled={preferences.desktop}
                      onChange={(v) => updatePreferences({ desktop: v })}
                    />
                  </SettingRow>
                </CardContent>
              </Card>

              {/* Quiet Hours */}
              <Card>
                <CardHeader
                  title="Quiet Hours"
                  subtitle="Mute notifications during specific times"
                />
                <CardContent>
                  <SettingRow
                    icon={<Moon size={16} />}
                    label="Enable Quiet Hours"
                    description="Pause all notifications during set hours"
                  >
                    <Toggle
                      enabled={preferences.quietHoursEnabled}
                      onChange={(v) => updatePreferences({ quietHoursEnabled: v })}
                    />
                  </SettingRow>
                  {preferences.quietHoursEnabled && (
                    <div className="flex items-center gap-4 py-3 pl-12">
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                          From
                        </label>
                        <input
                          type="time"
                          value={preferences.quietHoursStart}
                          onChange={(e) => updatePreferences({ quietHoursStart: e.target.value })}
                          className="rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50 text-gray-800 dark:text-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                        />
                      </div>
                      <span className="text-gray-400 dark:text-slate-500 mt-5">—</span>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                          To
                        </label>
                        <input
                          type="time"
                          value={preferences.quietHoursEnd}
                          onChange={(e) => updatePreferences({ quietHoursEnd: e.target.value })}
                          className="rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50 text-gray-800 dark:text-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* Reset */}
                  <div className="pt-4 border-t border-gray-100 dark:border-slate-700/40 mt-2">
                    <button
                      onClick={resetPreferences}
                      className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition-colors"
                    >
                      <RotateCcw size={13} />
                      Reset to defaults
                    </button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* ═══ APPEARANCE TAB ═══ */}
          {activeTab === 'appearance' && (
            <>
              <Card>
                <CardHeader
                  title="Theme"
                  subtitle="Choose your preferred appearance"
                />
                <CardContent>
                  <SettingRow
                    icon={darkMode ? <Moon size={16} /> : <Sun size={16} />}
                    label="Dark Mode"
                    description="Switch between light and dark themes"
                  >
                    <Toggle
                      enabled={darkMode}
                      onChange={() => toggleDarkMode()}
                    />
                  </SettingRow>
                  <SettingRow
                    icon={<Palette size={16} />}
                    label="Accent Color"
                    description="Customize your accent color across the app"
                    noBorder
                  >
                    <div className="flex items-center gap-2">
                      {['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'].map((color) => (
                        <button
                          key={color}
                          className={clsx(
                            'w-7 h-7 rounded-full transition-transform hover:scale-110',
                            color === '#8b5cf6' && 'ring-2 ring-offset-2 ring-purple-500 dark:ring-offset-slate-800'
                          )}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </SettingRow>
                </CardContent>
              </Card>

              <Card>
                <CardHeader
                  title="Layout"
                  subtitle="Configure your workspace layout"
                />
                <CardContent>
                  <SettingRow
                    icon={<Eye size={16} />}
                    label="Compact Mode"
                    description="Reduce spacing for more information density"
                    noBorder
                  >
                    <Toggle enabled={false} onChange={() => {}} />
                  </SettingRow>
                </CardContent>
              </Card>
            </>
          )}

          {/* ═══ ACCOUNT TAB ═══ */}
          {activeTab === 'account' && (
            <>
              <Card>
                <CardHeader title="Profile" subtitle="Your account details" />
                <CardContent>
                  {user && (
                    <div className="space-y-5">
                      <div className="flex items-center gap-4">
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-16 h-16 rounded-2xl ring-2 ring-gray-200 dark:ring-slate-700"
                        />
                        <div>
                          <p className="text-lg font-bold text-gray-900 dark:text-slate-100">{user.name}</p>
                          <p className="text-sm text-gray-500 dark:text-slate-400">{user.email}</p>
                          <span className={clsx(
                            'inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                            user.role === 'admin'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                              : user.role === 'manager'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          )}>
                            <Shield size={10} />
                            {user.role}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-slate-700/40">
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                            Full Name
                          </label>
                          <input
                            type="text"
                            value={user.name}
                            readOnly
                            className="w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50 text-gray-800 dark:text-slate-200 px-3 py-2.5 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                            Email
                          </label>
                          <input
                            type="email"
                            value={user.email}
                            readOnly
                            className="w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50 text-gray-800 dark:text-slate-200 px-3 py-2.5 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader title="Security" subtitle="Manage your password and sessions" />
                <CardContent>
                  <SettingRow
                    icon={<Shield size={16} />}
                    label="Change Password"
                    description="Update your account password"
                  >
                    <button className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 text-xs font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                      Change
                    </button>
                  </SettingRow>
                  <SettingRow
                    icon={<Smartphone size={16} />}
                    label="Two-Factor Authentication"
                    description="Add an extra layer of security to your account"
                    noBorder
                  >
                    <Toggle enabled={false} onChange={() => {}} />
                  </SettingRow>
                </CardContent>
              </Card>
            </>
          )}

          {/* ═══ GENERAL TAB ═══ */}
          {activeTab === 'general' && (
            <>
              <Card>
                <CardHeader title="Workspace" subtitle="General workspace preferences" />
                <CardContent>
                  <SettingRow
                    icon={<Globe size={16} />}
                    label="Language"
                    description="Set your preferred display language"
                  >
                    <select className="rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50 text-gray-800 dark:text-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500">
                      <option>English (US)</option>
                      <option>English (UK)</option>
                      <option>Afrikaans</option>
                      <option>isiZulu</option>
                    </select>
                  </SettingRow>
                  <SettingRow
                    icon={<Clock size={16} />}
                    label="Timezone"
                    description="Your local timezone for task deadlines"
                  >
                    <select className="rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50 text-gray-800 dark:text-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500">
                      <option>Africa/Johannesburg (GMT+2)</option>
                      <option>Europe/London (GMT+0)</option>
                      <option>America/New_York (GMT-5)</option>
                    </select>
                  </SettingRow>
                  <SettingRow
                    icon={<Zap size={16} />}
                    label="AI Features"
                    description="Enable AI-powered insights and recommendations"
                    noBorder
                  >
                    <Toggle enabled={true} onChange={() => {}} />
                  </SettingRow>
                </CardContent>
              </Card>

              {/* Demo & Tips */}
              <Card>
                <CardHeader
                  title="Demo & Onboarding"
                  subtitle="Control sample data and interactive guidance"
                />
                <CardContent>
                  <SettingRow
                    icon={<Database size={16} />}
                    label="Keep Mock Data"
                    description="Preserve sample tasks, projects, and chats for exploring the app. Turn off to start with a clean workspace."
                  >
                    <Toggle
                      enabled={keepMockData}
                      onChange={handleMockDataToggle}
                    />
                  </SettingRow>
                  <SettingRow
                    icon={<Lightbulb size={16} />}
                    label="Show Tips"
                    description="Display helpful tooltips when hovering over key UI elements. Great for learning the interface."
                  >
                    <Toggle
                      enabled={showTips}
                      onChange={setShowTips}
                    />
                  </SettingRow>
                  <SettingRow
                    icon={<HelpCircle size={16} />}
                    label="Welcome Guide"
                    description="Re-open the getting-started walkthrough that shows on first login"
                    noBorder
                  >
                    <button
                      onClick={openWelcomeModal}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 text-xs font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      Show Guide
                    </button>
                  </SettingRow>
                </CardContent>
              </Card>

              {/* Integrations */}
              <Card>
                <CardHeader
                  title="Integrations"
                  subtitle="Connect external messaging platforms for notifications"
                />
                <CardContent>
                  {/* WhatsApp */}
                  <div className={clsx(
                    'py-4 border-b border-gray-100 dark:border-slate-700/40',
                  )}>
                    <div className="flex items-start gap-3">
                      <div className={clsx(
                        'flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center mt-0.5',
                        whatsappEnabled
                          ? 'bg-green-100 dark:bg-green-900/20'
                          : 'bg-gray-100 dark:bg-slate-700/50'
                      )}>
                        <MessageCircle size={16} className={whatsappEnabled ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-slate-400'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-medium text-gray-900 dark:text-slate-100">WhatsApp</p>
                          {whatsappEnabled && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                              <Link2 size={8} />
                              Connected
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">
                          Receive task reminders, due-date alerts, and team mentions via WhatsApp
                        </p>
                        {!whatsappEnabled ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="tel"
                              placeholder="+27 81 234 5678"
                              value={whatsappNumber}
                              onChange={(e) => setWhatsappNumber(e.target.value)}
                              className="w-44 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50 text-gray-800 dark:text-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                            />
                            <button
                              onClick={handleConnectWhatsapp}
                              disabled={!whatsappNumber.trim() || whatsappConnecting}
                              className={clsx(
                                'px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5',
                                whatsappNumber.trim() && !whatsappConnecting
                                  ? 'bg-green-600 text-white hover:bg-green-700 hover:shadow-lg hover:shadow-green-500/20'
                                  : 'bg-gray-100 text-gray-400 dark:bg-slate-700 dark:text-slate-500 cursor-not-allowed'
                              )}
                            >
                              {whatsappConnecting ? (
                                <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Connecting...</>
                              ) : (
                                <><Link2 size={12} /> Connect</>
                              )}
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-600 dark:text-slate-300 bg-gray-50 dark:bg-slate-700/50 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600">
                              {whatsappNumber}
                            </span>
                            <button
                              onClick={handleConnectWhatsapp}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200 dark:border-red-700/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors flex items-center gap-1.5"
                            >
                              <Unlink2 size={12} />
                              Disconnect
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Telegram */}
                  <div className="py-4">
                    <div className="flex items-start gap-3">
                      <div className={clsx(
                        'flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center mt-0.5',
                        telegramEnabled
                          ? 'bg-blue-100 dark:bg-blue-900/20'
                          : 'bg-gray-100 dark:bg-slate-700/50'
                      )}>
                        <Send size={16} className={telegramEnabled ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-slate-400'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-medium text-gray-900 dark:text-slate-100">Telegram</p>
                          {telegramEnabled && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                              <Link2 size={8} />
                              Connected
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">
                          Get task updates, AI insights, and team notifications via Telegram bot
                        </p>
                        {!telegramEnabled ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="@username"
                              value={telegramUsername}
                              onChange={(e) => setTelegramUsername(e.target.value)}
                              className="w-44 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50 text-gray-800 dark:text-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                            <button
                              onClick={handleConnectTelegram}
                              disabled={!telegramUsername.trim() || telegramConnecting}
                              className={clsx(
                                'px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5',
                                telegramUsername.trim() && !telegramConnecting
                                  ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/20'
                                  : 'bg-gray-100 text-gray-400 dark:bg-slate-700 dark:text-slate-500 cursor-not-allowed'
                              )}
                            >
                              {telegramConnecting ? (
                                <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Connecting...</>
                              ) : (
                                <><Link2 size={12} /> Connect</>
                              )}
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-600 dark:text-slate-300 bg-gray-50 dark:bg-slate-700/50 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600">
                              {telegramUsername}
                            </span>
                            <button
                              onClick={handleConnectTelegram}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200 dark:border-red-700/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors flex items-center gap-1.5"
                            >
                              <Unlink2 size={12} />
                              Disconnect
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Personal Telegram account link */}
                  <div className="py-4 border-t border-gray-100 dark:border-slate-700/50">
                    <div className="flex items-start gap-3">
                      <div className={clsx(
                        'flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center mt-0.5',
                        telegramLinked ? 'bg-blue-100 dark:bg-blue-900/20' : 'bg-gray-100 dark:bg-slate-700/50'
                      )}>
                        <Send size={16} className={telegramLinked ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-slate-400'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-medium text-gray-900 dark:text-slate-100">Connect Telegram</p>
                          {telegramLinked && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                              <Check size={8} />
                              Telegram connected
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">
                          Link your Telegram account so Purple Bee Bot knows it's you — create and see your own tasks from Telegram.
                        </p>
                        {!telegramLinked ? (
                          <div className="flex flex-col gap-2 items-start">
                            <button
                              onClick={handleGenerateTelegramLinkCode}
                              disabled={telegramLinking}
                              className={clsx(
                                'px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5',
                                !telegramLinking
                                  ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/20'
                                  : 'bg-gray-100 text-gray-400 dark:bg-slate-700 dark:text-slate-500 cursor-not-allowed'
                              )}
                            >
                              {telegramLinking ? (
                                <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating...</>
                              ) : (
                                <><Link2 size={12} /> Connect Telegram</>
                              )}
                            </button>
                            {telegramLinkCode && (
                              <p className="text-[11px] text-gray-500 dark:text-slate-400">
                                Opened Telegram with code <span className="font-mono font-semibold">{telegramLinkCode}</span> — if it didn't open, message @PurpleBee2bot with <span className="font-mono">/start {telegramLinkCode}</span>. Expires in 10 minutes.
                              </p>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={handleUnlinkTelegram}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200 dark:border-red-700/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors flex items-center gap-1.5"
                          >
                            <Unlink2 size={12} />
                            Unlink Telegram
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader title="Data & Privacy" subtitle="Control your data" />
                <CardContent>
                  <SettingRow
                    icon={<EyeOff size={16} />}
                    label="Activity Status"
                    description="Show when you're online to team members"
                  >
                    <Toggle enabled={true} onChange={() => {}} />
                  </SettingRow>
                  <SettingRow
                    icon={<Shield size={16} />}
                    label="Export Data"
                    description="Download all your task and activity data"
                    noBorder
                  >
                    <button className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 text-xs font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                      Export
                    </button>
                  </SettingRow>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
