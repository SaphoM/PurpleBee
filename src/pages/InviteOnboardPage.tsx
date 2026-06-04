import React, { useState } from 'react';
import { Lock, Sparkles, HelpCircle, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import { authDb } from '@/lib/dataService';
import { useSettingsStore } from '@stores/settingsStore';
import { useUserStore } from '@stores/userStore';

// skipPassword: true when user already set a password during sign-up
// (e.g. via the Settings demo→real modal) — jump straight to preferences.
export const InviteOnboardPage: React.FC<{ skipPassword?: boolean }> = ({ skipPassword = false }) => {
  const user = useUserStore((s) => s.user);
  const { setKeepMockData, setShowTips } = useSettingsStore();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mockData, setMockData] = useState(false);
  const [tooltips, setTooltips] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Start on step 2 (preferences) if password was already set
  const [step, setStep] = useState(skipPassword ? 2 : 1);

  const handleNext = () => {
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleFinish = async () => {
    setSaving(true);
    setError(null);

    // Update password only when coming from magic-link (no prior password).
    // When skipPassword=true the user already set a password during sign-up.
    if (!skipPassword) {
      const ok = await authDb.updatePassword(password);
      if (!ok) {
        setError('Failed to set password. Please try again.');
        setSaving(false);
        return;
      }
    }

    // Apply preference choices
    setKeepMockData(mockData);
    setShowTips(tooltips);

    // Navigate to dashboard
    setTimeout(() => {
      window.history.replaceState({}, '', window.location.origin);
      window.location.hash = '#dashboard';
      window.location.reload();
    }, 600);
  };

  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 p-4">
      <div className="max-w-md w-full">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className={`w-2.5 h-2.5 rounded-full transition-colors ${step >= 1 ? 'bg-purple-500' : 'bg-gray-300 dark:bg-slate-600'}`} />
          <div className={`w-8 h-0.5 transition-colors ${step >= 2 ? 'bg-purple-500' : 'bg-gray-300 dark:bg-slate-600'}`} />
          <div className={`w-2.5 h-2.5 rounded-full transition-colors ${step >= 2 ? 'bg-purple-500' : 'bg-gray-300 dark:bg-slate-600'}`} />
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 p-8">
          {step === 1 ? (
            <>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white mx-auto mb-5">
                <Lock size={24} />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 text-center mb-1">
                Welcome, {firstName}!
              </h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 text-center mb-6">
                Set a password so you can sign in anytime.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                    Confirm password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500"
                    onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-500 font-medium">{error}</p>
                )}

                <button
                  onClick={handleNext}
                  disabled={!password || !confirmPassword}
                  className="w-full py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-md shadow-purple-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  Continue
                  <ArrowRight size={16} />
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white mx-auto mb-5">
                <Sparkles size={24} />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 text-center mb-1">
                Customize your experience
              </h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 text-center mb-6">
                You can change these anytime in Settings.
              </p>

              <div className="space-y-4 mb-6">
                {/* Mock Data Toggle */}
                <label className="flex items-start gap-4 p-4 rounded-xl border border-gray-200 dark:border-slate-600 hover:border-purple-300 dark:hover:border-purple-600 transition-colors cursor-pointer">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles size={15} className="text-purple-500" />
                      <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">Sample data</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                      Pre-fill your dashboard with example tasks, projects, and chats so you can explore the app.
                    </p>
                  </div>
                  <div
                    onClick={() => setMockData(!mockData)}
                    className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 mt-1 cursor-pointer ${mockData ? 'bg-purple-500' : 'bg-gray-300 dark:bg-slate-600'}`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${mockData ? 'translate-x-5' : ''}`} />
                  </div>
                </label>

                {/* Tooltips Toggle */}
                <label className="flex items-start gap-4 p-4 rounded-xl border border-gray-200 dark:border-slate-600 hover:border-purple-300 dark:hover:border-purple-600 transition-colors cursor-pointer">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <HelpCircle size={15} className="text-blue-500" />
                      <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">Helpful tips</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                      Show guided tooltips and a welcome tour to help you learn the interface.
                    </p>
                  </div>
                  <div
                    onClick={() => setTooltips(!tooltips)}
                    className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 mt-1 cursor-pointer ${tooltips ? 'bg-purple-500' : 'bg-gray-300 dark:bg-slate-600'}`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${tooltips ? 'translate-x-5' : ''}`} />
                  </div>
                </label>
              </div>

              {error && (
                <p className="text-xs text-red-500 font-medium mb-3">{error}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => { setStep(1); setError(null); }}
                  className="px-5 py-3 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleFinish}
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-md shadow-purple-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Setting up…
                    </>
                  ) : (
                    <>
                      Get Started
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
