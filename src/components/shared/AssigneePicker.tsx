import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { X, Plus, Check } from 'lucide-react';

export interface AssigneeMember {
  id: string;
  name: string;
  avatar?: string;
  role?: string;
  title?: string;
}

interface AssigneePickerProps {
  /** Currently selected ids (the exact set). */
  selectedIds: string[];
  members: AssigneeMember[];
  onChange: (ids: string[]) => void;
  /** Compact preview text when closed, e.g. "Assign…" */
  placeholder?: string;
  /** Align dropdown left (default) or right. */
  align?: 'left' | 'right';
}

/**
 * Totally reusable multi-assignee control: closed state shows avatar stack +
 * "N people" (or the placeholder when empty); click opens a dropdown where
 * each member is a checkable chip. Used identically by project tasks and
 * board tasks so themulti-select behaviour is consistent everywhere.
 */
export const AssigneePicker: React.FC<AssigneePickerProps> = ({
  selectedIds,
  members,
  onChange,
  placeholder = 'Assign…',
  align = 'left',
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((u) => u !== id)
        : [...selectedIds, id],
    );
  };

  const selectedMembers = members.filter((m) => selectedIds.includes(m.id));

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          'inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition-colors',
          selectedIds.length === 0
            ? 'bg-white border border-dashed border-gray-300 text-gray-400 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-400 hover:border-purple-400 dark:hover:border-purple-500'
            : 'bg-purple-50 border border-purple-200 text-purple-700 dark:bg-purple-900/30 dark:border-purple-700 dark:text-purple-300 hover:border-purple-400',
        )}
        title={selectedIds.length === 0 ? 'Assign task' : `${selectedIds.length} assigned — click to change`}
      >
        {selectedIds.length === 0 ? (
          <>
            <Plus size={12} />
            {placeholder}
          </>
        ) : (
          <>
            <span className="flex items-center gap-1.5">
              <span className="flex -space-x-1.5">
                {selectedMembers.slice(0, 3).map((m) => (
                  <img
                    key={m.id}
                    src={m.avatar}
                    alt={m.name}
                    title={m.name}
                    className="w-5 h-5 rounded-full object-cover ring-2 ring-white dark:ring-slate-800 bg-gray-200 dark:bg-slate-700"
                  />
                ))}
                {selectedMembers.length > 3 && (
                  <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-[9px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-slate-800">
                    +{selectedMembers.length - 3}
                  </span>
                )}
              </span>
              <span className="flex-shrink-0">{selectedIds.length} {selectedIds.length === 1 ? 'person' : 'people'}</span>
            </span>
          </>
        )}
      </button>

      {open && (
        <div
          className={clsx(
            'absolute top-full mt-1 z-50 w-56 rounded-xl shadow-xl overflow-hidden py-1',
            'bg-white border border-gray-200 dark:bg-slate-800 dark:border-slate-700',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          <div className="px-3 py-2 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
              Assign to ({selectedIds.length})
            </span>
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[11px] font-medium text-gray-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="max-h-56 overflow-y-auto">
            {members.map((m) => {
              const isOn = selectedIds.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggle(m.id)}
                  className={clsx(
                    'w-full flex items-center gap-2 px-3 py-2 text-left transition-colors',
                    isOn ? 'bg-purple-50 dark:bg-purple-900/20' : 'hover:bg-gray-50 dark:hover:bg-slate-700/50',
                  )}
                >
                  <span
                    className={clsx(
                      'w-4.5 h-4.5 w-[18px] h-[18px] rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all',
                      isOn
                        ? 'bg-purple-600 border-purple-600 text-white dark:bg-purple-500 dark:border-purple-500'
                        : 'border-gray-300 dark:border-slate-600',
                    )}
                  >
                    {isOn && <Check size={11} />}
                  </span>
                  {m.avatar ? (
                    <img src={m.avatar} alt={m.name} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-purple-600 dark:text-purple-400">
                      {m.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-medium text-gray-800 dark:text-slate-200 truncate">{m.name}</span>
                    {m.title && (
                      <span className="block text-[10px] text-gray-400 dark:text-slate-500 truncate">{m.title}</span>
                    )}
                  </span>
                </button>
              );
            })}
            {members.length === 0 && (
              <p className="px-3 py-4 text-xs text-gray-400 dark:text-slate-500 text-center">No team members available</p>
            )}
          </div>
          <div className="border-t border-gray-100 dark:border-slate-700 px-3 py-2 flex justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-3 py-1 rounded-lg text-xs font-semibold bg-purple-600 text-white hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/** Row-level avatar stack for already-assigned multi-assignees (read-only). */
export const AssigneeAvatarStack: React.FC<{ members: AssigneeMember[]; max?: number }> = ({ members, max = 3 }) => {
  if (members.length === 0) return null;
  return (
    <span className="flex items-center gap-1.5">
      <span className="flex -space-x-1.5 items-center">
        {members.slice(0, max).map((m) => (
          <img
            key={m.id}
            src={m.avatar}
            alt={m.name}
            title={m.name}
            className="w-6 h-6 rounded-full object-cover ring-2 ring-white dark:ring-slate-800 bg-gray-200 dark:bg-slate-700"
          />
        ))}
        {members.length > max && (
          <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-slate-800">
            +{members.length - max}
          </span>
        )}
      </span>
      <span className="text-xs text-gray-600 dark:text-slate-300">
        {members.map((m) => m.name.split(' ')[0]).join(', ')}
      </span>
    </span>
  );
};
