import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import {
  Settings,
  Bell,
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
  LogIn,
  UserPlus,
  ArrowRight,
  Loader2,
  X,
  Sparkles,
  Lock,
  KeyRound,
  CheckCircle2,
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
import { authDb } from '@/lib/dataService';

// ─── Demo-to-Real Auth Modal ──────────────────────────────────────────────────
// Shown when a Quick Login (demo) user tries to turn off mock data.
// They must sign in or create a real account before real mode activates.

type AuthTab = 'signin' | 'register';

const DemoToRealModal: React.FC<{
  onClose: () => void;
  onSuccessNew: () => void;  // new account → go to onboard
  onSuccessExisting: () => void; // existing account → just apply real mode
}> = ({ onClose, onSuccessNew, onSuccessExisting }) => {
  const { loginWithEmail, signUpWithEmail } = useUserStore();
  const [tab, setTab] = useState<AuthTab>('signin');

  // Sign-in state
  const [siEmail, setSiEmail] = useState('');
  const [siPassword, setSiPassword] = useState('');
  const [siShowPw, setSiShowPw] = useState(false);
  const [siError, setSiError] = useState<string | null>(null);
  const [siLoading, setSiLoading] = useState(false);

  // Register state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regCompany, setRegCompany] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regShowPw, setRegShowPw] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regLoading, setRegLoading] = useState(false);
  const [regEmailSent, setRegEmailSent] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siEmail.trim() || !siPassword.trim()) { setSiError('Email and password are required.'); return; }
    setSiLoading(true); setSiError(null);
    const ok = await loginWithEmail(siEmail.trim(), siPassword);
    setSiLoading(false);
    if (!ok) { setSiError('Invalid email or password.'); return; }
    onSuccessExisting();
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setRegError('Name, email, and password are required.'); return;
    }
    if (regPassword.length < 6) { setRegError('Password must be at least 6 characters.'); return; }
    setRegLoading(true); setRegError(null);
    const result = await signUpWithEmail(regEmail.trim(), regPassword, regName.trim(), regCompany.trim() || undefined);
    setRegLoading(false);
    if (!result.success) { setRegError('Sign-up failed. Please try again.'); return; }
    if (result.needsConfirmation) {
      setRegEmailSent(true);
    } else {
      // Auto-confirmed — logged in, go to onboard
      onSuccessNew();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 pt-6 pb-5">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Database size={18} className="text-white" />
            </div>
            <h2 className="text-lg font-bold text-white">Switch to real mode</h2>
          </div>
          <p className="text-sm text-white/75">
            Quick Login is demo-only. Sign in or create an account to save your real data.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-gray-200 dark:border-slate-700">
          {[
            { id: 'signin' as AuthTab, icon: <LogIn size={14} />, label: 'Sign In' },
            { id: 'register' as AuthTab, icon: <UserPlus size={14} />, label: 'Create Account' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={clsx(
                'flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold transition-colors',
                tab === t.id
                  ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-500'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
              )}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* ── Sign In ── */}
          {tab === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                  Email
                </label>
                <input
                  type="email"
                  value={siEmail}
                  onChange={(e) => setSiEmail(e.target.value)}
                  placeholder="you@company.com"
                  autoFocus
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={siShowPw ? 'text' : 'password'}
                    value={siPassword}
                    onChange={(e) => setSiPassword(e.target.value)}
                    placeholder="Your password"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 pr-10"
                  />
                  <button type="button" onClick={() => setSiShowPw(!siShowPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">
                    {siShowPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              {siError && <p className="text-xs text-red-500 font-medium">{siError}</p>}
              <button
                type="submit"
                disabled={siLoading}
                className="w-full py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-md shadow-purple-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {siLoading ? <Loader2 size={15} className="animate-spin" /> : <LogIn size={15} />}
                Sign In & Switch to Real Mode
              </button>
            </form>
          )}

          {/* ── Register ── */}
          {tab === 'register' && !regEmailSent && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Jane Smith"
                    autoFocus
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                    Email
                  </label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                    Company <span className="text-gray-400 normal-case font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={regCompany}
                    onChange={(e) => setRegCompany(e.target.value)}
                    placeholder="Acme Corp"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={regShowPw ? 'text' : 'password'}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 pr-10"
                    />
                    <button type="button" onClick={() => setRegShowPw(!regShowPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">
                      {regShowPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>
              {regError && <p className="text-xs text-red-500 font-medium">{regError}</p>}
              <button
                type="submit"
                disabled={regLoading || !regName.trim() || !regEmail.trim() || !regPassword.trim()}
                className="w-full py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-md shadow-purple-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {regLoading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                Create Account
                {!regLoading && <ArrowRight size={14} />}
              </button>
            </form>
          )}

          {/* ── Email confirmation sent ── */}
          {tab === 'register' && regEmailSent && (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white mx-auto mb-4">
                <Mail size={24} />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-slate-100 mb-2">Check your inbox</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-5">
                We sent a confirmation link to <strong>{regEmail}</strong>. Click it to activate your account, then come back and sign in.
              </p>
              <button
                onClick={() => { setTab('signin'); setSiEmail(regEmail); }}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
              >
                Back to Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

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

// ─── Change Password Card ──────────────────────────────────────────────────
const ChangePasswordCard: React.FC<{ isQuickLogin: boolean; autoOpen?: boolean; skipCurrentPassword?: boolean }> = ({ isQuickLogin, autoOpen = false, skipCurrentPassword = false }) => {
  const [isOpen, setIsOpen] = useState(autoOpen);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const reset = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    setError(null);
    setSuccess(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!skipCurrentPassword && !currentPassword.trim()) { setError('Please enter your current password'); return; }
    if (!newPassword.trim()) { setError('Please enter a new password'); return; }
    if (newPassword.length < 6) { setError('New password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    if (!skipCurrentPassword && newPassword === currentPassword) { setError('New password must be different from current password'); return; }

    setIsLoading(true);

    // When not in recovery mode, verify current password by re-authenticating
    if (!skipCurrentPassword) {
      const { user } = useUserStore.getState();
      if (!user?.email) { setError('Could not verify account'); setIsLoading(false); return; }

      const signInResult = await authDb.signIn(user.email, currentPassword);
      if (!signInResult) {
        setError('Current password is incorrect');
        setIsLoading(false);
        return;
      }
    }

    // Update to new password
    const updated = await authDb.updatePassword(newPassword);
    setIsLoading(false);

    if (updated) {
      setSuccess(true);
      // Clean recovery param from URL
      if (skipCurrentPassword) {
        window.location.hash = '#settings?tab=account';
      }
      setTimeout(() => {
        setIsOpen(false);
        reset();
      }, 2000);
    } else {
      setError('Failed to update password. Please try again.');
    }
  };

  const pwInputCls = clsx(
    'w-full rounded-xl pl-10 pr-12 py-2.5 text-sm',
    'bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400',
    'dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500',
    'focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all',
  );

  return (
    <Card>
      <CardHeader title="Password" subtitle="Change your account password" />
      <CardContent>
        {isQuickLogin ? (
          /* Demo user — show disabled state with explanation */
          <div className="flex items-center gap-3 py-3">
            <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gray-100 dark:bg-slate-700/50 flex items-center justify-center text-gray-400 dark:text-slate-500">
              <Lock size={16} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-400 dark:text-slate-500">Change Password</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                Create a real account to set a password. Demo accounts don't have passwords.
              </p>
            </div>
            <button
              disabled
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-xs font-semibold text-gray-300 dark:text-slate-600 cursor-not-allowed"
            >
              Change
            </button>
          </div>
        ) : !isOpen ? (
          /* Collapsed state — show button to expand */
          <SettingRow
            icon={<KeyRound size={16} />}
            label="Change Password"
            description="Update your account password"
            noBorder
          >
            <button
              onClick={() => { reset(); setIsOpen(true); }}
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 text-xs font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              Change
            </button>
          </SettingRow>
        ) : success ? (
          /* Success state */
          <div className="flex items-center gap-3 py-6 justify-center">
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
              <CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Password updated successfully!</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Your new password is now active.</p>
            </div>
          </div>
        ) : (
          /* Expanded form */
          <form onSubmit={handleChangePassword} className="space-y-4 py-2">
            {skipCurrentPassword && (
              <div className="px-3 py-2.5 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700/40 text-xs text-purple-600 dark:text-purple-400 font-medium flex items-center gap-2">
                <KeyRound size={14} />
                You verified your identity via email. Choose a new password below.
              </div>
            )}

            {error && (
              <div className="px-3 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/40 text-xs text-red-600 dark:text-red-400 font-medium">
                {error}
              </div>
            )}

            {!skipCurrentPassword && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    autoComplete="current-password"
                    autoFocus
                    className={pwInputCls}
                  />
                  <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors">
                    {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  className={pwInputCls}
                />
                <button type="button" onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors">
                  {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {newPassword.length > 0 && newPassword.length < 6 && (
                <p className="text-[11px] text-amber-500 mt-1">Must be at least 6 characters</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  className={pwInputCls}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors">
                  {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                <p className="text-[11px] text-red-500 mt-1">Passwords do not match</p>
              )}
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => { setIsOpen(false); reset(); }}
                className="px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  isLoading ||
                  (!skipCurrentPassword && !currentPassword.trim()) ||
                  !newPassword.trim() ||
                  !confirmPassword.trim() ||
                  newPassword.length < 6 ||
                  newPassword !== confirmPassword
                }
                className={clsx(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold',
                  'bg-gradient-to-r from-purple-600 to-blue-600 text-white',
                  'hover:from-purple-700 hover:to-blue-700',
                  'shadow-md shadow-purple-500/20',
                  'disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200',
                )}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <KeyRound size={14} />
                    Update Password
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
};

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(() => {
    const hash = window.location.hash;
    if (hash.includes('tab=account')) return 'account';
    if (hash.includes('tab=general')) return 'general';
    return 'notifications';
  });

  // Detect recovery mode — user arrived via password reset email link
  const isRecoveryMode = window.location.hash.includes('recovery=true');
  const { preferences, updatePreferences, resetPreferences } = useNotificationStore();
  const { user, isQuickLoginUser } = useUserStore();
  const { darkMode, toggleDarkMode } = useUIStore();
  const { keepMockData, showTips, setKeepMockData, setShowTips, openWelcomeModal, accentColor, setAccentColor, dashboardLayout, setDashboardLayout } = useSettingsStore();
  const [saved, setSaved] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);

  // Listen for hash changes (e.g. clicking Demo Mode while already on Settings)
  useEffect(() => {
    const onHashChange = () => {
      if (window.location.hash.includes('tab=account')) {
        setActiveTab('account');
      } else if (window.location.hash.includes('tab=general')) {
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
      const res = await fetch(`${API_URL}/api/integrations/telegram/verify`, {
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

  // When mock data toggle changes, immediately clear or restore all stores.
  //
  // ON  → populate Zustand with mock arrays (in-memory only, DB untouched)
  // OFF → if Quick Login user, show auth modal first.
  //        Otherwise clear Zustand and hydrate from DB.
  const applyRealMode = async () => {
    setKeepMockData(false);

    // 1. Clear mock/sample data from in-memory state.
    //    clearMockData only wipes Zustand state (not localStorage or DB),
    //    so this is safe — it guarantees mock items don't leak into real mode.
    useTaskStore.getState().clearMockData();
    useProjectStore.getState().clearMockData();
    useChatStore.getState().clearMockData();
    useNotificationStore.getState().clearMockData();
    useUserStore.getState().clearViewAs();

    // 2. Hydrate from DB — each store replaces state with DB data.
    //    If the DB is empty, stores seed initial data and persist it.
    const currentUser = useUserStore.getState().user;
    if (isDbConnected() && currentUser) {
      await Promise.all([
        useTaskStore.getState().hydrateFromDb(currentUser.id),
        useNotificationStore.getState().hydrateFromDb(currentUser.id),
        useChatStore.getState().hydrateFromDb(currentUser.id),
        useProjectStore.getState().hydrateFromDb(currentUser.id),
      ]);
      // Refresh assignable members so dropdowns show real DB users
      await useUserStore.getState().loadAssignableMembers();
    }
  };

  const handleMockDataToggle = (enabled: boolean) => {
    if (enabled) {
      // ── Switching to mock mode: populate in-memory only, never write to DB ──
      setKeepMockData(true);
      useTaskStore.getState().restoreMockData(user?.id);
      useProjectStore.getState().restoreMockData();
      if (user) {
        useNotificationStore.getState().restoreMockData(user.id, user.name);
        useChatStore.getState().restoreMockData(user.id);
      }
      // Refresh assignable members so dropdowns show demo profiles
      useUserStore.getState().loadAssignableMembers();
    } else {
      // ── Switching to real mode ──
      // If the user is on a Quick Login demo session they have no real
      // Supabase account — prompt them to sign in or register first.
      if (isQuickLoginUser()) {
        setShowDemoModal(true);
        return; // Don't apply real mode yet — wait for auth success
      }
      applyRealMode();
    }
  };

  // Called by modal after a successful sign-in (existing user)
  const handleDemoModalSuccessExisting = () => {
    setShowDemoModal(false);
    applyRealMode();
  };

  // Called by modal after a successful sign-up (new user) → onboarding
  const handleDemoModalSuccessNew = () => {
    setShowDemoModal(false);
    applyRealMode();
    // Send new users to preferences-only onboarding (password was already set
    // in the sign-up form). Pass ?from=settings so the page skips the password step.
    window.location.hash = '#onboard?from=settings';
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
      {/* Demo-to-real auth modal */}
      {showDemoModal && (
        <DemoToRealModal
          onClose={() => setShowDemoModal(false)}
          onSuccessExisting={handleDemoModalSuccessExisting}
          onSuccessNew={handleDemoModalSuccessNew}
        />
      )}

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
                      {([
                        { key: 'purple', hex: '#8b5cf6', label: 'Purple' },
                        { key: 'blue',   hex: '#3b82f6', label: 'Blue' },
                        { key: 'green',  hex: '#10b981', label: 'Green' },
                        { key: 'amber',  hex: '#f59e0b', label: 'Amber' },
                        { key: 'red',    hex: '#ef4444', label: 'Red' },
                        { key: 'pink',   hex: '#ec4899', label: 'Pink' },
                      ] as const).map((c) => (
                        <button
                          key={c.key}
                          onClick={() => setAccentColor(c.key)}
                          className={clsx(
                            'w-7 h-7 rounded-full transition-all hover:scale-110',
                            accentColor === c.key && 'ring-2 ring-offset-2 dark:ring-offset-slate-800',
                          )}
                          style={{
                            backgroundColor: c.hex,
                            ...(accentColor === c.key ? { ['--tw-ring-color' as string]: c.hex } : {}),
                          }}
                          title={c.label}
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
                    icon={<Monitor size={16} />}
                    label="Dashboard Layout"
                    description="Choose between classic and modern dashboard views"
                  >
                    <div className="flex items-center gap-2">
                      {([
                        { key: 'default', label: 'Classic' },
                        { key: 'modern', label: 'Modern' },
                      ] as const).map((l) => (
                        <button
                          key={l.key}
                          onClick={() => setDashboardLayout(l.key)}
                          className={clsx(
                            'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                            dashboardLayout === l.key
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                          )}
                        >
                          {l.label}
                        </button>
                      ))}
                    </div>
                  </SettingRow>
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

              <ChangePasswordCard isQuickLogin={isQuickLoginUser()} autoOpen={isRecoveryMode} skipCurrentPassword={isRecoveryMode} />

              <Card>
                <CardHeader title="Security" subtitle="Additional security options" />
                <CardContent>
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
                    label="Sample Data"
                    description="Show example tasks, projects, and chats while exploring. Turn off to work with your own real data — requires a free account."
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
