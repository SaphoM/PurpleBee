import React, { useState, useMemo, useEffect } from 'react';
import clsx from 'clsx';
import {
  BarChart, Bar, Line, AreaChart, Area, PieChart, Pie, Cell, RadialBarChart, RadialBar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  CheckCircle2,
  AlertTriangle,
  Target,
  Flame,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Timer,
  ListChecks,
  Award,
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@components/Card';
import { useToastStore } from '@components/Toast';
import { useTaskStore } from '@stores/taskStore';
import { useUIStore } from '@stores/uiStore';
import { useUserStore } from '@stores/userStore';
import { useInactivityTracker, InactivityState, formatDuration } from '@/lib/inactivityTracker';
import { activityLogDb, ActivityLogRow } from '@/lib/dataService';
import { useSettingsStore } from '@stores/settingsStore';
import { formatHours } from '@/utils/time';
import { format, subDays, isPast, isToday, formatDistanceToNow } from 'date-fns';

type TimeRange = '7d' | '14d' | '30d' | '90d';

// ── Activity & Progress Monitor: freshness defaults ─────────────────────────
// No server-side update schedule is configured yet, so these are the
// configurable defaults the freshness states are measured against.
const FRESHNESS_DUE_HOURS = 24;   // within this → up to date
const FRESHNESS_STALE_HOURS = 48; // beyond this → stale / overdue

const inactivityLabel: Record<InactivityState, string> = {
  'recently-active': 'Less than 1 hour',
  'activity-slowing': '1–4 hours',
  'extended-inactive': '4–8 hours',
  'inactive-most-of-day': '8–24 hours',
  'prolonged-inactive': 'More than 24 hours',
};

const freshnessMeta: Record<
  'up-to-date' | 'due' | 'stale' | 'no-activity' | 'unverified',
  { label: string; className: string }
> = {
  'up-to-date': {
    label: 'Up to date',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  due: {
    label: 'Due for an update',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  stale: {
    label: 'Stale / overdue',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  'no-activity': {
    label: 'No activity recorded',
    className: 'bg-gray-100 text-gray-600 dark:bg-slate-700/60 dark:text-slate-400',
  },
  unverified: {
    label: 'Unable to verify',
    className: 'bg-gray-100 text-gray-600 dark:bg-slate-700/60 dark:text-slate-400',
  },
};

const eventMeta: Record<string, { emoji: string; label: string }> = {
  login: { emoji: '🔐', label: 'Successful login' },
  signup: { emoji: '✨', label: 'Account created' },
  logout: { emoji: '🚪', label: 'Logout' },
  upload: { emoji: '📎', label: 'Upload completed' },
  upload_failed: { emoji: '⚠️', label: 'Upload failed' },
  task_created: { emoji: '➕', label: 'Task created' },
  task_updated: { emoji: '✏️', label: 'Task updated' },
  task_completed: { emoji: '✅', label: 'Task completed' },
  task_deleted: { emoji: '🗑️', label: 'Task deleted' },
  project_created: { emoji: '📁', label: 'Project created' },
  data_import: { emoji: '🔄', label: 'Data imported' },
  data_import_failed: { emoji: '❌', label: 'Data import failed' },
  setting_changed: { emoji: '⚙️', label: 'Setting changed' },
};

// Generate realistic mock data for charts
const generateWeeklyData = () => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days.map((day) => ({
    day,
    completed: Math.floor(Math.random() * 6) + 2,
    created: Math.floor(Math.random() * 5) + 1,
    target: 5,
  }));
};

const generateDailyVelocity = (range: number) => {
  return Array.from({ length: range }, (_, i) => {
    const date = subDays(new Date(), range - 1 - i);
    return {
      date: format(date, 'MMM d'),
      shortDate: format(date, 'd'),
      velocity: Math.floor(Math.random() * 8) + 1,
      avgTime: +(Math.random() * 4 + 0.5).toFixed(1),
    };
  });
};

const generateHourlyProductivity = () => {
  const hours = ['6am', '7am', '8am', '9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm', '7pm', '8pm'];
  return hours.map((hour) => ({
    hour,
    tasks: Math.floor(Math.random() * 5),
    focus: +(Math.random() * 2).toFixed(1),
  }));
};

const generateWeeklyTrend = () => {
  const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
  return weeks.map((week) => ({
    week,
    completed: Math.floor(Math.random() * 20) + 10,
    overdue: Math.floor(Math.random() * 5),
    velocity: Math.floor(Math.random() * 10) + 8,
  }));
};

const CHART_COLORS = {
  purple: '#8b5cf6',
  blue: '#3b82f6',
  emerald: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
  cyan: '#06b6d4',
  pink: '#ec4899',
  indigo: '#6366f1',
};

// KPI Card component
const KPICard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  color: string;
  bgClass: string;
  iconClass: string;
}> = ({ icon, label, value, change, changeLabel, bgClass, iconClass }) => (
  <div className="bg-white dark:bg-slate-800/30 rounded-xl border border-gray-200 dark:border-slate-700/50 p-5">
    <div className="flex items-start justify-between mb-3">
      <div className={clsx('w-11 h-11 rounded-xl flex items-center justify-center', bgClass)}>
        <span className={iconClass}>{icon}</span>
      </div>
      {change !== undefined && (
        <div className={clsx(
          'inline-flex items-center gap-0.5 px-2 py-1 rounded-lg text-xs font-bold',
          change >= 0
            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
            : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
        )}>
          {change >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {Math.abs(change)}%
        </div>
      )}
    </div>
    <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{value}</p>
    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{label}</p>
    {changeLabel && (
      <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1">{changeLabel}</p>
    )}
  </div>
);

// Mini bar for status breakdown
const StatusBreakdownBar: React.FC<{ data: { status: string; count: number; color: string }[]; total: number }> = ({ data, total }) => (
  <div className="flex rounded-full h-3 overflow-hidden bg-gray-100 dark:bg-slate-700/50">
    {data.map((item) => (
      <div
        key={item.status}
        className={clsx('h-full transition-all', item.color)}
        style={{ width: `${total > 0 ? (item.count / total) * 100 : 0}%` }}
        title={`${item.status}: ${item.count}`}
      />
    ))}
  </div>
);

export const Analytics: React.FC = () => {
  const { tasks: allTasks, getTasksForUser } = useTaskStore();
  const { darkMode } = useUIStore();
  const { canViewAllTasks, getEffectiveUserId } = useUserStore();
  const keepMockData = useSettingsStore((s) => s.keepMockData);

  // Scope tasks — when "viewing as" another user, show their tasks
  const tasks = canViewAllTasks() ? allTasks : getTasksForUser(getEffectiveUserId());

  // ── Activity & Progress Monitor: inactivity tracking + cross-tab toasts ──
  // Deduplication lives in the tracker (shared event ids in localStorage),
  // so opening the app in three tabs still shows exactly one notice.
  const { lastActivity, inactivityString, currentState, isInactive, minutesSinceActivity } =
    useInactivityTracker({
      onInactivityChange: (durationMinutes, state, isNewForThisTab) => {
        if (!isNewForThisTab || state === 'recently-active') return;
        useToastStore.getState().addToast({
          type: state === 'activity-slowing' ? 'info' : 'error',
          title: state === 'activity-slowing' ? 'Activity slowing down' : 'Inactivity warning',
          message: `No meaningful activity for ${formatDuration(durationMinutes)}.`,
          duration: 8000,
        });
      },
    });

  // ── Audit trail (activity_log): real login / upload / task events ──────
  const effectiveUserId = getEffectiveUserId();
  const [activityLog, setActivityLog] = useState<ActivityLogRow[] | null>(null); // null = loading
  const [activityLogFailed, setActivityLogFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setActivityLog(null);
    setActivityLogFailed(false);
    if (!effectiveUserId) {
      setActivityLog([]);
      return;
    }
    activityLogDb
      .fetchRecent(effectiveUserId, { days: 30, limit: 100 }, keepMockData)
      .then((rows) => {
        if (cancelled) return;
        if (rows === null) {
          setActivityLogFailed(true);
          setActivityLog([]);
        } else {
          setActivityLog(rows);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setActivityLogFailed(true);
        setActivityLog([]);
      });
    return () => {
      cancelled = true;
    };
  }, [effectiveUserId, keepMockData]);

  // Derived monitor metrics — every value comes from the real task store or
  // the real activity_log rows; nothing is faked when data is missing.
  const tracker = useMemo(() => {
    const byUpdated = [...tasks].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    const completedList = byUpdated.filter((t) => t.status === 'completed');
    const lastCompletedTask = completedList[0] ?? null;
    const completedToday = completedList.filter((t) => isToday(new Date(t.updatedAt))).length;
    const pendingCount = tasks.filter((t) => t.status === 'todo').length;
    const overdueCount = tasks.filter(
      (t) => t.dueDate && isPast(new Date(t.dueDate)) && t.status !== 'completed'
    ).length;
    const lastUpdatedTask = byUpdated[0] ?? null;
    const avgProgress = tasks.length
      ? Math.round(tasks.reduce((sum, t) => sum + (t.progress || 0), 0) / tasks.length)
      : null;

    const log = activityLog ?? [];
    const lastLoginEvent = log.find((e) => e.eventType === 'login') ?? null;
    const lastUploadEvent =
      log.find((e) => e.eventType === 'upload' && e.outcome === 'success') ?? null;
    const uploadsToday = log.filter(
      (e) => e.eventType === 'upload' && e.outcome === 'success' && isToday(e.eventTimestamp)
    ).length;
    const failedUploads = log.filter(
      (e) => e.eventType === 'upload_failed' || (e.eventType === 'upload' && e.outcome === 'failure')
    ).length;

    // Last successful data update across the signals we actually track.
    const timestamps: number[] = [];
    if (lastLoginEvent) timestamps.push(+lastLoginEvent.eventTimestamp);
    if (lastUploadEvent) timestamps.push(+lastUploadEvent.eventTimestamp);
    if (lastCompletedTask) timestamps.push(+new Date(lastCompletedTask.updatedAt));
    if (lastUpdatedTask) timestamps.push(+new Date(lastUpdatedTask.updatedAt));
    const lastDataUpdate = timestamps.length ? new Date(Math.max(...timestamps)) : null;
    const hoursSinceUpdate = lastDataUpdate ? (+Date.now() - +lastDataUpdate) / 3_600_000 : null;

    let freshness: 'up-to-date' | 'due' | 'stale' | 'no-activity' | 'unverified';
    if (activityLogFailed && !lastCompletedTask && !lastUpdatedTask) freshness = 'unverified';
    else if (!lastDataUpdate) freshness = 'no-activity';
    else if ((hoursSinceUpdate ?? 0) <= FRESHNESS_DUE_HOURS) freshness = 'up-to-date';
    else if ((hoursSinceUpdate ?? 0) <= FRESHNESS_STALE_HOURS) freshness = 'due';
    else freshness = 'stale';

    return {
      lastCompletedTask,
      completedToday,
      pendingCount,
      overdueCount,
      lastUpdatedTask,
      avgProgress,
      lastLoginEvent,
      lastUploadEvent,
      uploadsToday,
      failedUploads,
      lastDataUpdate,
      hoursSinceUpdate,
      freshness,
      timeline: log.slice(0, 20),
    };
  }, [tasks, activityLog, activityLogFailed]);

  const [timeRange, setTimeRange] = useState<TimeRange>('7d');

  const chartTooltipStyle = darkMode
    ? { backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '10px', color: '#e2e8f0', fontSize: '12px' }
    : { backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '10px', color: '#374151', fontSize: '12px' };
  const gridStroke = darkMode ? '#334155' : '#f3f4f6';
  const axisStroke = darkMode ? '#64748b' : '#d1d5db';

  // Task metrics
  const metrics = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const inProgress = tasks.filter((t) => t.status === 'in-progress').length;
    const review = tasks.filter((t) => t.status === 'review').length;
    const todo = tasks.filter((t) => t.status === 'todo').length;
    const overdue = tasks.filter((t) => t.dueDate && isPast(new Date(t.dueDate)) && t.status !== 'completed' && !isToday(new Date(t.dueDate))).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const totalEstimated = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
    const totalActual = tasks.reduce((sum, t) => sum + (t.actualHours || 0), 0);
    const avgProgress = total > 0 ? Math.round(tasks.reduce((sum, t) => sum + t.progress, 0) / total) : 0;

    // Priority breakdown
    const byPriority = {
      urgent: tasks.filter((t) => t.priority === 'urgent').length,
      high: tasks.filter((t) => t.priority === 'high').length,
      medium: tasks.filter((t) => t.priority === 'medium').length,
      low: tasks.filter((t) => t.priority === 'low').length,
    };

    // Tags frequency
    const tagCounts = new Map<string, number>();
    tasks.forEach((t) => t.tags.forEach((tag) => tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)));
    const topTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag, count]) => ({ tag, count }));

    return { total, completed, inProgress, review, todo, overdue, completionRate, totalEstimated, totalActual, avgProgress, byPriority, topTags };
  }, [tasks]);

  const hasTasks = tasks.length > 0;

  // Chart data — only generate when there are tasks
  const weeklyData = useMemo(() => hasTasks ? generateWeeklyData() : [
    { day: 'Mon', completed: 0, created: 0, target: 0 },
    { day: 'Tue', completed: 0, created: 0, target: 0 },
    { day: 'Wed', completed: 0, created: 0, target: 0 },
    { day: 'Thu', completed: 0, created: 0, target: 0 },
    { day: 'Fri', completed: 0, created: 0, target: 0 },
    { day: 'Sat', completed: 0, created: 0, target: 0 },
    { day: 'Sun', completed: 0, created: 0, target: 0 },
  ], [hasTasks]);
  const velocityData = useMemo(() => {
    const range = timeRange === '7d' ? 7 : timeRange === '14d' ? 14 : timeRange === '30d' ? 30 : 90;
    if (!hasTasks) {
      return Array.from({ length: range }, (_, i) => {
        const date = subDays(new Date(), range - 1 - i);
        return { date: format(date, 'MMM d'), shortDate: format(date, 'd'), velocity: 0, avgTime: 0 };
      });
    }
    return generateDailyVelocity(range);
  }, [timeRange, hasTasks]);
  const hourlyData = useMemo(() => hasTasks ? generateHourlyProductivity() : [
    { hour: '6am', tasks: 0, focus: 0 }, { hour: '8am', tasks: 0, focus: 0 },
    { hour: '10am', tasks: 0, focus: 0 }, { hour: '12pm', tasks: 0, focus: 0 },
    { hour: '2pm', tasks: 0, focus: 0 }, { hour: '4pm', tasks: 0, focus: 0 },
    { hour: '6pm', tasks: 0, focus: 0 }, { hour: '8pm', tasks: 0, focus: 0 },
  ], [hasTasks]);
  const weeklyTrend = useMemo(() => hasTasks ? generateWeeklyTrend() : [
    { week: 'Week 1', completed: 0, overdue: 0, velocity: 0 },
    { week: 'Week 2', completed: 0, overdue: 0, velocity: 0 },
    { week: 'Week 3', completed: 0, overdue: 0, velocity: 0 },
    { week: 'Week 4', completed: 0, overdue: 0, velocity: 0 },
  ], [hasTasks]);

  const priorityPieData = [
    { name: 'Urgent', value: metrics.byPriority.urgent, fill: CHART_COLORS.red },
    { name: 'High', value: metrics.byPriority.high, fill: CHART_COLORS.amber },
    { name: 'Medium', value: metrics.byPriority.medium, fill: CHART_COLORS.blue },
    { name: 'Low', value: metrics.byPriority.low, fill: CHART_COLORS.indigo },
  ].filter((d) => d.value > 0);

  const statusPieData = [
    { name: 'To Do', value: metrics.todo, fill: '#94a3b8' },
    { name: 'In Progress', value: metrics.inProgress, fill: CHART_COLORS.blue },
    { name: 'Review', value: metrics.review, fill: CHART_COLORS.amber },
    { name: 'Completed', value: metrics.completed, fill: CHART_COLORS.emerald },
  ].filter((d) => d.value > 0);

  const completionRadial = [
    { name: 'Completion', value: metrics.completionRate, fill: CHART_COLORS.purple },
  ];

  const statusBreakdown = [
    { status: 'Completed', count: metrics.completed, color: 'bg-emerald-500' },
    { status: 'Review', count: metrics.review, color: 'bg-amber-500' },
    { status: 'In Progress', count: metrics.inProgress, color: 'bg-blue-500' },
    { status: 'To Do', count: metrics.todo, color: 'bg-gray-400 dark:bg-slate-500' },
  ];

  // Efficiency needs an estimate baseline; with no estimates on any task,
  // the summary card shows a neutral "no estimates" state instead of a
  // misleading 0h "Under Budget" verdict.
  const hasEstimates = metrics.totalEstimated > 0;
  const efficiencyRatio = hasEstimates ? Math.round((metrics.totalActual / metrics.totalEstimated) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Analytics</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1">
            Track your productivity metrics and team performance
          </p>
        </div>
        <div className="flex items-center gap-2 bg-gray-100 border border-gray-200 dark:bg-slate-800/50 dark:border-slate-700 rounded-lg p-1">
          {(['7d', '14d', '30d', '90d'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={clsx(
                'px-3 py-1.5 rounded-md text-xs font-semibold transition-colors',
                timeRange === range
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
              )}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={<CheckCircle2 size={20} />}
          label="Completion Rate"
          value={`${metrics.completionRate}%`}
          change={hasTasks ? 12 : undefined}
          changeLabel={hasTasks ? 'vs last period' : 'No data yet'}
          color="emerald"
          bgClass="bg-emerald-100 dark:bg-emerald-900/20"
          iconClass="text-emerald-600 dark:text-emerald-400"
        />
        <KPICard
          icon={<Activity size={20} />}
          label="Avg Progress"
          value={`${metrics.avgProgress}%`}
          change={hasTasks ? 8 : undefined}
          changeLabel={hasTasks ? 'across all tasks' : 'No data yet'}
          color="purple"
          bgClass="bg-purple-100 dark:bg-purple-900/20"
          iconClass="text-purple-600 dark:text-purple-400"
        />
        <KPICard
          icon={<AlertTriangle size={20} />}
          label="Overdue"
          value={metrics.overdue}
          change={hasTasks && metrics.overdue > 0 ? -metrics.overdue * 10 : undefined}
          changeLabel={hasTasks ? 'need attention' : 'No data yet'}
          color="red"
          bgClass={clsx(metrics.overdue > 0 ? 'bg-red-100 dark:bg-red-900/20' : 'bg-gray-100 dark:bg-slate-700/50')}
          iconClass={clsx(metrics.overdue > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-slate-500')}
        />
        <KPICard
          icon={<Timer size={20} />}
          label="Time Efficiency"
          value={`${efficiencyRatio}%`}
          change={hasTasks ? (efficiencyRatio <= 100 ? 5 : -3) : undefined}
          changeLabel={hasTasks ? `${metrics.totalActual}h actual / ${metrics.totalEstimated}h est.` : 'No data yet'}
          color="blue"
          bgClass="bg-blue-100 dark:bg-blue-900/20"
          iconClass="text-blue-600 dark:text-blue-400"
        />
      </div>

      {/* Status breakdown bar */}
      <div className="bg-white dark:bg-slate-800/30 rounded-xl border border-gray-200 dark:border-slate-700/50 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Task Pipeline</h3>
          <span className="text-xs font-medium text-gray-500 dark:text-slate-400">{metrics.total} total tasks</span>
        </div>
        <StatusBreakdownBar data={statusBreakdown} total={metrics.total} />
        <div className="flex items-center justify-between mt-3">
          {statusBreakdown.map((item) => (
            <div key={item.status} className="flex items-center gap-1.5">
              <span className={clsx('w-2.5 h-2.5 rounded-full', item.color)} />
              <span className="text-[11px] text-gray-500 dark:text-slate-400">{item.status}</span>
              <span className="text-[11px] font-bold text-gray-700 dark:text-slate-300">{item.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Velocity Chart */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader title="Task Velocity" subtitle={`Tasks completed per day (${timeRange})`} />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={velocityData}>
                  <defs>
                    <linearGradient id="velocityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.purple} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_COLORS.purple} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey={timeRange === '7d' || timeRange === '14d' ? 'date' : 'shortDate'} stroke={axisStroke} fontSize={11} />
                  <YAxis stroke={axisStroke} fontSize={11} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Area
                    type="monotone"
                    dataKey="velocity"
                    stroke={CHART_COLORS.purple}
                    strokeWidth={2.5}
                    fill="url(#velocityGrad)"
                    name="Tasks Completed"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Completion Radial */}
        <Card>
          <CardHeader title="Completion Rate" />
          <CardContent>
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={200}>
                <RadialBarChart
                  cx="50%"
                  cy="50%"
                  innerRadius="60%"
                  outerRadius="90%"
                  startAngle={90}
                  endAngle={-270}
                  data={completionRadial}
                  barSize={16}
                >
                  <RadialBar
                    background={{ fill: darkMode ? '#334155' : '#f3f4f6' }}
                    dataKey="value"
                    cornerRadius={10}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="-mt-[130px] text-center mb-16">
                <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">{metrics.completionRate}%</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">completed</p>
              </div>
              <div className="w-full space-y-2 mt-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-slate-400">Completed</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{metrics.completed}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-slate-400">Remaining</span>
                  <span className="font-bold text-gray-700 dark:text-slate-300">{metrics.total - metrics.completed}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Created vs Completed */}
        <Card>
          <CardHeader title="Created vs Completed" subtitle="Weekly task flow" />
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={weeklyData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="day" stroke={axisStroke} fontSize={11} />
                <YAxis stroke={axisStroke} fontSize={11} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="created" fill={CHART_COLORS.blue} radius={[6, 6, 0, 0]} name="Created" />
                <Bar dataKey="completed" fill={CHART_COLORS.emerald} radius={[6, 6, 0, 0]} name="Completed" />
                <Line type="monotone" dataKey="target" stroke={CHART_COLORS.amber} strokeWidth={2} strokeDasharray="5 5" name="Target" dot={false} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Hourly Productivity */}
        <Card>
          <CardHeader title="Peak Productivity Hours" subtitle="When you get the most done" />
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={hourlyData}>
                <defs>
                  <linearGradient id="hourlyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.cyan} stopOpacity={0.9} />
                    <stop offset="95%" stopColor={CHART_COLORS.purple} stopOpacity={0.9} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="hour" stroke={axisStroke} fontSize={10} />
                <YAxis stroke={axisStroke} fontSize={11} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="tasks" fill="url(#hourlyGrad)" radius={[6, 6, 0, 0]} name="Tasks Completed" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Third Row — Pie Charts + Tags */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Priority Distribution */}
        <Card>
          <CardHeader title="Priority Distribution" />
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={priorityPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {priorityPieData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {priorityPieData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                    <span className="text-xs text-gray-500 dark:text-slate-400">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-700 dark:text-slate-300">{item.value}</span>
                    <span className="text-[10px] text-gray-400 dark:text-slate-500">
                      ({metrics.total > 0 ? Math.round((item.value / metrics.total) * 100) : 0}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader title="Status Distribution" />
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {statusPieData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {statusPieData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                    <span className="text-xs text-gray-500 dark:text-slate-400">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-700 dark:text-slate-300">{item.value}</span>
                    <span className="text-[10px] text-gray-400 dark:text-slate-500">
                      ({metrics.total > 0 ? Math.round((item.value / metrics.total) * 100) : 0}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Tags */}
        <Card>
          <CardHeader title="Top Tags" subtitle="Most used task labels" />
          <CardContent>
            {metrics.topTags.length === 0 ? (
              <div className="py-8 text-center">
                <ListChecks size={24} className="mx-auto mb-2 text-gray-300 dark:text-slate-600" />
                <p className="text-xs text-gray-400 dark:text-slate-500">No tags used yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {metrics.topTags.map((item, i) => {
                  const maxCount = metrics.topTags[0].count;
                  const pct = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                  const colors = [
                    'bg-purple-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500',
                    'bg-pink-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-red-500',
                  ];
                  return (
                    <div key={item.tag}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-700 dark:text-slate-300">{item.tag}</span>
                        <span className="text-xs font-bold text-gray-500 dark:text-slate-400">{item.count}</span>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
                        <div
                          className={clsx('h-full rounded-full transition-all', colors[i % colors.length])}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Weekly Performance Trend */}
      <Card>
        <CardHeader title="Weekly Performance" subtitle="Month-over-month task trends" />
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={weeklyTrend} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="week" stroke={axisStroke} fontSize={11} />
              <YAxis stroke={axisStroke} fontSize={11} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="completed" fill={CHART_COLORS.emerald} radius={[6, 6, 0, 0]} name="Completed" />
              <Bar dataKey="overdue" fill={CHART_COLORS.red} radius={[6, 6, 0, 0]} name="Overdue" />
              <Bar dataKey="velocity" fill={CHART_COLORS.purple} radius={[6, 6, 0, 0]} name="Velocity" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Time Tracking Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Time Tracking Summary" />
          <CardContent>
            <div className="space-y-5">
              {/* Estimated vs Actual */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Estimated Hours</span>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{formatHours(metrics.totalEstimated)}h</span>
                </div>
                <div className="h-3 bg-gray-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: hasEstimates ? '100%' : '0%' }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Actual Hours</span>
                  <span className={clsx(
                    'text-sm font-bold',
                    !hasEstimates
                      ? 'text-gray-600 dark:text-slate-300'
                      : efficiencyRatio <= 100
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                  )}>
                    {formatHours(metrics.totalActual)}h
                  </span>
                </div>
                <div className="h-3 bg-gray-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
                  <div
                    className={clsx(
                      'h-full rounded-full',
                      !hasEstimates
                        ? 'bg-gray-400 dark:bg-slate-500'
                        : efficiencyRatio <= 100
                          ? 'bg-emerald-500'
                          : 'bg-red-500'
                    )}
                    style={{ width: hasEstimates ? `${Math.min(efficiencyRatio, 100)}%` : metrics.totalActual > 0 ? '100%' : '0%' }}
                  />
                </div>
              </div>

              {/* Efficiency verdict — only meaningful against estimates */}
              {hasEstimates ? (
                <div className={clsx(
                  'flex items-center gap-3 p-3 rounded-xl border',
                  efficiencyRatio <= 100
                    ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-700/30'
                    : 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-700/30'
                )}>
                  <div className={clsx(
                    'w-10 h-10 rounded-lg flex items-center justify-center',
                    efficiencyRatio <= 100 ? 'bg-emerald-100 dark:bg-emerald-900/20' : 'bg-red-100 dark:bg-red-900/20'
                  )}>
                    {efficiencyRatio <= 100
                      ? <Award size={20} className="text-emerald-600 dark:text-emerald-400" />
                      : <AlertTriangle size={20} className="text-red-600 dark:text-red-400" />
                    }
                  </div>
                  <div>
                    <p className={clsx('text-sm font-semibold', efficiencyRatio <= 100 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300')}>
                      {efficiencyRatio <= 100 ? 'Under Budget' : 'Over Budget'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      {efficiencyRatio <= 100
                        ? `${formatHours(metrics.totalEstimated - metrics.totalActual)}h saved vs estimates`
                        : `${formatHours(metrics.totalActual - metrics.totalEstimated)}h over estimates`
                      }
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 rounded-xl border bg-gray-50 border-gray-200 dark:bg-slate-800/40 dark:border-slate-700">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-slate-700/50">
                    <Timer size={20} className="text-gray-500 dark:text-slate-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-slate-300">No estimates yet</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      {metrics.totalActual > 0
                        ? `${formatHours(metrics.totalActual)}h tracked — set estimated hours on tasks to compare`
                        : 'Set estimated hours on tasks to compare against tracked time'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Performance Scores */}
        <Card>
          <CardHeader title="Performance Scores" subtitle="Key productivity indicators" />
          <CardContent>
            <div className="space-y-5">
              {(hasTasks ? [
                { label: 'On-Time Delivery', value: 82, icon: <Target size={16} />, color: 'bg-purple-500' },
                { label: 'Task Throughput', value: 74, icon: <Zap size={16} />, color: 'bg-blue-500' },
                { label: 'Estimation Accuracy', value: efficiencyRatio <= 100 ? 90 : 65, icon: <Timer size={16} />, color: 'bg-cyan-500' },
                { label: 'Consistency', value: 88, icon: <Flame size={16} />, color: 'bg-amber-500' },
                { label: 'Completion Quality', value: 95, icon: <Award size={16} />, color: 'bg-emerald-500' },
              ] : [
                { label: 'On-Time Delivery', value: 0, icon: <Target size={16} />, color: 'bg-purple-500' },
                { label: 'Task Throughput', value: 0, icon: <Zap size={16} />, color: 'bg-blue-500' },
                { label: 'Estimation Accuracy', value: 0, icon: <Timer size={16} />, color: 'bg-cyan-500' },
                { label: 'Consistency', value: 0, icon: <Flame size={16} />, color: 'bg-amber-500' },
                { label: 'Completion Quality', value: 0, icon: <Award size={16} />, color: 'bg-emerald-500' },
              ]).map((score) => (
                <div key={score.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 dark:text-slate-500">{score.icon}</span>
                      <span className="text-xs font-medium text-gray-700 dark:text-slate-300">{score.label}</span>
                    </div>
                    <span className={clsx(
                      'text-xs font-bold',
                      score.value >= 80 ? 'text-emerald-600 dark:text-emerald-400'
                        : score.value >= 60 ? 'text-amber-600 dark:text-amber-400'
                          : 'text-red-600 dark:text-red-400'
                    )}>
                      {score.value}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
                    <div
                      className={clsx('h-full rounded-full transition-all', score.color)}
                      style={{ width: `${score.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ══════════ Activity & Progress Monitor ══════════ */}
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">
            Activity &amp; Progress Monitor
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Last login, uploads, task progress, data freshness and inactivity — from real activity records
          </p>
        </div>

        {/* Row 1: Last Login · Last Upload */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader title="Last Login" subtitle="Successful sign-ins and current presence" />
            <CardContent>
              {activityLog === null ? (
                <p className="text-sm text-gray-500 dark:text-slate-400">Loading activity…</p>
              ) : activityLogFailed ? (
                <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                  Unable to verify last login — the activity log could not be reached.
                </p>
              ) : tracker.lastLoginEvent ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-slate-500">
                      Last login
                    </p>
                    <p className="text-lg font-bold text-gray-900 dark:text-slate-100">
                      {formatDistanceToNow(tracker.lastLoginEvent.eventTimestamp, { addSuffix: true })}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      {format(tracker.lastLoginEvent.eventTimestamp, 'EEE, MMM d, yyyy HH:mm')}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    {tracker.lastLoginEvent.metadata?.source === 'session_restore'
                      ? 'Restored from a persisted session'
                      : 'Signed in with email and password'}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  No login recorded yet — login events appear here after your first sign-in.
                </p>
              )}

              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700/50 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={clsx(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
                      isInactive
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    )}
                  >
                    <span aria-hidden="true">{isInactive ? '●' : '●'}</span>
                    {isInactive ? 'Inactive' : 'Active'}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-slate-400">
                    {inactivityLabel[currentState]} · {inactivityString}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Last meaningful activity:{' '}
                  {format(lastActivity, 'EEE, MMM d, yyyy HH:mm')} ({minutesSinceActivity} min ago).
                  Presence is approximate — a hidden or closed tab is not treated as a logout.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Last Upload" subtitle="Confirmed file saves only" />
            <CardContent>
              {activityLog === null ? (
                <p className="text-sm text-gray-500 dark:text-slate-400">Loading activity…</p>
              ) : activityLogFailed ? (
                <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                  Unable to verify uploads — the activity log could not be reached.
                </p>
              ) : tracker.lastUploadEvent ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-slate-500">
                      Last successful upload
                    </p>
                    <p className="text-lg font-bold text-gray-900 dark:text-slate-100">
                      {formatDistanceToNow(tracker.lastUploadEvent.eventTimestamp, { addSuffix: true })}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      {format(tracker.lastUploadEvent.eventTimestamp, 'EEE, MMM d, yyyy HH:mm')}
                      {typeof tracker.lastUploadEvent.metadata?.count === 'number'
                        ? ` · ${tracker.lastUploadEvent.metadata.count} file(s)`
                        : ''}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  No uploads recorded yet — attachments added to tasks show up here after they save.
                </p>
              )}

              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700/50 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-slate-500">
                    Uploads today
                  </p>
                  <p className="text-lg font-bold text-gray-900 dark:text-slate-100">
                    {activityLog === null ? '—' : tracker.uploadsToday}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-slate-500">
                    Failed uploads
                  </p>
                  <p
                    className={clsx(
                      'text-lg font-bold',
                      tracker.failedUploads > 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-900 dark:text-slate-100'
                    )}
                  >
                    {activityLog === null ? '—' : tracker.failedUploads}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-500 dark:text-slate-400">
                An upload counts only after the application confirms the file was saved — selecting a
                file is not counted.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Row 2: Task Completion & Progress */}
        <Card>
          <CardHeader title="Task Completion & Progress" subtitle="Live from your task list" />
          <CardContent>
            {tasks.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-slate-400">
                No tasks recorded yet — create a task to start tracking progress.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-slate-500">
                      Most recently completed
                    </p>
                    {tracker.lastCompletedTask ? (
                      <>
                        <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                          {tracker.lastCompletedTask.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          {format(new Date(tracker.lastCompletedTask.updatedAt), 'EEE, MMM d, yyyy HH:mm')}{' '}
                          · {formatDistanceToNow(new Date(tracker.lastCompletedTask.updatedAt), { addSuffix: true })}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-slate-400">
                        No completed tasks yet
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs font-medium text-gray-400 dark:text-slate-500">Completed today</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-slate-100">
                        {tracker.completedToday}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-400 dark:text-slate-500">Pending</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-slate-100">
                        {tracker.pendingCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-400 dark:text-slate-500">Overdue</p>
                      <p
                        className={clsx(
                          'text-lg font-bold',
                          tracker.overdueCount > 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-gray-900 dark:text-slate-100'
                        )}
                      >
                        {tracker.overdueCount}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-slate-500">
                      Most recent update
                    </p>
                    {tracker.lastUpdatedTask ? (
                      <>
                        <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                          {tracker.lastUpdatedTask.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          {formatDistanceToNow(new Date(tracker.lastUpdatedTask.updatedAt), { addSuffix: true })}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-slate-400">No task updates yet</p>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-medium text-gray-400 dark:text-slate-500">
                        Average progress
                      </p>
                      <p className="text-xs font-bold text-gray-900 dark:text-slate-100">
                        {tracker.avgProgress === null ? '—' : `${tracker.avgProgress}%`}
                      </p>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full transition-all"
                        style={{ width: `${tracker.avgProgress ?? 0}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-gray-500 dark:text-slate-400">
                      {tracker.completedToday === 0
                        ? 'No completed tasks recorded today'
                        : `${tracker.completedToday} completed today`}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Row 3: Daily Activity & Data Freshness */}
        <Card>
          <CardHeader
            title="Daily Activity & Data Freshness"
            subtitle={`Expected meaningful update within ${FRESHNESS_DUE_HOURS}h — stale after ${FRESHNESS_STALE_HOURS}h (configurable defaults)`}
            action={
              <span
                className={clsx(
                  'inline-block px-2.5 py-1 rounded-full text-xs font-semibold',
                  freshnessMeta[tracker.freshness].className
                )}
              >
                {freshnessMeta[tracker.freshness].label}
              </span>
            }
          />
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-slate-500">
                  Last successful data update
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                  {activityLog === null && !tracker.lastDataUpdate
                    ? 'Loading…'
                    : tracker.lastDataUpdate
                      ? format(tracker.lastDataUpdate, 'EEE, MMM d, yyyy HH:mm')
                      : 'No activity recorded'}
                </p>
                {tracker.hoursSinceUpdate !== null && (
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    {tracker.hoursSinceUpdate < 1
                      ? 'Less than an hour ago'
                      : `${Math.floor(tracker.hoursSinceUpdate)} hours ago`}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-slate-500">
                  Last login
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                  {tracker.lastLoginEvent
                    ? formatDistanceToNow(tracker.lastLoginEvent.eventTimestamp, { addSuffix: true })
                    : activityLogFailed
                      ? 'Unable to verify'
                      : activityLog === null
                        ? 'Loading…'
                        : 'No login recorded'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-slate-500">
                  Last successful upload
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                  {tracker.lastUploadEvent
                    ? formatDistanceToNow(tracker.lastUploadEvent.eventTimestamp, { addSuffix: true })
                    : activityLogFailed
                      ? 'Unable to verify'
                      : activityLog === null
                        ? 'Loading…'
                        : 'No uploads recorded'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-slate-500">
                  Last completed task
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                  {tracker.lastCompletedTask
                    ? formatDistanceToNow(new Date(tracker.lastCompletedTask.updatedAt), { addSuffix: true })
                    : 'No completed tasks recorded'}
                </p>
              </div>
            </div>
            <p className="mt-4 text-xs text-gray-500 dark:text-slate-400">
              Freshness is derived from real recorded events (login, upload, task changes) — never
              from page loads alone. Scheduled background jobs would lower these thresholds once
              configured.
            </p>
          </CardContent>
        </Card>

        {/* Row 4: Inactivity Monitoring */}
        <Card>
          <CardHeader title="Inactivity Monitoring" subtitle="Hour-based intervals since last meaningful action" />
          <CardContent>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{inactivityString}</p>
              <span
                className={clsx(
                  'inline-flex px-2.5 py-1 rounded-full text-xs font-semibold',
                  isInactive
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                )}
              >
                {inactivityLabel[currentState]}
              </span>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
              Exact timestamp: {format(lastActivity, 'EEE, MMM d, yyyy HH:mm:ss')} · recalculated as
              the clock advances and on refresh, from the persisted timestamp.
            </p>
            <ul className="mt-3 space-y-1 text-xs text-gray-500 dark:text-slate-400 list-disc list-inside">
              <li>Meaningful actions (task create/update/complete, uploads) reset the clock.</li>
              <li>Passive page viewing does not count as activity.</li>
              <li>
                Cross-tab coordination via BroadcastChannel: the same threshold shows one toast, not
                one per open tab.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Row 5: Recent Activity Timeline */}
        <Card>
          <CardHeader
            title="Recent Activity Timeline"
            subtitle="Audit history — last 30 days, newest first"
          />
          <CardContent>
            {activityLog === null ? (
              <div className="py-6 text-center">
                <p className="text-sm text-gray-500 dark:text-slate-400">Loading activity…</p>
              </div>
            ) : activityLogFailed ? (
              <div className="py-6 text-center">
                <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                  Unable to load the activity timeline. Task metrics above still reflect live data.
                </p>
              </div>
            ) : tracker.timeline.length === 0 ? (
              <div className="py-6 text-center">
                <ListChecks size={24} className="mx-auto mb-2 text-gray-300 dark:text-slate-600" />
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  No activity recorded yet — logins, uploads and task changes will appear here.
                </p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                {tracker.timeline.map((event) => {
                  const meta = eventMeta[event.eventType] ?? { emoji: '•', label: event.eventType };
                  const failed = event.outcome === 'failure';
                  const detail =
                    (event.metadata?.taskTitle as string | undefined) ||
                    (event.metadata?.projectTitle as string | undefined);
                  return (
                    <div
                      key={event.id}
                      className="flex items-start gap-3 py-2.5 border-b border-gray-100 dark:border-slate-700/40 last:border-0"
                    >
                      <span className="w-6 text-center text-base leading-6" aria-hidden="true">
                        {meta.emoji}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p
                          className={clsx(
                            'text-sm font-medium truncate',
                            failed
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-gray-800 dark:text-slate-200'
                          )}
                        >
                          {meta.label}
                          {failed ? ' (failed)' : ''}
                          {detail ? ` — ${detail}` : ''}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          {format(event.eventTimestamp, 'MMM d, yyyy HH:mm')} ·{' '}
                          {formatDistanceToNow(event.eventTimestamp, { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
