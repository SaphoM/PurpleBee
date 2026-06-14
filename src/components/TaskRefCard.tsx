import React from 'react';
import clsx from 'clsx';
import { CheckSquare } from 'lucide-react';
import { TaskRef } from '@/types/index';

interface TaskRefCardProps {
  taskRef: TaskRef;
  isMe: boolean;
}

const STATUS_LABEL: Record<string, string> = {
  todo: 'To Do',
  'in-progress': 'In Progress',
  review: 'Review',
  completed: 'Completed',
};

const STATUS_CLASS: Record<string, string> = {
  todo: 'bg-gray-200 text-gray-600 dark:bg-slate-700 dark:text-slate-300',
  'in-progress': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  review: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};

const PRIORITY_CLASS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const TaskRefCard: React.FC<TaskRefCardProps> = ({ taskRef, isMe }) => (
  <div className={clsx(
    'px-2.5 pt-2 pb-1.5',
    isMe
      ? 'mb-1.5 bg-gradient-to-r from-emerald-500 to-transparent'
      : 'border-b border-emerald-100 dark:border-emerald-900/40 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-900'
  )}>
    {/* Header */}
    <div className={clsx(
      'text-[9px] font-semibold uppercase tracking-wide flex items-center gap-1 mb-1',
      isMe ? 'text-purple-200' : 'text-purple-500 dark:text-purple-400'
    )}>
      <CheckSquare size={9} /> Task
    </div>

    {/* Title */}
    <p className={clsx(
      'text-[11px] font-bold truncate leading-snug',
      isMe ? 'text-white' : 'text-gray-900 dark:text-slate-100'
    )}>
      {taskRef.title}
    </p>

    {/* Project name */}
    {taskRef.projectName && (
      <p className={clsx(
        'text-[9px] truncate mt-0.5',
        isMe ? 'text-purple-200' : 'text-purple-500 dark:text-purple-400'
      )}>
        {taskRef.projectName}
      </p>
    )}

    {/* Badges row */}
    <div className="flex items-center gap-1 mt-1 flex-wrap">
      <span className={clsx(
        'text-[9px] font-medium px-1.5 py-0.5 rounded-full',
        isMe ? 'bg-white/20 text-white' : (STATUS_CLASS[taskRef.status] ?? 'bg-gray-200 text-gray-600')
      )}>
        {STATUS_LABEL[taskRef.status] ?? taskRef.status}
      </span>
      <span className={clsx(
        'text-[9px] font-medium px-1.5 py-0.5 rounded-full',
        isMe ? 'bg-white/20 text-white' : (PRIORITY_CLASS[taskRef.priority] ?? 'bg-gray-100 text-gray-500')
      )}>
        {taskRef.priority.charAt(0).toUpperCase() + taskRef.priority.slice(1)}
      </span>
      {taskRef.subtasksTotal > 0 && (
        <span className={clsx(
          'text-[9px]',
          isMe ? 'text-purple-200' : 'text-gray-400 dark:text-slate-500'
        )}>
          {taskRef.subtasksCompleted}/{taskRef.subtasksTotal}
        </span>
      )}
    </div>

    {/* Progress bar */}
    {taskRef.progress > 0 && (
      <div className="mt-1.5 h-1 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
        <div
          className={clsx(
            'h-full rounded-full',
            isMe ? 'bg-white/70' : (taskRef.progress >= 100 ? 'bg-emerald-500' : 'bg-purple-500')
          )}
          style={{ width: `${taskRef.progress}%` }}
        />
      </div>
    )}
  </div>
);

export default TaskRefCard;
