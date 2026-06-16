import React, { useState, useRef } from 'react';
import clsx from 'clsx';
import { Task, TaskStatus, TaskPriority, Subtask, Attachment, TaskLink, ProgressNote } from '@/types/index';
import { PriorityBadge } from './Badge';
import {
  X,
  Clock,
  Users,
  CalendarDays,
  Tag,
  Timer,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Trash2,
  Edit3,
  Save,
  BarChart3,
  RefreshCw,
  SlidersHorizontal,
  ListChecks,
  Zap,
  Eye,
  EyeOff,
  Plus,
  Settings2,
  Info,
  Paperclip,
  Link2,
  Upload,
  ExternalLink,
  File,
  FileImage,
  FileVideo,
  Download,
  MessageSquare,
  Send,
  StickyNote,
  ChevronDown,
  ChevronUp,
  FolderKanban,
} from 'lucide-react';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { useTaskStore } from '@stores/taskStore';
import { useProjectStore } from '@stores/projectStore';
import { useUserStore } from '@stores/userStore';
import { v4 as uuidv4 } from 'uuid';

interface TaskDetailModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
}

const statusConfig: { value: TaskStatus; label: string; color: string; bg: string }[] = [
  { value: 'todo', label: 'To Do', color: 'text-gray-600 dark:text-slate-300', bg: 'bg-gray-100 dark:bg-slate-700/50' },
  { value: 'in-progress', label: 'In Progress', color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  { value: 'review', label: 'Review', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  { value: 'completed', label: 'Completed', color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
];

const SubtaskText: React.FC<{ completed: boolean; title: string; reveal?: boolean }> = ({ completed, title, reveal }) => {
  if (!completed) {
    return <span className="text-sm flex-1 text-gray-700 dark:text-slate-300">{title}</span>;
  }
  return (
    <span
      className={clsx(
        'text-sm flex-1 transition-all duration-150 select-none',
        reveal ? 'text-gray-700 dark:text-slate-300' : 'line-through text-gray-400 dark:text-slate-500'
      )}
    >
      {title}
    </span>
  );
};

const SubtaskItem: React.FC<{
  subtask: { id: string; title: string; description?: string; completed: boolean };
  onToggle: () => void;
  onRemove: (e: React.MouseEvent) => void;
}> = ({ subtask, onToggle, onRemove }) => {
  const [reveal, setReveal] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startReveal = () => {
    if (!subtask.completed) return;
    timerRef.current = setTimeout(() => setReveal(true), 400);
  };
  const endReveal = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    setReveal(false);
  };

  return (
    <button
      onClick={onToggle}
      onMouseEnter={() => subtask.completed && setReveal(true)}
      onMouseLeave={endReveal}
      onTouchStart={startReveal}
      onTouchEnd={endReveal}
      title={subtask.completed ? 'Hover or hold to read' : undefined}
      className={clsx(
        'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left',
        'transition-all duration-200',
        subtask.completed
          ? 'bg-emerald-50 dark:bg-emerald-900/10'
          : 'bg-white hover:bg-gray-100 dark:bg-slate-800/50 dark:hover:bg-slate-700/50'
      )}
    >
      {subtask.completed ? (
        <CheckCircle2 size={16} className="text-emerald-500 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
      ) : (
        <Circle size={16} className="text-gray-300 dark:text-slate-600 flex-shrink-0 mt-0.5" />
      )}
      <div className="flex-1 min-w-0">
        <SubtaskText completed={subtask.completed} title={subtask.title} reveal={reveal} />
        {subtask.description && (
          <p className={clsx(
            'text-xs mt-0.5 truncate',
            subtask.completed
              ? 'text-emerald-500/70 dark:text-emerald-400/60'
              : 'text-gray-400 dark:text-slate-500'
          )}>
            {subtask.description}
          </p>
        )}
      </div>
      <span
        role="button"
        tabIndex={0}
        onClick={onRemove}
        onKeyDown={(e) => e.key === 'Enter' && onRemove(e as unknown as React.MouseEvent)}
        className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 transition-all cursor-pointer"
      >
        <X size={12} />
      </span>
    </button>
  );
};

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  isOpen,
  onClose,
}) => {
  const { updateTask, deleteTask } = useTaskStore();
  const { getProjectById } = useProjectStore();
  const { assignableMembers, user } = useUserStore();
  const canComplete = user?.role === 'admin' || user?.role === 'manager';
  const project = task?.projectId ? getProjectById(task.projectId) : null;

  // Resolve assignee: check assignableMembers first, fall back to current user if id matches
  const assignee = task?.assignedTo
    ? assignableMembers.find((m) => m.id === task.assignedTo) ??
      (user?.id === task.assignedTo ? { name: user.name, avatar: user.avatar } : null)
    : null;
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Progress tracking method visibility
  const [showSlider, setShowSlider] = useState(true);
  const [showMiniTasks, setShowMiniTasks] = useState(true);
  const [showQuickSet, setShowQuickSet] = useState(true);
  const [showProgressSettings, setShowProgressSettings] = useState(false);
  const [showInfoGuide, setShowInfoGuide] = useState(false);
  const [newMiniTaskInput, setNewMiniTaskInput] = useState('');
  const [newMiniTaskDescription, setNewMiniTaskDescription] = useState('');
  const [showAddLink, setShowAddLink] = useState(false);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [showAttachments, setShowAttachments] = useState(false);
  const [attachmentTrigger, setAttachmentTrigger] = useState<string>('');
  const [noteInput, setNoteInput] = useState('');
  const [showAllNotes, setShowAllNotes] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const noteInputRef = React.useRef<HTMLInputElement>(null);

  if (!isOpen || !task) return null;

  const currentStatus = statusConfig.find((s) => s.value === task.status);
  const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== 'completed';
  const subtasksCompleted = task.subtasks?.filter((s) => s.completed).length ?? 0;
  const subtasksTotal = task.subtasks?.length ?? 0;

  // Derive task status from progress percentage.
  // Regular members cap at 'review' — only admin/manager can mark completed.
  const getStatusFromProgress = (progress: number): TaskStatus => {
    if (progress === 0) return 'todo';
    if (progress >= 100) return canComplete ? 'completed' : 'review';
    if (progress >= 75) return 'review';
    return 'in-progress';
  };

  // Central progress update — always syncs status
  const setProgress = (newProgress: number, trigger?: string) => {
    const clamped = Math.max(0, Math.min(100, newProgress));
    updateTask(task.id, {
      progress: clamped,
      status: getStatusFromProgress(clamped),
    });
    if (trigger) {
      setAttachmentTrigger(trigger);
      setShowAttachments(true);
    }
  };

  // Calculate progress from subtasks and sync
  const syncProgressFromSubtasks = (subtasks: Subtask[]) => {
    if (subtasks.length === 0) return;
    const completed = subtasks.filter((s) => s.completed).length;
    const newProgress = Math.round((completed / subtasks.length) * 100);
    return {
      progress: newProgress,
      status: getStatusFromProgress(newProgress),
    };
  };

  const handleStartEdit = () => {
    setEditTitle(task.title);
    setEditDescription(task.description || '');
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    updateTask(task.id, {
      title: editTitle.trim() || task.title,
      description: editDescription.trim() || undefined,
    });
    setIsEditing(false);
  };

  const handleStatusChange = (newStatus: TaskStatus) => {
    // Regular members cannot mark a task completed — requires manager/admin approval
    if (newStatus === 'completed' && !canComplete) return;
    let progress = task.progress;
    if (newStatus === 'completed') progress = 100;
    else if (newStatus === 'todo') progress = 0;
    else if (newStatus === 'review' && task.progress < 75) progress = 75;
    else if (newStatus === 'in-progress' && task.progress === 0) progress = 10;
    updateTask(task.id, { status: newStatus, progress });
  };

  const handlePriorityChange = (newPriority: TaskPriority) => {
    updateTask(task.id, { priority: newPriority });
  };

  const handleToggleSubtask = (subtaskId: string) => {
    if (!task.subtasks) return;
    const updatedSubtasks = task.subtasks.map((s) =>
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    );
    const progressUpdate = syncProgressFromSubtasks(updatedSubtasks);
    updateTask(task.id, {
      subtasks: updatedSubtasks,
      ...progressUpdate,
    });
    const toggled = updatedSubtasks.find((s) => s.id === subtaskId);
    setAttachmentTrigger(`mini-task: ${toggled?.title || 'task'}`);
    setShowAttachments(true);
  };

  const handleAddMiniTask = () => {
    const title = newMiniTaskInput.trim();
    if (!title) return;
    const newSubtask: Subtask = {
      id: uuidv4(),
      title,
      description: newMiniTaskDescription.trim() || undefined,
      completed: false,
      createdAt: new Date(),
    };
    const updatedSubtasks = [...(task.subtasks || []), newSubtask];
    const progressUpdate = syncProgressFromSubtasks(updatedSubtasks);
    updateTask(task.id, {
      subtasks: updatedSubtasks,
      ...progressUpdate,
    });
    setNewMiniTaskInput('');
    setNewMiniTaskDescription('');
  };

  const handleRemoveSubtask = (subtaskId: string) => {
    if (!task.subtasks) return;
    const updatedSubtasks = task.subtasks.filter((s) => s.id !== subtaskId);
    const updates: Partial<Task> = { subtasks: updatedSubtasks };
    if (updatedSubtasks.length > 0) {
      Object.assign(updates, syncProgressFromSubtasks(updatedSubtasks));
    }
    updateTask(task.id, updates);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newAttachments: Attachment[] = Array.from(files).map((file) => ({
      id: uuidv4(),
      name: file.name,
      url: URL.createObjectURL(file),
      type: file.type,
      size: file.size,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      uploadedAt: new Date(),
    }));
    updateTask(task.id, {
      attachments: [...(task.attachments || []), ...newAttachments],
    });
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    updateTask(task.id, {
      attachments: (task.attachments || []).filter((a) => a.id !== attachmentId),
    });
  };

  const handleAddLink = () => {
    if (!linkUrl.trim()) return;
    const newLink: TaskLink = {
      id: uuidv4(),
      title: linkTitle.trim() || linkUrl.trim(),
      url: linkUrl.trim().startsWith('http') ? linkUrl.trim() : `https://${linkUrl.trim()}`,
      type: detectLinkType(linkUrl.trim()),
      addedAt: new Date(),
    };
    updateTask(task.id, {
      links: [...(task.links || []), newLink],
    });
    setLinkTitle('');
    setLinkUrl('');
    setShowAddLink(false);
  };

  const handleRemoveLink = (linkId: string) => {
    updateTask(task.id, {
      links: (task.links || []).filter((l) => l.id !== linkId),
    });
  };

  const handleAddNote = () => {
    const text = noteInput.trim();
    if (!text) return;
    const newNote: ProgressNote = {
      id: uuidv4(),
      text,
      progress: task.progress,
      trigger: attachmentTrigger || 'manual',
      createdAt: new Date(),
    };
    updateTask(task.id, {
      progressNotes: [newNote, ...(task.progressNotes || [])],
    });
    setNoteInput('');
  };

  const handleRemoveNote = (noteId: string) => {
    updateTask(task.id, {
      progressNotes: (task.progressNotes || []).filter((n) => n.id !== noteId),
    });
  };

  const getTriggerIcon = (trigger: string) => {
    if (trigger.startsWith('mini-task')) return <ListChecks size={10} className="text-emerald-500" />;
    if (trigger.startsWith('quick-set')) return <Zap size={10} className="text-amber-500" />;
    if (trigger === 'slider') return <SlidersHorizontal size={10} className="text-purple-500" />;
    if (trigger === 'drag') return <BarChart3 size={10} className="text-blue-500" />;
    return <StickyNote size={10} className="text-gray-400 dark:text-slate-500" />;
  };

  const detectLinkType = (url: string): TaskLink['type'] => {
    if (url.includes('figma.com')) return 'figma';
    if (url.includes('github.com')) return 'github';
    if (url.includes('notion.so') || url.includes('notion.site')) return 'notion';
    if (url.includes('docs.google.com')) return 'google-doc';
    return 'link';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <FileImage size={18} className="text-purple-500" />;
    if (type.startsWith('video/')) return <FileVideo size={18} className="text-blue-500" />;
    return <File size={18} className="text-gray-500 dark:text-slate-400" />;
  };

  const getLinkIcon = (type: TaskLink['type']) => {
    switch (type) {
      case 'figma': return <span className="text-sm">🎨</span>;
      case 'github': return <span className="text-sm">🐙</span>;
      case 'notion': return <span className="text-sm">📝</span>;
      case 'google-doc': return <span className="text-sm">📄</span>;
      default: return <Link2 size={14} className="text-blue-500" />;
    }
  };

  const handleDelete = () => {
    deleteTask(task.id);
    setShowDeleteConfirm(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />

      <div
        className={clsx(
          'relative w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto',
          'bg-white dark:bg-gradient-to-b dark:from-slate-800 dark:to-slate-900',
          'border border-gray-200 dark:border-slate-700/50 rounded-2xl',
          'shadow-2xl'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Status Bar at Top */}
        <div
          className={clsx(
            'h-1.5 rounded-t-2xl',
            task.status === 'todo' && 'bg-gray-300 dark:bg-slate-600',
            task.status === 'in-progress' && 'bg-blue-500',
            task.status === 'review' && 'bg-amber-500',
            task.status === 'completed' && 'bg-emerald-500',
          )}
        />

        {/* Header */}
        <div className="flex items-start justify-between p-4 sm:p-6 pb-4">
          <div className="flex-1 min-w-0 pr-4">
            {isEditing ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className={clsx(
                  'w-full text-xl font-bold rounded-lg px-3 py-2',
                  'bg-gray-50 border border-gray-300 text-gray-900',
                  'dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-100',
                  'focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                )}
                autoFocus
              />
            ) : (
              <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">
                {task.title}
              </h2>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span
                className={clsx(
                  'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold',
                  currentStatus?.bg,
                  currentStatus?.color
                )}
              >
                {currentStatus?.label}
              </span>
              <PriorityBadge priority={task.priority} size="sm" />
              {isOverdue && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                  <AlertTriangle size={12} />
                  Overdue
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {isEditing ? (
              <button
                onClick={handleSaveEdit}
                className="p-2 rounded-lg bg-purple-100 text-purple-600 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50 transition-colors"
                title="Save changes"
              >
                <Save size={18} />
              </button>
            ) : (
              <button
                onClick={handleStartEdit}
                className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-300 transition-colors"
                title="Edit task"
              >
                <Edit3 size={18} />
              </button>
            )}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 dark:text-slate-400 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
              title="Delete task"
            >
              <Trash2 size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 sm:px-6 pb-6 space-y-6">
          {/* Description */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Description
            </h3>
            {isEditing ? (
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={4}
                className={clsx(
                  'w-full rounded-lg px-4 py-3 text-sm resize-vertical',
                  'bg-gray-50 border border-gray-300 text-gray-800',
                  'dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-100',
                  'focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                )}
              />
            ) : (
              <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                {task.description || 'No description provided.'}
              </p>
            )}
          </div>

          {/* Progress Section */}
          <div className="bg-gray-50/50 dark:bg-slate-800/30 rounded-xl p-5 border border-gray-100 dark:border-slate-700/30">
            {/* Header with info & settings toggles */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 size={14} />
                Progress
              </h3>
              <div className="flex items-center gap-1.5">
                <span className={clsx(
                  'text-sm font-bold',
                  task.progress >= 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-purple-600 dark:text-purple-400'
                )}>
                  {task.progress}%
                </span>
                <button
                  onClick={() => { setShowInfoGuide(!showInfoGuide); setShowProgressSettings(false); }}
                  className={clsx(
                    'p-1.5 rounded-lg transition-colors',
                    showInfoGuide
                      ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300'
                  )}
                  title="How progress works"
                >
                  <Info size={14} />
                </button>
                <button
                  onClick={() => { setShowProgressSettings(!showProgressSettings); setShowInfoGuide(false); }}
                  className={clsx(
                    'p-1.5 rounded-lg transition-colors',
                    showProgressSettings
                      ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                      : 'text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300'
                  )}
                  title="Configure progress tracking"
                >
                  <Settings2 size={14} />
                </button>
              </div>
            </div>

            {/* Main progress bar — always draggable */}
            <div className="relative mb-4">
              {/* Visual bar behind the slider */}
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-3 bg-gray-200 dark:bg-slate-700/50 rounded-full overflow-hidden pointer-events-none">
                <div
                  className={clsx(
                    'h-full rounded-full transition-all duration-300',
                    task.progress >= 100
                      ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                      : 'bg-gradient-to-r from-purple-500 to-blue-500'
                  )}
                  style={{ width: `${task.progress}%` }}
                />
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={task.progress}
                onChange={(e) => setProgress(Number(e.target.value), 'drag')}
                className="relative w-full h-3 appearance-none bg-transparent cursor-pointer z-10 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-600 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-purple-600 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-grab [&::-webkit-slider-runnable-track]:bg-transparent [&::-moz-range-track]:bg-transparent"
              />
            </div>

            {/* Status threshold guide — only shown via info button */}
            {showInfoGuide && (
              <div className="mb-4 p-3 bg-white dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-slate-700/50">
                <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Progress auto-moves tasks between columns
                </p>
                <div className="flex items-center gap-0 text-xs">
                  <div className="flex-1 text-center py-1.5 rounded-l-lg bg-gray-100 dark:bg-slate-700/50 text-gray-500 dark:text-slate-400 font-medium border border-gray-200 dark:border-slate-600/50">
                    To Do<span className="block text-[10px] opacity-60">0%</span>
                  </div>
                  <div className="flex-1 text-center py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium border-y border-blue-200 dark:border-blue-700/30">
                    In Progress<span className="block text-[10px] opacity-60">1–74%</span>
                  </div>
                  <div className="flex-1 text-center py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 font-medium border-y border-amber-200 dark:border-amber-700/30">
                    Review<span className="block text-[10px] opacity-60">75–99%</span>
                  </div>
                  <div className="flex-1 text-center py-1.5 rounded-r-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-medium border border-emerald-200 dark:border-emerald-700/30">
                    Completed<span className="block text-[10px] opacity-60">100%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Settings panel - toggle visibility of each method */}
            {showProgressSettings && (
              <div className="mb-4 p-3 bg-white dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-slate-700/50">
                <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                  Show/Hide tracking methods
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setShowSlider(!showSlider)}
                    className={clsx(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                      showSlider
                        ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-700/30'
                        : 'bg-gray-50 text-gray-400 border-gray-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700'
                    )}
                  >
                    {showSlider ? <Eye size={12} /> : <EyeOff size={12} />}
                    <SlidersHorizontal size={12} />
                    Drag Slider
                  </button>
                  <button
                    onClick={() => setShowMiniTasks(!showMiniTasks)}
                    className={clsx(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                      showMiniTasks
                        ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-700/30'
                        : 'bg-gray-50 text-gray-400 border-gray-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700'
                    )}
                  >
                    {showMiniTasks ? <Eye size={12} /> : <EyeOff size={12} />}
                    <ListChecks size={12} />
                    Mini Tasks
                  </button>
                  <button
                    onClick={() => setShowQuickSet(!showQuickSet)}
                    className={clsx(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                      showQuickSet
                        ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-700/30'
                        : 'bg-gray-50 text-gray-400 border-gray-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700'
                    )}
                  >
                    {showQuickSet ? <Eye size={12} /> : <EyeOff size={12} />}
                    <Zap size={12} />
                    Quick Set
                  </button>
                </div>
              </div>
            )}

            {/* Drag Slider */}
            {showSlider && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <SlidersHorizontal size={13} className="text-gray-400 dark:text-slate-500" />
                  <span className="text-xs font-medium text-gray-400 dark:text-slate-500">Drag Slider</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={task.progress}
                  onChange={(e) => setProgress(Number(e.target.value), 'slider')}
                  className="w-full h-2 accent-purple-600 cursor-pointer rounded-full"
                />
              </div>
            )}

            {/* Mini Tasks (subtasks for progress) */}
            {showMiniTasks && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <ListChecks size={13} className="text-gray-400 dark:text-slate-500" />
                    <span className="text-xs font-medium text-gray-400 dark:text-slate-500">Mini Tasks</span>
                  </div>
                  {(task.subtasks?.length ?? 0) > 0 && (
                    <span className="text-xs font-medium text-gray-400 dark:text-slate-500">
                      {subtasksCompleted}/{subtasksTotal} done
                    </span>
                  )}
                </div>

                {/* Mini task progress bar */}
                {(task.subtasks?.length ?? 0) > 0 && (
                  <div className="h-1.5 bg-gray-200 dark:bg-slate-700/50 rounded-full overflow-hidden mb-3">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${subtasksTotal > 0 ? (subtasksCompleted / subtasksTotal) * 100 : 0}%` }}
                    />
                  </div>
                )}

                {/* Subtask list */}
                {task.subtasks && task.subtasks.length > 0 && (
                  <ul className="space-y-1.5 mb-3">
                    {task.subtasks.map((subtask) => (
                      <li key={subtask.id}>
                        <SubtaskItem
                          subtask={subtask}
                          onToggle={() => handleToggleSubtask(subtask.id)}
                          onRemove={(e) => { e.stopPropagation(); handleRemoveSubtask(subtask.id); }}
                        />
                      </li>
                    ))}
                  </ul>
                )}

                {/* Add new mini task */}
                <div className="space-y-2 rounded-lg border border-gray-200 dark:border-slate-700/50 p-3 bg-gray-50/50 dark:bg-slate-800/30">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                      Title
                    </label>
                    <input
                      type="text"
                      value={newMiniTaskInput}
                      onChange={(e) => setNewMiniTaskInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.repeat) {
                          e.preventDefault();
                          handleAddMiniTask();
                        }
                      }}
                      placeholder="Mini task title..."
                      className={clsx(
                        'w-full rounded-lg px-3 py-2 text-sm',
                        'bg-white border border-gray-200 text-gray-800 placeholder-gray-400',
                        'dark:bg-slate-800/50 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500',
                        'focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                      )}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                      Description
                    </label>
                    <textarea
                      value={newMiniTaskDescription}
                      onChange={(e) => setNewMiniTaskDescription(e.target.value)}
                      placeholder="Brief explanation (optional)..."
                      rows={2}
                      className={clsx(
                        'w-full rounded-lg px-3 py-2 text-sm resize-none',
                        'bg-white border border-gray-200 text-gray-800 placeholder-gray-400',
                        'dark:bg-slate-800/50 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500',
                        'focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                      )}
                    />
                  </div>
                  <button
                    onClick={handleAddMiniTask}
                    disabled={!newMiniTaskInput.trim()}
                    className={clsx(
                      'w-full py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5',
                      newMiniTaskInput.trim()
                        ? 'bg-purple-100 text-purple-600 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50'
                        : 'bg-gray-100 text-gray-300 dark:bg-slate-700/30 dark:text-slate-600 cursor-not-allowed'
                    )}
                  >
                    <Plus size={14} />
                    Add mini task
                  </button>
                </div>
              </div>
            )}

            {/* Quick Set Buttons */}
            {showQuickSet && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={13} className="text-gray-400 dark:text-slate-500" />
                  <span className="text-xs font-medium text-gray-400 dark:text-slate-500">Quick Set</span>
                </div>
                <div className="flex gap-1.5">
                  {[0, 25, 50, 75, 100].map((val) => (
                    <button
                      key={val}
                      onClick={() => setProgress(val, `quick-set: ${val}%`)}
                      className={clsx(
                        'flex-1 px-2 py-2 rounded-lg text-xs font-semibold transition-all',
                        task.progress === val
                          ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20 dark:bg-purple-500'
                          : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:border-slate-700/50'
                      )}
                    >
                      {val}%
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Progress Notes — triggered by progress interactions */}
            {showAttachments && (
              <div className="mt-4 pt-4 border-t border-gray-200/50 dark:border-slate-700/30">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquare size={12} />
                      Progress Notes
                    </h4>
                    {attachmentTrigger && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                        via {attachmentTrigger}
                      </span>
                    )}
                    {(task.progressNotes?.length ?? 0) > 0 && (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold bg-gray-200 text-gray-600 dark:bg-slate-700 dark:text-slate-300">
                        {task.progressNotes!.length}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {(task.progressNotes?.length ?? 0) > 3 && (
                      <button
                        onClick={() => setShowAllNotes(!showAllNotes)}
                        className="inline-flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium transition-colors"
                      >
                        {showAllNotes ? (
                          <>Show less <ChevronUp size={12} /></>
                        ) : (
                          <>Show all ({task.progressNotes!.length}) <ChevronDown size={12} /></>
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => setShowAttachments(false)}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                      title="Dismiss"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {/* Note input */}
                <div className="flex gap-2 mb-3">
                  <div className="relative flex-1">
                    <input
                      ref={noteInputRef}
                      type="text"
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddNote();
                        }
                      }}
                      placeholder={attachmentTrigger ? `Note on ${attachmentTrigger}...` : 'Add a progress note...'}
                      className={clsx(
                        'w-full rounded-lg pl-3 pr-10 py-2.5 text-sm',
                        'bg-white border border-gray-200 text-gray-800 placeholder-gray-400',
                        'dark:bg-slate-800/50 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500',
                        'focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                      )}
                    />
                    {attachmentTrigger && (
                      <div className="absolute right-10 top-1/2 -translate-y-1/2">
                        {getTriggerIcon(attachmentTrigger)}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleAddNote}
                    disabled={!noteInput.trim()}
                    className={clsx(
                      'px-3 py-2.5 rounded-lg transition-all',
                      noteInput.trim()
                        ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm shadow-purple-500/20'
                        : 'bg-gray-100 text-gray-300 dark:bg-slate-700/30 dark:text-slate-600 cursor-not-allowed'
                    )}
                  >
                    <Send size={16} />
                  </button>
                </div>

                {/* Notes list */}
                {task.progressNotes && task.progressNotes.length > 0 && (
                  <div className="space-y-2">
                    {(showAllNotes ? task.progressNotes : task.progressNotes.slice(0, 3)).map((note) => (
                      <div
                        key={note.id}
                        className="group flex gap-3 px-3 py-2.5 rounded-lg bg-white/60 hover:bg-white dark:bg-slate-800/30 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        {/* Progress badge */}
                        <div className="flex-shrink-0 pt-0.5">
                          <div className={clsx(
                            'w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border-2',
                            note.progress >= 100
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-700/30'
                              : note.progress >= 75
                                ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700/30'
                                : note.progress > 0
                                  ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-700/30'
                                  : 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-600'
                          )}>
                            {note.progress}%
                          </div>
                        </div>

                        {/* Note content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed">
                            {note.text}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-1">
                              {getTriggerIcon(note.trigger)}
                              <span className="text-[10px] text-gray-400 dark:text-slate-500 capitalize">
                                {note.trigger}
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-300 dark:text-slate-600">•</span>
                            <span className="text-[10px] text-gray-400 dark:text-slate-500">
                              {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                        </div>

                        {/* Delete */}
                        <button
                          onClick={() => handleRemoveNote(note.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 transition-all flex-shrink-0 self-start"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Attachments & Links — triggered by progress interactions */}
            {showAttachments && (
              <div className="mt-4 pt-4 border-t border-gray-200/50 dark:border-slate-700/30">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Paperclip size={12} />
                      Attachments & Links
                    </h4>
                    {attachmentTrigger && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                        via {attachmentTrigger}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowAddLink(!showAddLink)}
                      className={clsx(
                        'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                        showAddLink
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700/50 dark:text-slate-300 dark:hover:bg-slate-700'
                      )}
                    >
                      <Link2 size={12} />
                      Add Link
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50 transition-colors"
                    >
                      <Upload size={12} />
                      Upload
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.csv,.json,.md"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => setShowAttachments(false)}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                      title="Hide attachments"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {/* Add Link Form */}
                {showAddLink && (
                  <div className="mb-3 p-3 bg-white dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-slate-700/50">
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={linkTitle}
                        onChange={(e) => setLinkTitle(e.target.value)}
                        placeholder="Link title (optional)"
                        className={clsx(
                          'w-full rounded-lg px-3 py-2 text-sm',
                          'bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400',
                          'dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500',
                          'focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                        )}
                      />
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={linkUrl}
                          onChange={(e) => setLinkUrl(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter' && !e.repeat) { e.preventDefault(); handleAddLink(); } }}
                          placeholder="https://..."
                          className={clsx(
                            'flex-1 rounded-lg px-3 py-2 text-sm',
                            'bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400',
                            'dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500',
                            'focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                          )}
                          autoFocus
                        />
                        <button
                          onClick={handleAddLink}
                          disabled={!linkUrl.trim()}
                          className={clsx(
                            'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                            linkUrl.trim()
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-gray-100 text-gray-300 dark:bg-slate-700/30 dark:text-slate-600 cursor-not-allowed'
                          )}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Links list */}
                {task.links && task.links.length > 0 && (
                  <div className="space-y-1.5 mb-3">
                    {task.links.map((link) => (
                      <div
                        key={link.id}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/60 hover:bg-white dark:bg-slate-800/30 dark:hover:bg-slate-800/50 group transition-colors"
                      >
                        <span className="flex-shrink-0">{getLinkIcon(link.type)}</span>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 text-sm text-blue-600 dark:text-blue-400 hover:underline truncate font-medium"
                        >
                          {link.title}
                        </a>
                        <ExternalLink size={12} className="text-gray-400 dark:text-slate-500 flex-shrink-0" />
                        <button
                          onClick={() => handleRemoveLink(link.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 transition-all flex-shrink-0"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Uploaded files list */}
                {task.attachments && task.attachments.length > 0 && (
                  <div className="space-y-2">
                    {task.attachments.filter((a) => a.type.startsWith('image/')).length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
                        {task.attachments
                          .filter((a) => a.type.startsWith('image/'))
                          .map((attachment) => (
                            <div
                              key={attachment.id}
                              className="relative group rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700/50 aspect-square"
                            >
                              <img
                                src={attachment.previewUrl || attachment.url}
                                alt={attachment.name}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                                <a
                                  href={attachment.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-1.5 bg-white/90 rounded-lg text-gray-700 hover:bg-white transition-colors"
                                >
                                  <ExternalLink size={14} />
                                </a>
                                <button
                                  onClick={() => handleRemoveAttachment(attachment.id)}
                                  className="p-1.5 bg-white/90 rounded-lg text-red-500 hover:bg-white transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1">
                                <p className="text-[10px] text-white truncate">{attachment.name}</p>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}

                    {task.attachments
                      .filter((a) => !a.type.startsWith('image/'))
                      .map((attachment) => (
                        <div
                          key={attachment.id}
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-white/60 hover:bg-white dark:bg-slate-800/30 dark:hover:bg-slate-800/50 group transition-colors"
                        >
                          {getFileIcon(attachment.type)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-700 dark:text-slate-300 truncate">
                              {attachment.name}
                            </p>
                            <p className="text-[10px] text-gray-400 dark:text-slate-500">
                              {formatFileSize(attachment.size)}
                            </p>
                          </div>
                          <a
                            href={attachment.url}
                            download={attachment.name}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 text-gray-400 hover:text-blue-500 dark:text-slate-500 dark:hover:text-blue-400 transition-colors"
                          >
                            <Download size={14} />
                          </a>
                          <button
                            onClick={() => handleRemoveAttachment(attachment.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 transition-all"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                  </div>
                )}

                {/* Empty state */}
                {(!task.attachments || task.attachments.length === 0) && (!task.links || task.links.length === 0) && !showAddLink && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={clsx(
                      'border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors',
                      'border-gray-200 hover:border-purple-300 hover:bg-purple-50/30',
                      'dark:border-slate-700 dark:hover:border-purple-700/50 dark:hover:bg-purple-900/10'
                    )}
                  >
                    <Upload size={20} className="mx-auto mb-1.5 text-gray-300 dark:text-slate-600" />
                    <p className="text-xs text-gray-400 dark:text-slate-500">
                      Drop files here or <span className="text-purple-600 dark:text-purple-400 font-medium">browse</span>
                    </p>
                    <p className="text-[10px] text-gray-300 dark:text-slate-600 mt-0.5">
                      Attach docs, images, or links related to this progress update
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Status */}
            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4">
              <label className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider block mb-2">
                Status
              </label>
              <select
                value={task.status}
                onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                className={clsx(
                  'w-full rounded-lg px-2 py-1.5 text-sm font-medium',
                  'bg-white border border-gray-200 text-gray-700',
                  'dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-200',
                  'focus:outline-none focus:border-purple-500 cursor-pointer'
                )}
              >
                {statusConfig.map((s) => (
                  <option
                    key={s.value}
                    value={s.value}
                    disabled={s.value === 'completed' && !canComplete}
                  >
                    {s.value === 'completed' && !canComplete ? `${s.label} (manager approval required)` : s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4">
              <label className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider block mb-2">
                Priority
              </label>
              <select
                value={task.priority}
                onChange={(e) => handlePriorityChange(e.target.value as TaskPriority)}
                className={clsx(
                  'w-full rounded-lg px-2 py-1.5 text-sm font-medium',
                  'bg-white border border-gray-200 text-gray-700',
                  'dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-200',
                  'focus:outline-none focus:border-purple-500 cursor-pointer'
                )}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {/* Due Date */}
            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4">
              <label className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-2">
                <CalendarDays size={12} />
                Due Date
              </label>
              {task.dueDate ? (
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-slate-200">
                    {format(new Date(task.dueDate), 'MMM dd, yyyy')}
                  </p>
                  <p className={clsx(
                    'text-xs mt-0.5',
                    isOverdue ? 'text-red-500 dark:text-red-400 font-semibold' : 'text-gray-400 dark:text-slate-500'
                  )}>
                    {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-400 dark:text-slate-500">Not set</p>
              )}
            </div>

            {/* Assigned */}
            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4">
              <label className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-2">
                <Users size={12} />
                Assigned To
              </label>
              {assignee ? (
                <div className="flex items-center gap-2">
                  {assignee.avatar ? (
                    <img
                      src={assignee.avatar}
                      alt={assignee.name}
                      className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                        {assignee.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-200 truncate">
                    {assignee.name}
                  </span>
                </div>
              ) : task.assignedTo ? (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-gray-500 dark:text-slate-400">?</span>
                  </div>
                  <span className="text-sm text-gray-400 dark:text-slate-500 truncate">Unknown</span>
                </div>
              ) : (
                <p className="text-sm text-gray-400 dark:text-slate-500">Unassigned</p>
              )}
            </div>

            {/* Project */}
            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4">
              <label className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-2">
                <FolderKanban size={12} />
                Project
              </label>
              {project ? (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: project.color + '22' }}>
                    <FolderKanban size={12} style={{ color: project.color }} />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
                    {project.name}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-gray-400 dark:text-slate-500">No project</p>
              )}
            </div>
          </div>

          {/* Time Tracking */}
          {(task.estimatedHours || task.actualHours) && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                <Timer size={14} />
                Time Tracking
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Clock size={18} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 dark:text-slate-500">Estimated</p>
                    <p className="text-lg font-bold text-gray-800 dark:text-slate-100">
                      {task.estimatedHours ?? '-'}<span className="text-sm font-normal text-gray-400 dark:text-slate-500">h</span>
                    </p>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 flex items-center gap-3">
                  <div className={clsx(
                    'w-10 h-10 rounded-lg flex items-center justify-center',
                    task.actualHours && task.estimatedHours && task.actualHours > task.estimatedHours
                      ? 'bg-red-100 dark:bg-red-900/30'
                      : 'bg-emerald-100 dark:bg-emerald-900/30'
                  )}>
                    <Timer size={18} className={clsx(
                      task.actualHours && task.estimatedHours && task.actualHours > task.estimatedHours
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    )} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 dark:text-slate-500">Actual</p>
                    <p className="text-lg font-bold text-gray-800 dark:text-slate-100">
                      {task.actualHours ?? '-'}<span className="text-sm font-normal text-gray-400 dark:text-slate-500">h</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tags */}
          {task.tags.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                <Tag size={14} />
                Tags
              </h3>
              <div className="flex gap-2 flex-wrap">
                {task.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-700/30"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recurring Info */}
          {task.isRecurring && task.recurringPattern && (
            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 rounded-xl p-4 flex items-center gap-3">
              <RefreshCw size={18} className="text-blue-500 dark:text-blue-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Recurring Task</p>
                <p className="text-xs text-blue-500 dark:text-blue-400 capitalize">
                  Repeats {task.recurringPattern.frequency}
                </p>
              </div>
            </div>
          )}

          {/* Metadata Footer */}
          <div className="pt-4 border-t border-gray-200 dark:border-slate-700/30">
            <div className="flex items-center justify-between text-xs text-gray-400 dark:text-slate-500">
              <span>
                Created {format(new Date(task.createdAt), 'MMM dd, yyyy \'at\' h:mm a')}
              </span>
              <span>
                Updated {formatDistanceToNow(new Date(task.updatedAt), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Overlay */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10">
            <div className="text-center p-8">
              <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} className="text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-2">Delete Task?</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-6 max-w-sm">
                Are you sure you want to delete "<strong>{task.title}</strong>"? This action cannot be undone.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
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
                  onClick={handleDelete}
                  className="px-5 py-2.5 rounded-lg text-sm font-medium bg-red-500 hover:bg-red-600 text-white transition-colors"
                >
                  Delete Task
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
