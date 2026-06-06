import React, { useState } from 'react';
import clsx from 'clsx';
import {
  Zap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { authDb } from '@/lib/dataService';
import { useUserStore } from '@stores/userStore';

// ─── Shared input class ──────────────────────────────────────────────
const inputCls = clsx(
  'w-full rounded-xl pl-10 pr-4 py-3 text-sm',
  'bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400',
  'dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500',
  'focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all',
);

const inputWithBtnCls = clsx(
  'w-full rounded-xl pl-10 pr-12 py-3 text-sm',
  'bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400',
  'dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500',
  'focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all',
);

const btnPrimary = clsx(
  'w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold',
  'bg-gradient-to-r from-purple-600 to-blue-600 text-white',
  'hover:from-purple-700 hover:to-blue-700',
  'shadow-md shadow-purple-500/20 hover:shadow-lg hover:shadow-purple-500/30',
  'disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200',
);

// ─── Props ───────────────────────────────────────────────────────────
interface ResetPasswordPageProps {
  /** When true, the user arrived via a Supabase recovery link and already
   *  has a valid session — show the "set new password" form directly. */
  isRecoveryMode?: boolean;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({
  isRecoveryMode = false,
}) => {
  // ── Request reset state ──
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Set new password state ──
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);

  // ── Request password reset email ──
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    setIsLoading(true);
    setError(null);
    const result = await authDb.resetPasswordForEmail(email);
    setIsLoading(false);
    if (result.success) {
      setEmailSent(true);
    } else {
      setError(result.error || 'Failed to send reset email. Please try again.');
    }
  };

  // ── Set new password ──
  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) {
      setError('Please enter a new password');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setIsLoading(true);
    setError(null);
    const success = await authDb.updatePassword(newPassword);
    setIsLoading(false);
    if (success) {
      setPasswordUpdated(true);
      // Clear the recovery flag so the user can access the app
      useUserStore.setState({ pendingPasswordRecovery: false });
    } else {
      setError('Failed to update password. The reset link may have expired. Please try again.');
    }
  };

  const goToLogin = () => {
    // Clear recovery flag and navigate
    useUserStore.setState({ pendingPasswordRecovery: false });
    window.location.hash = '';
    window.location.search = '';
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-200 dark:bg-purple-900/20 rounded-full blur-3xl opacity-40" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200 dark:bg-blue-900/20 rounded-full blur-3xl opacity-40" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/10 dark:to-blue-900/10 rounded-full blur-3xl opacity-30" />
      </div>

      <div className="relative w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl shadow-lg shadow-purple-500/30 mb-4">
            <Zap size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Purple Bee</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1">
            {isRecoveryMode ? 'Set your new password' : 'Reset your password'}
          </p>
        </div>

        <div
          className={clsx(
            'bg-white dark:bg-slate-800/60 dark:backdrop-blur-xl',
            'rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-slate-900/50',
            'border border-gray-200 dark:border-slate-700/50',
            'overflow-hidden',
          )}
        >
          <div className="p-6">
            {error && (
              <div className="mb-4 px-3 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/40 text-xs text-red-600 dark:text-red-400 font-medium">
                {error}
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════ */}
            {/* PASSWORD UPDATED SUCCESS                               */}
            {/* ═══════════════════════════════════════════════════════ */}
            {passwordUpdated && (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto mb-5">
                  <ShieldCheck size={28} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">
                  Password updated!
                </h2>
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
                  {isRecoveryMode
                    ? 'Your password has been reset successfully. You can now access your workspace.'
                    : 'Your password has been reset successfully. You can now sign in with your new password.'}
                </p>
                <button onClick={() => {
                  useUserStore.setState({ pendingPasswordRecovery: false });
                  if (isRecoveryMode) {
                    window.location.hash = '#dashboard';
                  } else {
                    goToLogin();
                  }
                }} className={btnPrimary}>
                  {isRecoveryMode ? (
                    <><ArrowLeft size={16} /> Go to Dashboard</>
                  ) : (
                    <><ArrowLeft size={16} /> Back to Sign In</>
                  )}
                </button>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════ */}
            {/* SET NEW PASSWORD (recovery mode)                       */}
            {/* ═══════════════════════════════════════════════════════ */}
            {isRecoveryMode && !passwordUpdated && (
              <form onSubmit={handleSetPassword} className="space-y-4">
                <div className="text-center mb-2">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <KeyRound size={22} className="text-purple-600 dark:text-purple-400" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">
                    Create new password
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                    Enter a new password for your account
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500"
                    />
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      autoComplete="new-password"
                      className={inputWithBtnCls}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                    >
                      {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {newPassword.length > 0 && newPassword.length < 6 && (
                    <p className="text-[11px] text-amber-500 mt-1">
                      Must be at least 6 characters
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500"
                    />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      autoComplete="new-password"
                      className={inputWithBtnCls}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                    <p className="text-[11px] text-red-500 mt-1">
                      Passwords do not match
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={
                    isLoading ||
                    !newPassword.trim() ||
                    !confirmPassword.trim() ||
                    newPassword.length < 6 ||
                    newPassword !== confirmPassword
                  }
                  className={btnPrimary}
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck size={16} />
                      Update Password
                    </>
                  )}
                </button>
              </form>
            )}

            {/* ═══════════════════════════════════════════════════════ */}
            {/* EMAIL SENT SUCCESS                                     */}
            {/* ═══════════════════════════════════════════════════════ */}
            {!isRecoveryMode && emailSent && (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto mb-5">
                  <CheckCircle2 size={28} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">
                  Check your email
                </h2>
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">
                  We've sent a password reset link to
                </p>
                <p className="text-sm font-semibold text-purple-600 dark:text-purple-400 mb-6">
                  {email}
                </p>
                <p className="text-xs text-gray-400 dark:text-slate-500 leading-relaxed mb-6">
                  Click the link in the email to reset your password. The link expires in 1 hour.
                </p>
                <button onClick={goToLogin} className={btnPrimary}>
                  <ArrowLeft size={16} />
                  Back to Sign In
                </button>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-4">
                  Didn't receive it? Check your spam folder or{' '}
                  <button
                    onClick={() => {
                      setEmailSent(false);
                      setError(null);
                    }}
                    className="text-purple-600 dark:text-purple-400 font-medium hover:text-purple-700"
                  >
                    try again
                  </button>
                </p>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════ */}
            {/* REQUEST RESET FORM                                     */}
            {/* ═══════════════════════════════════════════════════════ */}
            {!isRecoveryMode && !emailSent && (
              <form onSubmit={handleRequestReset} className="space-y-4">
                <div className="text-center mb-2">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Mail size={22} className="text-purple-600 dark:text-purple-400" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">
                    Forgot your password?
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                    Enter the email address you used to sign up and we'll send you a reset link.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500"
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      autoComplete="email"
                      className={inputCls}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !email.trim()}
                  className={btnPrimary}
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Mail size={16} />
                      Send Reset Link
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Back to sign in link */}
        {!passwordUpdated && !emailSent && (
          <div className="text-center mt-6">
            <button
              onClick={goToLogin}
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 font-medium transition-colors"
            >
              <ArrowLeft size={14} />
              Back to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
