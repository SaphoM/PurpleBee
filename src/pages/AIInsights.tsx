import React, { useState, useMemo } from 'react';
import clsx from 'clsx';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Target,
  Lightbulb,
  Brain,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  Activity,
  BarChart3,
  Flame,
  Eye,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  X,
  MessageSquare,
  Gauge,
  CircleDot,
  Timer,
  Layers,
  AlertCircle,
  Award,
  Rocket,
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@components/Card';
import { useTaskStore } from '@stores/taskStore';
import { useUserStore } from '@stores/userStore';
import { Task, TaskPriority } from '@/types/index';
import { format, differenceInDays, isPast, addDays } from 'date-fns';

// ─── Types ───────────────────────────────────────────────────────────────
type InsightCategory = 'all' | 'productivity' | 'risks' | 'suggestions' | 'forecasts';
type InsightSeverity = 'info' | 'warning' | 'success' | 'critical';

interface Insight {
  id: string;
  category: 'productivity' | 'risks' | 'suggestions' | 'forecasts';
  severity: InsightSeverity;
  title: string;
  description: string;
  action?: string;
  actionLabel?: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  icon: React.ReactNode;
  dismissed?: boolean;
  helpful?: boolean | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────
const severityConfig: Record<InsightSeverity, { bg: string; border: string; icon: string; badge: string }> = {
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-700/40',
    icon: 'text-blue-500',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  },
  success: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    border: 'border-emerald-200 dark:border-emerald-700/40',
    icon: 'text-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-700/40',
    icon: 'text-amber-500',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  },
  critical: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-700/40',
    icon: 'text-red-500',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  },
};

const categoryTabs: { value: InsightCategory; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'All Insights', icon: <Sparkles size={14} /> },
  { value: 'productivity', label: 'Productivity', icon: <Activity size={14} /> },
  { value: 'risks', label: 'Risks', icon: <ShieldAlert size={14} /> },
  { value: 'suggestions', label: 'Suggestions', icon: <Lightbulb size={14} /> },
  { value: 'forecasts', label: 'Forecasts', icon: <TrendingUp size={14} /> },
];

// ─── Generate insights from real task data ───────────────────────────────
const generateInsights = (tasks: Task[]): Insight[] => {
  if (tasks.length === 0) return [];

  const insights: Insight[] = [];
  const now = new Date();

  const totalTasks = tasks.length;
  const completed = tasks.filter((t) => t.status === 'completed');
  const inProgress = tasks.filter((t) => t.status === 'in-progress');
  const todo = tasks.filter((t) => t.status === 'todo');
  const review = tasks.filter((t) => t.status === 'review');
  const overdue = tasks.filter((t) => t.dueDate && isPast(new Date(t.dueDate)) && t.status !== 'completed');
  const urgent = tasks.filter((t) => t.priority === 'urgent' && t.status !== 'completed');
  const dueSoon = tasks.filter((t) => {
    if (!t.dueDate || t.status === 'completed') return false;
    const days = differenceInDays(new Date(t.dueDate), now);
    return days >= 0 && days <= 2;
  });
  const avgProgress = totalTasks > 0
    ? Math.round(tasks.reduce((sum, t) => sum + t.progress, 0) / totalTasks)
    : 0;
  const completionRate = totalTasks > 0 ? Math.round((completed.length / totalTasks) * 100) : 0;

  // ── Productivity insights ──
  if (completionRate >= 60) {
    insights.push({
      id: 'prod-1',
      category: 'productivity',
      severity: 'success',
      title: 'Strong completion rate',
      description: `You've completed ${completed.length} of ${totalTasks} tasks (${completionRate}%). Your productivity is above average — keep the momentum going!`,
      confidence: 92,
      impact: 'high',
      icon: <Award size={20} />,
    });
  } else if (completionRate < 30 && totalTasks > 2) {
    insights.push({
      id: 'prod-1b',
      category: 'productivity',
      severity: 'warning',
      title: 'Low completion rate detected',
      description: `Only ${completionRate}% of your tasks are completed. Consider breaking down larger tasks into smaller, actionable items to build momentum.`,
      action: '#tasks',
      actionLabel: 'Review tasks',
      confidence: 88,
      impact: 'high',
      icon: <AlertTriangle size={20} />,
    });
  }

  if (inProgress.length > 0) {
    const avgInProgressProgress = Math.round(
      inProgress.reduce((sum, t) => sum + t.progress, 0) / inProgress.length
    );
    insights.push({
      id: 'prod-2',
      category: 'productivity',
      severity: avgInProgressProgress >= 50 ? 'success' : 'info',
      title: `${inProgress.length} tasks in progress`,
      description: `Active tasks are at ${avgInProgressProgress}% average progress. ${
        avgInProgressProgress >= 50
          ? 'Great momentum — several tasks are past the halfway mark.'
          : 'Most tasks are still in early stages. Focus on completing one before starting another.'
      }`,
      confidence: 85,
      impact: 'medium',
      icon: <Activity size={20} />,
    });
  }

  if (review.length > 0) {
    insights.push({
      id: 'prod-3',
      category: 'productivity',
      severity: 'info',
      title: `${review.length} task${review.length > 1 ? 's' : ''} awaiting review`,
      description: `${review.map((t) => `"${t.title}"`).join(', ')} ${review.length > 1 ? 'are' : 'is'} in review. Completing reviews quickly keeps the pipeline moving.`,
      action: '#tasks',
      actionLabel: 'Go to reviews',
      confidence: 95,
      impact: 'medium',
      icon: <Eye size={20} />,
    });
  }

  // ── Risk insights ──
  if (overdue.length > 0) {
    insights.push({
      id: 'risk-1',
      category: 'risks',
      severity: 'critical',
      title: `${overdue.length} overdue task${overdue.length > 1 ? 's' : ''}`,
      description: `${overdue.map((t) => `"${t.title}" (${differenceInDays(now, new Date(t.dueDate!))}d overdue)`).join(', ')}. Overdue tasks compound — address these first to prevent cascading delays.`,
      action: '#tasks',
      actionLabel: 'Fix overdue',
      confidence: 98,
      impact: 'high',
      icon: <AlertCircle size={20} />,
    });
  }

  if (dueSoon.length > 0) {
    insights.push({
      id: 'risk-2',
      category: 'risks',
      severity: 'warning',
      title: `${dueSoon.length} task${dueSoon.length > 1 ? 's' : ''} due within 48 hours`,
      description: `${dueSoon.map((t) => `"${t.title}" (${t.progress}% done)`).join(', ')}. ${
        dueSoon.some((t) => t.progress < 50)
          ? 'Some are under 50% — consider requesting deadline extensions.'
          : 'Good progress — push through to finish on time.'
      }`,
      action: '#tasks',
      actionLabel: 'View due tasks',
      confidence: 95,
      impact: 'high',
      icon: <Clock size={20} />,
    });
  }

  if (urgent.length > 0) {
    insights.push({
      id: 'risk-3',
      category: 'risks',
      severity: 'critical',
      title: `${urgent.length} urgent task${urgent.length > 1 ? 's' : ''} unfinished`,
      description: `"${urgent[0].title}"${urgent.length > 1 ? ` and ${urgent.length - 1} more` : ''} ${urgent.length > 1 ? 'are' : 'is'} marked urgent but not completed. These should be your top priority today.`,
      action: '#tasks',
      actionLabel: 'Focus on urgent',
      confidence: 96,
      impact: 'high',
      icon: <Flame size={20} />,
    });
  }

  const timeOverBudget = tasks.filter(
    (t) => t.estimatedHours && t.actualHours && t.actualHours > t.estimatedHours
  );
  if (timeOverBudget.length > 0) {
    insights.push({
      id: 'risk-4',
      category: 'risks',
      severity: 'warning',
      title: 'Time estimates exceeded',
      description: `${timeOverBudget.length} task${timeOverBudget.length > 1 ? 's have' : ' has'} gone over the estimated hours. Consider reviewing estimation practices for future planning accuracy.`,
      confidence: 80,
      impact: 'medium',
      icon: <Timer size={20} />,
    });
  }

  // ── Suggestion insights ──
  if (todo.length > 3) {
    insights.push({
      id: 'sug-1',
      category: 'suggestions',
      severity: 'info',
      title: 'Backlog growing',
      description: `You have ${todo.length} tasks in the backlog. Consider prioritizing and scheduling the top 2-3 items to prevent overwhelm. Use time-boxing to tackle them systematically.`,
      action: '#tasks',
      actionLabel: 'Prioritize backlog',
      confidence: 82,
      impact: 'medium',
      icon: <Layers size={20} />,
    });
  }

  const noEstimate = tasks.filter(
    (t) => t.status !== 'completed' && !t.estimatedHours
  );
  if (noEstimate.length > 1) {
    insights.push({
      id: 'sug-2',
      category: 'suggestions',
      severity: 'info',
      title: 'Add time estimates',
      description: `${noEstimate.length} active tasks don't have time estimates. Adding estimates improves planning accuracy by 40% and helps identify workload imbalances early.`,
      action: '#tasks',
      actionLabel: 'Add estimates',
      confidence: 75,
      impact: 'medium',
      icon: <Target size={20} />,
    });
  }

  if (inProgress.length >= 3) {
    insights.push({
      id: 'sug-3',
      category: 'suggestions',
      severity: 'warning',
      title: 'Too many tasks in progress',
      description: `You have ${inProgress.length} tasks in progress simultaneously. Research shows limiting work-in-progress to 2-3 items increases throughput by 25%. Consider completing existing tasks before starting new ones.`,
      confidence: 78,
      impact: 'high',
      icon: <CircleDot size={20} />,
    });
  }

  const tagsUsed = new Set(tasks.flatMap((t) => t.tags));
  if (tagsUsed.size > 0) {
    const tagCounts: Record<string, number> = {};
    tasks.forEach((t) => t.tags.forEach((tag) => { tagCounts[tag] = (tagCounts[tag] || 0) + 1; }));
    const topTag = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])[0];
    insights.push({
      id: 'sug-4',
      category: 'suggestions',
      severity: 'info',
      title: `Most common focus: "${topTag[0]}"`,
      description: `${topTag[1]} of your tasks are tagged "${topTag[0]}". Consider dedicating focused time blocks for this category to maximize deep work efficiency.`,
      confidence: 70,
      impact: 'low',
      icon: <Lightbulb size={20} />,
    });
  }

  // ── Forecast insights ──
  const completedRecently = completed.filter((t) => {
    const daysDiff = differenceInDays(now, new Date(t.updatedAt));
    return daysDiff <= 7;
  });
  const weeklyVelocity = completedRecently.length;
  const remainingTasks = tasks.filter((t) => t.status !== 'completed').length;

  if (weeklyVelocity > 0 && remainingTasks > 0) {
    const weeksToComplete = Math.ceil(remainingTasks / weeklyVelocity);
    const estDate = format(addDays(now, weeksToComplete * 7), 'MMM d');
    insights.push({
      id: 'fore-1',
      category: 'forecasts',
      severity: weeksToComplete <= 2 ? 'success' : 'info',
      title: 'Estimated completion forecast',
      description: `At your current pace of ${weeklyVelocity} tasks/week, your remaining ${remainingTasks} tasks could be completed by ~${estDate}. ${
        weeksToComplete <= 2 ? 'You\'re on track!' : 'Consider increasing velocity or deferring lower-priority items.'
      }`,
      confidence: 65,
      impact: 'high',
      icon: <TrendingUp size={20} />,
    });
  }

  if (avgProgress > 0) {
    insights.push({
      id: 'fore-2',
      category: 'forecasts',
      severity: avgProgress >= 50 ? 'success' : 'info',
      title: 'Overall progress health',
      description: `Average task progress is ${avgProgress}%. ${
        avgProgress >= 60
          ? 'The portfolio is trending well — most tasks are in advanced stages.'
          : avgProgress >= 30
          ? 'Progress is moderate. Focus efforts on tasks closest to completion for quick wins.'
          : 'Progress is low across the board. Consider identifying and removing blockers.'
      }`,
      confidence: 88,
      impact: 'medium',
      icon: <Gauge size={20} />,
    });
  }

  insights.push({
    id: 'fore-3',
    category: 'forecasts',
    severity: 'info',
    title: 'Workload prediction',
    description: `Based on your current pipeline: ${todo.length} to start, ${inProgress.length} active, ${review.length} in review. ${
      todo.length > inProgress.length + review.length
        ? 'Incoming work exceeds capacity — expect bottlenecks next week unless tasks are deferred.'
        : 'Workload appears balanced for the coming week.'
    }`,
    confidence: 72,
    impact: 'medium',
    icon: <BarChart3 size={20} />,
  });

  return insights;
};

// ─── Productivity Score Ring ─────────────────────────────────────────────
const ScoreRing: React.FC<{ score: number; label: string; size?: number; color?: string }> = ({
  score, label, size = 80, color = '#8b5cf6',
}) => {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none"
            className="stroke-gray-200 dark:stroke-slate-700" strokeWidth={6} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={color} strokeWidth={6} strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={offset}
            className="transition-all duration-1000" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-900 dark:text-slate-100">
          {score}%
        </span>
      </div>
      <span className="text-xs font-medium text-gray-500 dark:text-slate-400">{label}</span>
    </div>
  );
};

// ─── Insight Card ────────────────────────────────────────────────────────
const InsightCard: React.FC<{
  insight: Insight;
  onDismiss: (id: string) => void;
  onFeedback: (id: string, helpful: boolean) => void;
}> = ({ insight, onDismiss, onFeedback }) => {
  const config = severityConfig[insight.severity];

  return (
    <div className={clsx(
      'relative rounded-xl border p-4 transition-all duration-300',
      config.bg, config.border,
      'hover:shadow-md group'
    )}>
      {/* Dismiss */}
      <button
        onClick={() => onDismiss(insight.id)}
        className="absolute top-3 right-3 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/60"
      >
        <X size={14} />
      </button>

      <div className="flex gap-3">
        {/* Icon */}
        <div className={clsx(
          'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center',
          config.badge
        )}>
          <span className={config.icon}>{insight.icon}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-slate-100">{insight.title}</h4>
            <span className={clsx('px-1.5 py-0.5 rounded text-[10px] font-bold uppercase', config.badge)}>
              {insight.severity}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400">
              {insight.confidence}% confidence
            </span>
          </div>

          <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed mb-3">
            {insight.description}
          </p>

          <div className="flex items-center justify-between">
            {/* Action */}
            {insight.action && (
              <a
                href={insight.action}
                className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
              >
                {insight.actionLabel || 'Take action'} <ArrowRight size={12} />
              </a>
            )}
            {!insight.action && <span />}

            {/* Feedback */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-gray-400 dark:text-slate-500 mr-1">Helpful?</span>
              <button
                onClick={() => onFeedback(insight.id, true)}
                className={clsx(
                  'p-1 rounded transition-colors',
                  insight.helpful === true
                    ? 'text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30'
                    : 'text-gray-400 hover:text-emerald-500 dark:text-slate-500'
                )}
              >
                <ThumbsUp size={12} />
              </button>
              <button
                onClick={() => onFeedback(insight.id, false)}
                className={clsx(
                  'p-1 rounded transition-colors',
                  insight.helpful === false
                    ? 'text-red-500 bg-red-100 dark:bg-red-900/30'
                    : 'text-gray-400 hover:text-red-500 dark:text-slate-500'
                )}
              >
                <ThumbsDown size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Impact indicator */}
      <div className={clsx(
        'absolute top-4 right-10 opacity-0 group-hover:opacity-100 transition-opacity',
        'text-[10px] font-medium text-gray-400 dark:text-slate-500'
      )}>
        {insight.impact} impact
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────
export const AIInsights: React.FC = () => {
  const allTasks = useTaskStore((s) => s.tasks);
  const getTasksForUser = useTaskStore((s) => s.getTasksForUser);
  const { canViewAllTasks, getEffectiveUserId } = useUserStore();

  // Scope tasks — when "viewing as" another user, show their tasks
  const tasks = canViewAllTasks() ? allTasks : getTasksForUser(getEffectiveUserId());
  const [activeCategory, setActiveCategory] = useState<InsightCategory>('all');
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<Record<string, boolean>>({});
  const [refreshKey, setRefreshKey] = useState(0);

  // Generate insights from actual task data
  const allInsights = useMemo(() => {
    const raw = generateInsights(tasks);
    return raw.map((ins) => ({
      ...ins,
      dismissed: dismissed.has(ins.id),
      helpful: feedback[ins.id] ?? null,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, refreshKey]);

  const visibleInsights = useMemo(() => {
    let filtered = allInsights.filter((i) => !dismissed.has(i.id));
    if (activeCategory !== 'all') {
      filtered = filtered.filter((i) => i.category === activeCategory);
    }
    // Sort: critical first, then warning, then info, then success
    const sevOrder: Record<InsightSeverity, number> = { critical: 0, warning: 1, info: 2, success: 3 };
    return filtered.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]);
  }, [allInsights, activeCategory, dismissed]);

  const handleDismiss = (id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
  };

  const handleFeedback = (id: string, helpful: boolean) => {
    setFeedback((prev) => ({ ...prev, [id]: helpful }));
  };

  // Quick stats from tasks
  const totalTasks = tasks.length;
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const overdue = tasks.filter((t) => t.dueDate && isPast(new Date(t.dueDate)) && t.status !== 'completed').length;
  const avgProgress = totalTasks > 0
    ? Math.round(tasks.reduce((sum, t) => sum + t.progress, 0) / totalTasks)
    : 0;
  const completionRate = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;

  // Health score calculation
  const overdueRatio = totalTasks > 0 ? overdue / totalTasks : 0;
  const healthScore = totalTasks === 0
    ? 0
    : Math.max(0, Math.min(100,
        Math.round(completionRate * 0.4 + avgProgress * 0.3 + (1 - overdueRatio) * 100 * 0.3)
      ));

  // Category counts
  const categoryCounts: Record<string, number> = { all: 0, productivity: 0, risks: 0, suggestions: 0, forecasts: 0 };
  allInsights.filter((i) => !dismissed.has(i.id)).forEach((i) => {
    categoryCounts[i.category]++;
    categoryCounts.all++;
  });

  // Severity counts for the summary
  const criticalCount = allInsights.filter((i) => !dismissed.has(i.id) && i.severity === 'critical').length;
  const warningCount = allInsights.filter((i) => !dismissed.has(i.id) && i.severity === 'warning').length;
  const successCount = allInsights.filter((i) => !dismissed.has(i.id) && i.severity === 'success').length;

  // Priority actions
  const priorityTasks = tasks
    .filter((t) => t.status !== 'completed')
    .sort((a, b) => {
      const pOrder: Record<TaskPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
      return pOrder[a.priority] - pOrder[b.priority];
    })
    .slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
              <Brain size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100">AI Insights</h1>
              <p className="text-gray-500 dark:text-slate-400 mt-0.5 text-sm">
                AI-powered productivity analysis • {allInsights.filter((i) => !dismissed.has(i.id)).length} active insights
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={() => { setRefreshKey((k) => k + 1); setDismissed(new Set()); }}
          className={clsx(
            'w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold',
            'bg-gradient-to-r from-purple-600 to-blue-600 text-white',
            'hover:shadow-lg hover:shadow-purple-500/25 transition-all'
          )}
        >
          <RefreshCw size={14} />
          Refresh Analysis
        </button>
      </div>

      {/* Health Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Health Score */}
        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Health Score</p>
                <p className={clsx(
                  'text-3xl font-bold mt-1',
                  healthScore >= 70 ? 'text-emerald-600 dark:text-emerald-400'
                    : healthScore >= 40 ? 'text-amber-600 dark:text-amber-400'
                    : 'text-red-600 dark:text-red-400'
                )}>
                  {healthScore}
                </p>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                  {healthScore >= 70 ? 'Excellent' : healthScore >= 40 ? 'Needs attention' : 'Critical'}
                </p>
              </div>
              <ScoreRing
                score={healthScore}
                label=""
                size={64}
                color={healthScore >= 70 ? '#10b981' : healthScore >= 40 ? '#f59e0b' : '#ef4444'}
              />
            </div>
          </CardContent>
        </Card>

        {/* Critical Issues */}
        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Critical Issues</p>
                <p className={clsx(
                  'text-3xl font-bold mt-1',
                  criticalCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                )}>
                  {criticalCount}
                </p>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                  {criticalCount > 0 ? 'Immediate action needed' : 'No critical issues'}
                </p>
              </div>
              <div className={clsx(
                'w-12 h-12 rounded-xl flex items-center justify-center',
                criticalCount > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30'
              )}>
                {criticalCount > 0 ? (
                  <AlertCircle size={22} className="text-red-500" />
                ) : (
                  <CheckCircle2 size={22} className="text-emerald-500" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Warnings */}
        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Warnings</p>
                <p className="text-3xl font-bold mt-1 text-amber-600 dark:text-amber-400">{warningCount}</p>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                  {warningCount > 0 ? 'Review recommended' : 'All clear'}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <AlertTriangle size={22} className="text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Wins */}
        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Positive Signals</p>
                <p className="text-3xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{successCount}</p>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                  {successCount > 0 ? 'Things going well' : 'Keep pushing'}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Sparkles size={22} className="text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Insights feed — 2 cols */}
        <div className="lg:col-span-2 space-y-4">
          {/* Category tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {categoryTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveCategory(tab.value)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all',
                  activeCategory === tab.value
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                    : 'text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700/50'
                )}
              >
                {tab.icon}
                {tab.label}
                {categoryCounts[tab.value] > 0 && (
                  <span className={clsx(
                    'ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center',
                    activeCategory === tab.value
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200 text-gray-600 dark:bg-slate-600 dark:text-slate-300'
                  )}>
                    {categoryCounts[tab.value]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Insights list */}
          <div className="space-y-3">
            {visibleInsights.length > 0 ? (
              visibleInsights.map((insight) => (
                <InsightCard
                  key={insight.id}
                  insight={insight}
                  onDismiss={handleDismiss}
                  onFeedback={handleFeedback}
                />
              ))
            ) : (
              <Card>
                <CardContent>
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-3">
                      <CheckCircle2 size={28} className="text-purple-500" />
                    </div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-slate-300">All caught up!</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                      {dismissed.size > 0 ? 'All insights dismissed. Refresh to re-analyze.' : 'No insights in this category.'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Sidebar — 1 col */}
        <div className="space-y-4">
          {/* Score Breakdown */}
          <Card>
            <CardHeader title="Score Breakdown" subtitle="How your health score is calculated" />
            <CardContent>
              <div className="flex items-center justify-center gap-6 mb-6">
                <ScoreRing score={completionRate} label="Completion" size={72} color="#8b5cf6" />
                <ScoreRing score={avgProgress} label="Progress" size={72} color="#3b82f6" />
                <ScoreRing score={totalTasks > 0 ? Math.round((1 - overdue / totalTasks) * 100) : 0} label="On Time" size={72} color="#10b981" />
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Task Completion', value: completionRate, weight: '40%', color: 'bg-purple-500' },
                  { label: 'Average Progress', value: avgProgress, weight: '30%', color: 'bg-blue-500' },
                  { label: 'On-Time Rate', value: totalTasks > 0 ? Math.round((1 - overdue / totalTasks) * 100) : 0, weight: '30%', color: 'bg-emerald-500' },
                ].map((metric) => (
                  <div key={metric.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600 dark:text-slate-400">{metric.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-900 dark:text-slate-100">{metric.value}%</span>
                        <span className="text-[10px] text-gray-400 dark:text-slate-500">({metric.weight})</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
                      <div
                        className={clsx('h-full rounded-full transition-all duration-700', metric.color)}
                        style={{ width: `${metric.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Priority Actions */}
          <Card>
            <CardHeader title="Priority Actions" subtitle="AI-recommended focus order" />
            <CardContent>
              {priorityTasks.length > 0 ? (
                <div className="space-y-2.5">
                  {priorityTasks.map((task, i) => {
                    const priorityColors: Record<TaskPriority, string> = {
                      urgent: 'border-l-red-500 bg-red-50/50 dark:bg-red-900/10',
                      high: 'border-l-orange-500 bg-orange-50/50 dark:bg-orange-900/10',
                      medium: 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-900/10',
                      low: 'border-l-gray-400 bg-gray-50/50 dark:bg-slate-700/20',
                    };
                    const priorityBadge: Record<TaskPriority, string> = {
                      urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
                      high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
                      medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
                      low: 'bg-gray-100 text-gray-600 dark:bg-slate-600 dark:text-slate-300',
                    };
                    return (
                      <div
                        key={task.id}
                        className={clsx(
                          'border-l-[3px] rounded-lg px-3 py-2.5 transition-all hover:shadow-sm',
                          priorityColors[task.priority]
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-[10px] font-bold flex items-center justify-center mt-0.5">
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-800 dark:text-slate-200 truncate">{task.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={clsx('px-1.5 py-0.5 rounded text-[10px] font-bold uppercase', priorityBadge[task.priority])}>
                                {task.priority}
                              </span>
                              <span className="text-[10px] text-gray-400 dark:text-slate-500">{task.progress}%</span>
                              {task.dueDate && (
                                <span className={clsx(
                                  'text-[10px]',
                                  isPast(new Date(task.dueDate)) ? 'text-red-500 font-semibold' : 'text-gray-400 dark:text-slate-500'
                                )}>
                                  {isPast(new Date(task.dueDate)) ? 'Overdue' : `Due ${format(new Date(task.dueDate), 'MMM d')}`}
                                </span>
                              )}
                            </div>
                            {/* Progress bar */}
                            <div className="mt-1.5 h-1 rounded-full bg-gray-200 dark:bg-slate-600 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all"
                                style={{ width: `${task.progress}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-400 dark:text-slate-500 text-center py-4">No pending tasks</p>
              )}
            </CardContent>
          </Card>

          {/* Quick Tips */}
          <Card>
            <CardHeader title="AI Tips" subtitle="Personalized recommendations" />
            <CardContent>
              <div className="space-y-3">
                {[
                  {
                    icon: <Rocket size={14} className="text-purple-500" />,
                    tip: 'Start your day with the highest-priority task for maximum impact.',
                  },
                  {
                    icon: <Target size={14} className="text-blue-500" />,
                    tip: 'Time-box tasks to 90-minute blocks with 15-minute breaks.',
                  },
                  {
                    icon: <Flame size={14} className="text-amber-500" />,
                    tip: 'Tackle urgent tasks before 11am when focus peaks.',
                  },
                  {
                    icon: <MessageSquare size={14} className="text-emerald-500" />,
                    tip: 'Use the ChatBot for quick task updates without context-switching.',
                  },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center mt-0.5">
                      {item.icon}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed">{item.tip}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
