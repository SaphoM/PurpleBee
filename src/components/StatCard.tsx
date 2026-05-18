import React from 'react';
import clsx from 'clsx';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  color?: 'purple' | 'blue' | 'emerald' | 'amber' | 'red';
  subtitle?: string;
}

const colorStyles: Record<string, { light: { bg: string; icon: string }; dark: { bg: string; icon: string } }> = {
  purple: {
    light: { bg: 'bg-purple-50 border-purple-200', icon: 'text-purple-600' },
    dark: { bg: 'bg-purple-900/20 border-purple-700/30', icon: 'text-purple-500' },
  },
  blue: {
    light: { bg: 'bg-blue-50 border-blue-200', icon: 'text-blue-600' },
    dark: { bg: 'bg-blue-900/20 border-blue-700/30', icon: 'text-blue-500' },
  },
  emerald: {
    light: { bg: 'bg-emerald-50 border-emerald-200', icon: 'text-emerald-600' },
    dark: { bg: 'bg-emerald-900/20 border-emerald-700/30', icon: 'text-emerald-500' },
  },
  amber: {
    light: { bg: 'bg-amber-50 border-amber-200', icon: 'text-amber-600' },
    dark: { bg: 'bg-amber-900/20 border-amber-700/30', icon: 'text-amber-500' },
  },
  red: {
    light: { bg: 'bg-red-50 border-red-200', icon: 'text-red-600' },
    dark: { bg: 'bg-red-900/20 border-red-700/30', icon: 'text-red-500' },
  },
};

export const StatCard: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  trend,
  color = 'purple',
  subtitle,
}) => {
  const styles = colorStyles[color];

  return (
    <div
      className={clsx(
        'w-full rounded-xl border p-5 transition-all duration-300',
        'bg-white border-gray-200 shadow-sm hover:shadow-md',
        'dark:bg-slate-800/50 dark:border-slate-700/50 dark:backdrop-blur-sm dark:hover:shadow-lg dark:hover:shadow-black/20'
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-1">{label}</p>
          <h3 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-2">{value}</h3>
          {subtitle && <p className="text-xs text-gray-400 dark:text-slate-500">{subtitle}</p>}
        </div>
        <div className={clsx('p-3 rounded-lg border', styles.light.bg, `dark:${styles.dark.bg}`)}>
          <div className={clsx(styles.light.icon, `dark:${styles.dark.icon}`)}>{icon}</div>
        </div>
      </div>

      {trend && (
        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-slate-700/50 flex items-center gap-2">
          {trend.direction === 'up' ? (
            <>
              <TrendingUp size={16} className="text-emerald-500" />
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                {trend.value}% increase
              </span>
            </>
          ) : (
            <>
              <TrendingDown size={16} className="text-red-500" />
              <span className="text-sm font-medium text-red-600 dark:text-red-400">
                {trend.value}% decrease
              </span>
            </>
          )}
          <span className="text-xs text-gray-400 dark:text-slate-500 ml-auto">vs last week</span>
        </div>
      )}
    </div>
  );
};
