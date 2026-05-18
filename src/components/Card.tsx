import React from 'react';
import clsx from 'clsx';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hover?: boolean;
  glass?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, hover = true, glass = true, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          'rounded-xl p-4 sm:p-6',
          glass
            ? 'bg-white border border-gray-200 shadow-sm dark:bg-slate-800/40 dark:backdrop-blur-xl dark:border-slate-700/50'
            : 'bg-white border border-gray-200 dark:bg-slate-800 dark:border-slate-700',
          hover && 'hover:shadow-md dark:hover:bg-slate-800/60 transition-all duration-300',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ title, subtitle, action }) => (
  <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-200 dark:border-slate-700/50">
    <div className="flex-1">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{title}</h3>
      {subtitle && <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{subtitle}</p>}
    </div>
    {action && <div className="ml-4">{action}</div>}
  </div>
);

interface CardContentProps {
  children: React.ReactNode;
}

export const CardContent: React.FC<CardContentProps> = ({ children }) => (
  <div className="text-gray-600 dark:text-slate-300">{children}</div>
);
