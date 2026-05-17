import React from 'react';
import clsx from 'clsx';
import { TaskPriority, TaskStatus } from '@/types/index';

interface BadgeProps {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<string, string> = {
  primary: 'bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700/30',
  secondary: 'bg-gray-100 text-gray-600 border border-gray-200 dark:bg-slate-700/50 dark:text-slate-300 dark:border-slate-600/50',
  success: 'bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/30',
  warning: 'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/30',
  danger: 'bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700/30',
  info: 'bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/30',
};

const sizeStyles: Record<string, string> = {
  sm: 'px-2 py-0.5 text-xs font-medium',
  md: 'px-3 py-1 text-sm font-medium',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'secondary',
  size = 'md',
  children,
  className,
}) => {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full whitespace-nowrap',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {children}
    </span>
  );
};

interface StatusBadgeProps {
  status: TaskStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const statusConfig: Record<TaskStatus, { label: string; variant: BadgeProps['variant'] }> = {
    'todo': { label: 'To Do', variant: 'secondary' },
    'in-progress': { label: 'In Progress', variant: 'info' },
    'review': { label: 'Review', variant: 'warning' },
    'completed': { label: 'Completed', variant: 'success' },
  };

  const { label, variant } = statusConfig[status];

  return (
    <Badge variant={variant} size={size}>
      {label}
    </Badge>
  );
};

interface PriorityBadgeProps {
  priority: TaskPriority;
  size?: 'sm' | 'md';
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, size = 'md' }) => {
  const priorityConfig: Record<TaskPriority, { label: string; variant: BadgeProps['variant'] }> = {
    'low': { label: 'Low', variant: 'secondary' },
    'medium': { label: 'Medium', variant: 'warning' },
    'high': { label: 'High', variant: 'danger' },
    'urgent': { label: 'Urgent', variant: 'danger' },
  };

  const { label, variant } = priorityConfig[priority];

  return (
    <Badge variant={variant} size={size}>
      {label}
    </Badge>
  );
};
