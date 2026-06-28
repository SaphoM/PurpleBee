import React, { useState, useMemo } from 'react';
import clsx from 'clsx';
import {
  Users,
  UserPlus,
  Search,
  Mail,
  MessageSquare,
  Crown,
  CheckCircle2,
  AlertTriangle,
  X,
  Copy,
  Check,
  Circle,
  Target,
  Activity,
  ListChecks,
  Pencil,
  Plus,
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@components/Card';
import { useChatStore } from '@stores/chatStore';
import { useTaskStore } from '@stores/taskStore';
import { useProjectStore } from '@stores/projectStore';
import { useUserStore } from '@stores/userStore';
import { useSettingsStore } from '@stores/settingsStore';
import { useUIStore } from '@stores/uiStore';
import { ChatParticipant, Task } from '@/types/index';
import { format, formatDistanceToNow, isPast, isToday } from 'date-fns';
import { authDb, inviteDb } from '@/lib/dataService';
import { isDbConnected } from '@/lib/supabase';

// Extended member data for the team page
interface TeamMemberData {
  member: ChatParticipant;
  tasksAssigned: Task[];
  tasksCompleted: number;
  tasksInProgress: number;
  tasksOverdue: number;
  totalTasks: number;
  completionRate: number;
  avgProgress: number;
  department: string;
  title: string;
  joinedDate: Date;
  email: string;
}

const departmentConfig: Record<string, { color: string; bg: string }> = {
  'Engineering': { color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  'Design': { color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  'Product': { color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  'QA': { color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  'DevOps': { color: 'text-cyan-700 dark:text-cyan-300', bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
  'Marketing': { color: 'text-pink-700 dark:text-pink-300', bg: 'bg-pink-50 dark:bg-pink-900/20' },
  'Operations': { color: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-50 dark:bg-orange-900/20' },
  'General': { color: 'text-gray-700 dark:text-slate-300', bg: 'bg-gray-50 dark:bg-slate-700/30' },
};

const DEPARTMENTS = [
  'General', 'Engineering', 'Design', 'Product', 'QA',
  'DevOps', 'Marketing', 'Operations',
];

const mockExtendedData: Record<string, { department: string; title: string; joinedDate: Date; email: string }> = {
  'user-1': { department: 'Product', title: 'Product Lead', joinedDate: new Date('2024-01-15'), email: 'sapho@xspark.co.za' },
  'user-2': { department: 'Design', title: 'UI/UX Designer', joinedDate: new Date('2024-03-20'), email: 'thando@xspark.co.za' },
  'user-3': { department: 'Engineering', title: 'Backend Developer', joinedDate: new Date('2024-02-10'), email: 'lerato@xspark.co.za' },
  'user-4': { department: 'Engineering', title: 'Full-Stack Developer', joinedDate: new Date('2024-04-05'), email: 'kabelo@xspark.co.za' },
  'user-5': { department: 'Engineering', title: 'Integration Engineer', joinedDate: new Date('2024-06-12'), email: 'naledi@xspark.co.za' },
};

// Invite modal
const InviteModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [selectedDepts, setSelectedDepts] = useState<string[]>(['General']);
  const [customDepts, setCustomDepts] = useState<string[]>([]);
  const [addingCustom, setAddingCustom] = useState(false);
  const [customInput, setCustomInput] = useState('');

  const allDepts = [...DEPARTMENTS, ...customDepts];
  const department = selectedDepts.join(', ');

  const toggleDept = (dept: string) => {
    setSelectedDepts((prev) =>
      prev.includes(dept)
        ? prev.length === 1 ? prev : prev.filter((d) => d !== dept)
        : [...prev, dept]
    );
  };
  const removeDept = (dept: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isCustom = customDepts.includes(dept);
    if (isCustom) setCustomDepts((prev) => prev.filter((d) => d !== dept));
    setSelectedDepts((prev) => prev.length === 1 && prev[0] === dept ? prev : prev.filter((d) => d !== dept));
  };
  const commitCustom = () => {
    const name = customInput.trim();
    if (name && !allDepts.includes(name)) {
      setCustomDepts((prev) => [...prev, name]);
      setSelectedDepts((prev) => [...prev, name]);
    }
    setCustomInput('');
    setAddingCustom(false);
  };
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const { user } = useUserStore();

  // Dynamic invite link
  const inviteLink = linkToken
    ? `${window.location.origin}#invite?token=${linkToken}`
    : null;

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Shared helper — ensures a team exists (auto-creates if needed).
  // Delegates to userStore so the resolved team_id is cached app-wide and
  // every subsequent create (task/project/notification) attaches to it.
  const ensureTeam = async () => {
    if (!isDbConnected()) throw new Error('Invites require a database connection. Please sign in with your email account.');
    const teamId = await useUserStore.getState().ensureTeam();
    if (!teamId) throw new Error('Could not find or create your team.');
    return { team_id: teamId };
  };

  const handleSendInvite = async () => {
    if (!email.trim() || !user) return;
    setSending(true);
    setError(null);

    try {
      const team = await ensureTeam();
      const invite = await inviteDb.create(team.team_id, user.id, role, email, department);
      if (!invite) {
        setError('Failed to create invite. Please try again.');
        setSending(false);
        return;
      }

      // Send magic link email via Supabase — user receives a login link
      // that redirects to the app with the invite token
      const result = await authDb.sendMagicLinkInvite(email, invite.token);
      if (!result.success) {
        setError(result.error || 'Failed to send invite email.');
        setSending(false);
        return;
      }

      setSent(true);
      setEmail('');
      setTimeout(() => setSent(false), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      console.error('[InviteModal] handleSendInvite', err);
      setError(msg);
    }
    setSending(false);
  };

  const handleGenerateLink = async () => {
    if (!user) return;
    setGeneratingLink(true);
    setError(null);

    try {
      const team = await ensureTeam();
      const invite = await inviteDb.create(team.team_id, user.id, role, undefined, department);
      if (!invite) {
        setError('Failed to generate link.');
        setGeneratingLink(false);
        return;
      }
      setLinkToken(invite.token);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      console.error('[InviteModal] handleGenerateLink', err);
      setError(msg);
    }
    setGeneratingLink(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className={clsx(
          'relative w-full max-w-lg mx-4',
          'bg-white dark:bg-slate-800 rounded-2xl shadow-2xl',
          'border border-gray-200 dark:border-slate-700'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">Invite Team Member</h3>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
              <X size={18} />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Email + role row */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@company.com"
                className={clsx(
                  'flex-1 rounded-lg px-4 py-2.5 text-sm',
                  'bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400',
                  'dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500',
                  'focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                )}
                autoFocus
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'user' | 'admin')}
                className={clsx(
                  'rounded-lg px-3 py-2.5 text-sm font-medium',
                  'bg-gray-50 border border-gray-200 text-gray-700',
                  'dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-200',
                  'focus:outline-none focus:border-purple-500 cursor-pointer'
                )}
              >
                <option value="user">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          {/* Department */}
          <div className="mb-5">
            <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Department
            </label>
            <div className="flex flex-wrap gap-1.5 items-center">
              {allDepts.map((dept) => {
                const active = selectedDepts.includes(dept);
                return (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => toggleDept(dept)}
                    className={clsx(
                      'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                      active
                        ? 'bg-gray-900 text-white border-gray-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100'
                        : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-600'
                    )}
                  >
                    {active && <span className="text-[10px]">✓</span>}
                    {dept}
                    {active && (
                      <span
                        role="button"
                        onClick={(e) => removeDept(dept, e)}
                        className="ml-0.5 opacity-60 hover:opacity-100 leading-none"
                      >
                        ×
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Add custom department */}
              {addingCustom ? (
                <input
                  autoFocus
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitCustom();
                    if (e.key === 'Escape') { setAddingCustom(false); setCustomInput(''); }
                  }}
                  onBlur={commitCustom}
                  placeholder="Department name"
                  className="px-2.5 py-1 rounded-full text-xs border border-purple-400 focus:outline-none focus:border-purple-500 w-32 bg-white dark:bg-slate-800 dark:text-slate-100"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingCustom(true)}
                  className="flex items-center gap-0.5 px-2.5 py-1 rounded-full text-xs font-medium border border-dashed border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-500 dark:border-slate-600 dark:text-slate-500 transition-all"
                >
                  <Plus size={12} />
                </button>
              )}
            </div>
          </div>

          <button
            disabled={!email.trim() || sending}
            onClick={handleSendInvite}
            className={clsx(
              'w-full py-2.5 rounded-xl text-sm font-semibold transition-all mb-6',
              email.trim() && !sending
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-md shadow-purple-500/20'
                : 'bg-gray-100 text-gray-300 dark:bg-slate-700/30 dark:text-slate-600 cursor-not-allowed'
            )}
          >
            {sending ? 'Sending invite…' : sent ? '✓ Invite Sent!' : 'Send Invite'}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700/50" />
            <span className="text-xs text-gray-400 dark:text-slate-500 font-medium">or share link</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700/50" />
          </div>

          {/* Invite link */}
          {inviteLink ? (
            <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-slate-700/30 rounded-lg border border-gray-200 dark:border-slate-700/50">
              <span className="flex-1 text-xs text-gray-500 dark:text-slate-400 truncate font-mono">{inviteLink}</span>
              <button
                onClick={handleCopy}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                  copied
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500'
                )}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          ) : (
            <button
              onClick={handleGenerateLink}
              disabled={generatingLink}
              className={clsx(
                'w-full py-2.5 rounded-xl text-sm font-medium transition-all',
                'border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300',
                'hover:bg-gray-50 dark:hover:bg-slate-700/50',
                generatingLink && 'opacity-50 cursor-not-allowed'
              )}
            >
              {generatingLink ? 'Generating…' : 'Generate Invite Link'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Member detail modal
const MemberDetailModal: React.FC<{
  member: TeamMemberData | null;
  isOpen: boolean;
  onClose: () => void;
  onMessage: (userId: string) => void;
}> = ({ member, isOpen, onClose, onMessage }) => {
  if (!isOpen || !member) return null;

  const projects = useProjectStore((s) => s.projects);
  const deptStyle = departmentConfig[member.department] || { color: 'text-gray-700 dark:text-slate-300', bg: 'bg-gray-50 dark:bg-slate-700/30' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className={clsx(
          'relative w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto',
          'bg-white dark:bg-gradient-to-b dark:from-slate-800 dark:to-slate-900 rounded-2xl shadow-2xl',
          'border border-gray-200 dark:border-slate-700/50'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner */}
        <div className="h-24 bg-gradient-to-r from-purple-600 to-blue-600 rounded-t-2xl relative">
          <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Avatar */}
        <div className="px-6 -mt-12">
          <div className="relative inline-block">
            <img src={member.member.avatar} alt={member.member.name} className="w-24 h-24 rounded-2xl border-4 border-white dark:border-slate-800 shadow-lg" />
            <span className={clsx(
              'absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-3 border-white dark:border-slate-800',
              member.member.online ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-600'
            )} />
          </div>
        </div>

        {/* Info */}
        <div className="px-6 pt-3 pb-6 space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">{member.member.name}</h3>
              {member.member.role === 'admin' && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                  <Crown size={10} /> Admin
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-400">{member.title}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold', deptStyle.bg, deptStyle.color)}>
                {member.department}
              </span>
              <span className="text-xs text-gray-400 dark:text-slate-500">
                {member.member.online ? 'Online' : `Last seen ${member.member.lastSeen ? formatDistanceToNow(member.member.lastSeen, { addSuffix: true }) : 'recently'}`}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => { onMessage(member.member.userId); onClose(); }}
              className={clsx(
                'flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold',
                'bg-gradient-to-r from-purple-600 to-blue-600 text-white',
                'hover:from-purple-700 hover:to-blue-700 shadow-md shadow-purple-500/20 transition-all'
              )}
            >
              <MessageSquare size={16} />
              Message
            </button>
            <button className={clsx(
              'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold',
              'border border-gray-200 text-gray-700 hover:bg-gray-50',
              'dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700/50',
              'transition-colors'
            )}>
              <Mail size={16} />
              Email
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-3.5">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span className="text-xs text-gray-500 dark:text-slate-400">Completed</span>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-slate-100">{member.tasksCompleted}</p>
            </div>
            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-3.5">
              <div className="flex items-center gap-2 mb-1">
                <Activity size={14} className="text-blue-500" />
                <span className="text-xs text-gray-500 dark:text-slate-400">In Progress</span>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-slate-100">{member.tasksInProgress}</p>
            </div>
            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-3.5">
              <div className="flex items-center gap-2 mb-1">
                <Target size={14} className="text-purple-500" />
                <span className="text-xs text-gray-500 dark:text-slate-400">Completion Rate</span>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-slate-100">{member.completionRate}%</p>
            </div>
            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-3.5">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={14} className={member.tasksOverdue > 0 ? 'text-red-500' : 'text-gray-400 dark:text-slate-500'} />
                <span className="text-xs text-gray-500 dark:text-slate-400">Overdue</span>
              </div>
              <p className={clsx('text-lg font-bold', member.tasksOverdue > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-slate-100')}>
                {member.tasksOverdue}
              </p>
            </div>
          </div>

          {/* Task list */}
          {member.tasksAssigned.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                Assigned Tasks ({member.totalTasks})
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {member.tasksAssigned.map((task) => {
                  const overdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== 'completed' && !isToday(new Date(task.dueDate));
                  const project = task.projectId ? projects.find((p) => p.id === task.projectId) : null;
                  return (
                    <div key={task.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-slate-800/30 border border-gray-100 dark:border-slate-700/30">
                      <span className={clsx(
                        'w-2 h-2 rounded-full flex-shrink-0',
                        task.status === 'completed' && 'bg-emerald-500',
                        task.status === 'in-progress' && 'bg-blue-500',
                        task.status === 'review' && 'bg-amber-500',
                        task.status === 'todo' && 'bg-gray-400 dark:bg-slate-500',
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className={clsx('text-sm font-medium truncate', task.status === 'completed' ? 'line-through text-gray-400 dark:text-slate-500' : 'text-gray-800 dark:text-slate-200')}>
                          {task.title}
                        </p>
                        {project && (
                          <p className="text-[10px] text-gray-400 dark:text-slate-500 truncate flex items-center gap-1 mt-0.5">
                            <span>{project.icon}</span>
                            <span>{project.name}</span>
                          </p>
                        )}
                      </div>
                      {overdue && <AlertTriangle size={12} className="text-red-500 flex-shrink-0" />}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <div className="w-12 h-1.5 bg-gray-200 dark:bg-slate-700/50 rounded-full overflow-hidden">
                          <div className={clsx('h-full rounded-full', task.progress >= 100 ? 'bg-emerald-500' : 'bg-purple-500')} style={{ width: `${task.progress}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 w-6 text-right">{task.progress}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Details */}
          <div className="pt-3 border-t border-gray-200 dark:border-slate-700/30 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-slate-400">Email</span>
              <span className="text-gray-700 dark:text-slate-300 font-medium">{member.email}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-slate-400">Joined</span>
              <span className="text-gray-700 dark:text-slate-300 font-medium">{format(member.joinedDate, 'MMM d, yyyy')}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-slate-400">Role</span>
              <span className="text-gray-700 dark:text-slate-300 font-medium capitalize">{member.member.role}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Edit Member Modal ──────────────────────────────────────────────────
const ROLES = [
  { value: 'admin',   label: 'Admin',   desc: 'Full access — manage team, settings, and all data' },
  { value: 'manager', label: 'Manager', desc: 'Can assign tasks, manage projects, and invite members' },
  { value: 'user',    label: 'Member',  desc: 'Standard access — tasks, chat, and personal data' },
] as const;

interface EditMemberModalProps {
  member: { id: string; name: string; title: string; department: string; role: string };
  onClose: () => void;
  onSave: (id: string, updates: { name: string; title: string; department: string; role: string }) => void;
}
const EditMemberModal: React.FC<EditMemberModalProps> = ({ member, onClose, onSave }) => {
  const [name, setName] = useState(member.name);
  const [title, setTitle] = useState(member.title);
  const [department, setDepartment] = useState(member.department);
  const [role, setRole] = useState(member.role);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(member.id, { name: name.trim(), title: title.trim(), department: department.trim(), role });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={clsx(
        'relative w-full max-w-md rounded-2xl shadow-2xl p-6 z-10',
        'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700'
      )}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">Edit Member</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={clsx(
                'w-full px-3 py-2.5 rounded-xl text-sm border',
                'bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100',
                'border-gray-200 dark:border-slate-600 placeholder-gray-400 dark:placeholder-slate-500',
                'focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400'
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1.5">Job Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. UI Designer"
                className={clsx(
                  'w-full px-3 py-2.5 rounded-xl text-sm border',
                  'bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100',
                  'border-gray-200 dark:border-slate-600 placeholder-gray-400 dark:placeholder-slate-500',
                  'focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400'
                )}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1.5">Department</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Engineering"
                className={clsx(
                  'w-full px-3 py-2.5 rounded-xl text-sm border',
                  'bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100',
                  'border-gray-200 dark:border-slate-600 placeholder-gray-400 dark:placeholder-slate-500',
                  'focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400'
                )}
              />
            </div>
          </div>
          {/* Role selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-2">Role / Access Level</label>
            <div className="space-y-2">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  className={clsx(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all',
                    role === r.value
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-500'
                      : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500 bg-white dark:bg-slate-700/30'
                  )}
                >
                  <div className={clsx(
                    'w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all',
                    role === r.value ? 'border-purple-500 bg-purple-500' : 'border-gray-300 dark:border-slate-500'
                  )}>
                    {role === r.value && <div className="w-full h-full rounded-full bg-white scale-50 block" />}
                  </div>
                  <div>
                    <p className={clsx('text-xs font-semibold', role === r.value ? 'text-purple-700 dark:text-purple-300' : 'text-gray-800 dark:text-slate-200')}>{r.label}</p>
                    <p className="text-[10px] text-gray-400 dark:text-slate-500">{r.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className={clsx(
              'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors',
              'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
            )}>Cancel</button>
            <button type="submit" disabled={!name.trim()} className={clsx(
              'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all',
              'bg-gradient-to-r from-purple-600 to-blue-600 text-white',
              'hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
            )}>Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const Team: React.FC = () => {
  const { teamMembers, createDM, conversations, currentUserId } = useChatStore();
  const { tasks } = useTaskStore();
  const { canInviteMembers, canManageTeam, assignableMembers, updateMember } = useUserStore();
  const keepMockData = useSettingsStore((s) => s.keepMockData);
  const search = useUIStore((s) => s.globalSearchQuery);
  const setSearch = useUIStore((s) => s.setGlobalSearchQuery);
  const [showInvite, setShowInvite] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [editMemberId, setEditMemberId] = useState<string | null>(null);
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'tasks' | 'completion'>('name');

  // Build enriched member data.
  // Mock ON  → chatStore.teamMembers + hardcoded mockExtendedData (demo users)
  // Mock OFF → userStore.assignableMembers (real DB profiles with title/dept/email),
  //            merged with chatStore.teamMembers for online status & chat features
  const membersData: TeamMemberData[] = useMemo(() => {
    if (keepMockData) {
      // ── Mock mode: use demo team members, but overlay editable fields from assignableMembers ──
      return teamMembers.map((member) => {
        const profile = assignableMembers.find((a) => a.id === member.userId);
        const assigned = tasks.filter((t) => t.assignedTo === member.userId);
        const completed = assigned.filter((t) => t.status === 'completed').length;
        const inProgress = assigned.filter((t) => t.status === 'in-progress').length;
        const overdue = assigned.filter((t) => t.dueDate && isPast(new Date(t.dueDate)) && t.status !== 'completed' && !isToday(new Date(t.dueDate))).length;
        const ext = mockExtendedData[member.userId] || { department: 'Engineering', title: 'Team Member', joinedDate: new Date(), email: `${member.name.toLowerCase().replace(' ', '.')}@xspark.co.za` };
        // Use updated name/role from assignableMembers if available
        const updatedMember: ChatParticipant = profile
          ? { ...member, name: profile.name, role: profile.role === 'admin' ? 'admin' : 'member' }
          : member;

        return {
          member: updatedMember,
          tasksAssigned: assigned,
          tasksCompleted: completed,
          tasksInProgress: inProgress,
          tasksOverdue: overdue,
          totalTasks: assigned.length,
          completionRate: assigned.length > 0 ? Math.round((completed / assigned.length) * 100) : 0,
          avgProgress: assigned.length > 0 ? Math.round(assigned.reduce((s, t) => s + t.progress, 0) / assigned.length) : 0,
          ...ext,
          // Overlay editable fields from assignableMembers
          ...(profile && { department: profile.department || ext.department, title: profile.title || ext.title }),
        };
      });
    }

    // ── Real mode: build from assignableMembers (DB profiles) ──
    return assignableMembers.map((profile) => {
      // Merge online status from chatStore if available, but always use profile for mutable fields
      const chatMember = teamMembers.find((m) => m.userId === profile.id);
      const member: ChatParticipant = {
        userId: profile.id,
        name: profile.name,
        avatar: profile.avatar,
        role: profile.role === 'admin' ? 'admin' : 'member',
        online: chatMember?.online ?? false,
      };

      const assigned = tasks.filter((t) => t.assignedTo === profile.id);
      const completed = assigned.filter((t) => t.status === 'completed').length;
      const inProgress = assigned.filter((t) => t.status === 'in-progress').length;
      const overdue = assigned.filter((t) => t.dueDate && isPast(new Date(t.dueDate)) && t.status !== 'completed' && !isToday(new Date(t.dueDate))).length;

      return {
        member,
        tasksAssigned: assigned,
        tasksCompleted: completed,
        tasksInProgress: inProgress,
        tasksOverdue: overdue,
        totalTasks: assigned.length,
        completionRate: assigned.length > 0 ? Math.round((completed / assigned.length) * 100) : 0,
        avgProgress: assigned.length > 0 ? Math.round(assigned.reduce((s, t) => s + t.progress, 0) / assigned.length) : 0,
        department: profile.department || 'General',
        title: profile.title || 'Team Member',
        joinedDate: new Date(),
        email: profile.email || `${profile.name.toLowerCase().replace(' ', '.')}@company.com`,
      };
    });
  }, [keepMockData, teamMembers, assignableMembers, tasks]);

  // Filter and sort
  const filteredMembers = useMemo(() => {
    let result = membersData;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((m) =>
        m.member.name.toLowerCase().includes(q) ||
        m.title.toLowerCase().includes(q) ||
        m.department.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q)
      );
    }

    if (deptFilter !== 'all') {
      result = result.filter((m) => m.department === deptFilter);
    }

    switch (sortBy) {
      case 'tasks':
        return [...result].sort((a, b) => b.totalTasks - a.totalTasks);
      case 'completion':
        return [...result].sort((a, b) => b.completionRate - a.completionRate);
      default:
        return [...result].sort((a, b) => a.member.name.localeCompare(b.member.name));
    }
  }, [membersData, search, deptFilter, sortBy]);

  const selectedMember = selectedMemberId ? membersData.find((m) => m.member.userId === selectedMemberId) ?? null : null;

  // Team stats
  const teamStats = useMemo(() => {
    const online = teamMembers.filter((m) => m.online).length;
    const totalAssigned = tasks.filter((t) => t.assignedTo).length;
    const totalCompleted = tasks.filter((t) => t.status === 'completed' && t.assignedTo).length;
    const departments = new Set(membersData.map((m) => m.department)).size;
    return { total: teamMembers.length, online, totalAssigned, totalCompleted, departments };
  }, [teamMembers, tasks, membersData]);

  const departments = useMemo(() => {
    const set = new Set(membersData.map((m) => m.department));
    return Array.from(set).sort();
  }, [membersData]);

  // Build a map of userId → unread DM count for badge display
  const unreadByUser = useMemo(() => {
    const map: Record<string, number> = {};
    conversations.forEach((c) => {
      if (c.type === 'dm' && c.unreadCount > 0) {
        const other = c.participants.find((p) => p.userId !== currentUserId);
        if (other) map[other.userId] = c.unreadCount;
      }
    });
    return map;
  }, [conversations, currentUserId]);

  const handleMessage = (userId: string) => {
    // Try chatStore first, then build from assignableMembers
    let member = teamMembers.find((m) => m.userId === userId);
    if (!member) {
      const profile = assignableMembers.find((p) => p.id === userId);
      if (profile) {
        member = {
          userId: profile.id,
          name: profile.name,
          avatar: profile.avatar,
          role: profile.role === 'admin' ? 'admin' : 'member',
          online: false,
        };
      }
    }
    if (member) {
      const convId = createDM(member);
      if (window.innerWidth < 1024) {
        useChatStore.getState().dockChat(convId);
      } else {
        window.location.hash = 'chat';
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Team</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1">
            {teamStats.total} members • {teamStats.online} online • {teamStats.departments} departments
          </p>
        </div>
        {canInviteMembers() && (
          <button
            onClick={() => setShowInvite(true)}
            className={clsx(
              'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold',
              'bg-gradient-to-r from-purple-600 to-blue-600 text-white',
              'hover:from-purple-700 hover:to-blue-700',
              'shadow-md shadow-purple-500/20 transition-all'
            )}
          >
            <UserPlus size={18} />
            Invite Member
          </button>
        )}
      </div>

      {/* Team Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800/30 rounded-xl border border-gray-200 dark:border-slate-700/50 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
              <Users size={18} className="text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Total Members</p>
              <p className="text-xl font-bold text-gray-900 dark:text-slate-100">{teamStats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800/30 rounded-xl border border-gray-200 dark:border-slate-700/50 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
              <Circle size={18} className="text-emerald-600 dark:text-emerald-400 fill-emerald-600 dark:fill-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Online Now</p>
              <p className="text-xl font-bold text-gray-900 dark:text-slate-100">{teamStats.online}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800/30 rounded-xl border border-gray-200 dark:border-slate-700/50 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
              <ListChecks size={18} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Tasks Assigned</p>
              <p className="text-xl font-bold text-gray-900 dark:text-slate-100">{teamStats.totalAssigned}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800/30 rounded-xl border border-gray-200 dark:border-slate-700/50 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
              <CheckCircle2 size={18} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Completed</p>
              <p className="text-xl font-bold text-gray-900 dark:text-slate-100">{teamStats.totalCompleted}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, role, department, or email..."
            className={clsx(
              'w-full pl-10 pr-4 py-2.5 rounded-xl text-sm',
              'bg-white border border-gray-200 text-gray-800 placeholder-gray-400',
              'dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-500',
              'focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
            )}
          />
        </div>
        <div className="flex gap-2">
          {/* Department filter */}
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className={clsx(
              'rounded-xl px-3 py-2.5 text-sm font-medium',
              'bg-white border border-gray-200 text-gray-700',
              'dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-200',
              'focus:outline-none focus:border-purple-500 cursor-pointer'
            )}
          >
            <option value="all">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className={clsx(
              'rounded-xl px-3 py-2.5 text-sm font-medium',
              'bg-white border border-gray-200 text-gray-700',
              'dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-200',
              'focus:outline-none focus:border-purple-500 cursor-pointer'
            )}
          >
            <option value="name">Sort: Name</option>
            <option value="tasks">Sort: Tasks</option>
            <option value="completion">Sort: Completion</option>
          </select>
        </div>
      </div>

      {/* Member Grid */}
      {filteredMembers.length === 0 ? (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-16">
              <Users size={40} className="text-gray-300 dark:text-slate-600 mb-3" />
              <p className="text-sm font-medium text-gray-500 dark:text-slate-400">No members found</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Try adjusting your search or filters</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((m) => {
            const deptStyle = departmentConfig[m.department] || { color: 'text-gray-700 dark:text-slate-300', bg: 'bg-gray-50 dark:bg-slate-700/30' };

            return (
              <div
                key={m.member.userId}
                onClick={() => setSelectedMemberId(m.member.userId)}
                className={clsx(
                  'bg-white dark:bg-slate-800/30 rounded-2xl border border-gray-200 dark:border-slate-700/50',
                  'p-5 cursor-pointer transition-all hover:shadow-lg hover:border-purple-200 dark:hover:border-purple-700/30',
                  'group'
                )}
              >
                {/* Top */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="relative flex-shrink-0">
                    <img src={m.member.avatar} alt={m.member.name} className="w-14 h-14 rounded-xl shadow-sm" />
                    <span className={clsx(
                      'absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800',
                      m.member.online ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-600'
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100 truncate">{m.member.name}</h3>
                      {m.member.role === 'admin' && <Crown size={12} className="text-amber-500 flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{m.title}</p>
                    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold mt-1.5', deptStyle.bg, deptStyle.color)}>
                      {m.department}
                    </span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleMessage(m.member.userId); }}
                    className="relative p-2 rounded-lg text-gray-400 hover:bg-purple-50 hover:text-purple-600 dark:text-slate-500 dark:hover:bg-purple-900/20 dark:hover:text-purple-400 transition-colors lg:opacity-0 lg:group-hover:opacity-100"
                    title="Message"
                  >
                    <MessageSquare size={16} />
                    {(unreadByUser[m.member.userId] ?? 0) > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-slate-800">
                        {unreadByUser[m.member.userId]}
                      </span>
                    )}
                  </button>
                  {/* Edit button — admin only */}
                  {canManageTeam() && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditMemberId(m.member.userId); }}
                      className="p-2 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600 dark:text-slate-500 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 transition-colors lg:opacity-0 lg:group-hover:opacity-100"
                      title="Edit member"
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                </div>

                {/* Progress bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Avg Progress</span>
                    <span className={clsx(
                      'text-xs font-bold',
                      m.avgProgress >= 75 ? 'text-emerald-600 dark:text-emerald-400'
                        : m.avgProgress >= 40 ? 'text-blue-600 dark:text-blue-400'
                          : 'text-gray-500 dark:text-slate-400'
                    )}>
                      {m.avgProgress}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
                    <div
                      className={clsx(
                        'h-full rounded-full transition-all',
                        m.avgProgress >= 75 ? 'bg-emerald-500' : m.avgProgress >= 40 ? 'bg-blue-500' : 'bg-gray-400 dark:bg-slate-500'
                      )}
                      style={{ width: `${m.avgProgress}%` }}
                    />
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-slate-700/30">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={12} className="text-emerald-500" />
                    <span className="text-xs font-semibold text-gray-700 dark:text-slate-300">{m.tasksCompleted}</span>
                    <span className="text-[10px] text-gray-400 dark:text-slate-500">done</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Activity size={12} className="text-blue-500" />
                    <span className="text-xs font-semibold text-gray-700 dark:text-slate-300">{m.tasksInProgress}</span>
                    <span className="text-[10px] text-gray-400 dark:text-slate-500">active</span>
                  </div>
                  {m.tasksOverdue > 0 ? (
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle size={12} className="text-red-500" />
                      <span className="text-xs font-bold text-red-600 dark:text-red-400">{m.tasksOverdue}</span>
                      <span className="text-[10px] text-red-500 dark:text-red-400">overdue</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <Target size={12} className="text-purple-500" />
                      <span className="text-xs font-semibold text-gray-700 dark:text-slate-300">{m.completionRate}%</span>
                      <span className="text-[10px] text-gray-400 dark:text-slate-500">rate</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Department Breakdown */}
      <Card>
        <CardHeader title="Department Breakdown" subtitle="Task distribution across departments" />
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {departments.map((dept) => {
              const members = membersData.filter((m) => m.department === dept);
              const totalTasks = members.reduce((s, m) => s + m.totalTasks, 0);
              const completedTasks = members.reduce((s, m) => s + m.tasksCompleted, 0);
              const rate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
              const deptStyle = departmentConfig[dept] || { color: 'text-gray-700 dark:text-slate-300', bg: 'bg-gray-50 dark:bg-slate-700/30' };

              return (
                <div key={dept} className="bg-gray-50 dark:bg-slate-800/30 rounded-xl p-4 border border-gray-100 dark:border-slate-700/30">
                  <div className="flex items-center justify-between mb-3">
                    <span className={clsx('inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold', deptStyle.bg, deptStyle.color)}>
                      {dept}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-slate-500">{members.length} members</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex -space-x-2">
                      {members.slice(0, 3).map((m) => (
                        <img key={m.member.userId} src={m.member.avatar} alt={m.member.name} className="w-6 h-6 rounded-full border-2 border-gray-50 dark:border-slate-800" />
                      ))}
                      {members.length > 3 && (
                        <span className="w-6 h-6 rounded-full bg-gray-200 dark:bg-slate-700 border-2 border-gray-50 dark:border-slate-800 flex items-center justify-center text-[9px] font-bold text-gray-500 dark:text-slate-400">
                          +{members.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-gray-500 dark:text-slate-400">Completion</span>
                    <span className="font-bold text-gray-700 dark:text-slate-300">{rate}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 dark:bg-slate-700/50 rounded-full overflow-hidden">
                    <div className={clsx('h-full rounded-full', rate >= 70 ? 'bg-emerald-500' : rate >= 40 ? 'bg-blue-500' : 'bg-amber-500')} style={{ width: `${rate}%` }} />
                  </div>
                  <div className="flex items-center justify-between mt-2 text-[10px] text-gray-400 dark:text-slate-500">
                    <span>{totalTasks} tasks</span>
                    <span>{completedTasks} completed</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <InviteModal isOpen={showInvite} onClose={() => setShowInvite(false)} />
      <MemberDetailModal
        member={selectedMember}
        isOpen={!!selectedMemberId}
        onClose={() => setSelectedMemberId(null)}
        onMessage={handleMessage}
      />

      {/* Edit Member Modal */}
      {editMemberId && (() => {
        const md = membersData.find((m) => m.member.userId === editMemberId);
        return md ? (
          <EditMemberModal
            member={{
              id: md.member.userId,
              name: md.member.name,
              title: md.title,
              department: md.department,
              role: md.member.role === 'admin' ? 'admin' : (assignableMembers.find((a) => a.id === md.member.userId)?.role ?? 'user'),
            }}
            onClose={() => setEditMemberId(null)}
            onSave={(id, updates) => updateMember(id, updates as any)}
          />
        ) : null;
      })()}
    </div>
  );
};
