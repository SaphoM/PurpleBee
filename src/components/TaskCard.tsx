import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { Task, TaskStatus } from '@/types/index';
import { PriorityBadge } from './Badge';
import { Clock, FileText, GripVertical, ChevronDown, FolderKanban } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useTaskStore } from '@stores/taskStore';
import { useProjectStore } from '@stores/projectStore';
import { useUserStore } from '@stores/userStore';
import { MemberTooltip, MemberInfo } from './MemberTooltip';

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  isDragging?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dragHandleProps?: Record<string, any>;
}

const statusOptions: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'todo', label: 'To Do', color: 'bg-gray-400' },
  { value: 'in-progress', label: 'In Progress', color: 'bg-blue-500' },
  { value: 'review', label: 'Review', color: 'bg-amber-500' },
  { value: 'completed', label: 'Completed', color: 'bg-emerald-500' },
];

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onClick,
  isDragging,
  dragHandleProps,
}) => {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { updateTaskStatus, addCollaborator, removeCollaborator } = useTaskStore();
  const { getProjectById } = useProjectStore();
  const { assignableMembers, canViewAllTasks } = useUserStore();
  const canComplete = canViewAllTasks();
  const project = task.projectId ? getProjectById(task.projectId) : null;

  // Resolve the assigned user name from assignableMembers
  const assignee = task.assignedTo
    ? assignableMembers.find((p) => p.id === task.assignedTo)
    : null;

  const collaborators = task.collaborators || [];

  // All people on this task (assignee + collaborators)
  const allMembers: MemberInfo[] = [
    ...(assignee ? [{ id: assignee.id, name: assignee.name, avatar: assignee.avatar, role: 'owner' as const }] : []),
    ...collaborators.map((c) => ({
      id: c.userId,
      name: c.name,
      avatar: c.avatar,
      role: c.role,
      allocatedMinutes: c.allocatedMinutes,
    })),
  ];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowStatusMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInvite = (profile: typeof assignableMembers[0], role: 'helper' | 'reviewer', minutes: number) => {
    addCollaborator(task.id, {
      userId: profile.id,
      name: profile.name,
      avatar: profile.avatar,
      role,
      allocatedMinutes: minutes,
    });
  };

  const handleRemove = (userId: string) => {
    removeCollaborator(task.id, userId);
  };

  const currentStatus = statusOptions.find((s) => s.value === task.status);
  const hasAssignee = !!task.assignedTo;

  const handleChatDragStart = (e: React.DragEvent) => {
    const priorityLabel = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);
    const statusLabel = currentStatus?.label ?? task.status;
    const ref = `📋 Task: "${task.title}" [${priorityLabel} · ${statusLabel}]`;
    e.dataTransfer.setData('text/task-ref', ref);
    e.dataTransfer.setData('text/task-id', task.id);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div
      draggable
      onDragStart={handleChatDragStart}
      onClick={onClick}
      className={clsx(
        'rounded-lg p-4 transition-all duration-200 cursor-pointer group relative',
        'bg-white border border-gray-200 hover:border-gray-300 hover:shadow-md',
        'dark:bg-slate-800/50 dark:border-slate-700/50 dark:hover:border-slate-600 dark:hover:bg-slate-800/70',
        isDragging && 'shadow-2xl ring-2 ring-purple-400 dark:ring-purple-500 bg-white dark:bg-slate-800'
      )}
    >
      {/* Header Row */}
      <div className="flex items-start gap-2 mb-3">
        {/* Title & Description */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 dark:text-slate-100 group-hover:text-purple-700 dark:group-hover:text-white transition-colors truncate">
            {task.title}
          </h4>
          {task.description && (
            <p className="text-xs text-gray-500 dark:text-slate-500 line-clamp-2 mt-1">
              {task.description}
            </p>
          )}
          {project && (
            <div className="flex items-center gap-1 mt-1.5">
              <FolderKanban size={10} className="text-purple-400 dark:text-purple-500 flex-shrink-0" />
              <span className="text-[10px] font-medium text-purple-500 dark:text-purple-400 truncate">
                {project.name}
              </span>
            </div>
          )}
        </div>

        {/* Status Dropdown */}
        <div ref={menuRef} className="relative flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowStatusMenu(!showStatusMenu);
            }}
            className={clsx(
              'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
              'border transition-colors',
              task.status === 'todo' && 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-slate-700/50 dark:text-slate-300 dark:border-slate-600/50',
              task.status === 'in-progress' && 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/30',
              task.status === 'review' && 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/30',
              task.status === 'completed' && 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/30',
            )}
          >
            <span>{currentStatus?.label}</span>
            <ChevronDown size={10} className={clsx('transition-transform', showStatusMenu && 'rotate-180')} />
          </button>

          {/* Dropdown Menu */}
          {showStatusMenu && (
            <div className={clsx(
              'absolute right-0 top-full mt-1 z-50 w-40',
              'bg-white dark:bg-slate-800',
              'border border-gray-200 dark:border-slate-700',
              'rounded-lg shadow-xl overflow-hidden'
            )}>
              {statusOptions.map((option) => {
                const locked = option.value === 'completed' && !canComplete;
                return (
                  <button
                    key={option.value}
                    disabled={locked}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (locked) return;
                      updateTaskStatus(task.id, option.value);
                      setShowStatusMenu(false);
                    }}
                    title={locked ? 'Requires manager or admin approval' : undefined}
                    className={clsx(
                      'w-full px-3 py-2 text-left text-xs font-medium flex items-center gap-2',
                      'transition-colors',
                      locked
                        ? 'text-gray-300 dark:text-slate-600 cursor-not-allowed'
                        : task.status === option.value
                          ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300'
                          : 'text-gray-600 hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-700/50'
                    )}
                  >
                    <span className={clsx('w-2 h-2 rounded-full', locked ? 'bg-gray-200 dark:bg-slate-600' : option.color)} />
                    {option.label}
                    {locked
                      ? <span className="ml-auto text-[9px] text-gray-300 dark:text-slate-600">manager only</span>
                      : task.status === option.value
                        ? <span className="ml-auto text-purple-500">&check;</span>
                        : null
                    }
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Drag Handle — RBD dragHandleProps scoped here so native drags elsewhere still work */}
        <div
          {...(dragHandleProps as React.HTMLAttributes<HTMLDivElement>)}
          className="flex-shrink-0 mt-0.5 text-gray-300 dark:text-slate-600 group-hover:text-gray-400 dark:group-hover:text-slate-500 cursor-grab active:cursor-grabbing transition-colors"
        >
          <GripVertical size={16} />
        </div>
      </div>

      {/* Tags */}
      {task.tags.length > 0 && (
        <div className="flex gap-2 mb-3 flex-wrap">
          {task.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex px-2 py-1 text-xs rounded bg-gray-100 text-gray-500 dark:bg-slate-700/30 dark:text-slate-400"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Progress Bar */}
      {task.progress > 0 && (
        <div className="mb-3 h-1.5 bg-gray-200 dark:bg-slate-700/30 rounded-full overflow-hidden">
          <div
            className={clsx(
              'h-full transition-all duration-300',
              task.progress >= 100 ? 'bg-emerald-500' : 'bg-purple-500'
            )}
            style={{ width: `${task.progress}%` }}
          />
        </div>
      )}

      {/* Meta Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {task.dueDate && (
            <div
              className={clsx(
                'flex items-center gap-1 text-xs font-medium',
                new Date(task.dueDate) < new Date()
                  ? 'text-red-500 dark:text-red-400'
                  : 'text-gray-400 dark:text-slate-400'
              )}
            >
              <Clock size={14} />
              <span>
                {formatDistanceToNow(new Date(task.dueDate), {
                  addSuffix: true,
                })}
              </span>
            </div>
          )}
          {task.subtasks && task.subtasks.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-slate-400">
              <FileText size={14} />
              <span>
                {task.subtasks.filter((s) => s.completed).length}/
                {task.subtasks.length}
              </span>
            </div>
          )}
        </div>

        {/* ── Member Tooltip + Invite ── */}
        {hasAssignee && (
          <MemberTooltip
            members={allMembers}
            collaborators={collaborators}
            onInvite={handleInvite}
            onRemove={handleRemove}
            excludeIds={task.assignedTo ? [task.assignedTo] : []}
            canInvite
          />
        )}
      </div>

      {/* Priority Badge */}
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-700/30">
        <PriorityBadge priority={task.priority} size="sm" />
      </div>
    </div>
  );
};
