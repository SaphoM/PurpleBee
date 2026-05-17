import React, { useState, useEffect } from 'react';
import { Card } from '@components/Card';
import { Button } from '@components/Button';
import { KanbanBoard } from '@components/KanbanBoard';
import { TaskCard } from '@components/TaskCard';
import { CreateTaskModal } from '@components/CreateTaskModal';
import { TaskDetailModal } from '@components/TaskDetailModal';
import { Plus, Filter, Layout, List as ListIcon, Shield, Eye } from 'lucide-react';
import { useTaskStore } from '@stores/taskStore';
import { useUIStore } from '@stores/uiStore';
import { useUserStore } from '@stores/userStore';
import { Task, TaskStatus } from '@/types/index';
import { Tip } from '@components/Tip';

export const Tasks: React.FC = () => {
  const { getSortedTasks, getTasksForUser } = useTaskStore();
  const { viewMode, setViewMode } = useUIStore();
  const { user, canViewAllTasks, canDeleteTasks, getEffectiveUserId } = useUserStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>('todo');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(() => {
    const hash = window.location.hash;
    const match = hash.match(/[?&]taskId=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  });
  const allTasks = useTaskStore((s) => s.tasks);

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

  // Scope tasks — when "viewing as" another user, show their tasks
  const tasks = canViewAllTasks() ? getSortedTasks() : getTasksForUser(getEffectiveUserId());

  const handleNewTask = (status: TaskStatus = 'todo') => {
    setDefaultStatus(status);
    setShowCreateModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Tasks</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-gray-500 dark:text-slate-400">
              {tasks.length} tasks • {tasks.filter((t) => t.status === 'in-progress').length}{' '}
              in progress • {tasks.filter((t) => t.status === 'completed').length}{' '}
              completed
            </p>
            {!canViewAllTasks() && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                <Eye size={10} /> My tasks only
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" icon={<Filter size={18} />}>
            Filters
          </Button>
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
          <Tip content="Create a new task and assign it to a column" position="bottom" beacon>
            <Button icon={<Plus size={18} />} onClick={() => handleNewTask()}>
              New Task
            </Button>
          </Tip>
        </div>
      </div>

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
                <p className="text-gray-300 dark:text-slate-600 text-sm">Create a new task to get started</p>
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
