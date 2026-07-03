import React, { useState, useRef, useEffect, useMemo } from 'react';
import clsx from 'clsx';
import { X, Plus, Trash2, CalendarDays, Tag, FolderKanban, ChevronDown } from 'lucide-react';
import { TaskStatus, TaskPriority } from '@/types/index';
import { useTaskStore } from '@stores/taskStore';
import { useProjectStore } from '@stores/projectStore';
import { useUserStore } from '@stores/userStore';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultStatus?: TaskStatus;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  defaultStatus = 'todo',
}) => {
  const { addTask } = useTaskStore();
  const getAllProjectTaskTitles = useProjectStore((s) => s.getAllProjectTaskTitles);
  const projects = useProjectStore((s) => s.projects);
  const user = useUserStore((s) => s.user);
  const canManageTeam = useUserStore((s) => s.canManageTeam);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [subtaskInput, setSubtaskInput] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<'daily' | 'weekly' | 'biweekly' | 'monthly'>('weekly');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [showTitleDropdown, setShowTitleDropdown] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Top 3 projects by most recently updated (filtered by user assignment for members)
  const top3Projects = useMemo(() => {
    const userProjects = canManageTeam()
      ? projects
      : projects.filter((p) => p.tasks.some((t) => t.assignedTo === user?.id));
    return [...userProjects]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 3);
  }, [projects, user, canManageTeam]);

  // Project task suggestions — admins/managers see all, members see their projects
  const allProjectTasks = getAllProjectTaskTitles();
  const projectTasks = canManageTeam()
    ? allProjectTasks
    : allProjectTasks.filter((pt) => {
        const proj = projects.find((p) => p.id === pt.projectId);
        return proj?.tasks.some((t) => t.assignedTo === user?.id);
      });
  const filteredSuggestions = title.trim()
    ? projectTasks.filter((pt) =>
        pt.taskTitle.toLowerCase().includes(title.toLowerCase()) ||
        pt.projectName.toLowerCase().includes(title.toLowerCase())
      )
    : projectTasks;

  // Group suggestions by project
  const groupedSuggestions = filteredSuggestions.reduce<Record<string, typeof projectTasks>>((acc, pt) => {
    if (!acc[pt.projectId]) acc[pt.projectId] = [];
    acc[pt.projectId].push(pt);
    return acc;
  }, {});

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          titleInputRef.current && !titleInputRef.current.contains(e.target as Node)) {
        setShowTitleDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelectProjectTask = (pt: typeof projectTasks[0]) => {
    setTitle(pt.taskTitle);
    setDescription(pt.taskDescription);
    setSelectedProjectId(pt.projectId);
    setShowTitleDropdown(false);
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStatus(defaultStatus);
    setPriority('medium');
    setDueDate('');
    setEstimatedHours('');
    setTags([]);
    setTagInput('');
    setSubtasks([]);
    setSubtaskInput('');
    setIsRecurring(false);
    setRecurringFrequency('weekly');
    setSelectedProjectId('');
    setShowTitleDropdown(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    addTask({
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      priority,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      estimatedHours: estimatedHours ? Number(estimatedHours) : undefined,
      tags,
      progress: 0,
      isRecurring,
      recurringPattern: isRecurring ? { frequency: recurringFrequency } : undefined,
      subtasks: subtasks.map((s, i) => ({
        id: `sub-${i}`,
        title: s,
        completed: false,
        createdAt: new Date(),
      })),
      projectId: selectedProjectId || undefined,
    });

    resetForm();
    onClose();
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const addSubtask = () => {
    if (subtaskInput.trim()) {
      setSubtasks([...subtasks, subtaskInput.trim()]);
      setSubtaskInput('');
    }
  };

  const removeSubtask = (index: number) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />

      <div
        className={clsx(
          'relative w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto',
          'bg-white dark:bg-gradient-to-b dark:from-slate-800 dark:to-slate-900',
          'border border-gray-200 dark:border-slate-700/50 rounded-2xl',
          'shadow-2xl'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-slate-700/50 bg-white dark:bg-slate-800 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">Create New Task</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Fill in the details for your new task</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-300 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Title with project task dropdown */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
              Task Title <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                ref={titleInputRef}
                type="text"
                value={title}
                onChange={(e) => { setTitle(e.target.value); setShowTitleDropdown(true); }}
                onFocus={() => setShowTitleDropdown(true)}
                placeholder="Type or pick from project tasks..."
                className={clsx(
                  'w-full rounded-lg px-4 py-2.5 text-sm pr-10',
                  'bg-white border border-gray-300 text-gray-800 placeholder-gray-400',
                  'dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500',
                  'focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20',
                  selectedProjectId && 'border-purple-400 dark:border-purple-500'
                )}
                required
                autoFocus
              />
              {projectTasks.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowTitleDropdown(!showTitleDropdown)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300"
                >
                  <ChevronDown size={16} className={clsx('transition-transform', showTitleDropdown && 'rotate-180')} />
                </button>
              )}
            </div>

            {/* Selected project badge */}
            {selectedProjectId && (() => {
              const pt = projectTasks.find((p) => p.projectId === selectedProjectId);
              return pt ? (
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                    <FolderKanban size={10} />
                    {pt.projectIcon} {pt.projectName}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedProjectId('')}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : null;
            })()}

            {/* Project task suggestions dropdown */}
            {showTitleDropdown && projectTasks.length > 0 && (
              <div
                ref={dropdownRef}
                className={clsx(
                  'absolute top-full left-0 right-0 mt-1 z-50',
                  'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700',
                  'rounded-xl shadow-xl max-h-64 overflow-y-auto'
                )}
              >
                {/* Top 3 projects quick-pick */}
                {top3Projects.length > 0 && (
                  <div className="px-3 py-2 border-b border-gray-100 dark:border-slate-700">
                    <p className="text-[10px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <FolderKanban size={10} /> Top Projects
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {top3Projects.map((proj) => (
                        <button
                          key={proj.id}
                          type="button"
                          onClick={() => {
                            setSelectedProjectId(proj.id);
                            setShowTitleDropdown(false);
                          }}
                          className={clsx(
                            'inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium transition-colors',
                            selectedProjectId === proj.id
                              ? 'bg-purple-200 text-purple-800 dark:bg-purple-800/50 dark:text-purple-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-purple-100 hover:text-purple-700 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-purple-900/30 dark:hover:text-purple-300'
                          )}
                        >
                          <span>{proj.icon}</span>
                          {proj.name}
                        </button>
                      ))}
                      {projects.length > 3 && (
                        <span className="inline-flex items-center px-2 py-1 text-[10px] text-gray-400 dark:text-slate-500">
                          +{projects.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
                <div className="px-3 py-2 border-b border-gray-100 dark:border-slate-700">
                  <p className="text-[10px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <FolderKanban size={10} /> Project Tasks
                  </p>
                </div>
                {Object.keys(groupedSuggestions).length === 0 ? (
                  <div className="px-3 py-4 text-center text-xs text-gray-400 dark:text-slate-500">
                    No matching project tasks
                  </div>
                ) : (
                  Object.entries(groupedSuggestions).map(([projId, tasks]) => (
                    <div key={projId}>
                      <div className="px-3 py-1.5 bg-gray-50 dark:bg-slate-800/80 sticky top-0">
                        <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400">
                          {tasks[0].projectIcon} {tasks[0].projectName}
                        </span>
                      </div>
                      {tasks.map((pt) => (
                        <button
                          key={pt.taskId}
                          type="button"
                          onClick={() => handleSelectProjectTask(pt)}
                          className={clsx(
                            'w-full text-left px-3 py-2 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors',
                            'flex items-start gap-2'
                          )}
                        >
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                            style={{ backgroundColor: pt.projectColor }}
                          />
                          <div className="min-w-0">
                            <p className="text-sm text-gray-800 dark:text-slate-200 truncate">{pt.taskTitle}</p>
                            {pt.taskDescription && (
                              <p className="text-[10px] text-gray-400 dark:text-slate-500 truncate">{pt.taskDescription}</p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details about this task..."
              rows={3}
              className={clsx(
                'w-full rounded-lg px-4 py-2.5 text-sm resize-vertical',
                'bg-white border border-gray-300 text-gray-800 placeholder-gray-400',
                'dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500',
                'focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
              )}
            />
          </div>

          {/* Status & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className={clsx(
                  'w-full rounded-lg px-4 py-2.5 text-sm',
                  'bg-white border border-gray-300 text-gray-800',
                  'dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-100',
                  'focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                )}
              >
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="review">Review</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className={clsx(
                  'w-full rounded-lg px-4 py-2.5 text-sm',
                  'bg-white border border-gray-300 text-gray-800',
                  'dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-100',
                  'focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                )}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Due Date & Estimated Hours */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                <CalendarDays size={14} className="inline mr-1" /> Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={clsx(
                  'w-full rounded-lg px-4 py-2.5 text-sm',
                  'bg-white border border-gray-300 text-gray-800',
                  'dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-100',
                  'focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                )}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Estimated Hours</label>
              <input
                type="number"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                placeholder="0"
                min="0"
                step="0.5"
                className={clsx(
                  'w-full rounded-lg px-4 py-2.5 text-sm',
                  'bg-white border border-gray-300 text-gray-800 placeholder-gray-400',
                  'dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500',
                  'focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                )}
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
              <Tag size={14} className="inline mr-1" /> Tags
            </label>
            <div className="flex gap-2 mb-2 flex-wrap">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                >
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                placeholder="Type and press Enter"
                className={clsx(
                  'flex-1 rounded-lg px-4 py-2 text-sm',
                  'bg-white border border-gray-300 text-gray-800 placeholder-gray-400',
                  'dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500',
                  'focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                )}
              />
              <button
                type="button"
                onClick={addTag}
                className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300 transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Subtasks */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Subtasks</label>
            {subtasks.length > 0 && (
              <ul className="space-y-2 mb-2">
                {subtasks.map((sub, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 flex-shrink-0" />
                    <span className="flex-1">{sub}</span>
                    <button type="button" onClick={() => removeSubtask(i)} className="text-gray-400 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={subtaskInput}
                onChange={(e) => setSubtaskInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSubtask(); } }}
                placeholder="Add a subtask"
                className={clsx(
                  'flex-1 rounded-lg px-4 py-2 text-sm',
                  'bg-white border border-gray-300 text-gray-800 placeholder-gray-400',
                  'dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500',
                  'focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                )}
              />
              <button
                type="button"
                onClick={addSubtask}
                className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300 transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Recurring */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Recurring task</span>
            </label>
            {isRecurring && (
              <select
                value={recurringFrequency}
                onChange={(e) => setRecurringFrequency(e.target.value as any)}
                className={clsx(
                  'rounded-lg px-3 py-1.5 text-sm',
                  'bg-white border border-gray-300 text-gray-800',
                  'dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-100',
                  'focus:outline-none focus:border-purple-500'
                )}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-slate-700/50">
            <button
              type="button"
              onClick={() => { resetForm(); onClose(); }}
              className={clsx(
                'px-5 py-2.5 rounded-lg text-sm font-medium',
                'bg-transparent hover:bg-gray-100 text-gray-600 border border-gray-300',
                'dark:hover:bg-slate-800 dark:text-slate-300 dark:border-slate-600',
                'transition-colors'
              )}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={clsx(
                'px-5 py-2.5 rounded-lg text-sm font-medium',
                'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700',
                'text-white shadow-lg shadow-purple-500/30',
                'transition-all'
              )}
            >
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
