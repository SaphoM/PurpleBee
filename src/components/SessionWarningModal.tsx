import React from 'react';
import clsx from 'clsx';
import { ShieldAlert } from 'lucide-react';

interface SessionWarningModalProps {
  isOpen: boolean;
  secondsRemaining: number;
  onContinue: () => void;
}

/**
 * Shown when the user has been idle for INACTIVITY_TIMEOUT_MS (see
 * src/lib/sessionGuard.ts). Deliberately not dismissable via backdrop click
 * or Escape — this is a security prompt, not a regular modal — and
 * disappears automatically the instant any real activity is detected
 * elsewhere in the app (see useSessionGuard), not just via the button.
 */
export const SessionWarningModal: React.FC<SessionWarningModalProps> = ({ isOpen, secondsRemaining, onContinue }) => {
  if (!isOpen) return null;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const countdown = `${minutes}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className={clsx(
          'relative w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center',
          'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700'
        )}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="session-warning-title"
      >
        <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <ShieldAlert size={24} className="text-amber-500" />
        </div>
        <h2 id="session-warning-title" className="text-lg font-bold text-gray-900 dark:text-slate-100">
          Are you still working?
        </h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">
          Your PurpleBee session will expire soon for security.
        </p>
        <p className="text-2xl font-mono font-bold text-amber-600 dark:text-amber-400 my-4">{countdown}</p>
        <button
          type="button"
          onClick={onContinue}
          className={clsx(
            'w-full py-2.5 rounded-xl text-sm font-semibold transition-all',
            'bg-gradient-to-r from-purple-600 to-blue-600 text-white',
            'hover:from-purple-700 hover:to-blue-700'
          )}
        >
          Continue Working
        </button>
      </div>
    </div>
  );
};
