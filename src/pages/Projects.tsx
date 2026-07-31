import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import {
  Plus,
  X,
  Search,
  ChevronRight,
  CheckCircle2,
  Clock,
  Users,
  Sparkles,
  Trash2,
  ArrowLeft,
  FolderKanban,
  AlertCircle,
  Layers,
  Check,
  Globe,
  Smartphone,
  Megaphone,
  Zap,
  Palette,
  Wrench,
  GraduationCap,
  Briefcase,
  GripVertical,
  ShieldCheck,
  Cloud,
  Headphones,
  Pencil,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ShoppingCart,
  Image as ImageIcon,
  Building2,
} from 'lucide-react';
import { useProjectStore, projectTemplates, ProjectTask, Project } from '@stores/projectStore';
import { useUserStore } from '@stores/userStore';
import { useTaskStore } from '@stores/taskStore';
import { useNotificationStore } from '@stores/notificationStore';
import { useChatStore } from '@stores/chatStore';
import { useToastStore } from '@components/Toast';
import { useUIStore } from '@stores/uiStore';
import { MemberTooltip, MemberInfo } from '@components/MemberTooltip';

const getTemplateIcon = (templateId: string, size: number = 24) => {
  const icons: Record<string, React.ReactNode> = {
    'web-app': <Globe size={size} strokeWidth={1.5} />,
    'mobile-app': <Smartphone size={size} strokeWidth={1.5} />,
    'marketing': <Megaphone size={size} strokeWidth={1.5} />,
    'product-sales': <ShoppingCart size={size} strokeWidth={1.5} />,
    'api-service': <Zap size={size} strokeWidth={1.5} />,
    'design-system': <Palette size={size} strokeWidth={1.5} />,
    'training': <GraduationCap size={size} strokeWidth={1.5} />,
    'services': <Briefcase size={size} strokeWidth={1.5} />,
    'cybersecurity': <ShieldCheck size={size} strokeWidth={1.5} />,
    'cloud-computing': <Cloud size={size} strokeWidth={1.5} />,
    'support': <Headphones size={size} strokeWidth={1.5} />,
    'custom': <Wrench size={size} strokeWidth={1.5} />,
  };
  return icons[templateId] || <FolderKanban size={size} strokeWidth={1.5} />;
};

/** Renders a project's uploaded company logo (data URL stored in project.icon)
 *  when present, falling back to the template's outline icon otherwise. */
const renderProjectIcon = (project: { icon: string; templateId: string }, size: number = 24) => {
  if (project.icon && project.icon.startsWith('data:image')) {
    return <img src={project.icon} alt="" className="w-full h-full object-cover rounded-lg" />;
  }
  return getTemplateIcon(project.templateId, size);
};

// ── Status config ──────────────────────────────────────────────────────
const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  planning: { label: 'Planning', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  active: { label: 'Active', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  'on-hold': { label: 'On Hold', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  completed: { label: 'Completed', color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-700/30' },
};

const priorityConfig: Record<string, { label: string; color: string; dot: string }> = {
  urgent: { label: 'Urgent', color: 'text-red-600 dark:text-red-400', dot: 'bg-red-500' },
  high: { label: 'High', color: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500' },
  medium: { label: 'Medium', color: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' },
  low: { label: 'Low', color: 'text-gray-500 dark:text-gray-400', dot: 'bg-gray-400' },
};

// ── Create Project Modal ───────────────────────────────────────────────
const CreateProjectModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { createProject } = useProjectStore();
  const { addNotification } = useNotificationStore();
  const user = useUserStore((s) => s.user);
  const assignableMembers = useUserStore((s) => s.assignableMembers);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [customTaskInput, setCustomTaskInput] = useState('');
  const [customTaskDescription, setCustomTaskDescription] = useState('');
  const [customTasks, setCustomTasks] = useState<{ title: string; description: string; priority: 'low' | 'medium' | 'high' | 'urgent'; estimatedHours: number; tags: string[] }[]>([]);
  const [assignments, setAssignments] = useState<Record<number, string>>({});
  const [productName, setProductName] = useState('');
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [logoError, setLogoError] = useState('');
  const logoInputRef = useRef<HTMLInputElement>(null);

  const template = projectTemplates.find((t) => t.id === selectedTemplate);
  const isCustom = selectedTemplate === 'custom';
  const isProductSales = selectedTemplate === 'product-sales';

  const reset = () => {
    setStep(1);
    setName('');
    setDescription('');
    setSelectedTemplate(null);
    setSelectedTasks(new Set());
    setCustomTaskInput('');
    setCustomTaskDescription('');
    setCustomTasks([]);
    setAssignments({});
    setProductName('');
    setLogoDataUrl(null);
    setLogoError('');
  };

  const MAX_LOGO_BYTES = 1024 * 1024; // 1MB — keeps the DB row small since it's stored as a data URL
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError('');
    if (!file.type.startsWith('image/')) {
      setLogoError('Please choose an image file.');
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError('Logo must be under 1MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoDataUrl(reader.result as string);
    reader.readAsDataURL(file);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    const tmpl = projectTemplates.find((t) => t.id === templateId);
    if (tmpl && tmpl.tasks.length > 0) {
      // Pre-select all suggested tasks
      setSelectedTasks(new Set(tmpl.tasks.map((_, i) => i)));
    }
  };

  const toggleTask = (index: number) => {
    setSelectedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const addCustomTask = () => {
    if (!customTaskInput.trim()) return;
    setCustomTasks([
      ...customTasks,
      { title: customTaskInput.trim(), description: customTaskDescription.trim(), priority: 'medium', estimatedHours: 4, tags: [] },
    ]);
    setCustomTaskInput('');
    setCustomTaskDescription('');
  };

  const removeCustomTask = (i: number) => {
    setCustomTasks(customTasks.filter((_, idx) => idx !== i));
  };

  const handleCreate = () => {
    if (!name.trim() || !user) {
      reset();
      onClose();
      return;
    }

    try {
      const taskList: Omit<ProjectTask, 'id'>[] = [];

      // Add selected template tasks
      if (template && !isCustom) {
        template.tasks.forEach((t, i) => {
          if (selectedTasks.has(i)) {
            taskList.push({
              title: t.title,
              description: t.description,
              priority: t.priority,
              estimatedHours: t.estimatedHours,
              tags: t.tags,
              assignedTo: assignments[i] || undefined,
              order: taskList.length + 1,
            });
          }
        });
      }

      // Add custom tasks
      customTasks.forEach((t, i) => {
        taskList.push({
          title: t.title,
          description: t.description,
          priority: t.priority,
          estimatedHours: t.estimatedHours,
          tags: t.tags,
          assignedTo: assignments[1000 + i] || undefined,
          order: taskList.length + 1,
        });
      });

      const projectName = name.trim();

      createProject({
        name: projectName,
        description: description.trim(),
        templateId: selectedTemplate || 'custom',
        icon: logoDataUrl || template?.icon || '🔧',
        color: template?.color || '#6b7280',
        tasks: taskList,
        createdBy: user.id,
        productName: isProductSales ? productName.trim() || undefined : undefined,
      });

      // Send project-invite notifications to each assigned member
      const assignedMembers = new Map<string, number>(); // userId → task count
      taskList.forEach((t) => {
        if (t.assignedTo && t.assignedTo !== user.id) {
          assignedMembers.set(t.assignedTo, (assignedMembers.get(t.assignedTo) || 0) + 1);
        }
      });

      assignedMembers.forEach((taskCount, memberId) => {
        addNotification({
          userId: memberId,
          type: 'project-invite',
          title: 'Added to project',
          message: `You've been added to "${projectName}" — ${taskCount} task${taskCount > 1 ? 's' : ''} assigned to you`,
          read: false,
          actionUrl: '#projects',
        });
      });
    } catch (err) {
      console.error('[Projects] handleCreate error:', err);
    } finally {
      reset();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="fixed inset-0 bg-black/50" />
      <div
        className={clsx(
          'relative w-full max-w-3xl mx-0 sm:mx-4 max-h-[100dvh] sm:max-h-[90vh] overflow-y-auto',
          'bg-white dark:bg-gradient-to-b dark:from-slate-800 dark:to-slate-900',
          'border-0 sm:border border-gray-200 dark:border-slate-700/50 rounded-none sm:rounded-2xl shadow-2xl',
          'h-[100dvh] sm:h-auto'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-slate-700/50 bg-white dark:bg-slate-800 rounded-none sm:rounded-t-2xl">
          <div className="flex items-center gap-3">
            {step > 1 && (
              <button onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                <ArrowLeft size={18} className="text-gray-500 dark:text-slate-400" />
              </button>
            )}
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">Create Project</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                {step === 1 && 'Choose a project template'}
                {step === 2 && 'Select and customize tasks'}
                {step === 3 && 'Assign tasks to team members'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Step indicator */}
            <div className="flex items-center gap-1.5">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={clsx(
                    'w-2 h-2 rounded-full transition-all',
                    step >= s ? 'bg-purple-600 dark:bg-purple-400' : 'bg-gray-300 dark:bg-slate-600'
                  )}
                />
              ))}
            </div>
            <button onClick={() => { reset(); onClose(); }} className="text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-300 transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {/* Step 1: Template selection + name */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Project name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Customer Portal v2"
                  className={clsx(
                    'w-full rounded-lg px-4 py-2.5 text-sm',
                    'bg-white border border-gray-300 text-gray-800 placeholder-gray-400',
                    'dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500',
                    'focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                  )}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the project..."
                  rows={2}
                  className={clsx(
                    'w-full rounded-lg px-4 py-2.5 text-sm resize-none',
                    'bg-white border border-gray-300 text-gray-800 placeholder-gray-400',
                    'dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500',
                    'focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                  )}
                />
              </div>

              {/* Company logo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                  Company Logo <span className="text-gray-400 dark:text-slate-500 font-normal">(optional)</span>
                </label>
                <div className="flex items-center gap-3">
                  <div
                    onClick={() => logoInputRef.current?.click()}
                    className={clsx(
                      'w-14 h-14 rounded-xl flex items-center justify-center cursor-pointer overflow-hidden flex-shrink-0 border-2 border-dashed transition-colors',
                      logoDataUrl
                        ? 'border-transparent'
                        : 'border-gray-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700/50 bg-gray-50 dark:bg-slate-800/50'
                    )}
                  >
                    {logoDataUrl ? (
                      <img src={logoDataUrl} alt="Logo preview" className="w-full h-full object-cover" />
                    ) : (
                      <Building2 size={20} className="text-gray-300 dark:text-slate-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700/50 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                      >
                        <ImageIcon size={12} />
                        {logoDataUrl ? 'Change logo' : 'Upload logo'}
                      </button>
                      {logoDataUrl && (
                        <button
                          type="button"
                          onClick={() => setLogoDataUrl(null)}
                          className="text-xs text-gray-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">
                      Shown instead of the template icon on this project's cards. PNG/JPG, up to 1MB.
                    </p>
                    {logoError && <p className="text-[11px] text-red-500 mt-1">{logoError}</p>}
                  </div>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Template cards */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">
                  <Sparkles size={14} className="inline mr-1 text-purple-500" />
                  Choose a template — we'll suggest the most practical tasks
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {projectTemplates.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      onClick={() => handleSelectTemplate(tmpl.id)}
                      className={clsx(
                        'p-4 rounded-xl border-2 text-left transition-all',
                        selectedTemplate === tmpl.id
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-400 shadow-md shadow-purple-500/10'
                          : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 hover:shadow-sm'
                      )}
                    >
                      <span className={clsx(
                        'inline-flex items-center justify-center w-10 h-10 rounded-lg',
                        selectedTemplate === tmpl.id
                          ? 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30'
                          : 'text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-700/50'
                      )}>
                        {getTemplateIcon(tmpl.id)}
                      </span>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-slate-100 mt-2">{tmpl.name}</h4>
                      <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">{tmpl.description}</p>
                      {tmpl.tasks.length > 0 && (
                        <span className="inline-block mt-2 text-[10px] font-medium text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 rounded-full">
                          {tmpl.tasks.length} suggested tasks
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Product name — only relevant for the Product Sales template */}
              {isProductSales && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <ShoppingCart size={14} className="text-emerald-500" />
                    Product Name <span className="text-gray-400 dark:text-slate-500 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="e.g. Acme Pro Subscription"
                    className={clsx(
                      'w-full rounded-lg px-4 py-2.5 text-sm',
                      'bg-white border border-gray-300 text-gray-800 placeholder-gray-400',
                      'dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500',
                      'focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                    )}
                  />
                </div>
              )}

              {/* Next button */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setStep(2)}
                  disabled={!name.trim() || !selectedTemplate}
                  className={clsx(
                    'px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2',
                    'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/30',
                    'hover:from-purple-700 hover:to-blue-700 transition-all',
                    'disabled:opacity-40 disabled:cursor-not-allowed'
                  )}
                >
                  Next: Select Tasks <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Task selection */}
          {step === 2 && (
            <div className="space-y-5">
              {/* Suggested tasks */}
              {template && !isCustom && template.tasks.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 flex items-center gap-2">
                      <Sparkles size={14} className="text-purple-500" />
                      Suggested Tasks for {template.name}
                    </h3>
                    <button
                      onClick={() => {
                        if (selectedTasks.size === template.tasks.length) setSelectedTasks(new Set());
                        else setSelectedTasks(new Set(template.tasks.map((_, i) => i)));
                      }}
                      className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
                    >
                      {selectedTasks.size === template.tasks.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {template.tasks.map((task, i) => (
                      <button
                        key={i}
                        onClick={() => toggleTask(i)}
                        className={clsx(
                          'w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all',
                          selectedTasks.has(i)
                            ? 'border-purple-300 bg-purple-50/50 dark:border-purple-600/50 dark:bg-purple-900/10'
                            : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 opacity-60'
                        )}
                      >
                        <div className={clsx(
                          'w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all',
                          selectedTasks.has(i)
                            ? 'bg-purple-600 border-purple-600 text-white'
                            : 'border-gray-300 dark:border-slate-600'
                        )}>
                          {selectedTasks.has(i) && <Check size={12} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-slate-100">{task.title}</span>
                            <span className={clsx('flex items-center gap-1 text-[10px] font-medium', priorityConfig[task.priority].color)}>
                              <span className={clsx('w-1.5 h-1.5 rounded-full', priorityConfig[task.priority].dot)} />
                              {priorityConfig[task.priority].label}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{task.description}</p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-[10px] text-gray-400 dark:text-slate-500 flex items-center gap-1">
                              <Clock size={10} /> {task.estimatedHours}h
                            </span>
                            <div className="flex gap-1">
                              {task.tags.slice(0, 3).map((tag) => (
                                <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom task input */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                  <Plus size={14} /> Add Custom Tasks
                </h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customTaskInput}
                    onChange={(e) => setCustomTaskInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.repeat) { e.preventDefault(); addCustomTask(); }
                      if (e.key === 'Escape') setCustomTaskDescription('');
                    }}
                    placeholder="Type a task title and press Enter..."
                    className={clsx(
                      'flex-1 rounded-lg px-4 py-2.5 text-sm',
                      'bg-white border border-gray-300 text-gray-800 placeholder-gray-400',
                      'dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500',
                      'focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                    )}
                  />
                  <button
                    onClick={addCustomTask}
                    className="px-3 py-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-600 dark:text-slate-300 transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                {/* Description field — shown once a title has been typed */}
                {customTaskInput.trim() && (
                  <div className="mt-2">
                    <textarea
                      value={customTaskDescription}
                      onChange={(e) => setCustomTaskDescription(e.target.value)}
                      rows={2}
                      placeholder="Task description (optional)…"
                      className={clsx(
                        'w-full rounded-lg px-4 py-2.5 text-sm resize-none',
                        'bg-white border border-gray-200 text-gray-800 placeholder-gray-400',
                        'dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500',
                        'focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                      )}
                    />
                  </div>
                )}
                {customTasks.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {customTasks.map((ct, i) => (
                      <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700">
                        <div className="w-5 h-5 rounded-md bg-purple-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check size={12} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-gray-800 dark:text-slate-200">{ct.title}</span>
                          {ct.description && (
                            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{ct.description}</p>
                          )}
                        </div>
                        <button onClick={() => removeCustomTask(i)} className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Next button */}
              <div className="flex justify-between pt-2">
                <span className="text-xs text-gray-400 dark:text-slate-500 self-center">
                  {selectedTasks.size + customTasks.length} tasks selected
                </span>
                <button
                  onClick={() => setStep(3)}
                  disabled={selectedTasks.size + customTasks.length === 0}
                  className={clsx(
                    'px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2',
                    'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/30',
                    'hover:from-purple-700 hover:to-blue-700 transition-all',
                    'disabled:opacity-40 disabled:cursor-not-allowed'
                  )}
                >
                  Next: Assign Tasks <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Assign tasks to members */}
          {step === 3 && (
            <div className="space-y-5">
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Assign tasks to team members. You can also leave them unassigned and assign later.
              </p>

              {/* Bulk-assign all tasks to one person */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                <span className="text-sm font-medium text-purple-700 dark:text-purple-300 whitespace-nowrap">Assign all to</span>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const val = e.target.value;
                    const bulk: Record<number, string> = {};
                    if (template && !isCustom) {
                      template.tasks.forEach((_, i) => { if (selectedTasks.has(i)) bulk[i] = val; });
                    }
                    customTasks.forEach((_, i) => { bulk[1000 + i] = val; });
                    setAssignments(val ? bulk : {});
                  }}
                  className={clsx(
                    'flex-1 rounded-lg px-3 py-1.5 text-sm',
                    'bg-white border border-purple-300 text-gray-800',
                    'dark:bg-slate-700 dark:border-purple-600 dark:text-slate-100',
                    'focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                  )}
                >
                  <option value="">— pick a member —</option>
                  {assignableMembers.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                {/* Template tasks */}
                {template && !isCustom && template.tasks.map((task, i) => {
                  if (!selectedTasks.has(i)) return null;
                  return (
                    <div key={`t-${i}`} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">{task.title}</p>
                        <span className={clsx('text-[10px] font-medium', priorityConfig[task.priority].color)}>
                          {priorityConfig[task.priority].label}
                        </span>
                      </div>
                      <select
                        value={assignments[i] || ''}
                        onChange={(e) => setAssignments({ ...assignments, [i]: e.target.value })}
                        className={clsx(
                          'rounded-lg px-3 py-2 sm:py-1.5 text-sm sm:text-xs w-full sm:w-44',
                          'bg-white border border-gray-300 text-gray-800',
                          'dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100',
                          'focus:outline-none focus:border-purple-500'
                        )}
                      >
                        <option value="">Unassigned</option>
                        {assignableMembers.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}

                {/* Custom tasks */}
                {customTasks.map((ct, i) => (
                  <div key={`c-${i}`} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">{ct.title}</p>
                      <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">Medium</span>
                    </div>
                    <select
                      value={assignments[1000 + i] || ''}
                      onChange={(e) => setAssignments({ ...assignments, [1000 + i]: e.target.value })}
                      className={clsx(
                        'rounded-lg px-3 py-2 sm:py-1.5 text-sm sm:text-xs w-full sm:w-44',
                        'bg-white border border-gray-300 text-gray-800',
                        'dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100',
                        'focus:outline-none focus:border-purple-500'
                      )}
                    >
                      <option value="">Unassigned</option>
                      {assignableMembers.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {/* Create button */}
              <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-slate-700/50">
                <span className="text-xs text-gray-400 dark:text-slate-500 self-center">
                  {Object.values(assignments).filter(Boolean).length} of {selectedTasks.size + customTasks.length} assigned
                </span>
                <button
                  onClick={handleCreate}
                  className={clsx(
                    'px-6 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2',
                    'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/30',
                    'hover:from-purple-700 hover:to-blue-700 transition-all'
                  )}
                >
                  <FolderKanban size={16} /> Create Project
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Industry / template extra suggestions (beyond the template defaults) ──
const industrySuggestions: Record<string, { title: string; description: string; priority: 'low' | 'medium' | 'high' | 'urgent'; estimatedHours: number; tags: string[] }[]> = {
  'web-app': [
    { title: 'Performance optimization', description: 'Audit and optimize load times, bundle size, and rendering', priority: 'medium', estimatedHours: 8, tags: ['performance', 'frontend'] },
    { title: 'SEO & meta tags setup', description: 'Configure meta tags, Open Graph, and structured data', priority: 'low', estimatedHours: 4, tags: ['seo', 'marketing'] },
    { title: 'Error boundary & fallback UI', description: 'Add error boundaries and graceful fallback states', priority: 'medium', estimatedHours: 4, tags: ['frontend', 'quality'] },
    { title: 'Internationalization (i18n)', description: 'Add multi-language support with translation files', priority: 'low', estimatedHours: 10, tags: ['i18n', 'frontend'] },
    { title: 'Analytics integration', description: 'Set up Google Analytics, Mixpanel, or PostHog', priority: 'medium', estimatedHours: 4, tags: ['analytics', 'tracking'] },
    { title: 'Security audit', description: 'Review for XSS, CSRF, SQL injection, and other vulnerabilities', priority: 'high', estimatedHours: 8, tags: ['security', 'audit'] },
  ],
  'mobile-app': [
    { title: 'Biometric authentication', description: 'Add Face ID / fingerprint login support', priority: 'medium', estimatedHours: 6, tags: ['security', 'mobile'] },
    { title: 'In-app purchases', description: 'Implement subscription or one-time purchase flows', priority: 'medium', estimatedHours: 12, tags: ['monetization', 'mobile'] },
    { title: 'Analytics & crash reporting', description: 'Integrate Firebase Analytics and Crashlytics', priority: 'high', estimatedHours: 4, tags: ['analytics', 'mobile'] },
    { title: 'Accessibility (a11y)', description: 'Ensure VoiceOver/TalkBack support and accessibility labels', priority: 'medium', estimatedHours: 6, tags: ['a11y', 'mobile'] },
    { title: 'App performance profiling', description: 'Profile and optimize startup time, memory, and battery', priority: 'medium', estimatedHours: 6, tags: ['performance', 'mobile'] },
    { title: 'Deep linking setup', description: 'Configure universal links and deep link routing', priority: 'low', estimatedHours: 4, tags: ['navigation', 'mobile'] },
  ],
  'marketing': [
    { title: 'Influencer outreach', description: 'Identify and reach out to relevant industry influencers', priority: 'medium', estimatedHours: 8, tags: ['outreach', 'marketing'] },
    { title: 'Press release & PR', description: 'Draft and distribute press release to media outlets', priority: 'medium', estimatedHours: 6, tags: ['pr', 'marketing'] },
    { title: 'Video production', description: 'Script, shoot, and edit promotional video content', priority: 'medium', estimatedHours: 16, tags: ['video', 'content'] },
    { title: 'Paid ads management', description: 'Set up and manage Google Ads, Meta Ads campaigns', priority: 'high', estimatedHours: 10, tags: ['ads', 'marketing'] },
    { title: 'Customer testimonials', description: 'Collect and format customer success stories and reviews', priority: 'low', estimatedHours: 6, tags: ['content', 'social-proof'] },
  ],
  'api-service': [
    { title: 'Load testing', description: 'Run stress tests with k6 or Artillery to find bottlenecks', priority: 'high', estimatedHours: 6, tags: ['testing', 'performance'] },
    { title: 'Caching layer', description: 'Implement Redis caching for frequently accessed data', priority: 'medium', estimatedHours: 8, tags: ['performance', 'backend'] },
    { title: 'Webhook system', description: 'Build webhook dispatch and retry mechanism for events', priority: 'medium', estimatedHours: 10, tags: ['api', 'events'] },
    { title: 'API versioning strategy', description: 'Implement URL or header-based API versioning', priority: 'low', estimatedHours: 4, tags: ['api', 'architecture'] },
    { title: 'Health check endpoints', description: 'Add /health and /ready endpoints for monitoring', priority: 'medium', estimatedHours: 2, tags: ['devops', 'monitoring'] },
  ],
  'design-system': [
    { title: 'Animation library', description: 'Define motion tokens and reusable animation components', priority: 'low', estimatedHours: 8, tags: ['animation', 'ui'] },
    { title: 'Icon library', description: 'Curate and package a consistent icon set', priority: 'medium', estimatedHours: 6, tags: ['icons', 'design'] },
    { title: 'Design token export', description: 'Export tokens to CSS variables, Tailwind, and Figma', priority: 'medium', estimatedHours: 6, tags: ['tokens', 'tooling'] },
    { title: 'Changelog & versioning', description: 'Set up semantic versioning and changelog generation', priority: 'low', estimatedHours: 4, tags: ['documentation', 'process'] },
    { title: 'Visual regression tests', description: 'Set up Chromatic or Percy for visual diff testing', priority: 'medium', estimatedHours: 6, tags: ['testing', 'qa'] },
  ],
  'training': [
    { title: 'Mentorship pairing program', description: 'Match learners with experienced mentors for guided support', priority: 'medium', estimatedHours: 6, tags: ['mentorship', 'support'] },
    { title: 'Certification & badge design', description: 'Create digital badges and certificates for course completion', priority: 'low', estimatedHours: 4, tags: ['certification', 'design'] },
    { title: 'Microlearning content', description: 'Create bite-sized learning modules for mobile consumption', priority: 'medium', estimatedHours: 10, tags: ['content', 'mobile'] },
    { title: 'Feedback survey setup', description: 'Build post-training satisfaction and effectiveness surveys', priority: 'low', estimatedHours: 3, tags: ['feedback', 'evaluation'] },
    { title: 'Compliance tracking', description: 'Track mandatory training completion and regulatory compliance', priority: 'high', estimatedHours: 6, tags: ['compliance', 'reporting'] },
    { title: 'Gamification elements', description: 'Add leaderboards, points, and streaks to boost engagement', priority: 'low', estimatedHours: 8, tags: ['gamification', 'engagement'] },
  ],
  'services': [
    { title: 'Risk register & mitigation', description: 'Identify project risks, assign owners, and plan mitigations', priority: 'high', estimatedHours: 4, tags: ['risk', 'planning'] },
    { title: 'Change request process', description: 'Define scope change workflow, approval gates, and impact assessment', priority: 'medium', estimatedHours: 4, tags: ['process', 'governance'] },
    { title: 'Weekly status reports', description: 'Set up recurring client status reports with progress and blockers', priority: 'medium', estimatedHours: 2, tags: ['reporting', 'client'] },
    { title: 'SLA & support agreement', description: 'Define post-delivery support levels, response times, and escalation', priority: 'medium', estimatedHours: 6, tags: ['support', 'sla'] },
    { title: 'Client satisfaction survey', description: 'Create and distribute NPS or CSAT survey at project milestones', priority: 'low', estimatedHours: 3, tags: ['feedback', 'client'] },
    { title: 'Post-project case study', description: 'Document outcomes, metrics, and testimonials for portfolio', priority: 'low', estimatedHours: 6, tags: ['marketing', 'documentation'] },
  ],
};

// ── Project Detail View ────────────────────────────────────────────────
const ProjectDetail: React.FC<{ projectId: string; onBack: () => void }> = ({ projectId, onBack }) => {
  const { getProjectById, updateProject, assignProjectTask, removeProjectTask, addProjectTask, updateProjectTask } = useProjectStore();
  const { addTask, tasks: boardTasks } = useTaskStore();
  const { isAdmin, isManager } = useUserStore();
  const currentUserId = useUserStore((s) => s.user?.id);
  const currentUserName = useUserStore((s) => s.user?.name || '');
  const assignableMembers = useUserStore((s) => s.assignableMembers);
  const { addNotification } = useNotificationStore();
  const { addToast } = useToastStore();
  const { conversations, dockChat } = useChatStore();
  const canManage = isAdmin() || isManager();
  const project = getProjectById(projectId);

  const openDmChat = (userId: string) => {
    const dm = conversations.find((c) => c.type === 'dm' && c.participants.some((p) => p.userId === userId));
    if (dm) dockChat(dm.id);
  };
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [removeTaskConfirm, setRemoveTaskConfirm] = useState<{ id: string; title: string } | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskValues, setEditingTaskValues] = useState<{ title: string; description: string; priority: string; estimatedHours: number; tags: string }>({ title: '', description: '', priority: 'medium', estimatedHours: 4, tags: '' });
  const suggestionRef = React.useRef<HTMLDivElement>(null);
  const addTaskInputRef = React.useRef<HTMLInputElement>(null);

  if (!project) return null;

  const assignedCount = project.tasks.filter((t) => t.assignedTo).length;
  const totalHours = project.tasks.reduce((sum, t) => sum + t.estimatedHours, 0);
  const sc = statusConfig[project.status];

  // Auto-update project status based on linked board task progress
  useEffect(() => {
    if (project.tasks.length === 0) return;
    const linked = project.tasks
      .filter((t) => t.linkedTaskId)
      .map((t) => boardTasks.find((bt) => bt.id === t.linkedTaskId))
      .filter(Boolean) as typeof boardTasks;
    if (linked.length === 0) return;
    const allCompleted = linked.every((t) => t.status === 'completed');
    const anyActive = linked.some((t) => t.status === 'in-progress' || t.status === 'review');
    const derived = allCompleted ? 'completed' : anyActive ? 'active' : project.status === 'on-hold' ? 'on-hold' : linked.length > 0 ? 'planning' : project.status;
    if (derived !== project.status) updateProject(project.id, { status: derived as any });
  }, [boardTasks, project.tasks, project.id]);

  // Build suggestions: template tasks + industry tasks that haven't been added yet
  const existingTitles = new Set(project.tasks.map((t) => t.title.toLowerCase()));
  const template = projectTemplates.find((t) => t.id === project.templateId);
  const templateTasks = template?.tasks || [];
  const extraTasks = industrySuggestions[project.templateId] || [];
  const allSuggestions = [
    ...templateTasks.map((t) => ({ ...t, source: 'template' as const })),
    ...extraTasks.map((t) => ({ ...t, source: 'industry' as const })),
  ].filter((t) => !existingTitles.has(t.title.toLowerCase()));

  const filteredSuggestions = newTaskTitle.trim()
    ? allSuggestions.filter((s) =>
        s.title.toLowerCase().includes(newTaskTitle.toLowerCase()) ||
        s.tags.some((tag) => tag.toLowerCase().includes(newTaskTitle.toLowerCase()))
      )
    : allSuggestions;

  const handleSelectSuggestion = (s: typeof allSuggestions[0]) => {
    addProjectTask(projectId, {
      title: s.title,
      description: s.description,
      priority: s.priority,
      estimatedHours: s.estimatedHours,
      tags: s.tags,
      order: project.tasks.length + 1,
    });
    setNewTaskTitle('');
    setShowSuggestions(false);
  };

  const handleAddTaskToProject = () => {
    if (!newTaskTitle.trim()) return;
    addProjectTask(projectId, {
      title: newTaskTitle.trim(),
      description: newTaskDescription.trim(),
      priority: 'medium',
      estimatedHours: 4,
      tags: [],
      order: project.tasks.length + 1,
    });
    setNewTaskTitle('');
    setNewTaskDescription('');
    setShowAddTask(false);
    setShowSuggestions(false);
  };

  const handleCreateActualTask = (pt: ProjectTask) => {
    // Create a real task in the taskStore linked to this project task
    addTask({
      title: pt.title,
      description: pt.description,
      status: 'todo',
      priority: pt.priority,
      assignedTo: pt.assignedTo,
      estimatedHours: pt.estimatedHours,
      tags: pt.tags,
      progress: 0,
      projectId: project.id,
    });

    // Notify the current user that the task was added
    addNotification({
      userId: currentUserId || '',
      type: 'task-assigned',
      title: 'Task added to board',
      message: `"${pt.title}" has been added to your Tasks board from ${project.name}`,
      read: false,
      actionUrl: '#tasks',
    });

    // If an admin/manager added a task for someone else, notify the assignee too
    if (pt.assignedTo && pt.assignedTo !== currentUserId) {
      addNotification({
        userId: pt.assignedTo,
        type: 'task-assigned',
        title: 'New task on your board',
        message: `${currentUserName.split(' ')[0]} added "${pt.title}" to your Tasks board`,
        read: false,
        actionUrl: '#tasks',
      });
    }

    // Show toast confirmation
    addToast({
      type: 'success',
      title: 'Task added to board',
      message: `"${pt.title}" is now on your Tasks board`,
      duration: 5000,
    });
  };

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
            <ArrowLeft size={20} className="text-gray-500 dark:text-slate-400" />
          </button>
          <span className="text-sm text-gray-400 dark:text-slate-500">Back to Projects</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 flex-shrink-0 overflow-hidden">
              {renderProjectIcon(project, 28)}
            </span>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-slate-100">{project.name}</h1>
              {project.productName && (
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                  <ShoppingCart size={11} /> {project.productName}
                </p>
              )}
              {project.description && (
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">{project.description}</p>
              )}
              <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-400 dark:text-slate-500">
                <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
                <span>&middot;</span>
                <span className="capitalize">{project.templateId.replace('-', ' ')} template</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={clsx('px-3 py-1 rounded-full text-xs font-semibold', sc.bg, sc.color)}>
              {sc.label}
            </span>
            {canManage && (
              <select
                value={project.status}
                onChange={(e) => updateProject(project.id, { status: e.target.value as any })}
                className={clsx(
                  'rounded-lg px-3 py-2 sm:py-1.5 text-sm sm:text-xs flex-1 sm:flex-none',
                  'bg-white border border-gray-300 text-gray-800',
                  'dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100',
                  'focus:outline-none focus:border-purple-500'
                )}
              >
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="on-hold">On Hold</option>
                <option value="completed">Completed</option>
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 text-xs mb-1">
            <Layers size={14} /> Total Tasks
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{project.tasks.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 text-xs mb-1">
            <Users size={14} /> Assigned
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{assignedCount} <span className="text-sm font-normal text-gray-400">/ {project.tasks.length}</span></p>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 text-xs mb-1">
            <Clock size={14} /> Estimated
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{totalHours}h</p>
        </div>
      </div>

      {/* Task list */}
      <div>
        <div className="flex items-center justify-between mb-4 gap-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">Project Tasks</h2>
          <button
            onClick={() => setShowAddTask(true)}
            className={clsx(
              'px-4 py-2 sm:px-3 sm:py-1.5 rounded-lg text-sm sm:text-xs font-medium flex items-center gap-1.5',
              'bg-purple-100 text-purple-700 hover:bg-purple-200',
              'dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50',
              'transition-colors'
            )}
          >
            <Plus size={14} /> Add Task
          </button>
        </div>

        {showAddTask && (
          <div className="mb-3 relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  ref={addTaskInputRef}
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => { setNewTaskTitle(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.repeat) handleAddTaskToProject(); if (e.key === 'Escape') { setShowAddTask(false); setShowSuggestions(false); setNewTaskDescription(''); } }}
                  placeholder="Type to search suggested tasks..."
                  className={clsx(
                    'w-full rounded-lg px-4 py-2.5 text-sm',
                    'bg-white border border-gray-300 text-gray-800 placeholder-gray-400',
                    'dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500',
                    'focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                  )}
                  autoFocus
                />

                {/* Suggestions dropdown */}
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div
                    ref={suggestionRef}
                    className={clsx(
                      'absolute top-full left-0 right-0 mt-1 z-50',
                      'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700',
                      'rounded-xl shadow-xl max-h-72 overflow-y-auto'
                    )}
                  >
                    {/* Header */}
                    <div className="px-3 py-2 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                      <p className="text-[10px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <Sparkles size={10} className="text-purple-500" /> Suggested Tasks
                      </p>
                      <span className="text-[10px] text-gray-400 dark:text-slate-500">
                        {filteredSuggestions.length} available
                      </span>
                    </div>

                    {/* Template suggestions */}
                    {filteredSuggestions.filter((s) => s.source === 'template').length > 0 && (
                      <>
                        <div className="px-3 py-1.5 bg-purple-50/50 dark:bg-purple-900/10 sticky top-0">
                          <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                            <Layers size={10} /> From {template?.name || 'Template'}
                          </span>
                        </div>
                        {filteredSuggestions.filter((s) => s.source === 'template').map((s, i) => (
                          <button
                            key={`t-${i}`}
                            type="button"
                            onClick={() => handleSelectSuggestion(s)}
                            className="w-full text-left px-3 py-2.5 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors border-b border-gray-50 dark:border-slate-700/50 last:border-0"
                          >
                            <div className="flex items-center gap-2">
                              <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', priorityConfig[s.priority].dot)} />
                              <span className="text-sm font-medium text-gray-800 dark:text-slate-200">{s.title}</span>
                              <span className={clsx('text-[9px] font-medium ml-auto flex-shrink-0', priorityConfig[s.priority].color)}>
                                {priorityConfig[s.priority].label}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5 ml-3.5 line-clamp-1">{s.description}</p>
                            <div className="flex items-center gap-2 mt-1 ml-3.5">
                              <span className="text-[9px] text-gray-400 dark:text-slate-500 flex items-center gap-0.5">
                                <Clock size={8} /> {s.estimatedHours}h
                              </span>
                              {s.tags.slice(0, 3).map((tag) => (
                                <span key={tag} className="text-[8px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </button>
                        ))}
                      </>
                    )}

                    {/* Industry / extra suggestions */}
                    {filteredSuggestions.filter((s) => s.source === 'industry').length > 0 && (
                      <>
                        <div className="px-3 py-1.5 bg-blue-50/50 dark:bg-blue-900/10 sticky top-0">
                          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                            <Sparkles size={10} /> More Suggestions
                          </span>
                        </div>
                        {filteredSuggestions.filter((s) => s.source === 'industry').map((s, i) => (
                          <button
                            key={`e-${i}`}
                            type="button"
                            onClick={() => handleSelectSuggestion(s)}
                            className="w-full text-left px-3 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border-b border-gray-50 dark:border-slate-700/50 last:border-0"
                          >
                            <div className="flex items-center gap-2">
                              <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', priorityConfig[s.priority].dot)} />
                              <span className="text-sm font-medium text-gray-800 dark:text-slate-200">{s.title}</span>
                              <span className={clsx('text-[9px] font-medium ml-auto flex-shrink-0', priorityConfig[s.priority].color)}>
                                {priorityConfig[s.priority].label}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5 ml-3.5 line-clamp-1">{s.description}</p>
                            <div className="flex items-center gap-2 mt-1 ml-3.5">
                              <span className="text-[9px] text-gray-400 dark:text-slate-500 flex items-center gap-0.5">
                                <Clock size={8} /> {s.estimatedHours}h
                              </span>
                              {s.tags.slice(0, 3).map((tag) => (
                                <span key={tag} className="text-[8px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
              <button onClick={handleAddTaskToProject} disabled={!newTaskTitle.trim()} className="px-4 py-2.5 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0">Add</button>
              <button onClick={() => { setShowAddTask(false); setShowSuggestions(false); setNewTaskDescription(''); }} className="px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors flex-shrink-0">Cancel</button>
            </div>
            {/* Description field — shown once user has typed a title */}
            {newTaskTitle.trim() && (
              <div className="mt-2">
                <textarea
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  rows={2}
                  placeholder="Task description (optional)…"
                  className={clsx(
                    'w-full rounded-lg px-4 py-2.5 text-sm resize-none',
                    'bg-white border border-gray-200 text-gray-800 placeholder-gray-400',
                    'dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500',
                    'focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                  )}
                />
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          {project.tasks.length === 0 ? (
            <div className="py-12 text-center">
              <AlertCircle size={32} className="mx-auto text-gray-300 dark:text-slate-600 mb-2" />
              <p className="text-sm text-gray-400 dark:text-slate-500">No tasks yet. Add tasks to get started.</p>
            </div>
          ) : (
            <>
            {[...project.tasks].sort((a, b) => (a.order ?? 999) - (b.order ?? 999)).map((task) => {
              const assignee = task.assignedTo ? assignableMembers.find((p) => p.id === task.assignedTo) : null;
              const pc = priorityConfig[task.priority];
              const isEditingThis = editingTaskId === task.id;
              return (
                <div key={task.id} className={clsx('flex flex-col gap-3 p-4 rounded-xl bg-white dark:bg-slate-800/50 border transition-shadow', isEditingThis ? 'border-purple-400 dark:border-purple-500 shadow-md' : 'border-gray-200 dark:border-slate-700 hover:shadow-sm sm:flex-row sm:items-center')}>
                  {isEditingThis ? (
                    /* ── Inline edit form ── */
                    <div className="flex-1 space-y-2">
                      <input
                        autoFocus
                        value={editingTaskValues.title}
                        onChange={(e) => setEditingTaskValues((v) => ({ ...v, title: e.target.value }))}
                        placeholder="Task title"
                        className="w-full px-3 py-2 rounded-lg text-sm font-semibold bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400"
                      />
                      <textarea
                        value={editingTaskValues.description}
                        onChange={(e) => setEditingTaskValues((v) => ({ ...v, description: e.target.value }))}
                        placeholder="Description (optional)"
                        rows={2}
                        className="w-full px-3 py-2 rounded-lg text-xs resize-none bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400"
                      />
                      <div className="flex items-center gap-2 flex-wrap">
                        <select
                          value={editingTaskValues.priority}
                          onChange={(e) => setEditingTaskValues((v) => ({ ...v, priority: e.target.value }))}
                          className="px-2 py-1.5 rounded-lg text-xs bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                        <div className="flex items-center gap-1">
                          <Clock size={11} className="text-gray-400" />
                          <input
                            type="number"
                            min={0.5}
                            step={0.5}
                            value={editingTaskValues.estimatedHours}
                            onChange={(e) => setEditingTaskValues((v) => ({ ...v, estimatedHours: parseFloat(e.target.value) || 0 }))}
                            className="w-16 px-2 py-1.5 rounded-lg text-xs bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                          />
                          <span className="text-xs text-gray-400">h</span>
                        </div>
                        <input
                          value={editingTaskValues.tags}
                          onChange={(e) => setEditingTaskValues((v) => ({ ...v, tags: e.target.value }))}
                          placeholder="Tags (comma-separated)"
                          className="flex-1 min-w-28 px-2 py-1.5 rounded-lg text-xs bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          onClick={() => setEditingTaskId(null)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-600 transition-colors"
                        >Cancel</button>
                        <button
                          onClick={() => {
                            if (!editingTaskValues.title.trim()) return;
                            updateProjectTask(project.id, task.id, {
                              title: editingTaskValues.title.trim(),
                              description: editingTaskValues.description.trim(),
                              priority: editingTaskValues.priority as ProjectTask['priority'],
                              estimatedHours: editingTaskValues.estimatedHours,
                              tags: editingTaskValues.tags.split(',').map((t) => t.trim()).filter(Boolean),
                            });
                            setEditingTaskId(null);
                          }}
                          disabled={!editingTaskValues.title.trim()}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >Save</button>
                      </div>
                    </div>
                  ) : (
                  /* ── Read view ── */
                  <>
                  {/* Task info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-slate-100">{task.title}</h4>
                      <span className={clsx('flex items-center gap-1 text-[10px] font-medium flex-shrink-0', pc.color)}>
                        <span className={clsx('w-1.5 h-1.5 rounded-full', pc.dot)} />
                        {pc.label}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-xs text-gray-500 dark:text-slate-400 line-clamp-2 sm:truncate">{task.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[10px] text-gray-400 dark:text-slate-500 flex items-center gap-1">
                        <Clock size={10} /> {task.estimatedHours}h
                      </span>
                      {task.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Assignee + actions — full width on mobile */}
                  <div className="flex items-center gap-2 flex-shrink-0 border-t sm:border-t-0 border-gray-100 dark:border-slate-700/50 pt-3 sm:pt-0">
                    {assignee ? (
                      <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
                        <button
                          onClick={() => openDmChat(assignee.id)}
                          className="flex items-center gap-2 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg px-2 py-1 transition-colors cursor-pointer"
                          title={`Chat with ${assignee.name}`}
                        >
                          <img src={assignee.avatar} alt={assignee.name} className="w-7 h-7 rounded-full ring-2 ring-transparent hover:ring-purple-400 transition-all" />
                          <span className="text-xs text-gray-600 dark:text-slate-300">{assignee.name.split(' ')[0]}</span>
                        </button>
                        {canManage && (
                          <select
                            value={task.assignedTo || ''}
                            onChange={(e) => {
                              if (e.target.value && e.target.value !== task.assignedTo) {
                                assignProjectTask(project.id, task.id, e.target.value);
                              }
                            }}
                            className={clsx(
                              'rounded-lg px-1.5 py-1 text-[10px] font-medium appearance-none cursor-pointer',
                              'bg-gray-100 border border-gray-200 text-gray-500',
                              'dark:bg-slate-700 dark:border-slate-600 dark:text-slate-400',
                              'hover:border-purple-400 dark:hover:border-purple-500',
                              'focus:outline-none focus:ring-2 focus:ring-purple-500/30'
                            )}
                            title="Reassign task"
                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M16 3h5v5'/%3E%3Cpath d='M8 21H3v-5'/%3E%3Cpath d='M21 3l-7 7'/%3E%3Cpath d='M3 21l7-7'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'center', backgroundSize: '12px', width: '28px', height: '28px', color: 'transparent' }}
                          >
                            {assignableMembers.map((p) => (
                              <option key={p.id} value={p.id} style={{ color: 'inherit' }}>{p.name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    ) : canManage ? (
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) assignProjectTask(project.id, task.id, e.target.value);
                        }}
                        className={clsx(
                          'rounded-lg px-3 py-2 sm:py-1 text-sm sm:text-xs flex-1 sm:flex-initial',
                          'bg-white border border-dashed border-gray-300 text-gray-400',
                          'dark:bg-slate-700 dark:border-slate-600 dark:text-slate-400',
                          'focus:outline-none focus:border-purple-500'
                        )}
                      >
                        <option value="">Assign...</option>
                        {assignableMembers.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs text-gray-400 dark:text-slate-500 italic">Unassigned</span>
                    )}

                    {(() => {
                      const isAssignedToMe = !!currentUserId && task.assignedTo === currentUserId;
                      const isOnBoard = !!task.linkedTaskId;
                      const isSelected = isAssignedToMe || isOnBoard;
                      if (isSelected) {
                        return (
                          <span
                            title={isOnBoard ? 'On your Tasks board' : 'Assigned to you'}
                            className="p-2 sm:p-1.5 rounded-lg text-emerald-500 dark:text-emerald-400"
                          >
                            <CheckCircle2 size={18} className="sm:w-4 sm:h-4 fill-emerald-500 dark:fill-emerald-400 text-white dark:text-slate-900" />
                          </span>
                        );
                      }
                      return (
                        <button
                          onClick={() => {
                            if (currentUserId) assignProjectTask(project.id, task.id, currentUserId);
                            handleCreateActualTask(task);
                          }}
                          title="Assign to me & add to Tasks board"
                          className="p-2 sm:p-1.5 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                        >
                          <CheckCircle2 size={18} className="sm:w-4 sm:h-4" />
                        </button>
                      );
                    })()}

                    {canManage && (
                      <button
                        onClick={() => {
                          setEditingTaskId(task.id);
                          setEditingTaskValues({
                            title: task.title,
                            description: task.description,
                            priority: task.priority,
                            estimatedHours: task.estimatedHours,
                            tags: task.tags.join(', '),
                          });
                        }}
                        className="p-2 sm:p-1.5 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                        title="Edit task"
                      >
                        <Pencil size={16} className="sm:w-3.5 sm:h-3.5" />
                      </button>
                    )}
                    {canManage && (
                      <button
                        onClick={() => setRemoveTaskConfirm({ id: task.id, title: task.title })}
                        className="p-2 sm:p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                        title="Remove task"
                      >
                        <Trash2 size={16} className="sm:w-3.5 sm:h-3.5" />
                      </button>
                    )}
                  </div>
                  </>
                  )}
                </div>
              );
            })}
            {/* Quick-add row at the bottom of the list */}
            <button
              onClick={() => { setShowAddTask(true); setTimeout(() => addTaskInputRef.current?.focus(), 50); }}
              className={clsx(
                'w-full flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed',
                'border-gray-200 dark:border-slate-700 text-gray-400 dark:text-slate-500',
                'hover:border-purple-400 hover:text-purple-500 dark:hover:border-purple-500 dark:hover:text-purple-400',
                'transition-colors text-sm font-medium'
              )}
            >
              <Plus size={15} />
              Add a task
            </button>
            </>
          )}
        </div>
      </div>

      {/* Remove project task confirm modal */}
      {removeTaskConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setRemoveTaskConfirm(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 w-full max-w-md z-10 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-5">
              <Trash2 size={28} className="text-red-500 dark:text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">Remove Task?</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
              Are you sure you want to remove "<strong className="text-gray-700 dark:text-slate-200">{removeTaskConfirm.title}</strong>"? This action cannot be undone.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setRemoveTaskConfirm(null)}
                className="px-6 py-2.5 rounded-lg text-sm font-medium bg-transparent hover:bg-gray-100 text-gray-600 border border-gray-300 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  removeProjectTask(project.id, removeTaskConfirm.id);
                  addToast({ type: 'success', title: 'Task removed', message: `"${removeTaskConfirm.title}" has been removed from this project.`, duration: 4000 });
                  setRemoveTaskConfirm(null);
                }}
                className="px-6 py-2.5 rounded-lg text-sm font-medium bg-red-500 hover:bg-red-600 text-white transition-colors"
              >
                Remove Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Edit Project Modal ─────────────────────────────────────────────────
const PROJECT_STATUSES = [
  { value: 'planning', label: 'Planning' },
  { value: 'active',   label: 'Active' },
  { value: 'on-hold',  label: 'On Hold' },
  { value: 'completed',label: 'Completed' },
] as const;

interface EditProjectModalProps {
  project: { id: string; name: string; description?: string; status: string };
  onClose: () => void;
  onSave: (id: string, updates: { name: string; description: string; status: string }) => void;
}
const EditProjectModal: React.FC<EditProjectModalProps> = ({ project, onClose, onSave }) => {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || '');
  const [status, setStatus] = useState(project.status);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(project.id, { name: name.trim(), description: description.trim(), status });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={clsx(
        'relative w-full max-w-md rounded-2xl shadow-2xl p-6 z-10',
        'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700'
      )}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">Edit Project</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1.5">Project Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={clsx(
                'w-full px-3 py-2.5 rounded-xl text-sm border',
                'bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100',
                'border-gray-200 dark:border-slate-600 placeholder-gray-400 dark:placeholder-slate-500',
                'focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400'
              )}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={clsx(
                'w-full px-3 py-2.5 rounded-xl text-sm border resize-none',
                'bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100',
                'border-gray-200 dark:border-slate-600 placeholder-gray-400 dark:placeholder-slate-500',
                'focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400'
              )}
              placeholder="What is this project about?"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1.5">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={clsx(
                'w-full px-3 py-2.5 rounded-xl text-sm border',
                'bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100',
                'border-gray-200 dark:border-slate-600',
                'focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 cursor-pointer'
              )}
            >
              {PROJECT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className={clsx(
              'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors',
              'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
            )}>Cancel</button>
            <button type="submit" disabled={!name.trim()} className={clsx(
              'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all',
              'bg-gradient-to-r from-purple-600 to-blue-600 text-white',
              'hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
            )}>Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main Projects Page ─────────────────────────────────────────────────
export const Projects: React.FC = () => {
  const { projects, deleteProject, updateProject } = useProjectStore();
  const { isAdmin, isManager } = useUserStore();
  const currentUserId = useUserStore((s) => s.user?.id ?? 'guest');
  const assignableMembers = useUserStore((s) => s.assignableMembers);
  const canManage = isAdmin() || isManager();
  const globalSearchQuery = useUIStore((s) => s.globalSearchQuery);
  const setGlobalSearchQuery = useUIStore((s) => s.setGlobalSearchQuery);
  const selectedProjectId = useUIStore((s) => s.activeProjectId);
  const setSelectedProjectId = useUIStore((s) => s.setActiveProjectId);
  const { addToast: addToastMain } = useToastStore();
  const [showCreate, setShowCreate] = useState(false);
  const [editProjectId, setEditProjectId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmInfo, setDeleteConfirmInfo] = useState<{ name: string; taskCount: number } | null>(null);

  // ── Long-press highlight ──────────────────────────────────────────────
  const highlightKey = `project-highlights-${currentUserId}`;
  const [highlightedProjects, setHighlightedProjects] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(highlightKey) || '[]')); } catch { return new Set(); }
  });
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  const startLongPress = (projectId: string) => {
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      setHighlightedProjects((prev) => {
        const next = new Set(prev);
        if (next.has(projectId)) { next.delete(projectId); } else { next.add(projectId); }
        try { localStorage.setItem(highlightKey, JSON.stringify([...next])); } catch {}
        return next;
      });
    }, 500);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  };

  // ── Sort state — persisted per user; 'custom' defers to drag order ─────
  const sortStorageKey = `project-sort-${currentUserId}`;
  type ProjectSortBy = 'custom' | 'highlighted' | 'createdAt' | 'updatedAt' | 'name';
  const [sortBy, setSortBy] = useState<ProjectSortBy>(() => {
    try { return JSON.parse(localStorage.getItem(sortStorageKey) || 'null')?.sortBy || 'custom'; } catch { return 'custom'; }
  });
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(() => {
    try { return JSON.parse(localStorage.getItem(sortStorageKey) || 'null')?.sortDir || 'desc'; } catch { return 'desc'; }
  });
  useEffect(() => {
    try { localStorage.setItem(sortStorageKey, JSON.stringify({ sortBy, sortDir })); } catch {}
  }, [sortBy, sortDir, sortStorageKey]);

  const sortLabels: Record<ProjectSortBy, string> = {
    custom: 'Custom Order',
    highlighted: 'Highlighted First',
    createdAt: 'Date Created',
    updatedAt: 'Date Updated',
    name: 'Name',
  };
  const [showSortMenu, setShowSortMenu] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setShowSortMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Drag-to-reorder state ──────────────────────────────────────────────
  const storageKey = `project-order-${currentUserId}`;
  const [projectOrder, setProjectOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : projects.map((p) => p.id);
    } catch {
      return projects.map((p) => p.id);
    }
  });
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const dragIdRef = useRef<string | null>(null);
  // Track whether a drag actually moved so we can swallow the resulting click
  const didDragRef = useRef(false);

  // Sync order when projects list changes (add/delete)
  useEffect(() => {
    setProjectOrder((prev) => {
      const existingIds = new Set(projects.map((p) => p.id));
      const newIds = projects.map((p) => p.id).filter((id) => !prev.includes(id));
      const merged = [...prev.filter((id) => existingIds.has(id)), ...newIds];
      localStorage.setItem(storageKey, JSON.stringify(merged));
      return merged;
    });
  }, [projects, storageKey]);

  const handleDragStart = (e: React.DragEvent, projectId: string) => {
    dragIdRef.current = projectId;
    didDragRef.current = true;
    setDraggingId(projectId);
    e.dataTransfer.effectAllowed = 'move';
    const ghost = document.createElement('div');
    ghost.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    requestAnimationFrame(() => document.body.removeChild(ghost));
  };

  const handleDragOver = (e: React.DragEvent, projectId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragIdRef.current && dragIdRef.current !== projectId) {
      setDragOverId(projectId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, projectId: string) => {
    // Only clear when leaving the card entirely (not crossing into a child element)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      if (dragOverId === projectId) setDragOverId(null);
    }
  };

  const handleDrop = (e: React.DragEvent, toId: string) => {
    e.preventDefault();
    const fromId = dragIdRef.current;
    setDragOverId(null);
    setDraggingId(null);
    dragIdRef.current = null;
    if (!fromId || fromId === toId) return;
    setProjectOrder((prev) => {
      const next = [...prev];
      const fromIdx = next.indexOf(fromId);
      const toIdx = next.indexOf(toId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      next.splice(fromIdx, 1);
      next.splice(toIdx, 0, fromId);
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };

  const handleDragEnd = () => {
    setDragOverId(null);
    setDraggingId(null);
    dragIdRef.current = null;
    // Reset after a tick so the click handler that fires after dragend can check it
    setTimeout(() => { didDragRef.current = false; }, 50);
  };

  // globalSearchQuery is shared with TopBar — typing in either filters the grid
  const filteredProjects = globalSearchQuery.trim()
    ? projects.filter((p) => {
        const q = globalSearchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.status.toLowerCase().includes(q) ||
          p.templateId.toLowerCase().includes(q)
        );
      })
    : projects;

  // Apply the selected sort to the (possibly filtered) list.
  // 'custom' defers to the user's drag order; 'highlighted' pins highlighted
  // projects to the top (custom order as tie-breaker within each group);
  // date/name sorts respect sortDir.
  const customOrderCompare = (a: Project, b: Project) => {
    const ai = projectOrder.indexOf(a.id);
    const bi = projectOrder.indexOf(b.id);
    return (ai === -1 ? 9999 : ai) - (bi === -1 ? 9999 : bi);
  };
  const orderedProjects = [...filteredProjects].sort((a, b) => {
    if (sortBy === 'custom') return customOrderCompare(a, b);
    if (sortBy === 'highlighted') {
      const ah = highlightedProjects.has(a.id) ? 0 : 1;
      const bh = highlightedProjects.has(b.id) ? 0 : 1;
      return ah !== bh ? ah - bh : customOrderCompare(a, b);
    }
    const cmp = sortBy === 'name'
      ? a.name.localeCompare(b.name)
      : new Date(a[sortBy]).getTime() - new Date(b[sortBy]).getTime();
    return sortDir === 'asc' ? cmp : -cmp;
  });

  if (selectedProjectId) {
    return <ProjectDetail projectId={selectedProjectId} onBack={() => setSelectedProjectId(null)} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-3">
            <FolderKanban size={28} className="text-purple-600 dark:text-purple-400" />
            Projects
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Manage your team's projects and tasks</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowCreate(true)}
            className={clsx(
              'w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2',
              'bg-gradient-to-r from-purple-600 to-blue-600 text-white',
              'shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40',
              'hover:from-purple-700 hover:to-blue-700 transition-all'
            )}
          >
            <Plus size={18} /> New Project
          </button>
        )}
      </div>

      {/* Search + sort — search synced with TopBar global search */}
      {projects.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative max-w-sm w-full sm:flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={globalSearchQuery}
              onChange={(e) => setGlobalSearchQuery(e.target.value)}
              placeholder="Search projects..."
              className={clsx(
                'w-full pl-9 pr-9 py-2 text-sm rounded-xl border',
                'bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100',
                'border-gray-200 dark:border-slate-700',
                'placeholder-gray-400 dark:placeholder-slate-500',
                'focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 dark:focus:border-purple-500',
                'transition-all'
              )}
            />
            {globalSearchQuery && (
              <button
                onClick={() => setGlobalSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div ref={sortMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setShowSortMenu((v) => !v)}
                className={clsx(
                  'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                  'bg-white border border-gray-200 text-gray-700',
                  'dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200',
                  'hover:border-purple-400 dark:hover:border-purple-500',
                  showSortMenu && 'border-purple-500 dark:border-purple-500'
                )}
              >
                {sortLabels[sortBy]}
                <ChevronDown size={14} className={clsx('transition-transform', showSortMenu && 'rotate-180')} />
              </button>

              {showSortMenu && (
                <div className={clsx(
                  'absolute top-full left-0 mt-2 w-44 rounded-xl shadow-xl overflow-hidden z-50 py-1',
                  'bg-white border border-gray-200',
                  'dark:bg-slate-800 dark:border-slate-700'
                )}>
                  {(Object.keys(sortLabels) as ProjectSortBy[]).map((key) => {
                    const isSelected = sortBy === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => { setSortBy(key); setShowSortMenu(false); }}
                        className={clsx(
                          'w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
                          isSelected
                            ? 'bg-purple-50 text-purple-700 font-semibold dark:bg-purple-900/20 dark:text-purple-300'
                            : 'text-gray-700 hover:bg-gray-50 dark:text-slate-200 dark:hover:bg-slate-700/50'
                        )}
                      >
                        <Check size={14} className={clsx(isSelected ? 'opacity-100' : 'opacity-0', 'flex-shrink-0')} />
                        {sortLabels[key]}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {sortBy !== 'custom' && sortBy !== 'highlighted' && (
              <button
                onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                title={sortDir === 'asc' ? 'Ascending — click for descending' : 'Descending — click for ascending'}
                className={clsx(
                  'p-2 rounded-xl border transition-colors',
                  'bg-white border-gray-200 text-gray-600 hover:border-purple-400 hover:text-purple-600',
                  'dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:border-purple-500 dark:hover:text-purple-400'
                )}
              >
                {sortDir === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Project grid */}
      {projects.length === 0 ? (
        <div className="py-20 text-center">
          <FolderKanban size={48} className="mx-auto text-gray-300 dark:text-slate-600 mb-3" />
          <p className="text-lg font-medium text-gray-400 dark:text-slate-500">No projects yet</p>
          <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">Create a project to organize your team's work</p>
          {canManage && (
            <button
              onClick={() => setShowCreate(true)}
              className={clsx(
                'mt-5 px-5 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center gap-2',
                'bg-gradient-to-r from-purple-600 to-blue-600 text-white',
                'shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40',
                'hover:from-purple-700 hover:to-blue-700 transition-all'
              )}
            >
              <Plus size={18} /> Create Your First Project
            </button>
          )}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="py-16 text-center">
          <Search size={36} className="mx-auto text-gray-300 dark:text-slate-600 mb-3" />
          <p className="text-base font-medium text-gray-400 dark:text-slate-500">No projects match &ldquo;{globalSearchQuery}&rdquo;</p>
          <button onClick={() => setGlobalSearchQuery('')} className="mt-3 text-sm text-purple-600 dark:text-purple-400 hover:underline">Clear search</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orderedProjects.map((project) => {
            const sc = statusConfig[project.status];
            const totalHours = project.tasks.reduce((sum, t) => sum + t.estimatedHours, 0);
            const members = [...new Set(project.tasks.map((t) => t.assignedTo).filter(Boolean))] as string[];
            const isDraggingThis = draggingId === project.id;
            const isDropTarget = dragOverId === project.id;
            const isHighlighted = highlightedProjects.has(project.id);

            return (
              <div
                key={project.id}
                draggable={sortBy === 'custom'}
                onDragStart={(e) => handleDragStart(e, project.id)}
                onDragOver={(e) => handleDragOver(e, project.id)}
                onDrop={(e) => handleDrop(e, project.id)}
                onDragEnd={handleDragEnd}
                onDragLeave={(e) => handleDragLeave(e, project.id)}
                onMouseDown={() => startLongPress(project.id)}
                onMouseUp={cancelLongPress}
                onMouseLeave={cancelLongPress}
                onTouchStart={() => startLongPress(project.id)}
                onTouchEnd={cancelLongPress}
                onTouchMove={cancelLongPress}
                className={clsx(
                  'relative rounded-2xl border text-left transition-all duration-150 group',
                  sortBy === 'custom' && 'cursor-grab active:cursor-grabbing',
                  isHighlighted
                    ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-400 dark:border-amber-500 ring-2 ring-amber-400/40 shadow-lg shadow-amber-500/10'
                    : 'bg-white dark:bg-slate-800/50',
                  !isHighlighted && (isDropTarget
                    ? 'border-purple-400 dark:border-purple-500 ring-2 ring-purple-400/40 shadow-lg shadow-purple-500/20 scale-[1.02]'
                    : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 hover:shadow-lg'),
                  isDraggingThis && 'opacity-30 scale-95 shadow-none',
                )}
              >
                {/* Grip handle — visual affordance only; dragging is handled by the card div */}
                {sortBy === 'custom' && (
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 dark:text-slate-600 z-10 select-none pointer-events-none">
                    <GripVertical size={16} />
                  </div>
                )}
              <button
                onClick={() => { if (didDragRef.current) return; if (longPressTriggered.current) { longPressTriggered.current = false; return; } setSelectedProjectId(project.id); }}
                className="w-full p-5 pl-7 text-left cursor-inherit"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden"
                      style={{ backgroundColor: `${project.color}15`, color: project.color }}
                    >
                      {renderProjectIcon(project, 20)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                        {project.name}
                      </h3>
                      <span className={clsx('text-[10px] font-semibold px-2 py-0.5 rounded-full', sc.bg, sc.color)}>
                        {sc.label}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {canManage && (
                      <>
                        {/* Edit button */}
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => { e.stopPropagation(); setEditProjectId(project.id); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setEditProjectId(project.id); } }}
                          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-all"
                          title="Edit project"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </span>
                        {/* Delete button */}
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(project.id);
                            setDeleteConfirmInfo({ name: project.name, taskCount: project.tasks.length });
                          }}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setDeleteConfirmId(project.id); setDeleteConfirmInfo({ name: project.name, taskCount: project.tasks.length }); } }}
                          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-all"
                          title="Delete project"
                        >
                          <Trash2 size={14} />
                        </span>
                      </>
                    )}
                    <ChevronRight size={16} className="text-gray-300 dark:text-slate-600 group-hover:text-purple-500 transition-colors" />
                  </div>
                </div>

                {project.description && (
                  <p className="text-xs text-gray-500 dark:text-slate-400 line-clamp-2 mb-2">{project.description}</p>
                )}

                {/* Extra info: template type + date */}
                <div className="flex items-center gap-2 mb-3 text-[10px] text-gray-400 dark:text-slate-500">
                  <span className="capitalize">{project.templateId.replace('-', ' ')}</span>
                  <span>&middot;</span>
                  <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                  {members.length > 0 && (
                    <>
                      <span>&middot;</span>
                      <span>{members.length} member{members.length !== 1 ? 's' : ''}</span>
                    </>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 dark:text-slate-500 flex items-center gap-1">
                      <Layers size={12} /> {project.tasks.length} tasks
                    </span>
                    <span className="text-xs text-gray-400 dark:text-slate-500 flex items-center gap-1">
                      <Clock size={12} /> {totalHours}h
                    </span>
                  </div>
                  {/* Member avatars with tooltip */}
                  {members.length > 0 && (() => {
                    const memberInfos: MemberInfo[] = members.map((uid) => {
                      const p = assignableMembers.find((t) => t.id === uid);
                      if (!p) return null;
                      // Only the project creator is "Owner"; everyone else is a "Member"
                      const isCreator = uid === project.createdBy;
                      return {
                        id: p.id,
                        name: p.name,
                        avatar: p.avatar,
                        role: isCreator ? 'owner' as const : 'member' as const,
                      };
                    }).filter(Boolean) as MemberInfo[];
                    // Sort so owner appears first
                    memberInfos.sort((a, b) => (a.role === 'owner' ? -1 : b.role === 'owner' ? 1 : 0));
                    return (
                      <MemberTooltip
                        members={memberInfos}
                        canInvite={false}
                      />
                    );
                  })()}
                </div>
              </button>
              </div>
            );
          })}

          {/* Add Project card */}
          {canManage && (
            <button
              onClick={() => setShowCreate(true)}
              className={clsx(
                'p-5 rounded-2xl border-2 border-dashed text-center transition-all group',
                'flex flex-col items-center justify-center gap-3 min-h-[180px]',
                'border-gray-300 dark:border-slate-600',
                'hover:border-purple-400 dark:hover:border-purple-500',
                'hover:bg-purple-50/50 dark:hover:bg-purple-900/10',
                'hover:shadow-lg'
              )}
            >
              <div className={clsx(
                'w-12 h-12 rounded-xl flex items-center justify-center',
                'bg-gray-100 dark:bg-slate-700/50',
                'group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30',
                'transition-colors'
              )}>
                <Plus size={24} className="text-gray-400 dark:text-slate-500 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-500 dark:text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  Add Project
                </p>
                <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">
                  Choose a template to get started
                </p>
              </div>
            </button>
          )}
        </div>
      )}

      <CreateProjectModal isOpen={showCreate} onClose={() => setShowCreate(false)} />

      {/* Delete confirmation modal */}
      {deleteConfirmId && deleteConfirmInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => { setDeleteConfirmId(null); setDeleteConfirmInfo(null); }}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 w-full max-w-md z-10 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-5">
              <Trash2 size={28} className="text-red-500 dark:text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">Delete Project?</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
              Are you sure you want to delete "<strong className="text-gray-700 dark:text-slate-200">{deleteConfirmInfo.name}</strong>" and all its {deleteConfirmInfo.taskCount} tasks? This action cannot be undone.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => { setDeleteConfirmId(null); setDeleteConfirmInfo(null); }}
                className="px-6 py-2.5 rounded-lg text-sm font-medium bg-transparent hover:bg-gray-100 text-gray-600 border border-gray-300 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const name = deleteConfirmInfo.name;
                  try { deleteProject(deleteConfirmId); } catch (err) { console.error('[Projects] deleteProject error:', err); }
                  setDeleteConfirmId(null); setDeleteConfirmInfo(null);
                  addToastMain({ type: 'success', title: 'Project deleted', message: `"${name}" has been deleted.`, duration: 4000 });
                }}
                className="px-6 py-2.5 rounded-lg text-sm font-medium bg-red-500 hover:bg-red-600 text-white transition-colors"
              >
                Delete Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {editProjectId && (() => {
        const proj = projects.find((p) => p.id === editProjectId);
        return proj ? (
          <EditProjectModal
            project={{ id: proj.id, name: proj.name, description: proj.description, status: (proj as any).status || 'active' }}
            onClose={() => setEditProjectId(null)}
            onSave={(id, updates) => updateProject(id, updates as any)}
          />
        ) : null;
      })()}
    </div>
  );
};
