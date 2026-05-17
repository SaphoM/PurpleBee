import React, { useState, useMemo } from 'react';
import clsx from 'clsx';
import {
  Users,
  UserPlus,
  Search,
  Mail,
  MessageSquare,
  Crown,
  Shield,
  MoreVertical,
  CheckCircle2,
  Clock,
  AlertTriangle,
  BarChart3,
  X,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Circle,
  Zap,
  Target,
  Activity,
  ListChecks,
  CalendarDays,
  Star,
  UserMinus,
  ShieldCheck,
  ShieldOff,
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@components/Card';
import { useChatStore } from '@stores/chatStore';
import { useTaskStore } from '@stores/taskStore';
import { useUserStore } from '@stores/userStore';
import { ChatParticipant, Task, TaskStatus } from '@/types/index';
import { format, formatDistanceToNow, isPast, isToday } from 'date-fns';

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
};

const mockExtendedData: Record<string, { department: string; title: string; joinedDate: Date; email: string }> = {
  'user-1': { department: 'Product', title: 'Product Lead', joinedDate: new Date('2024-01-15'), email: 'sapho@xspark.co.za' },
  'user-2': { department: 'Design', title: 'UI/UX Designer', joinedDate: new Date('2024-03-20'), email: 'thando@xspark.co.za' },
  'user-3': { department: 'Engineering', title: 'Backend Developer', joinedDate: new Date('2024-02-10'), email: 'lerato@xspark.co.za' },
  'user-4': { department: 'Engineering', title: 'Full-Stack Developer', joinedDate: new Date('2024-04-05'), email: 'kabelo@xspark.co.za' },
  'user-5': { department: 'Engineering', title: 'Integration Engineer', joinedDate: new Date('2024-06-12'), email: 'naledi@xspark.co.za' },
};

// Stat pill
const StatPill: React.FC<{ icon: React.ReactNode; value: number | string; label: string; color?: string }> = ({ icon, value, label, color }) => (
  <div className="flex items-center gap-2">
    <span className={clsx('text-gray-400 dark:text-slate-500', color)}>{icon}</span>
    <div>
      <p className="text-sm font-bold text-gray-900 dark:text-slate-100">{value}</p>
      <p className="text-[10px] text-gray-500 dark:text-slate-400">{label}</p>
    </div>
  </div>
);

// Invite modal
const InviteModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'member' | 'admin'>('member');
  const [copied, setCopied] = useState(false);
  const inviteLink = 'https://purplebee.app/invite/xspark-team-abc123';

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

          {/* Email invite */}
          <div className="mb-5">
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
                onChange={(e) => setRole(e.target.value as 'member' | 'admin')}
                className={clsx(
                  'rounded-lg px-3 py-2.5 text-sm font-medium',
                  'bg-gray-50 border border-gray-200 text-gray-700',
                  'dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-200',
                  'focus:outline-none focus:border-purple-500 cursor-pointer'
                )}
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          <button
            disabled={!email.trim()}
            className={clsx(
              'w-full py-2.5 rounded-xl text-sm font-semibold transition-all mb-6',
              email.trim()
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-md shadow-purple-500/20'
                : 'bg-gray-100 text-gray-300 dark:bg-slate-700/30 dark:text-slate-600 cursor-not-allowed'
            )}
          >
            Send Invite
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700/50" />
            <span className="text-xs text-gray-400 dark:text-slate-500 font-medium">or share link</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700/50" />
          </div>

          {/* Invite link */}
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

export const Team: React.FC = () => {
  const { teamMembers, createDM } = useChatStore();
  const { tasks } = useTaskStore();
  const { canInviteMembers, canManageTeam } = useUserStore();

  const [search, setSearch] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'tasks' | 'completion'>('name');

  // Build enriched member data
  const membersData: TeamMemberData[] = useMemo(() => {
    return teamMembers.map((member) => {
      const assigned = tasks.filter((t) => t.assignedTo === member.userId);
      const completed = assigned.filter((t) => t.status === 'completed').length;
      const inProgress = assigned.filter((t) => t.status === 'in-progress').length;
      const overdue = assigned.filter((t) => t.dueDate && isPast(new Date(t.dueDate)) && t.status !== 'completed' && !isToday(new Date(t.dueDate))).length;
      const ext = mockExtendedData[member.userId] || { department: 'Engineering', title: 'Team Member', joinedDate: new Date(), email: `${member.name.toLowerCase().replace(' ', '.')}@xspark.co.za` };

      return {
        member,
        tasksAssigned: assigned,
        tasksCompleted: completed,
        tasksInProgress: inProgress,
        tasksOverdue: overdue,
        totalTasks: assigned.length,
        completionRate: assigned.length > 0 ? Math.round((completed / assigned.length) * 100) : 0,
        avgProgress: assigned.length > 0 ? Math.round(assigned.reduce((s, t) => s + t.progress, 0) / assigned.length) : 0,
        ...ext,
      };
    });
  }, [teamMembers, tasks]);

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

  const handleMessage = (userId: string) => {
    const member = teamMembers.find((m) => m.userId === userId);
    if (member) {
      createDM(member);
      window.location.hash = 'chat';
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
                    className="p-2 rounded-lg text-gray-400 hover:bg-purple-50 hover:text-purple-600 dark:text-slate-500 dark:hover:bg-purple-900/20 dark:hover:text-purple-400 transition-colors opacity-0 group-hover:opacity-100"
                    title="Message"
                  >
                    <MessageSquare size={16} />
                  </button>
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
    </div>
  );
};
