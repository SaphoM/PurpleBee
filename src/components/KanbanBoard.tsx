import React, { useState } from 'react';
import clsx from 'clsx';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { TaskStatus, Task } from '@/types/index';
import { TaskCard } from './TaskCard';
import { Plus, MoreVertical, ChevronDown } from 'lucide-react';
import { useTaskStore } from '@stores/taskStore';
import { useUserStore } from '@stores/userStore';
import { useUIStore } from '@stores/uiStore';

const statusConfig: Record<TaskStatus, { label: string; color: string }> = {
  'todo': { label: 'To Do', color: 'slate' },
  'in-progress': { label: 'In Progress', color: 'blue' },
  'review': { label: 'Review', color: 'amber' },
  'completed': { label: 'Completed', color: 'emerald' },
};

const statusOrder: TaskStatus[] = ['todo', 'in-progress', 'review', 'completed'];

const statusColorMap: Record<string, string> = {
  slate: 'bg-gray-500',
  blue: 'bg-blue-500',
  amber: 'bg-amber-500',
  emerald: 'bg-emerald-500',
};

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onAddTask: () => void;
  onTaskClick?: (task: Task) => void;
  /** When true, renders a collapsible mobile-style column */
  mobile?: boolean;
  defaultOpen?: boolean;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  status,
  tasks,
  onAddTask,
  onTaskClick,
  mobile = false,
  defaultOpen = false,
}) => {
  const config = statusConfig[status];
  const [open, setOpen] = useState(defaultOpen);

  if (mobile) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-slate-700/50 overflow-hidden">
        {/* Collapsible header */}
        <button
          onClick={() => setOpen(!open)}
          className={clsx(
            'w-full flex items-center justify-between px-4 py-3',
            'bg-gray-50 dark:bg-slate-800/50',
            'transition-colors'
          )}
        >
          <div className="flex items-center gap-3">
            <span className={clsx('w-2.5 h-2.5 rounded-full', statusColorMap[config.color])} />
            <h3 className="font-semibold text-gray-900 dark:text-slate-100 text-sm">{config.label}</h3>
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold bg-gray-200 text-gray-600 dark:bg-slate-700 dark:text-slate-300">
              {tasks.length}
            </span>
          </div>
          <ChevronDown size={18} className={clsx('text-gray-400 transition-transform', open && 'rotate-180')} />
        </button>

        {/* Cards */}
        {open && (
          <div className="p-3 space-y-3">
            {tasks.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-gray-400 dark:text-slate-500">No tasks</p>
              </div>
            ) : (
              tasks.map((task) => (
                <TaskCard key={task.id} task={task} onClick={() => onTaskClick?.(task)} />
              ))
            )}
            <button
              onClick={onAddTask}
              className={clsx(
                'w-full flex items-center justify-center gap-2 py-2.5 rounded-lg',
                'border border-dashed border-gray-300 text-gray-400',
                'hover:border-gray-400 hover:text-gray-500 hover:bg-gray-50',
                'dark:border-slate-600 dark:text-slate-400 dark:hover:border-slate-500',
                'transition-all duration-200 text-sm'
              )}
            >
              <Plus size={16} />
              Add Task
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-[300px] flex flex-col">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-gray-900 dark:text-slate-100">{config.label}</h3>
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold bg-gray-200 text-gray-600 dark:bg-slate-700 dark:text-slate-300">
            {tasks.length}
          </span>
        </div>
        <button className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded transition-colors text-gray-400 dark:text-slate-400">
          <MoreVertical size={16} />
        </button>
      </div>

      {/* Droppable Column */}
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={clsx(
              'flex-1 space-y-3 pb-4 min-h-[500px] rounded-lg p-3 transition-colors duration-200',
              snapshot.isDraggingOver
                ? 'bg-purple-50/50 dark:bg-purple-900/10 ring-2 ring-purple-300 dark:ring-purple-700 ring-dashed'
                : 'bg-gray-100/50 dark:bg-slate-800/20'
            )}
          >
            {tasks.length === 0 && !snapshot.isDraggingOver ? (
              <div className="h-32 flex flex-col items-center justify-center text-center">
                <div className="text-gray-400 dark:text-slate-500 mb-3 text-4xl">📭</div>
                <p className="text-sm text-gray-400 dark:text-slate-500">No tasks yet</p>
              </div>
            ) : null}

            {tasks.map((task, index) => (
              <Draggable key={task.id} draggableId={task.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    style={provided.draggableProps.style}
                    className={clsx(
                      snapshot.isDragging && 'rotate-2 shadow-2xl'
                    )}
                  >
                    <TaskCard
                      task={task}
                      isDragging={snapshot.isDragging}
                      onClick={() => onTaskClick?.(task)}
                      dragHandleProps={provided.dragHandleProps as Record<string, any> ?? undefined}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}

            {/* Add Task Button */}
            <button
              onClick={onAddTask}
              className={clsx(
                'w-full mt-4 flex items-center justify-center gap-2',
                'py-3 rounded-lg',
                'border border-dashed',
                'border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-500 hover:bg-gray-50',
                'dark:border-slate-600 dark:text-slate-400 dark:hover:border-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-800/30',
                'transition-all duration-200'
              )}
            >
              <Plus size={18} />
              <span className="text-sm font-medium">Add Task</span>
            </button>
          </div>
        )}
      </Droppable>
    </div>
  );
};

interface KanbanBoardProps {
  onAddTask?: (status: TaskStatus) => void;
  onTaskClick?: (task: Task) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ onAddTask, onTaskClick }) => {
  const { getTasksByStatus, getTasksForUser, moveTask } = useTaskStore();
  const { canViewAllTasks, getEffectiveUserId } = useUserStore();
  const globalSearchQuery = useUIStore((s) => s.globalSearchQuery);
  const taskOwnerFilter = useUIStore((s) => s.taskOwnerFilter);

  const getColumnTasks = (status: TaskStatus) => {
    const effectiveId = getEffectiveUserId();

    // Start with the correct task pool
    let tasks: ReturnType<typeof getTasksByStatus>;

    if (!canViewAllTasks()) {
      // Regular members always see only their own tasks
      tasks = getTasksForUser(effectiveId).filter((t) => t.status === status);
    } else if (taskOwnerFilter === 'all') {
      // Admin/manager chose "All Tasks" — show everything, own tasks first
      const all = getTasksByStatus(status);
      tasks = [
        ...all.filter((t) => t.assignedTo === effectiveId),
        ...all.filter((t) => t.assignedTo !== effectiveId),
      ];
    } else if (taskOwnerFilter === 'mine') {
      // Admin/manager default — only their own tasks
      tasks = getTasksForUser(effectiveId).filter((t) => t.status === status);
    } else {
      // Specific team member selected
      tasks = getTasksForUser(taskOwnerFilter).filter((t) => t.status === status);
    }

    // Apply global search on top
    if (globalSearchQuery.trim()) {
      const q = globalSearchQuery.toLowerCase();
      tasks = tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.tags?.some((tag) => tag.toLowerCase().includes(q))
      );
    }

    return tasks;
  };

  const handleAddTask = (status: TaskStatus) => {
    if (onAddTask) {
      onAddTask(status);
    }
  };

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    moveTask(
      draggableId,
      destination.droppableId as TaskStatus,
      destination.index
    );
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      {/* Mobile: stacked collapsible columns */}
      <div className="flex flex-col gap-3 lg:hidden">
        {statusOrder.map((status, i) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={getColumnTasks(status)}
            onAddTask={() => handleAddTask(status)}
            onTaskClick={onTaskClick}
            mobile
            defaultOpen={i === 0}
          />
        ))}
      </div>

      {/* Desktop: horizontal drag-and-drop columns */}
      <div className="hidden lg:flex gap-6 overflow-x-auto pb-6">
        {statusOrder.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={getColumnTasks(status)}
            onAddTask={() => handleAddTask(status)}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>
    </DragDropContext>
  );
};
