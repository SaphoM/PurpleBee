import React, { useState } from 'react';
import clsx from 'clsx';
import {
  Zap,
  Shield,
  Crown,
  User,
  Eye,
  EyeOff,
  LogIn,
  ChevronRight,
  ChevronLeft,
  Lock,
  Mail,
  Sparkles,
  Building2,
  Database,
  Lightbulb,
  Check,
  ArrowRight,
  Users,
  Briefcase,
} from 'lucide-react';
import { useUserStore, teamProfiles, AppRole } from '@stores/userStore';
import { useSettingsStore } from '@stores/settingsStore';

// ─── Role config ──────────────────────────────────────────────────────
const roleConfig: Record<AppRole, { label: string; description: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  admin: {
    label: 'Admin',
    description: 'Full access to all features, team management, and analytics',
    color: 'text-red-600',
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-700/40 hover:border-red-400 dark:hover:border-red-500',
    icon: <Shield size={18} className="text-red-500" />,
  },
  manager: {
    label: 'Manager',
    description: 'View all tasks, manage team workload, full analytics',
    color: 'text-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-700/40 hover:border-amber-400 dark:hover:border-amber-500',
    icon: <Crown size={18} className="text-amber-500" />,
  },
  user: {
    label: 'Team Member',
    description: 'View assigned tasks, personal dashboard, and team chat',
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-700/40 hover:border-blue-400 dark:hover:border-blue-500',
    icon: <User size={18} className="text-blue-500" />,
  },
};

// ─── Onboarding Toggle ────────────────────────────────────────────────
const OnboardToggle: React.FC<{
  enabled: boolean;
  onChange: (v: boolean) => void;
  icon: React.ReactNode;
  title: string;
  description: string;
  enabledLabel?: string;
  disabledLabel?: string;
}> = ({ enabled, onChange, icon, title, description, enabledLabel = 'On', disabledLabel = 'Off' }) => (
  <button
    type="button"
    onClick={() => onChange(!enabled)}
    className={clsx(
      'w-full flex items-start gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left',
      enabled
        ? 'border-purple-400 dark:border-purple-500 bg-purple-50/60 dark:bg-purple-900/15'
        : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 hover:border-gray-300 dark:hover:border-slate-600'
    )}
  >
    <div className={clsx(
      'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
      enabled
        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
        : 'bg-gray-100 dark:bg-slate-700/50 text-gray-400 dark:text-slate-500'
    )}>
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-0.5">
        <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{title}</p>
        <span className={clsx(
          'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full',
          enabled
            ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400'
            : 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500'
        )}>
          {enabled ? enabledLabel : disabledLabel}
        </span>
      </div>
      <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">{description}</p>
    </div>
  </button>
);

// ─── Main Login Page ──────────────────────────────────────────────────
type PageMode = 'login' | 'create';

export const LoginPage: React.FC = () => {
  const { login, loginWithEmail, signUpWithEmail, error, setError, isLoading: storeLoading, sessionExpiredReason } = useUserStore();
  const { setKeepMockData, setShowTips, hideQuickLogin, setHideQuickLogin } = useSettingsStore();

  const [pageMode, setPageMode] = useState<PageMode>('login');
  const [password, setPassword] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [rememberMe, setRememberMeChecked] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginMode, setLoginMode] = useState<'select' | 'credentials'>(hideQuickLogin ? 'credentials' : 'select');
  const [signUpDone, setSignUpDone] = useState(false); // "Check your email" screen

  // ── Create Account state ──
  const [createStep, setCreateStep] = useState(0); // 0 = details, 1 = workspace, 2 = preferences
  const [companyName, setCompanyName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [industry, setIndustry] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [mockDataEnabled, setMockDataEnabled] = useState(true);
  const [tipsEnabled, setTipsEnabled] = useState(true);

  // ── Demo Quick Login ──
  const handleSelectLogin = (profileId: string) => {
    setIsLoading(true);
    setError(null);
    setTimeout(() => {
      login(profileId, 'demo');
      setIsLoading(false);
    }, 600);
  };

  // ── Real Supabase Auth login ──
  const handleCredentialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim()) { setError('Please enter your email'); return; }
    if (!password.trim()) { setError('Please enter your password'); return; }
    setIsLoading(true);
    setError(null);
    const success = await loginWithEmail(loginEmail, password, rememberMe);
    setIsLoading(false);
    if (!success && !error) {
      setError('Invalid email or password');
    }
  };

  // ── Real Supabase Auth sign-up ──
  const handleCreateAccount = async () => {
    setIsLoading(true);
    setKeepMockData(mockDataEnabled);
    setShowTips(tipsEnabled);

    const result = await signUpWithEmail(email, createPassword, fullName, companyName || undefined);
    setIsLoading(false);

    if (result.success && result.needsConfirmation) {
      setSignUpDone(true);
    } else if (result.success) {
      // No confirmation needed — auto-login (rare if email confirm is on)
      await loginWithEmail(email, createPassword);
    }
  };

  const canProceedStep0 = fullName.trim() && email.trim() && createPassword.trim();
  const canProceedStep1 = companyName.trim();

  // Group profiles by role
  const admins = teamProfiles.filter((p) => p.role === 'admin');
  const managers = teamProfiles.filter((p) => p.role === 'manager');
  const members = teamProfiles.filter((p) => p.role === 'user');

  // ── Step indicators ──
  const steps = [
    { label: 'Account', icon: <User size={14} /> },
    { label: 'Workspace', icon: <Building2 size={14} /> },
    { label: 'Preferences', icon: <Sparkles size={14} /> },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-200 dark:bg-purple-900/20 rounded-full blur-3xl opacity-40" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200 dark:bg-blue-900/20 rounded-full blur-3xl opacity-40" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/10 dark:to-blue-900/10 rounded-full blur-3xl opacity-30" />
      </div>

      <div className="relative w-full max-w-lg">
        {/* Logo + Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src="/logo.png" alt="PurpleBee Task Manager" className="h-24 object-contain" />
          </div>
          <p className="text-gray-500 dark:text-slate-400 mt-1">
            {pageMode === 'login' ? 'Sign in to your workspace' : 'Create your business account'}
          </p>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* LOGIN MODE                                                     */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {pageMode === 'login' && (
          <>
            <div className={clsx(
              'bg-white dark:bg-slate-800/60 dark:backdrop-blur-xl',
              'rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-slate-900/50',
              'border border-gray-200 dark:border-slate-700/50',
              'overflow-hidden'
            )}>
              {/* Tab Toggle */}
              <div className="flex border-b border-gray-200 dark:border-slate-700/50">
                {!hideQuickLogin && (
                  <button
                    onClick={() => { setLoginMode('select'); setError(null); }}
                    className={clsx(
                      'flex-1 py-3.5 text-sm font-semibold transition-colors relative',
                      loginMode === 'select'
                        ? 'text-purple-600 dark:text-purple-400'
                        : 'text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300'
                    )}
                  >
                    Quick Login
                    {loginMode === 'select' && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 dark:bg-purple-400" />
                    )}
                  </button>
                )}
                <button
                  onClick={() => { setLoginMode('credentials'); setError(null); }}
                  className={clsx(
                    'flex-1 py-3.5 text-sm font-semibold transition-colors relative',
                    loginMode === 'credentials'
                      ? 'text-purple-600 dark:text-purple-400'
                      : 'text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300'
                  )}
                >
                  Email & Password
                  {loginMode === 'credentials' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 dark:bg-purple-400" />
                  )}
                </button>
              </div>

              <div className="p-6">
                {sessionExpiredReason && !error && (
                  <div className="mb-4 px-3 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 text-xs text-amber-700 dark:text-amber-400 font-medium">
                    Your session has expired for security. Please sign in again to continue.
                  </div>
                )}
                {error && (
                  <div className="mb-4 px-3 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/40 text-xs text-red-600 dark:text-red-400 font-medium">
                    {error}
                  </div>
                )}

                {loginMode === 'select' ? (
                  <div className="space-y-6">
                    {/* Admins */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Shield size={14} className="text-red-500" />
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500">Administrators</span>
                      </div>
                      <div className="space-y-2">
                        {admins.map((profile) => (
                          <ProfileCard key={profile.id} profile={profile} isLoading={isLoading} onClick={() => handleSelectLogin(profile.id)} />
                        ))}
                      </div>
                    </div>
                    {/* Managers */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Crown size={14} className="text-amber-500" />
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500">Managers</span>
                      </div>
                      <div className="space-y-2">
                        {managers.map((profile) => (
                          <ProfileCard key={profile.id} profile={profile} isLoading={isLoading} onClick={() => handleSelectLogin(profile.id)} />
                        ))}
                      </div>
                    </div>
                    {/* Members */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <User size={14} className="text-blue-500" />
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500">Team Members</span>
                      </div>
                      <div className="space-y-2">
                        {members.map((profile) => (
                          <ProfileCard key={profile.id} profile={profile} isLoading={isLoading} onClick={() => handleSelectLogin(profile.id)} />
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleCredentialLogin} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">Email Address</label>
                      <div className="relative">
                        <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                        <input
                          type="email"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          placeholder="you@company.com"
                          autoComplete="email"
                          className={clsx(
                            'w-full rounded-xl pl-10 pr-4 py-3 text-sm',
                            'bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400',
                            'dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500',
                            'focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all'
                          )}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">Password</label>
                      <div className="relative">
                        <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          autoComplete="current-password"
                          className={clsx(
                            'w-full rounded-xl pl-10 pr-12 py-3 text-sm',
                            'bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400',
                            'dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500',
                            'focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all'
                          )}
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMeChecked(e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500/30"
                        />
                        <span className="text-xs text-gray-500 dark:text-slate-400">Remember me</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => { window.location.hash = '#reset-password'; }}
                        className="text-xs text-purple-600 dark:text-purple-400 font-medium hover:text-purple-700"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading || storeLoading || !loginEmail.trim() || !password.trim()}
                      className={clsx(
                        'w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold',
                        'bg-gradient-to-r from-purple-600 to-blue-600 text-white',
                        'hover:from-purple-700 hover:to-blue-700',
                        'shadow-md shadow-purple-500/20 hover:shadow-lg hover:shadow-purple-500/30',
                        'disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200'
                      )}
                    >
                      {(isLoading || storeLoading) ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><LogIn size={16} />Sign In</>}
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Footer: Create Account CTA + Quick Login toggle */}
            <div className="mt-6 space-y-3">
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  New to Purple Bee?{' '}
                  <button
                    onClick={() => { setPageMode('create'); setCreateStep(0); setError(null); }}
                    className="font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                  >
                    Create a business account
                  </button>
                </p>
              </div>
              {loginMode === 'select' && !hideQuickLogin && (
                <div className="text-center">
                  <button
                    onClick={() => {
                      setHideQuickLogin(true);
                      setLoginMode('credentials');
                    }}
                    className="text-[11px] text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors underline underline-offset-2"
                  >
                    Don't show Quick Login again
                  </button>
                </div>
              )}
              {loginMode === 'select' && (
                <div className="text-center">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700/40">
                    <Sparkles size={12} className="text-purple-500" />
                    <span className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">
                      Demo mode — any password works. Choose a role to explore.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* EMAIL CONFIRMATION SCREEN                                      */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {signUpDone && (
          <>
            <div className={clsx(
              'bg-white dark:bg-slate-800/60 dark:backdrop-blur-xl',
              'rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-slate-900/50',
              'border border-gray-200 dark:border-slate-700/50',
              'p-8 text-center'
            )}>
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto mb-5">
                <Mail size={28} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">Check your email</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">
                We've sent a confirmation link to
              </p>
              <p className="text-sm font-semibold text-purple-600 dark:text-purple-400 mb-6">{email}</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 leading-relaxed mb-6">
                Click the link in the email to activate your account, then come back here to sign in.
              </p>
              <button
                onClick={() => {
                  setSignUpDone(false);
                  setPageMode('login');
                  setLoginMode('credentials');
                  setLoginEmail(email); // Pre-fill email for convenience
                  setError(null);
                }}
                className={clsx(
                  'w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold',
                  'bg-gradient-to-r from-purple-600 to-blue-600 text-white',
                  'hover:from-purple-700 hover:to-blue-700',
                  'shadow-md shadow-purple-500/20 transition-all'
                )}
              >
                <LogIn size={16} />
                Back to Sign In
              </button>
            </div>
            <div className="text-center mt-4">
              <p className="text-xs text-gray-400 dark:text-slate-500">
                Didn't receive the email? Check your spam folder or{' '}
                <button
                  onClick={() => { setSignUpDone(false); setPageMode('create'); setCreateStep(0); }}
                  className="text-purple-600 dark:text-purple-400 font-medium hover:text-purple-700"
                >
                  try again
                </button>
              </p>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* CREATE ACCOUNT MODE                                            */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {pageMode === 'create' && !signUpDone && (
          <>
            <div className={clsx(
              'bg-white dark:bg-slate-800/60 dark:backdrop-blur-xl',
              'rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-slate-900/50',
              'border border-gray-200 dark:border-slate-700/50',
              'overflow-hidden'
            )}>
              {/* Step indicator */}
              <div className="px-6 pt-5 pb-4">
                <div className="flex items-center justify-between mb-1">
                  {steps.map((step, i) => (
                    <React.Fragment key={i}>
                      <button
                        onClick={() => {
                          // Only allow going back to completed steps
                          if (i < createStep) setCreateStep(i);
                        }}
                        className={clsx(
                          'flex items-center gap-2 transition-all',
                          i <= createStep ? 'cursor-pointer' : 'cursor-default'
                        )}
                      >
                        <div className={clsx(
                          'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                          i < createStep
                            ? 'bg-purple-600 text-white'
                            : i === createStep
                              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 ring-2 ring-purple-300 dark:ring-purple-600'
                              : 'bg-gray-100 dark:bg-slate-700/50 text-gray-400 dark:text-slate-500'
                        )}>
                          {i < createStep ? <Check size={14} /> : i + 1}
                        </div>
                        <span className={clsx(
                          'text-xs font-semibold hidden sm:inline',
                          i <= createStep ? 'text-gray-900 dark:text-slate-100' : 'text-gray-400 dark:text-slate-500'
                        )}>
                          {step.label}
                        </span>
                      </button>
                      {i < steps.length - 1 && (
                        <div className={clsx(
                          'flex-1 h-0.5 mx-2 rounded-full transition-colors',
                          i < createStep ? 'bg-purple-500' : 'bg-gray-200 dark:bg-slate-700'
                        )} />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-100 dark:border-slate-700/50" />

              <div className="p-6">
                {error && (
                  <div className="mb-4 px-3 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/40 text-xs text-red-600 dark:text-red-400 font-medium">
                    {error}
                  </div>
                )}

                {/* ── Step 0: Account Details ── */}
                {createStep === 0 && (
                  <div className="space-y-4">
                    <div className="mb-2">
                      <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">Create your account</h2>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">You'll be set up as the workspace admin</p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">Full Name</label>
                      <div className="relative">
                        <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. Sarah Johnson"
                          className={clsx(
                            'w-full rounded-xl pl-10 pr-4 py-3 text-sm',
                            'bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400',
                            'dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500',
                            'focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all'
                          )}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">Work Email</label>
                      <div className="relative">
                        <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="sarah@company.com"
                          className={clsx(
                            'w-full rounded-xl pl-10 pr-4 py-3 text-sm',
                            'bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400',
                            'dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500',
                            'focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all'
                          )}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">Password</label>
                      <div className="relative">
                        <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                        <input
                          type={showCreatePassword ? 'text' : 'password'}
                          value={createPassword}
                          onChange={(e) => setCreatePassword(e.target.value)}
                          placeholder="Create a strong password"
                          className={clsx(
                            'w-full rounded-xl pl-10 pr-12 py-3 text-sm',
                            'bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400',
                            'dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500',
                            'focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all'
                          )}
                        />
                        <button type="button" onClick={() => setShowCreatePassword(!showCreatePassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                        >
                          {showCreatePassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (!canProceedStep0) { setError('Please fill in all fields'); return; }
                        setError(null);
                        setCreateStep(1);
                      }}
                      className={clsx(
                        'w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold',
                        'bg-gradient-to-r from-purple-600 to-blue-600 text-white',
                        'hover:from-purple-700 hover:to-blue-700',
                        'shadow-md shadow-purple-500/20 hover:shadow-lg hover:shadow-purple-500/30',
                        'disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200'
                      )}
                      disabled={!canProceedStep0}
                    >
                      Continue
                      <ArrowRight size={16} />
                    </button>
                  </div>
                )}

                {/* ── Step 1: Workspace Setup ── */}
                {createStep === 1 && (
                  <div className="space-y-4">
                    <div className="mb-2">
                      <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">Set up your workspace</h2>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Tell us about your business</p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">Company / Organisation</label>
                      <div className="relative">
                        <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                        <input
                          type="text"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="e.g. Acme Corp"
                          className={clsx(
                            'w-full rounded-xl pl-10 pr-4 py-3 text-sm',
                            'bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400',
                            'dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500',
                            'focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all'
                          )}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">Industry</label>
                      <div className="relative">
                        <Briefcase size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                        <select
                          value={industry}
                          onChange={(e) => setIndustry(e.target.value)}
                          className={clsx(
                            'w-full rounded-xl pl-10 pr-4 py-3 text-sm appearance-none',
                            'bg-gray-50 border border-gray-200 text-gray-800',
                            'dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-100',
                            'focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all'
                          )}
                        >
                          <option value="">Select industry...</option>
                          <option value="tech">Technology</option>
                          <option value="finance">Finance & Banking</option>
                          <option value="marketing">Marketing & Advertising</option>
                          <option value="healthcare">Healthcare</option>
                          <option value="education">Education</option>
                          <option value="consulting">Consulting</option>
                          <option value="retail">Retail & E-commerce</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">Team Size</label>
                      <div className="relative">
                        <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                        <select
                          value={teamSize}
                          onChange={(e) => setTeamSize(e.target.value)}
                          className={clsx(
                            'w-full rounded-xl pl-10 pr-4 py-3 text-sm appearance-none',
                            'bg-gray-50 border border-gray-200 text-gray-800',
                            'dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-100',
                            'focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all'
                          )}
                        >
                          <option value="">Select team size...</option>
                          <option value="1-5">1 – 5 people</option>
                          <option value="6-20">6 – 20 people</option>
                          <option value="21-50">21 – 50 people</option>
                          <option value="51-200">51 – 200 people</option>
                          <option value="200+">200+ people</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-1">
                      <button
                        onClick={() => setCreateStep(0)}
                        className={clsx(
                          'flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-sm font-medium',
                          'border border-gray-200 dark:border-slate-600',
                          'text-gray-600 dark:text-slate-300',
                          'hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors'
                        )}
                      >
                        <ChevronLeft size={16} />
                        Back
                      </button>
                      <button
                        onClick={() => {
                          if (!canProceedStep1) { setError('Please enter your company name'); return; }
                          setError(null);
                          setCreateStep(2);
                        }}
                        disabled={!canProceedStep1}
                        className={clsx(
                          'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold',
                          'bg-gradient-to-r from-purple-600 to-blue-600 text-white',
                          'hover:from-purple-700 hover:to-blue-700',
                          'shadow-md shadow-purple-500/20 hover:shadow-lg hover:shadow-purple-500/30',
                          'disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200'
                        )}
                      >
                        Continue
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Step 2: Preferences (Mock Data + Tips) ── */}
                {createStep === 2 && (
                  <div className="space-y-4">
                    <div className="mb-2">
                      <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">Your preferences</h2>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Customise your onboarding experience. You can change these later in Settings.</p>
                    </div>

                    <OnboardToggle
                      enabled={mockDataEnabled}
                      onChange={setMockDataEnabled}
                      icon={<Database size={20} />}
                      title="Sample Data"
                      description="Load sample tasks, projects, chats, and notifications to explore the app. Turn off to start with a clean workspace connected to your database."
                      enabledLabel="Yes"
                      disabledLabel="No"
                    />

                    <OnboardToggle
                      enabled={tipsEnabled}
                      onChange={setTipsEnabled}
                      icon={<Lightbulb size={20} />}
                      title="Onboarding Tips"
                      description="Show helpful tooltips when hovering over UI elements, plus a welcome guide on first login. Great for learning the interface."
                      enabledLabel="Yes"
                      disabledLabel="No"
                    />

                    {/* What you'll get summary */}
                    <div className={clsx(
                      'p-3.5 rounded-xl',
                      'bg-gray-50 dark:bg-slate-700/30',
                      'border border-gray-100 dark:border-slate-700/50'
                    )}>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-2">Your workspace will include</p>
                      <div className="space-y-1.5">
                        <SummaryRow icon={<Shield size={12} />} text={`Admin account for ${fullName || 'you'}`} active />
                        <SummaryRow icon={<Building2 size={12} />} text={companyName ? `${companyName} workspace` : 'Your workspace'} active />
                        <SummaryRow icon={<Database size={12} />} text={mockDataEnabled ? 'Sample tasks, projects & chats' : 'Clean workspace — no sample data'} active={mockDataEnabled} />
                        <SummaryRow icon={<Lightbulb size={12} />} text={tipsEnabled ? 'Hover tips & welcome guide' : 'No onboarding tips'} active={tipsEnabled} />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-1">
                      <button
                        onClick={() => setCreateStep(1)}
                        className={clsx(
                          'flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-sm font-medium',
                          'border border-gray-200 dark:border-slate-600',
                          'text-gray-600 dark:text-slate-300',
                          'hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors'
                        )}
                      >
                        <ChevronLeft size={16} />
                        Back
                      </button>
                      <button
                        onClick={handleCreateAccount}
                        disabled={isLoading}
                        className={clsx(
                          'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold',
                          'bg-gradient-to-r from-purple-600 to-blue-600 text-white',
                          'hover:from-purple-700 hover:to-blue-700',
                          'shadow-md shadow-purple-500/20 hover:shadow-lg hover:shadow-purple-500/30',
                          'disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200'
                        )}
                      >
                        {isLoading ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <Zap size={16} />
                            Create Account
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Back to login */}
            <div className="text-center mt-6">
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Already have an account?{' '}
                <button
                  onClick={() => { setPageMode('login'); setError(null); }}
                  className="font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                >
                  Sign in
                </button>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ── Summary Row ──
const SummaryRow: React.FC<{ icon: React.ReactNode; text: string; active?: boolean }> = ({ icon, text, active = true }) => (
  <div className="flex items-center gap-2">
    <div className={clsx(
      'flex-shrink-0',
      active ? 'text-purple-500 dark:text-purple-400' : 'text-gray-300 dark:text-slate-600'
    )}>
      {icon}
    </div>
    <span className={clsx(
      'text-xs',
      active ? 'text-gray-700 dark:text-slate-300' : 'text-gray-400 dark:text-slate-500 line-through'
    )}>
      {text}
    </span>
  </div>
);

// ── Profile Card for Quick Login ──
const ProfileCard: React.FC<{
  profile: typeof teamProfiles[0];
  isLoading: boolean;
  onClick: () => void;
}> = ({ profile, isLoading, onClick }) => {
  const cfg = roleConfig[profile.role];
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={clsx(
        'w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200',
        'bg-white dark:bg-slate-800/40',
        cfg.border,
        'hover:shadow-md group',
        'disabled:opacity-60 disabled:cursor-wait'
      )}
    >
      <img src={profile.avatar} alt={profile.name} className="w-10 h-10 rounded-full flex-shrink-0 ring-2 ring-gray-100 dark:ring-slate-700" />
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900 dark:text-slate-100 truncate">{profile.name}</span>
          <span className={clsx('inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase', cfg.bg, cfg.color)}>
            {cfg.icon}
            {cfg.label}
          </span>
        </div>
        <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{profile.title} &middot; {profile.email}</p>
      </div>
      <ChevronRight size={16} className="text-gray-300 dark:text-slate-600 group-hover:text-purple-500 dark:group-hover:text-purple-400 transition-colors flex-shrink-0" />
    </button>
  );
};
