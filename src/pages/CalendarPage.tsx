import React, { useState, useMemo } from 'react';
import clsx from 'clsx';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  Circle,
  AlertTriangle,
  LayoutGrid,
  List,
  Filter,
  MoreHorizontal,
  X,
} from 'lucide-react';
import { useTaskStore } from '@stores/taskStore';
import { useUserStore } from '@stores/userStore';
import { Task, TaskStatus, TaskPriority } from '@/types/index';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday, isPast, parseISO } from 'date-fns';
import { CreateTaskModal } from '@components/CreateTaskModal';
import { TaskDetailModal } from '@components/TaskDetailModal';
import { StatusBadge, PriorityBadge } from '@components/Badge';

type CalendarView = 'month' | 'week' | 'agenda';

const statusColors: Record<TaskStatus, { dot: string; bg: string; text: string; border: string }> = {
  'todo': { dot: 'bg-gray-400 dark:bg-slate-500', bg: 'bg-gray-50 dark:bg-slate-700/30', text: 'text-gray-700 dark:text-slate-300', border: 'border-gray-200 dark:border-slate-600/50' },
  'in-progress': { dot: 'bg-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-700/30' },
  'review': { dot: 'bg-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-700/30' },
  'completed': { dot: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-700/30' },
};

const priorityIndicator: Record<TaskPriority, string> = {
  low: '',
  medium: 'border-l-amber-400',
  high: 'border-l-orange-500',
  urgent: 'border-l-red-500',
};

// Day cell for month view
const DayCell: React.FC<{
  date: Date;
  tasks: Task[];
  currentMonth: Date;
  onTaskClick: (task: Task) => void;
  onAddTask: (date: Date) => void;
}> = ({ date, tasks, currentMonth, onTaskClick, onAddTask }) => {
  const inMonth = isSameMonth(date, currentMonth);
  const today = isToday(date);
  const overdueTasks = tasks.filter((t) => t.status !== 'completed' && isPast(date) && !isToday(date));

  return (
    <div
      className={clsx(
        'min-h-[110px] lg:min-h-[130px] border-b border-r border-gray-200 dark:border-slate-700/40 p-1.5 transition-colors group',
        inMonth ? 'bg-white dark:bg-slate-800/20' : 'bg-gray-50/60 dark:bg-slate-900/20',
        today && 'bg-purple-50/40 dark:bg-purple-900/5'
      )}
    >
      {/* Day number */}
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

      {/* Tasks */}
      <div className="space-y-0.5">
        {tasks.slice(0, 3).map((task) => {
          const colors = statusColors[task.status];
          return (
            <button
              key={task.id}
              onClick={() => onTaskClick(task)}
              className={clsx(
                'w-full text-left px-1.5 py-0.5 rounded text-[10px] lg:text-[11px] font-medium truncate transition-all',
                'border-l-2',
                priorityIndicator[task.priority] || 'border-l-transparent',
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

// Agenda row
const AgendaRow: React.FC<{
  task: Task;
  onClick: () => void;
}> = ({ task, onClick }) => {
  const colors = statusColors[task.status];
  const overdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== 'completed' && !isToday(new Date(task.dueDate));

  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-left transition-all',
        'border border-gray-100 dark:border-slate-700/30',
        'hover:shadow-md hover:border-purple-200 dark:hover:border-purple-700/30',
        'bg-white dark:bg-slate-800/30',
        'group'
      )}
    >
      {/* Status dot */}
      <div className={clsx('w-2.5 h-2.5 rounded-full flex-shrink-0', colors.dot)} />

      {/* Task info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={clsx(
            'text-sm font-semibold truncate',
            task.status === 'completed' ? 'line-through text-gray-400 dark:text-slate-500' : 'text-gray-900 dark:text-slate-100'
          )}>
            {task.title}
          </span>
          {overdue && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 flex-shrink-0">
              <AlertTriangle size={10} />
              Overdue
            </span>
          )}
        </div>
        {task.description && (
          <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{task.description}</p>
        )}
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {task.tags.length > 0 && (
          <div className="hidden lg:flex items-center gap-1">
            {task.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500 dark:bg-slate-700/50 dark:text-slate-400">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Progress */}
        <div className="hidden md:flex items-center gap-2 w-24">
          <div className="flex-1 h-1.5 bg-gray-200 dark:bg-slate-700/50 rounded-full overflow-hidden">
            <div
              className={clsx(
                'h-full rounded-full transition-all',
                task.progress >= 100 ? 'bg-emerald-500' : 'bg-purple-500'
              )}
              style={{ width: `${task.progress}%` }}
            />
          </div>
          <span className="text-[10px] font-semibold text-gray-400 dark:text-slate-500 w-7 text-right">
            {task.progress}%
          </span>
        </div>

        <PriorityBadge priority={task.priority} size="sm" />
        <StatusBadge status={task.status} size="sm" />
      </div>
    </button>
  );
};

export const CalendarPage: React.FC = () => {
  const storeTasks = useTaskStore((s) => s.tasks);
  const getTasksForUser = useTaskStore((s) => s.getTasksForUser);
  const { canViewAllTasks, getEffectiveUserId } = useUserStore();

  // Scope tasks — when "viewing as" another user, show their tasks
  const tasks = canViewAllTasks() ? storeTasks : getTasksForUser(getEffectiveUserId());
  const allTasks = tasks;

  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('month');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createDefaultDate, setCreateDefaultDate] = useState<Date | undefined>();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);

  const selectedTask = selectedTaskId ? allTasks.find((t) => t.id === selectedTaskId) ?? null : null;

  // Filter tasks
  const filteredTasks = useMemo(() => {
    if (statusFilter === 'all') return tasks;
    return tasks.filter((t) => t.status === statusFilter);
  }, [tasks, statusFilter]);

  // Tasks with due dates mapped by date string
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    filteredTasks.forEach((task) => {
      if (task.dueDate) {
        const key = format(new Date(task.dueDate), 'yyyy-MM-dd');
        const existing = map.get(key) || [];
        map.set(key, [...existing, task]);
      }
    });
    return map;
  }, [filteredTasks]);

  // Calendar grid dates for month view
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

  // Week view dates
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(currentDate);
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [currentDate]);

  // Agenda tasks — sorted by date
  const agendaTasks = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    return filteredTasks
      .filter((t) => {
        if (!t.dueDate) return false;
        const due = new Date(t.dueDate);
        return due >= monthStart && due <= monthEnd;
      })
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
  }, [filteredTasks, currentDate]);

  // Tasks without due dates
  const unscheduledTasks = useMemo(() => filteredTasks.filter((t) => !t.dueDate), [filteredTasks]);

  // Stats
  const stats = useMemo(() => {
    const monthTasks = agendaTasks;
    return {
      total: monthTasks.length,
      completed: monthTasks.filter((t) => t.status === 'completed').length,
      overdue: monthTasks.filter((t) => t.dueDate && isPast(new Date(t.dueDate)) && t.status !== 'completed' && !isToday(new Date(t.dueDate))).length,
      upcoming: monthTasks.filter((t) => t.dueDate && !isPast(new Date(t.dueDate))).length,
    };
  }, [agendaTasks]);

  const navigateMonth = (dir: 'prev' | 'next') => {
    setCurrentDate(dir === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
  };

  const goToToday = () => setCurrentDate(new Date());

  const handleAddTask = (date?: Date) => {
    setCreateDefaultDate(date);
    setShowCreateModal(true);
  };

  const getTasksForDate = (date: Date) => {
    const key = format(date, 'yyyy-MM-dd');
    return tasksByDate.get(key) || [];
  };

  // Group agenda tasks by date
  const agendaGrouped = useMemo(() => {
    const groups = new Map<string, Task[]>();
    agendaTasks.forEach((task) => {
      const key = format(new Date(task.dueDate!), 'yyyy-MM-dd');
      const existing = groups.get(key) || [];
      groups.set(key, [...existing, task]);
    });
    return Array.from(groups.entries()).map(([dateStr, tasks]) => ({
      date: new Date(dateStr),
      dateStr,
      tasks,
    }));
  }, [agendaTasks]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Calendar</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1">
            {stats.total} tasks this month • {stats.completed} completed • {stats.overdue > 0 && (
              <span className="text-red-500 dark:text-red-400 font-medium">{stats.overdue} overdue</span>
            )}
            {stats.overdue === 0 && `${stats.upcoming} upcoming`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={clsx(
              'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors',
              showFilters
                ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-700/30'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700/50'
            )}
          >
            <Filter size={16} />
            Filters
            {statusFilter !== 'all' && (
              <span className="w-2 h-2 rounded-full bg-purple-600" />
            )}
          </button>
          <div className="flex items-center gap-1 bg-gray-100 border border-gray-200 dark:bg-slate-800/50 dark:border-slate-700 rounded-lg p-1">
            {(['month', 'week', 'agenda'] as CalendarView[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={clsx(
                  'px-3 py-1.5 rounded text-xs font-semibold transition-colors capitalize',
                  view === v
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => handleAddTask()}
          className={clsx(
            'w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold',
            'bg-gradient-to-r from-purple-600 to-blue-600 text-white',
            'hover:from-purple-700 hover:to-blue-700',
            'shadow-md shadow-purple-500/20 transition-all'
          )}
        >
          <Plus size={16} />
          Add Task
        </button>
      </div>

      {/* Filters bar */}
      {showFilters && (
        <div className="flex items-center gap-2 flex-wrap p-3 bg-white dark:bg-slate-800/30 rounded-xl border border-gray-200 dark:border-slate-700/50">
          <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mr-2">Status:</span>
          {(['all', 'todo', 'in-progress', 'review', 'completed'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={clsx(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                statusFilter === s
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                  : 'text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700/50'
              )}
            >
              {s === 'all' ? (
                'All'
              ) : (
                <>
                  <span className={clsx('w-2 h-2 rounded-full', statusColors[s].dot)} />
                  {s === 'in-progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
                </>
              )}
            </button>
          ))}
          {statusFilter !== 'all' && (
            <button
              onClick={() => setStatusFilter('all')}
              className="ml-auto p-1 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* Navigation Bar */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-800/30 rounded-xl border border-gray-200 dark:border-slate-700/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
          <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
        </div>
        <button
          onClick={goToToday}
          className={clsx(
            'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
            'border border-purple-200 text-purple-600 hover:bg-purple-50',
            'dark:border-purple-700/30 dark:text-purple-400 dark:hover:bg-purple-900/20'
          )}
        >
          Today
        </button>
      </div>

      {/* Month View */}
      {view === 'month' && (
        <div className="bg-white dark:bg-slate-800/20 rounded-xl border border-gray-200 dark:border-slate-700/50 overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-200 dark:border-slate-700/40">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div
                key={day}
                className="py-2.5 text-center text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider bg-gray-50/80 dark:bg-slate-800/40"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((date) => (
              <DayCell
                key={date.toISOString()}
                date={date}
                tasks={getTasksForDate(date)}
                currentMonth={currentDate}
                onTaskClick={(task) => setSelectedTaskId(task.id)}
                onAddTask={(d) => handleAddTask(d)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Week View */}
      {view === 'week' && (
        <div className="bg-white dark:bg-slate-800/20 rounded-xl border border-gray-200 dark:border-slate-700/50 overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-200 dark:border-slate-700/40">
            {weekDays.map((date) => (
              <div
                key={date.toISOString()}
                className={clsx(
                  'py-3 text-center border-r border-gray-200 dark:border-slate-700/40 last:border-r-0',
                  isToday(date) && 'bg-purple-50/50 dark:bg-purple-900/10'
                )}
              >
                <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">{format(date, 'EEE')}</p>
                <p className={clsx(
                  'text-lg font-bold mt-0.5',
                  isToday(date) ? 'text-purple-600 dark:text-purple-400' : 'text-gray-900 dark:text-slate-100'
                )}>
                  {format(date, 'd')}
                </p>
              </div>
            ))}
          </div>

          {/* Week task columns */}
          <div className="grid grid-cols-7 min-h-[400px]">
            {weekDays.map((date) => {
              const dayTasks = getTasksForDate(date);
              return (
                <div
                  key={date.toISOString()}
                  className={clsx(
                    'border-r border-gray-200 dark:border-slate-700/40 last:border-r-0 p-2 space-y-1.5 group',
                    isToday(date) && 'bg-purple-50/30 dark:bg-purple-900/5'
                  )}
                >
                  {dayTasks.map((task) => {
                    const colors = statusColors[task.status];
                    return (
                      <button
                        key={task.id}
                        onClick={() => setSelectedTaskId(task.id)}
                        className={clsx(
                          'w-full text-left p-2 rounded-lg text-xs transition-all',
                          'border-l-2',
                          priorityIndicator[task.priority] || 'border-l-transparent',
                          colors.bg, colors.text, 'border', colors.border,
                          'hover:ring-1 hover:ring-purple-300 dark:hover:ring-purple-600'
                        )}
                      >
                        <p className="font-semibold truncate text-[11px]">{task.title}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="flex-1 h-1 bg-gray-200 dark:bg-slate-700/50 rounded-full overflow-hidden">
                            <div
                              className={clsx('h-full rounded-full', task.progress >= 100 ? 'bg-emerald-500' : 'bg-purple-500')}
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                          <span className="text-[9px] font-bold opacity-70">{task.progress}%</span>
                        </div>
                      </button>
                    );
                  })}
                  {dayTasks.length === 0 && (
                    <button
                      onClick={() => handleAddTask(date)}
                      className="w-full h-full min-h-[60px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Plus size={16} className="text-gray-300 dark:text-slate-600" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Agenda View */}
      {view === 'agenda' && (
        <div className="space-y-6">
          {agendaGrouped.length === 0 ? (
            <div className="bg-white dark:bg-slate-800/30 rounded-xl border border-gray-200 dark:border-slate-700/50 py-16 text-center">
              <CalendarIcon size={40} className="mx-auto mb-3 text-gray-300 dark:text-slate-600" />
              <p className="text-sm font-medium text-gray-500 dark:text-slate-400">No tasks scheduled this month</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Add tasks with due dates to see them here</p>
            </div>
          ) : (
            agendaGrouped.map(({ date, dateStr, tasks: dayTasks }) => {
              const today = isToday(date);
              const overdue = isPast(date) && !today;

              return (
                <div key={dateStr}>
                  {/* Date header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className={clsx(
                      'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold',
                      today
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                        : overdue
                          ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                          : 'bg-gray-100 text-gray-600 dark:bg-slate-700/50 dark:text-slate-300'
                    )}>
                      <CalendarIcon size={12} />
                      {today ? 'Today' : format(date, 'EEEE, MMM d')}
                    </div>
                    <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700/50" />
                    <span className="text-xs text-gray-400 dark:text-slate-500 font-medium">
                      {dayTasks.length} task{dayTasks.length !== 1 && 's'}
                    </span>
                  </div>

                  {/* Tasks */}
                  <div className="space-y-2 pl-2">
                    {dayTasks.map((task) => (
                      <AgendaRow
                        key={task.id}
                        task={task}
                        onClick={() => setSelectedTaskId(task.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })
          )}

          {/* Unscheduled tasks */}
          {unscheduledTasks.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-500 dark:bg-slate-700/50 dark:text-slate-400">
                  <Clock size={12} />
                  Unscheduled
                </div>
                <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700/50" />
                <span className="text-xs text-gray-400 dark:text-slate-500 font-medium">
                  {unscheduledTasks.length} task{unscheduledTasks.length !== 1 && 's'}
                </span>
              </div>
              <div className="space-y-2 pl-2">
                {unscheduledTasks.map((task) => (
                  <AgendaRow
                    key={task.id}
                    task={task}
                    onClick={() => setSelectedTaskId(task.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800/30 rounded-xl border border-gray-200 dark:border-slate-700/50 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
              <CalendarIcon size={18} className="text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">This Month</p>
              <p className="text-xl font-bold text-gray-900 dark:text-slate-100">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800/30 rounded-xl border border-gray-200 dark:border-slate-700/50 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
              <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Completed</p>
              <p className="text-xl font-bold text-gray-900 dark:text-slate-100">{stats.completed}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800/30 rounded-xl border border-gray-200 dark:border-slate-700/50 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
              <Clock size={18} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Upcoming</p>
              <p className="text-xl font-bold text-gray-900 dark:text-slate-100">{stats.upcoming}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800/30 rounded-xl border border-gray-200 dark:border-slate-700/50 p-4">
          <div className="flex items-center gap-3">
            <div className={clsx(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              stats.overdue > 0 ? 'bg-red-100 dark:bg-red-900/20' : 'bg-gray-100 dark:bg-slate-700/50'
            )}>
              <AlertTriangle size={18} className={stats.overdue > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-slate-500'} />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Overdue</p>
              <p className={clsx(
                'text-xl font-bold',
                stats.overdue > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-slate-100'
              )}>
                {stats.overdue}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); setCreateDefaultDate(undefined); }}
        defaultStatus="todo"
      />

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        isOpen={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
      />
    </div>
  );
};
