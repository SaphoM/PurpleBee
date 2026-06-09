import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import { Card } from '@components/Card';
import { Button } from '@components/Button';
import { KanbanBoard } from '@components/KanbanBoard';
import { TaskCard } from '@components/TaskCard';
import { CreateTaskModal } from '@components/CreateTaskModal';
import { TaskDetailModal } from '@components/TaskDetailModal';
import { Plus, Filter, Layout, List as ListIcon, Eye, Users, User } from 'lucide-react';
import { useTaskStore } from '@stores/taskStore';
import { useUIStore } from '@stores/uiStore';
import { useUserStore } from '@stores/userStore';
import { Task, TaskStatus } from '@/types/index';
import { Tip } from '@components/Tip';

export const Tasks: React.FC = () => {
  const { getSortedTasks, getTasksForUser } = useTaskStore();
  const { viewMode, setViewMode, taskOwnerFilter, setTaskOwnerFilter } = useUIStore();
  const {
    user,
    canViewAllTasks,
    canDeleteTasks,
    getEffectiveUserId,
    assignableMembers,
  } = useUserStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>('todo');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(() => {
    const hash = window.location.hash;
    const match = hash.match(/[?&]taskId=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  });
  const allTasks = useTaskStore((s) => s.tasks);

  // Default admin/manager to 'mine' on mount so their own tasks load first
  useEffect(() => {
    if (canViewAllTasks() && !['mine', 'all'].includes(taskOwnerFilter) === false) {
      // Already set — leave as-is
    }
    if (canViewAllTasks() && taskOwnerFilter === '') {
      setTaskOwnerFilter('mine');
    }
  }, []);

  useEffect(() => {
    const handle = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#tasks')) {
        const match = hash.match(/[?&]taskId=([^&]+)/);
        if (match) setSelectedTaskId(decodeURIComponent(match[1]));
      }
    };
    window.addEventListener('hashchange', handle);
    return () => window.removeEventListener('hashchange', handle);
  }, []);

  const selectedTask = selectedTaskId ? allTasks.find((t) => t.id === selectedTaskId) ?? null : null;
  const effectiveId = getEffectiveUserId();

  // Derive task list for list view (Kanban applies its own filter internally)
  const tasks: Task[] = (() => {
    if (!canViewAllTasks()) {
      return getTasksForUser(effectiveId);
    }
    if (taskOwnerFilter === 'mine') {
      return getTasksForUser(effectiveId);
    }
    if (taskOwnerFilter === 'all') {
      const all = getSortedTasks();
      // Own tasks first
      return [
        ...all.filter((t) => t.assignedTo === effectiveId),
        ...all.filter((t) => t.assignedTo !== effectiveId),
      ];
    }
    // Specific member
    return getTasksForUser(taskOwnerFilter);
  })();

  const handleNewTask = (status: TaskStatus = 'todo') => {
    setDefaultStatus(status);
    setShowCreateModal(true);
  };

  const isAdminOrManager = canViewAllTasks();

  // Label for the current filter
  const filterLabel = (() => {
    if (taskOwnerFilter === 'mine') return 'My Tasks';
    if (taskOwnerFilter === 'all') return 'All Tasks';
    const member = assignableMembers.find((m) => m.id === taskOwnerFilter);
    return member ? member.name.split(' ')[0] + "'s Tasks" : 'Tasks';
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100">Tasks</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-gray-500 dark:text-slate-400">
              {tasks.length} tasks &bull; {tasks.filter((t) => t.status === 'in-progress').length}{' '}
              in progress &bull; {tasks.filter((t) => t.status === 'completed').length} completed
            </p>
            {!isAdminOrManager && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                <Eye size={10} /> My tasks only
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Tip content="Switch between Kanban board and list view" position="bottom">
            <div className="flex items-center gap-2 bg-gray-100 border border-gray-200 dark:bg-slate-800/50 dark:border-slate-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('kanban')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'kanban'
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
                title="Kanban view"
              >
                <Layout size={18} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'list'
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
                title="List view"
              >
                <ListIcon size={18} />
              </button>
            </div>
          </Tip>
        </div>
        <div className="w-full sm:w-auto [&>*]:w-full sm:[&>*]:w-auto">
          <Tip content="Create a new task and assign it to a column" position="bottom" beacon>
            <Button icon={<Plus size={18} />} onClick={() => handleNewTask()} className="w-full sm:w-auto">
              New Task
            </Button>
          </Tip>
        </div>
      </div>

      {/* ── Task Owner Filter — admin/manager only ── */}
      {isAdminOrManager && (
        <div className="flex flex-wrap items-center gap-2">
          {/* My Tasks */}
          <button
            onClick={() => setTaskOwnerFilter('mine')}
            className={clsx(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
              taskOwnerFilter === 'mine'
                ? 'bg-purple-600 border-purple-600 text-white shadow-sm shadow-purple-500/30'
                : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:border-purple-400 dark:hover:border-purple-500'
            )}
          >
            <User size={12} />
            My Tasks
          </button>

          {/* All Tasks */}
          <button
            onClick={() => setTaskOwnerFilter('all')}
            className={clsx(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
              taskOwnerFilter === 'all'
                ? 'bg-purple-600 border-purple-600 text-white shadow-sm shadow-purple-500/30'
                : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:border-purple-400 dark:hover:border-purple-500'
            )}
          >
            <Users size={12} />
            All Tasks
          </button>

          {/* Divider */}
          {assignableMembers.filter((m) => m.id !== effectiveId).length > 0 && (
            <span className="text-gray-300 dark:text-slate-600 select-none">|</span>
          )}

          {/* Per-member pills */}
          {assignableMembers
            .filter((m) => m.id !== effectiveId)
            .map((member) => (
              <button
                key={member.id}
                onClick={() => setTaskOwnerFilter(member.id)}
                className={clsx(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                  taskOwnerFilter === member.id
                    ? 'bg-purple-600 border-purple-600 text-white shadow-sm shadow-purple-500/30'
                    : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:border-purple-400 dark:hover:border-purple-500'
                )}
              >
                <img
                  src={member.avatar}
                  alt={member.name}
                  className="w-4 h-4 rounded-full flex-shrink-0"
                />
                {member.name.split(' ')[0]}
              </button>
            ))}
        </div>
      )}

      {/* View */}
      {viewMode === 'kanban' ? (
        <div className="overflow-x-auto">
          <KanbanBoard onAddTask={handleNewTask} onTaskClick={(task) => setSelectedTaskId(task.id)} />
        </div>
      ) : (
        <Card>
          <div className="space-y-3">
            {tasks.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 dark:text-slate-500 text-lg">No tasks found</p>
                <p className="text-gray-300 dark:text-slate-600 text-sm">
                  {taskOwnerFilter === 'mine' ? 'You have no tasks yet' : 'No tasks match this filter'}
                </p>
              </div>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-slate-700/30 rounded-lg transition-colors cursor-pointer group"
                >
                  <div className="flex-1">
                    <TaskCard task={task} onClick={() => setSelectedTaskId(task.id)} />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        defaultStatus={defaultStatus}
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
