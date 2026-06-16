import React, { useEffect, useState } from 'react';
import { XCircle, Loader2, Users, CheckCircle } from 'lucide-react';
import { inviteDb } from '@/lib/dataService';
import { useUserStore } from '@stores/userStore';

interface InviteData {
  id: string;
  token: string;
  email: string | null;
  role: string;
  department: string | null;
  status: string;
  expires_at: string;
  teams: { name: string } | null;
  profiles: { name: string; email: string } | null;
}

export const InviteAcceptPage: React.FC<{ token: string }> = ({ token }) => {
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, user } = useUserStore();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await inviteDb.getByToken(token);
      if (!data) {
        setError('This invite link is invalid or has expired.');
      } else if (data.status === 'accepted') {
        // Already accepted — just redirect to app
        setAccepted(true);
        setTimeout(() => {
          window.location.href = window.location.origin + '#dashboard';
        }, 1500);
      } else if (data.status !== 'pending') {
        setError(`This invite has already been ${data.status}.`);
      } else if (new Date(data.expires_at) < new Date()) {
        setError('This invite link has expired.');
      } else {
        setInvite(data as InviteData);

        // If user is already authenticated (came via magic link), auto-accept
        if (user) {
          setAccepting(true);
          const result = await inviteDb.accept(token, user.id);
          if (result) {
            setAccepted(true);
            setTimeout(() => {
              // Clean the URL and go to onboarding for new invitees
              window.history.replaceState({}, '', window.location.origin);
              window.location.hash = '#onboard';
              window.location.reload();
            }, 2000);
          } else {
            setAccepting(false);
            // invite might already be accepted by the trigger
            setAccepted(true);
            setTimeout(() => {
              window.history.replaceState({}, '', window.location.origin);
              window.location.hash = '#onboard';
              window.location.reload();
            }, 2000);
          }
        }
      }
      setLoading(false);
    };
    load();
  }, [token, user]);

  const handleAccept = async () => {
    if (!user || !invite) return;
    setAccepting(true);
    const result = await inviteDb.accept(token, user.id);
    if (result) {
      setAccepted(true);
      setTimeout(() => {
        window.history.replaceState({}, '', window.location.origin);
        window.location.hash = '#onboard';
        window.location.reload();
      }, 2000);
    } else {
      setError('Failed to accept invite.');
      setAccepting(false);
    }
  };

  const handleSignUp = () => {
    // Store invite token so we can accept after sign-up
    sessionStorage.setItem('purplebee-invite-token', token);
    window.history.replaceState({}, '', window.location.origin);
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
        <Loader2 size={32} className="animate-spin text-purple-500" />
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 p-8 text-center">
          <CheckCircle size={48} className="mx-auto mb-4 text-emerald-500" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">You're in!</h2>
          <p className="text-gray-500 dark:text-slate-400">Redirecting to your team…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 p-8 text-center">
          <XCircle size={48} className="mx-auto mb-4 text-red-400" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">Invalid Invite</h2>
          <p className="text-gray-500 dark:text-slate-400 mb-6">{error}</p>
          <button
            onClick={() => { window.location.href = window.location.origin; }}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const teamName = (invite?.teams as any)?.name || 'the team';
  const inviterName = (invite?.profiles as any)?.name || 'Someone';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white mx-auto mb-5">
          <Users size={28} />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">
          You're invited to {teamName}
        </h2>
        <p className="text-gray-500 dark:text-slate-400 mb-2">
          {inviterName} invited you to join as a <span className="font-semibold capitalize">{invite?.role}</span>.
        </p>
        {invite?.department && (
          <p className="text-sm text-gray-400 dark:text-slate-500 mb-6">
            Department: <span className="font-medium text-gray-600 dark:text-slate-300">{invite.department}</span>
          </p>
        )}

        {accepting ? (
          <div className="flex items-center justify-center gap-2 py-3 text-purple-600 dark:text-purple-400">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm font-medium">Joining team…</span>
          </div>
        ) : isAuthenticated ? (
          <button
            onClick={handleAccept}
            className="w-full py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-md shadow-purple-500/20 transition-all"
          >
            Accept & Join Team
          </button>
        ) : (
          <div className="space-y-3">
            <button
              onClick={handleSignUp}
              className="w-full py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-md shadow-purple-500/20 transition-all"
            >
              Create Account & Join
            </button>
            <p className="text-xs text-gray-400 dark:text-slate-500">
              Already have an account?{' '}
              <button onClick={handleSignUp} className="text-purple-500 hover:underline font-medium">
                Sign in
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
