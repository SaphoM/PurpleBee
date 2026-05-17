import React from 'react';
import { StatCard } from '@components/StatCard';
import { Card, CardHeader, CardContent } from '@components/Card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import {
  CheckCircle,
  Clock,
  Zap,
  AlertCircle,
} from 'lucide-react';
import { useTaskStore } from '@stores/taskStore';
import { useUIStore } from '@stores/uiStore';
import { useUserStore } from '@stores/userStore';
import { useSettingsStore } from '@stores/settingsStore';
import { Tip } from '@components/Tip';

const mockCompletionTrendData = [
  { date: 'Mon', completed: 4, target: 5 },
  { date: 'Tue', completed: 3, target: 5 },
  { date: 'Wed', completed: 6, target: 5 },
  { date: 'Thu', completed: 5, target: 5 },
  { date: 'Fri', completed: 7, target: 5 },
  { date: 'Sat', completed: 4, target: 5 },
  { date: 'Sun', completed: 5, target: 5 },
];

const emptyCompletionTrendData = [
  { date: 'Mon', completed: 0, target: 0 },
  { date: 'Tue', completed: 0, target: 0 },
  { date: 'Wed', completed: 0, target: 0 },
  { date: 'Thu', completed: 0, target: 0 },
  { date: 'Fri', completed: 0, target: 0 },
  { date: 'Sat', completed: 0, target: 0 },
  { date: 'Sun', completed: 0, target: 0 },
];

const mockFocusSessionsData = [
  { time: '9am', sessions: 2, hours: 1.5 },
  { time: '10am', sessions: 3, hours: 2 },
  { time: '11am', sessions: 1, hours: 0.5 },
  { time: '2pm', sessions: 2, hours: 1.5 },
  { time: '3pm', sessions: 4, hours: 2.5 },
  { time: '4pm', sessions: 2, hours: 1.5 },
];

const emptyFocusSessionsData = [
  { time: '9am', sessions: 0, hours: 0 },
  { time: '10am', sessions: 0, hours: 0 },
  { time: '11am', sessions: 0, hours: 0 },
  { time: '2pm', sessions: 0, hours: 0 },
  { time: '3pm', sessions: 0, hours: 0 },
  { time: '4pm', sessions: 0, hours: 0 },
];

export const Dashboard: React.FC = () => {
  const { tasks: allTasks, getTasksForUser } = useTaskStore();
  const { darkMode } = useUIStore();
  const { user, canViewAllTasks, getEffectiveUserId, isViewingOther, getViewingProfile } = useUserStore();
  const keepMockData = useSettingsStore((s) => s.keepMockData);

  // Scope tasks — when "viewing as" another user, show their tasks
  const tasks = canViewAllTasks() ? allTasks : getTasksForUser(getEffectiveUserId());

  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in-progress').length;
  const overdueTasks = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed'
  ).length;

  const hasTasks = tasks.length > 0;

  // Derive priority distribution from actual tasks
  const priorityDistribution = hasTasks
    ? [
        { name: 'Urgent', value: tasks.filter((t) => t.priority === 'urgent').length, fill: '#ef4444' },
        { name: 'High', value: tasks.filter((t) => t.priority === 'high').length, fill: '#f97316' },
        { name: 'Medium', value: tasks.filter((t) => t.priority === 'medium').length, fill: '#eab308' },
        { name: 'Low', value: tasks.filter((t) => t.priority === 'low').length, fill: '#6366f1' },
      ].filter((d) => d.value > 0)
    : [];

  const completionTrendData = hasTasks ? mockCompletionTrendData : emptyCompletionTrendData;
  const focusSessionsData = hasTasks ? mockFocusSessionsData : emptyFocusSessionsData;

  // Productivity score — derived from actual tasks when available
  const productivityScore = hasTasks
    ? `${Math.min(100, Math.round((completedTasks / tasks.length) * 100 + inProgressTasks * 3))}%`
    : '0%';

  const chartTooltipStyle = darkMode
    ? { backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#e2e8f0' }
    : { backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#374151' };

  const gridStroke = darkMode ? '#334155' : '#e5e7eb';
  const axisStroke = darkMode ? '#94a3b8' : '#9ca3af';

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-slate-100 mb-2">
          {isViewingOther()
            ? `${getViewingProfile()?.name?.split(' ')[0]}'s Dashboard`
            : `Welcome back, ${user?.name?.split(' ')[0] || 'User'}! 👋`
          }
        </h1>
        <p className="text-gray-500 dark:text-slate-400">
          {isViewingOther()
            ? `Viewing ${getViewingProfile()?.name}'s productivity overview`
            : "Here's your productivity overview for today"
          }
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Tip content="Total tasks marked as completed this period" position="bottom">
          <StatCard
            icon={<CheckCircle size={24} />}
            label="Tasks Completed"
            value={completedTasks}
            color="emerald"
            trend={hasTasks ? { value: 12, direction: 'up' } : undefined}
            subtitle={hasTasks ? 'This week' : 'No data yet'}
          />
        </Tip>
        <Tip content="Tasks currently being worked on" position="bottom">
          <StatCard
            icon={<Clock size={24} />}
            label="In Progress"
            value={inProgressTasks}
            color="blue"
            trend={hasTasks ? { value: 5, direction: 'down' } : undefined}
            subtitle={hasTasks ? 'Active tasks' : 'No data yet'}
          />
        </Tip>
        <Tip content="Tasks past their due date that aren't done yet" position="bottom">
          <StatCard
            icon={<AlertCircle size={24} />}
            label="Overdue Tasks"
            value={overdueTasks}
            color="red"
            trend={hasTasks ? { value: 8, direction: 'up' } : undefined}
            subtitle={hasTasks ? 'Need attention' : 'No data yet'}
          />
        </Tip>
        <Tip content="Overall score based on completion rate, velocity, and focus" position="bottom">
          <StatCard
            icon={<Zap size={24} />}
            label="Productivity Score"
            value={productivityScore}
            color="purple"
            trend={hasTasks ? { value: 3, direction: 'up' } : undefined}
            subtitle={hasTasks ? 'Very productive!' : 'No data yet'}
          />
        </Tip>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Completion Trend */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title="Completion Trend"
              subtitle="Tasks completed vs target this week"
            />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={completionTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis stroke={axisStroke} />
                  <YAxis stroke={axisStroke} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={{ fill: '#8b5cf6' }}
                    name="Completed"
                  />
                  <Line
                    type="monotone"
                    dataKey="target"
                    stroke="#94a3b8"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: '#94a3b8' }}
                    name="Target"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Priority Distribution */}
        <Card>
          <CardHeader title="Priority Distribution" />
          <CardContent>
            {priorityDistribution.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={priorityDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {priorityDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={chartTooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {priorityDistribution.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: item.fill }}
                        />
                        <span className="text-sm text-gray-500 dark:text-slate-400">{item.name}</span>
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-slate-100">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-gray-400 dark:text-slate-500">
                <AlertCircle size={32} className="mb-2 opacity-40" />
                <p className="text-sm font-medium">No tasks yet</p>
                <p className="text-xs mt-1">Create tasks to see priority distribution</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Focus Sessions */}
      <Card>
        <CardHeader
          title="Focus Sessions"
          subtitle="Your productivity throughout the day"
        />
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={focusSessionsData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis stroke={axisStroke} />
              <YAxis stroke={axisStroke} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Legend />
              <Bar dataKey="sessions" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              <Bar dataKey="hours" fill="#06b6d4" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* AI Insights */}
      <Card>
        <CardHeader title="AI Insights & Recommendations" />
        <CardContent>
          {hasTasks ? (
            <div className="space-y-3">
              {[
                {
                  icon: '🚀',
                  title: 'Great Progress!',
                  text: `You've completed ${completedTasks} of ${tasks.length} tasks. ${completedTasks > 0 ? 'Keep it up!' : 'Get started by completing your first task!'}`,
                },
                {
                  icon: '⏰',
                  title: 'Deadline Alert',
                  text: overdueTasks > 0
                    ? `You have ${overdueTasks} overdue task${overdueTasks > 1 ? 's' : ''}. Consider prioritizing these.`
                    : 'All tasks are on schedule. Great time management!',
                },
                {
                  icon: '💡',
                  title: 'Productivity Tip',
                  text: 'Your most productive hours are between 3-4pm. Schedule important tasks then.',
                },
              ].map((insight, idx) => (
                <div
                  key={idx}
                  className="flex gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200 dark:bg-slate-800/50 dark:border-slate-700/50"
                >
                  <span className="text-lg flex-shrink-0">{insight.icon}</span>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-slate-100">{insight.title}</p>
                    <p className="text-sm text-gray-500 dark:text-slate-400">{insight.text}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400 dark:text-slate-500">
              <Zap size={32} className="mb-2 opacity-40" />
              <p className="text-sm font-medium">No insights yet</p>
              <p className="text-xs mt-1">Add tasks to get AI-powered recommendations</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
