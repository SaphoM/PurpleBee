import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string | number;
  label: string;
  icon?: React.ReactNode;
}

interface SelectProps {
  label?: string;
  options: SelectOption[];
  value?: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  error?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  error,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="w-full relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
          {label}
        </label>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'w-full rounded-lg',
          'bg-white border border-gray-300 text-gray-800',
          'dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-100',
          'px-4 py-2.5 text-left',
          'focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20',
          'transition-all duration-200',
          'flex items-center justify-between',
          error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
        )}
      >
        <span className={selectedOption ? 'text-gray-800 dark:text-slate-100' : 'text-gray-400 dark:text-slate-500'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={18}
          className={clsx(
            'text-gray-400 dark:text-slate-500 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 dark:bg-slate-800 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={clsx(
                'w-full px-4 py-2.5 text-left text-sm',
                'flex items-center gap-2',
                'transition-colors duration-150',
                value === option.value
                  ? 'bg-purple-50 text-purple-700 border-l-2 border-purple-600 dark:bg-purple-600/20 dark:text-purple-300'
                  : 'text-gray-600 hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-700/50'
              )}
            >
              {option.icon && <span>{option.icon}</span>}
              {option.label}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
};
