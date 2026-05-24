import React, { useState } from 'react';
import clsx from 'clsx';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  Zap,
  TrendingUp,
  TrendingDown,
  MoreHorizontal,
  ExternalLink,
  ListChecks,
  ThumbsUp,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useTaskStore } from '@stores/taskStore';
import { useProjectStore } from '@stores/projectStore';
import { useUserStore } from '@stores/userStore';
import { useUIStore } from '@stores/uiStore';
import { useSettingsStore } from '@stores/settingsStore';

// ── Activity bar chart mock data ────────────────────────────────────
const weeklyActivity = [
  { day: 'M', value: 4 },
  { day: 'T', value: 6 },
  { day: 'W', value: 3 },
  { day: 'T', value: 7 },
  { day: 'F', value: 5 },
  { day: 'S', value: 2 },
  { day: 'S', value: 1 },
];

export const ModernDashboard: React.FC = () => {
  const { tasks: allTasks, getTasksForUser } = useTaskStore();
  const projects = useProjectStore((s) => s.projects);
  const { user, canViewAllTasks, getEffectiveUserId, isViewingOther, getViewingProfile } = useUserStore();
  const { darkMode } = useUIStore();
  const keepMockData = useSettingsStore((s) => s.keepMockData);
  const [activityTab, setActivityTab] = useState<'tasks' | 'projects'>('tasks');

  const tasks = canViewAllTasks() ? allTasks : getTasksForUser(getEffectiveUserId());
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in-progress').length;
  const todoTasks = tasks.filter((t) => t.status === 'todo').length;
  const overdueTasks = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed'
  ).length;
  const totalTasks = tasks.length;

  // Percentages for donut
  const completedPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const inProgressPct = totalTasks > 0 ? Math.round((inProgressTasks / totalTasks) * 100) : 0;
  const todoPct = totalTasks > 0 ? 100 - completedPct - inProgressPct : 0;

  const donutData = [
    { name: 'Completed', value: completedPct || 1, fill: 'rgb(var(--accent-400))' },
    { name: 'In Progress', value: inProgressPct || 1, fill: 'rgb(var(--accent-200))' },
    { name: 'To Do', value: todoPct || 1, fill: '#fbbf24' },
  ];

  const productivityScore = totalTasks > 0
    ? Math.min(100, Math.round((completedTasks / totalTasks) * 100 + inProgressTasks * 3))
    : 0;

  // Recent tasks for activity table
  const recentTasks = [...tasks]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
    .slice(0, 5);

  const priorityColors: Record<string, string> = {
    urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  };

  const statusColors: Record<string, string> = {
    completed: 'text-emerald-600',
    'in-progress': 'text-blue-600',
    todo: 'text-gray-500',
    review: 'text-amber-600',
  };

  const chartTooltipStyle = darkMode
    ? { backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#e2e8f0' }
    : { backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#374151' };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">
          {isViewingOther()
            ? `${getViewingProfile()?.name?.split(' ')[0]}'s Dashboard`
            : 'Dashboard'
          }
        </h1>
      </div>

      {/* Top Row: Hero Card + Right Column */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Hero Gradient Card — Total Tasks */}
        <div className="lg:col-span-5 relative overflow-hidden rounded-2xl p-6 text-white min-h-[260px]"
          style={{
            background: `linear-gradient(135deg, rgb(var(--accent-500)), rgb(var(--accent-300)))`,
          }}
        >
          {/* Decorative wavy line */}
          <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" viewBox="0 0 400 260" preserveAspectRatio="none">
            <path d="M0 180 Q50 120 100 160 T200 140 T300 160 T400 130 L400 260 L0 260 Z" fill="white" />
            <path d="M0 200 Q80 150 160 190 T320 170 T400 150 L400 260 L0 260 Z" fill="white" opacity="0.5" />
          </svg>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <p className="text-white/80 text-sm font-medium">Total Tasks</p>
              <button className="p-1 rounded-full hover:bg-white/20 transition-colors">
                <MoreHorizontal size={18} />
              </button>
            </div>
            <h2 className="text-5xl font-bold mb-8">{totalTasks}</h2>

            {/* Bottom stats row */}
            <div className="flex gap-8 mt-auto">
              <div>
                <p className="text-white/70 text-xs">Completed</p>
                <p className="text-lg font-bold">%{completedPct}</p>
              </div>
              <div>
                <p className="text-white/70 text-xs">In Progress</p>
                <p className="text-lg font-bold">%{inProgressPct}</p>
              </div>
              <div>
                <p className="text-white/70 text-xs">To Do</p>
                <p className="text-lg font-bold">%{todoPct}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Middle: Donut Chart Card */}
        <div className="lg:col-span-4 rounded-2xl border border-gray-200 bg-white p-5 dark:bg-slate-800/50 dark:border-slate-700/50">
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold text-gray-800 dark:text-slate-100">Task Distribution</p>
            <button className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-gray-400">
              <MoreHorizontal size={18} />
            </button>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{totalTasks}</p>

          <div className="flex items-center gap-4">
            {/* Legend */}
            <div className="space-y-2 text-xs flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'rgb(var(--accent-400))' }} />
                <span className="text-gray-600 dark:text-slate-300">Completed</span>
              </div>
              <p className="font-bold text-gray-900 dark:text-white text-base ml-4">%{completedPct}</p>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="text-gray-600 dark:text-slate-300">To Do</span>
              </div>
              <p className="font-bold text-gray-900 dark:text-white text-base ml-4">%{todoPct}</p>
            </div>
            {/* Donut */}
            <div className="flex-1">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {donutData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column: Two Stacked Cards */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          {/* Overdue Tasks */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:bg-slate-800/50 dark:border-slate-700/50 flex-1">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Overdue Tasks</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{overdueTasks}</p>
              </div>
              <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgb(var(--accent-50))' }}>
                <AlertCircle size={18} style={{ color: 'rgb(var(--accent-500))' }} />
              </div>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-red-100 dark:bg-red-900/30">
              <div
                className="h-full rounded-full bg-red-500"
                style={{ width: `${totalTasks > 0 ? Math.min(100, (overdueTasks / totalTasks) * 100) : 0}%` }}
              />
            </div>
          </div>

          {/* Weekly Activity Mini Chart */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:bg-slate-800/50 dark:border-slate-700/50 flex-1">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500 dark:text-slate-400">Weekly Activity</p>
              <button className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-gray-400">
                <MoreHorizontal size={18} />
              </button>
            </div>
            <ResponsiveContainer width="100%" height={80}>
              <BarChart data={weeklyActivity} barSize={12}>
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {weeklyActivity.map((_, i) => (
                    <Cell
                      key={i}
                      fill={i === 3 ? 'rgb(var(--accent-500))' : (darkMode ? '#475569' : '#e5e7eb')}
                    />
                  ))}
                </Bar>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: darkMode ? '#94a3b8' : '#9ca3af' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row: Activity Table + Right Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Activity Table */}
        <div className="lg:col-span-8 rounded-2xl border border-gray-200 bg-white dark:bg-slate-800/50 dark:border-slate-700/50 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-slate-700/50 px-5 pt-4">
            <button
              onClick={() => setActivityTab('tasks')}
              className={clsx(
                'px-4 pb-3 text-sm font-medium border-b-2 transition-colors',
                activityTab === 'tasks'
                  ? 'border-gray-900 text-gray-900 dark:border-white dark:text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-slate-300'
              )}
            >
              Recent Tasks
            </button>
            <button
              onClick={() => setActivityTab('projects')}
              className={clsx(
                'px-4 pb-3 text-sm font-medium border-b-2 transition-colors',
                activityTab === 'projects'
                  ? 'border-gray-900 text-gray-900 dark:border-white dark:text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-slate-300'
              )}
            >
              Projects
            </button>
          </div>

          {/* Table Content */}
          <div className="divide-y divide-gray-100 dark:divide-slate-700/50">
            {activityTab === 'tasks' ? (
              recentTasks.length > 0 ? (
                recentTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                    {/* Avatar circle with initials */}
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: 'rgb(var(--accent-400))' }}
                    >
                      {task.title.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                    </div>
                    {/* Task info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">{task.title}</p>
                        <ExternalLink size={12} className="text-gray-300 dark:text-slate-600 flex-shrink-0" />
                      </div>
                      <p className="text-xs text-gray-400 dark:text-slate-500">
                        {task.project || 'No project'} &middot; #{task.id.slice(-4)}
                      </p>
                    </div>
                    {/* Priority */}
                    <span className={clsx(
                      'px-2 py-0.5 rounded text-[10px] font-semibold uppercase hidden sm:inline-block',
                      priorityColors[task.priority]
                    )}>
                      {task.priority}
                    </span>
                    {/* Status indicator */}
                    <div className="flex items-center gap-1.5">
                      {task.status === 'completed' ? (
                        <TrendingUp size={14} className="text-emerald-500" />
                      ) : task.status === 'in-progress' ? (
                        <Clock size={14} className="text-blue-500" />
                      ) : (
                        <AlertCircle size={14} className="text-gray-400" />
                      )}
                    </div>
                    <button className="p-1 text-gray-300 hover:text-gray-500 dark:text-slate-600 dark:hover:text-slate-400">
                      <MoreHorizontal size={16} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-slate-500">
                  <ListChecks size={32} className="mb-2 opacity-40" />
                  <p className="text-sm">No tasks yet</p>
                </div>
              )
            ) : (
              projects.length > 0 ? (
                projects.slice(0, 5).map((project) => (
                  <div key={project.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: project.color || 'rgb(var(--accent-400))' }}
                    >
                      {project.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">{project.name}</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500">{project.status}</p>
                    </div>
                    <span className="text-xs font-medium text-gray-500 dark:text-slate-400">
                      {project.taskIds?.length || 0} tasks
                    </span>
                    <button className="p-1 text-gray-300 hover:text-gray-500 dark:text-slate-600 dark:hover:text-slate-400">
                      <MoreHorizontal size={16} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-slate-500">
                  <ListChecks size={32} className="mb-2 opacity-40" />
                  <p className="text-sm">No projects yet</p>
                </div>
              )
            )}
          </div>
        </div>

        {/* Right Stats Column */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Completed Tasks Card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:bg-slate-800/50 dark:border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl" style={{ backgroundColor: 'rgb(var(--accent-50))' }}>
                <ListChecks size={20} style={{ color: 'rgb(var(--accent-500))' }} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500 dark:text-slate-400">Completed Tasks</p>
                <p className="text-xs text-gray-400 dark:text-slate-500">This Week</p>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{completedTasks}</p>
            </div>
          </div>

          {/* Productivity Score */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:bg-slate-800/50 dark:border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20">
                <ThumbsUp size={20} className="text-amber-500" />
              </div>
              <div className="flex-1">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{productivityScore}%</p>
                <p className="text-xs text-gray-400 dark:text-slate-500">Productivity Score</p>
              </div>
              <div className="w-16 h-1.5 rounded-full bg-gray-100 dark:bg-slate-700">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${productivityScore}%`,
                    backgroundColor: 'rgb(var(--accent-500))',
                  }}
                />
              </div>
            </div>
          </div>

          {/* AI Quick Insight */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:bg-slate-800/50 dark:border-slate-700/50 flex-1">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={16} style={{ color: 'rgb(var(--accent-500))' }} />
              <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">AI Insight</p>
            </div>
            {totalTasks > 0 ? (
              <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
                {overdueTasks > 0
                  ? `You have ${overdueTasks} overdue task${overdueTasks > 1 ? 's' : ''}. Consider prioritizing these to keep momentum.`
                  : completedPct >= 50
                    ? `Great progress! You've completed ${completedPct}% of your tasks. Keep the momentum going.`
                    : `You have ${inProgressTasks} tasks in progress. Focus on completing these before taking on new ones.`
                }
              </p>
            ) : (
              <p className="text-sm text-gray-400 dark:text-slate-500">Add tasks to get AI-powered insights.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
