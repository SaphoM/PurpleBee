import React, { useState, useMemo } from 'react';
import clsx from 'clsx';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  Filter,
} from 'lucide-react';
import { useTaskStore } from '@stores/taskStore';
import { useUserStore } from '@stores/userStore';
import { Task, TaskStatus, TaskPriority } from '@/types/index';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday, isPast } from 'date-fns';
import { CreateTaskModal } from '@components/CreateTaskModal';
import { TaskDetailModal } from '@components/TaskDetailModal';
import { PriorityBadge } from '@components/Badge';

// ── Color configs ──────────────────────────────────────────────────────
const statusColors: Record<TaskStatus, { dot: string; bg: string; text: string; border: string; accent: string }> = {
  'todo': { dot: 'bg-gray-400 dark:bg-slate-500', bg: 'bg-gray-50 dark:bg-slate-700/30', text: 'text-gray-700 dark:text-slate-300', border: 'border-gray-200 dark:border-slate-600/50', accent: '#9ca3af' },
  'in-progress': { dot: 'bg-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-700/30', accent: '#3b82f6' },
  'review': { dot: 'bg-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-700/30', accent: '#f59e0b' },
  'completed': { dot: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-700/30', accent: '#10b981' },
};

const priorityAccent: Record<TaskPriority, string> = {
  low: '#9ca3af',
  medium: '#f59e0b',
  high: '#f97316',
  urgent: '#ef4444',
};

// ── Desktop Day Cell (month grid) ──────────────────────────────────────
const DesktopDayCell: React.FC<{
  date: Date;
  tasks: Task[];
  currentMonth: Date;
  onTaskClick: (task: Task) => void;
  onAddTask: (date: Date) => void;
}> = ({ date, tasks, currentMonth, onTaskClick, onAddTask }) => {
  const inMonth = isSameMonth(date, currentMonth);
  const today = isToday(date);

  return (
    <div
      className={clsx(
        'min-h-[120px] border-b border-r border-gray-200 dark:border-slate-700/40 p-1.5 transition-colors group',
        inMonth ? 'bg-white dark:bg-slate-800/20' : 'bg-gray-50/60 dark:bg-slate-900/20',
        today && 'bg-purple-50/40 dark:bg-purple-900/5'
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className={clsx(
            'inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold',
            today
              ? 'bg-purple-600 text-white'
              : inMonth
                ? 'text-gray-700 dark:text-slate-300'
                : 'text-gray-400 dark:text-slate-600'
          )}
        >
          {format(date, 'd')}
        </span>
        <button
          onClick={() => onAddTask(date)}
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:text-slate-500 dark:hover:text-purple-400 dark:hover:bg-purple-900/20 transition-all"
        >
          <Plus size={14} />
        </button>
      </div>
      <div className="space-y-0.5">
        {tasks.slice(0, 3).map((task) => {
          const colors = statusColors[task.status];
          return (
            <button
              key={task.id}
              onClick={() => onTaskClick(task)}
              className={clsx(
                'w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium truncate transition-all',
                'border-l-2',
                task.priority === 'urgent' ? 'border-l-red-500' : task.priority === 'high' ? 'border-l-orange-500' : 'border-l-transparent',
                colors.bg, colors.text,
                'hover:ring-1 hover:ring-purple-300 dark:hover:ring-purple-600'
              )}
              title={task.title}
            >
              {task.title}
            </button>
          );
        })}
        {tasks.length > 3 && (
          <span className="block text-[10px] font-semibold text-purple-600 dark:text-purple-400 px-1.5">
            +{tasks.length - 3} more
          </span>
        )}
      </div>
    </div>
  );
};

// ── Upcoming Date Group (mobile) ──────────────────────────────────────
const UpcomingGroup: React.FC<{
  date: Date;
  dateStr: string;
  tasks: Task[];
  defaultExpanded: boolean;
  onTaskClick: (id: string) => void;
}> = ({ date, dateStr, tasks: dayTasks, defaultExpanded, onTaskClick }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const dayIsToday = isToday(date);
  const overdue = isPast(date) && !dayIsToday;

  return (
    <div className="rounded-xl overflow-hidden bg-white dark:bg-slate-800/30 border border-gray-100 dark:border-slate-700/30">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className={clsx(
            'text-sm font-bold',
            dayIsToday ? 'text-purple-600 dark:text-purple-400'
              : overdue ? 'text-red-500 dark:text-red-400'
                : 'text-gray-800 dark:text-slate-200'
          )}>
            {dayIsToday ? 'Today' : format(date, 'EEE, d MMM')}
          </span>
          <span className="text-[10px] font-medium text-gray-400 dark:text-slate-500">
            {dayTasks.length} task{dayTasks.length !== 1 ? 's' : ''}
          </span>
        </div>
        <ChevronDown size={16} className={clsx(
          'text-gray-400 dark:text-slate-500 transition-transform',
          expanded && 'rotate-180'
        )} />
      </button>
      {expanded && (
        <div className="px-4 pb-3 pt-1 space-y-1">
          {dayTasks.map((task) => (
            <button
              key={task.id}
              onClick={() => onTaskClick(task.id)}
              className="w-full flex items-center gap-3 py-2.5 text-left border-b border-gray-100 dark:border-slate-700/30 last:border-b-0"
            >
              <div
                className="w-1 h-8 rounded-full flex-shrink-0"
                style={{ backgroundColor: statusColors[task.status].accent }}
              />
              <div className="flex-1 min-w-0">
                <p className={clsx(
                  'text-sm font-medium truncate',
                  task.status === 'completed' ? 'line-through text-gray-400 dark:text-slate-500' : 'text-gray-800 dark:text-slate-200'
                )}>
                  {task.title}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-slate-500">
                  {task.status === 'in-progress' ? 'In Progress' : task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                  {task.tags.length > 0 && ` · ${task.tags[0]}`}
                </p>
              </div>
              <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                {task.dueDate && (
                  <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400">
                    {format(new Date(task.dueDate), 'h:mm a')}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Main CalendarPage ──────────────────────────────────────────────────
export const CalendarPage: React.FC = () => {
  const storeTasks = useTaskStore((s) => s.tasks);
  const getTasksForUser = useTaskStore((s) => s.getTasksForUser);
  const { canViewAllTasks, getEffectiveUserId } = useUserStore();

  const tasks = canViewAllTasks() ? storeTasks : getTasksForUser(getEffectiveUserId());

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'month' | 'week' | 'agenda'>('month');

  const selectedTask = selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) ?? null : null;

  // Tasks with due dates mapped by date string
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach((task) => {
      if (task.dueDate) {
        const key = format(new Date(task.dueDate), 'yyyy-MM-dd');
        const existing = map.get(key) || [];
        map.set(key, [...existing, task]);
      }
    });
    return map;
  }, [tasks]);

  // Calendar grid dates
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);
    const days: Date[] = [];
    let day = calStart;
    while (day <= calEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentDate]);

  // Agenda tasks for this month, sorted by date
  const agendaTasks = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    return tasks
      .filter((t) => {
        if (!t.dueDate) return false;
        const due = new Date(t.dueDate);
        return due >= monthStart && due <= monthEnd;
      })
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
  }, [tasks, currentDate]);

  // Group agenda tasks by date
  const agendaGrouped = useMemo(() => {
    const groups = new Map<string, Task[]>();
    agendaTasks.forEach((task) => {
      const key = format(new Date(task.dueDate!), 'yyyy-MM-dd');
      const existing = groups.get(key) || [];
      groups.set(key, [...existing, task]);
    });
    return Array.from(groups.entries()).map(([dateStr, dateTasks]) => ({
      date: new Date(dateStr),
      dateStr,
      tasks: dateTasks,
    }));
  }, [agendaTasks]);

  // Tasks for the selected date (mobile)
  const selectedDateTasks = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, 'yyyy-MM-dd');
    return tasksByDate.get(key) || [];
  }, [selectedDate, tasksByDate]);

  // Stats
  const stats = useMemo(() => ({
    total: agendaTasks.length,
    completed: agendaTasks.filter((t) => t.status === 'completed').length,
    overdue: agendaTasks.filter((t) => t.dueDate && isPast(new Date(t.dueDate)) && t.status !== 'completed' && !isToday(new Date(t.dueDate))).length,
    upcoming: agendaTasks.filter((t) => t.dueDate && !isPast(new Date(t.dueDate))).length,
  }), [agendaTasks]);

  const navigateMonth = (dir: 'prev' | 'next') => {
    setCurrentDate(dir === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
    setSelectedDate(null);
  };

  const getTasksForDate = (date: Date) => {
    const key = format(date, 'yyyy-MM-dd');
    return tasksByDate.get(key) || [];
  };

  // Get the dominant circle color for a date based on task statuses
  const getDateCircleColor = (date: Date): string | null => {
    const dayTasks = getTasksForDate(date);
    if (dayTasks.length === 0) return null;
    // Priority: in-progress (blue) > review (amber) > todo (pink) > completed (green)
    const priority: TaskStatus[] = ['in-progress', 'review', 'todo', 'completed'];
    for (const status of priority) {
      if (dayTasks.some((t) => t.status === status)) return statusColors[status].accent;
    }
    return statusColors['todo'].accent;
  };

  // Palette of circle ring colors for dates with tasks (matching reference)
  const dateRingColors: Record<string, { ring: string; bg: string; text: string }> = {
    '#3b82f6': { ring: 'ring-blue-400/60', bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-300' },
    '#f59e0b': { ring: 'ring-amber-400/60', bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-300' },
    '#9ca3af': { ring: 'ring-pink-400/60', bg: 'bg-pink-100 dark:bg-pink-900/40', text: 'text-pink-700 dark:text-pink-300' },
    '#10b981': { ring: 'ring-emerald-400/60', bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-300' },
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ─── MOBILE LAYOUT ─── */}
      <div className="lg:hidden space-y-4">
        {/* Month header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => navigateMonth('prev')} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 min-w-[160px] text-center">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <button onClick={() => navigateMonth('next')} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Filters + View Toggle */}
        <div className="flex items-center gap-3">
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
            <Filter size={16} />
            Filters
          </button>
          <div className="flex rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
            {(['month', 'week', 'agenda'] as const).map((view) => (
              <button
                key={view}
                onClick={() => setMobileView(view)}
                className={clsx(
                  'px-4 py-2.5 text-sm font-semibold transition-colors capitalize',
                  mobileView === view
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'
                )}
              >
                {view === 'agenda' ? 'Agenda' : view.charAt(0).toUpperCase() + view.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* + Add Task button */}
        <button
          onClick={() => setShowCreateModal(true)}
          className={clsx(
            'w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl text-sm font-bold',
            'bg-gradient-to-r from-purple-600 to-blue-600 text-white',
            'shadow-lg shadow-purple-500/25',
            'active:scale-[0.98] transition-transform'
          )}
        >
          <Plus size={18} strokeWidth={2.5} />
          Add Task
        </button>

        {/* Calendar grid card */}
        {mobileView === 'month' && (
          <div className="bg-white dark:bg-slate-800/40 rounded-2xl p-4 border border-gray-200 dark:border-slate-700/50 shadow-sm">
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-3">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                <div key={i} className={clsx(
                  'text-center text-[11px] font-bold uppercase tracking-wider py-1',
                  i >= 5 ? 'text-purple-400 dark:text-purple-500' : 'text-gray-400 dark:text-slate-500'
                )}>
                  {d}
                </div>
              ))}
            </div>

            {/* Date grid */}
            <div className="grid grid-cols-7 gap-y-2">
              {calendarDays.map((date) => {
                const inMonth = isSameMonth(date, currentDate);
                const today = isToday(date);
                const selected = selectedDate && isSameDay(date, selectedDate);
                const circleColor = getDateCircleColor(date);
                const ringStyle = circleColor ? dateRingColors[circleColor] : null;
                const hasOverdue = getTasksForDate(date).some(
                  (t) => t.status !== 'completed' && isPast(date) && !isToday(date)
                );

                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => setSelectedDate(date)}
                    className="relative flex items-center justify-center py-0.5"
                  >
                    <span
                      className={clsx(
                        'w-9 h-9 flex items-center justify-center rounded-full text-sm font-semibold transition-all',
                        selected
                          ? 'bg-gradient-to-br from-purple-500 to-purple-700 text-white shadow-lg shadow-purple-500/40 scale-110'
                          : today
                            ? 'bg-gradient-to-br from-pink-400 to-pink-500 text-white shadow-md shadow-pink-400/30'
                            : ringStyle && inMonth
                              ? `${ringStyle.bg} ${ringStyle.text} ring-2 ${ringStyle.ring}`
                              : inMonth
                                ? 'text-gray-700 dark:text-slate-300'
                                : 'text-gray-300 dark:text-slate-600'
                      )}
                    >
                      {format(date, 'd')}
                    </span>

                    {/* Overdue tiny dot */}
                    {hasOverdue && !selected && (
                      <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-red-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Week view */}
        {mobileView === 'week' && (() => {
          const weekStart = startOfWeek(selectedDate || new Date());
          const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
          return (
            <div className="bg-white dark:bg-slate-800/40 rounded-2xl p-4 border border-gray-200 dark:border-slate-700/50 shadow-sm">
              <div className="grid grid-cols-7 gap-1">
                {weekDays.map((date) => {
                  const today = isToday(date);
                  const selected = selectedDate && isSameDay(date, selectedDate);
                  const dayTasks = getTasksForDate(date);
                  const circleColor = getDateCircleColor(date);
                  const ringStyle = circleColor ? dateRingColors[circleColor] : null;
                  return (
                    <button
                      key={date.toISOString()}
                      onClick={() => setSelectedDate(date)}
                      className="flex flex-col items-center gap-1 py-2"
                    >
                      <span className="text-[10px] font-bold uppercase text-gray-400 dark:text-slate-500">
                        {format(date, 'EEE')}
                      </span>
                      <span
                        className={clsx(
                          'w-10 h-10 flex items-center justify-center rounded-full text-sm font-semibold transition-all',
                          selected
                            ? 'bg-gradient-to-br from-purple-500 to-purple-700 text-white shadow-lg shadow-purple-500/40'
                            : today
                              ? 'bg-gradient-to-br from-pink-400 to-pink-500 text-white shadow-md shadow-pink-400/30'
                              : ringStyle
                                ? `${ringStyle.bg} ${ringStyle.text} ring-2 ${ringStyle.ring}`
                                : 'text-gray-700 dark:text-slate-300'
                        )}
                      >
                        {format(date, 'd')}
                      </span>
                      <span className="text-[9px] font-medium text-gray-400 dark:text-slate-500">
                        {dayTasks.length > 0 ? `${dayTasks.length}` : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Selected date task list */}
        <div className="space-y-3">
          {selectedDate && (mobileView === 'month' || mobileView === 'week') && (
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100">
                {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEE, d MMM yyyy')}
              </h3>
              <span className="text-xs text-gray-400 dark:text-slate-500 font-medium">
                {selectedDateTasks.length} task{selectedDateTasks.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {selectedDateTasks.length === 0 && selectedDate && mobileView !== 'agenda' && (
            <div className="text-center py-10 bg-white dark:bg-slate-800/30 rounded-2xl border border-gray-200 dark:border-slate-700/50">
              <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gray-100 dark:bg-slate-700/40 flex items-center justify-center">
                <CalendarIcon size={28} className="text-gray-300 dark:text-slate-600" />
              </div>
              <p className="text-sm font-medium text-gray-400 dark:text-slate-500">No events or tasks</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-3 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline"
              >
                + Add a task
              </button>
            </div>
          )}

          {mobileView !== 'agenda' && selectedDateTasks.map((task) => {
            const colors = statusColors[task.status];
            const overdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== 'completed' && !isToday(new Date(task.dueDate));
            return (
              <button
                key={task.id}
                onClick={() => setSelectedTaskId(task.id)}
                className={clsx(
                  'w-full flex items-start gap-3 p-4 rounded-xl text-left transition-all',
                  'bg-white dark:bg-slate-800/30 border border-gray-100 dark:border-slate-700/30',
                  'hover:shadow-md active:scale-[0.99]',
                  'border-l-4'
                )}
                style={{ borderLeftColor: priorityAccent[task.priority] }}
              >
                <div className={clsx('w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0', colors.dot)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={clsx(
                      'text-sm font-semibold truncate',
                      task.status === 'completed' ? 'line-through text-gray-400 dark:text-slate-500' : 'text-gray-900 dark:text-slate-100'
                    )}>
                      {task.title}
                    </span>
                    {overdue && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 flex-shrink-0">
                        Overdue
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">
                    {task.status === 'in-progress' ? 'In Progress' : task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                    {task.tags.length > 0 && ` · ${task.tags[0]}`}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {task.dueDate && (
                    <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400">
                      {format(new Date(task.dueDate), 'h:mm a')}
                    </span>
                  )}
                  <PriorityBadge priority={task.priority} size="sm" />
                </div>
              </button>
            );
          })}

          {/* Agenda view — show all grouped tasks */}
          {mobileView === 'agenda' && agendaGrouped.length > 0 && (
            <div className="space-y-3">
              {agendaGrouped.map(({ date, dateStr, tasks: dayTasks }, idx) => (
                <UpcomingGroup
                  key={dateStr}
                  date={date}
                  dateStr={dateStr}
                  tasks={dayTasks}
                  defaultExpanded={isToday(date) || idx < 3}
                  onTaskClick={(id) => setSelectedTaskId(id)}
                />
              ))}
            </div>
          )}
          {mobileView === 'agenda' && agendaGrouped.length === 0 && (
            <div className="text-center py-10 bg-white dark:bg-slate-800/30 rounded-2xl border border-gray-200 dark:border-slate-700/50">
              <CalendarIcon size={28} className="mx-auto mb-2 text-gray-300 dark:text-slate-600" />
              <p className="text-sm font-medium text-gray-400 dark:text-slate-500">No tasks this month</p>
            </div>
          )}

          {/* Upcoming tasks section (month/week views) */}
          {mobileView !== 'agenda' && (!selectedDate || selectedDateTasks.length === 0) && agendaGrouped.length > 0 && (
            <div className="mt-2 space-y-3">
              <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100 px-1">Upcoming</h3>
              {agendaGrouped.slice(0, 5).map(({ date, dateStr, tasks: dayTasks }, idx) => (
                <UpcomingGroup
                  key={dateStr}
                  date={date}
                  dateStr={dateStr}
                  tasks={dayTasks}
                  defaultExpanded={isToday(date) || idx < 2}
                  onTaskClick={(id) => setSelectedTaskId(id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── DESKTOP LAYOUT ─── */}
      <div className="hidden lg:block space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Calendar</h1>
            <p className="text-gray-500 dark:text-slate-400 mt-1">
              {stats.total} tasks this month · {stats.completed} completed
              {stats.overdue > 0 && <> · <span className="text-red-500 font-medium">{stats.overdue} overdue</span></>}
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className={clsx(
              'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold',
              'bg-gradient-to-r from-purple-600 to-blue-600 text-white',
              'hover:from-purple-700 hover:to-blue-700',
              'shadow-md shadow-purple-500/20 transition-all'
            )}
          >
            <Plus size={16} />
            Add Task
          </button>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between bg-white dark:bg-slate-800/30 rounded-xl border border-gray-200 dark:border-slate-700/50 px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigateMonth('prev')} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition-colors">
              <ChevronLeft size={20} />
            </button>
            <button onClick={() => navigateMonth('next')} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition-colors">
              <ChevronRight size={20} />
            </button>
            <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
          </div>
          <button
            onClick={() => { setCurrentDate(new Date()); setSelectedDate(new Date()); }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-purple-200 text-purple-600 hover:bg-purple-50 dark:border-purple-700/30 dark:text-purple-400 dark:hover:bg-purple-900/20 transition-colors"
          >
            Today
          </button>
        </div>

        {/* Desktop month grid */}
        <div className="bg-white dark:bg-slate-800/20 rounded-xl border border-gray-200 dark:border-slate-700/50 overflow-hidden">
          <div className="grid grid-cols-7 border-b border-gray-200 dark:border-slate-700/40">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="py-2.5 text-center text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider bg-gray-50/80 dark:bg-slate-800/40">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendarDays.map((date) => (
              <DesktopDayCell
                key={date.toISOString()}
                date={date}
                tasks={getTasksForDate(date)}
                currentMonth={currentDate}
                onTaskClick={(task) => setSelectedTaskId(task.id)}
                onAddTask={() => setShowCreateModal(true)}
              />
            ))}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'This Month', value: stats.total, icon: <CalendarIcon size={18} />, color: 'purple' },
            { label: 'Completed', value: stats.completed, icon: <CheckCircle2 size={18} />, color: 'emerald' },
            { label: 'Upcoming', value: stats.upcoming, icon: <Clock size={18} />, color: 'blue' },
            { label: 'Overdue', value: stats.overdue, icon: <AlertTriangle size={18} />, color: stats.overdue > 0 ? 'red' : 'gray' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="bg-white dark:bg-slate-800/30 rounded-xl border border-gray-200 dark:border-slate-700/50 p-4">
              <div className="flex items-center gap-3">
                <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center',
                  `bg-${color}-100 dark:bg-${color}-900/20 text-${color}-600 dark:text-${color}-400`
                )}>
                  {icon}
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">{label}</p>
                  <p className={clsx('text-xl font-bold', color === 'red' && value > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-slate-100')}>{value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      <CreateTaskModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        defaultStatus="todo"
      />
      <TaskDetailModal
        task={selectedTask}
        isOpen={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
      />
    </div>
  );
};
