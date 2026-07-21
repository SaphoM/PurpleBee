import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  ArrowRight,
} from 'lucide-react';
import { useTaskStore } from '@stores/taskStore';
import { useProjectStore } from '@stores/projectStore';
import { useUserStore } from '@stores/userStore';
import { useChatStore } from '@stores/chatStore';
import { TaskPriority, TaskStatus } from '@/types/index';

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: Date;
  actions?: ChatAction[];
}

interface ChatAction {
  label: string;
  value: string;
}

type ConversationStep =
  | 'idle'
  // Create Task flow — after picking a project, shows the user's own
  // existing tasks there (pick one to add details to it) plus the option
  // to type a brand-new title.
  | 'create-ask-project'
  | 'create-ask-project-more'
  | 'create-pick-task-or-title'
  | 'create-ask-title'
  | 'create-ask-subtask'
  | 'create-ask-subtask-more'
  | 'create-ask-description'
  | 'create-ask-status'
  | 'create-ask-priority'
  | 'create-ask-due-date'
  | 'create-ask-hours'
  | 'create-ask-tags'
  // Edit Task flow — existing tasks only. Picking a project + an existing
  // task drops into this menu-driven loop. Each action applies and persists
  // immediately, so there's nothing staged to lose — "Done Editing" just
  // returns to the main menu.
  | 'edit-ask-project'
  | 'edit-ask-project-more'
  | 'edit-pick-task'
  | 'edit-menu'
  | 'edit-description'
  | 'edit-subtask-add'
  | 'edit-subtask-add-more'
  | 'edit-subtask-toggle'
  | 'edit-progress'
  | 'edit-progress-custom'
  | 'edit-status'
  | 'edit-priority'
  | 'edit-due-date'
  | 'edit-hours'
  | 'edit-tags'
  // Delete Task flow
  | 'delete-ask-task'
  | 'delete-ask-reason';

interface PendingCreate {
  projectId?: string;
  projectName?: string;
  assigneeId?: string;
  assigneeName?: string;
  mode?: 'create' | 'update';
  newTaskTitle?: string;      // set when mode === 'create'
  existingTaskId?: string;    // set when mode === 'update'
  existingTaskTitle?: string; // set when mode === 'update'
  pickList?: { id: string; title: string }[];
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
  estimatedHours?: number;
  tags?: string[];
  subtasks?: string[];
  // Edit Task flow only — sign of the in-progress custom progress adjustment
  // (Custom +/- both route through edit-progress-custom, this remembers which)
  progressCustomSign?: 1 | -1;
}

interface PendingDelete {
  taskId?: string;
  taskTitle?: string;
}

// Integration status check
const isWhatsAppConfigured = Boolean(import.meta.env.VITE_WHATSAPP_PHONE_ID);
const isTelegramConfigured = Boolean(import.meta.env.VITE_TELEGRAM_BOT_TOKEN);

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const TelegramIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);

const GREETING_ACTIONS: ChatAction[] = [
  { label: 'Create a Task', value: 'create-a-task' },
  { label: 'Edit Task', value: 'edit-a-task' },
  { label: 'Delete a Task', value: 'delete-a-task' },
];

const GREETING_TEXT = "👋 Hi! I'm Purple Bee. What would you like to do?";

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// Quick-pick due-date options — every value here must be something
// parseNaturalDate() already understands, except 'custom-date' which is
// intercepted to prompt for typed input instead. Mirrors the same set
// offered as a tappable keyboard on Telegram, for parity across channels.
const DUE_DATE_QUICK_OPTIONS: ChatAction[] = [
  { label: 'Today', value: 'today' },
  { label: 'Tomorrow', value: 'tomorrow' },
  { label: 'Friday', value: 'friday' },
  { label: 'Next week', value: 'next week' },
  { label: 'Custom date', value: 'custom-date' },
];

function toDateOnlyString(d: Date): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

// Accepts "today", "tomorrow", weekday names ("friday", "next friday"),
// "next week", or a literal YYYY-MM-DD. Returns null if unrecognized.
function parseNaturalDate(raw: string): string | null {
  const input = raw.trim().toLowerCase();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (/^\d{4}-\d{2}-\d{2}$/.test(input) && !isNaN(Date.parse(input))) {
    return input;
  }
  if (input === 'today') {
    return toDateOnlyString(today);
  }
  if (input === 'tomorrow') {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return toDateOnlyString(d);
  }
  if (input === 'next week') {
    const d = new Date(today);
    d.setDate(d.getDate() + 7);
    return toDateOnlyString(d);
  }
  const weekdayMatch = input.match(/^(next\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)$/);
  if (weekdayMatch) {
    const isNext = Boolean(weekdayMatch[1]);
    const targetDay = WEEKDAYS.indexOf(weekdayMatch[2]);
    const d = new Date(today);
    let diff = (targetDay - d.getDay() + 7) % 7;
    if (diff === 0 || isNext) diff += 7;
    d.setDate(d.getDate() + diff);
    return toDateOnlyString(d);
  }
  return null;
}

function progressBar(progress: number): string {
  const filled = Math.round(Math.max(0, Math.min(100, progress)) / 10);
  return `${'█'.repeat(filled)}${'░'.repeat(10 - filled)} ${progress}%`;
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  'todo': 'To Do',
  'in-progress': 'In Progress',
  'review': 'Review',
  'completed': 'Completed',
};

export const ChatBot: React.FC = () => {
  const { chatBotOpen: isOpen, setChatBotOpen: setIsOpen } = useChatStore();
  const [input, setInput] = useState('');
  const [step, setStep] = useState<ConversationStep>('idle');
  const [pendingCreate, setPendingCreate] = useState<PendingCreate>({});
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>({});
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', sender: 'bot', text: GREETING_TEXT, timestamp: new Date(), actions: GREETING_ACTIONS },
  ]);

  const { addTask, updateTask, deleteTask } = useTaskStore();
  const tasks = useTaskStore((s) => s.tasks);
  const projects = useProjectStore((s) => s.projects);
  const user = useUserStore((s) => s.user);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const addBotMessage = (text: string, actions?: ChatAction[]) => {
    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, sender: 'bot', text, timestamp: new Date(), actions },
    ]);
  };

  const addUserMessage = (text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, sender: 'user', text, timestamp: new Date() },
    ]);
  };

  const showGreeting = () => {
    setStep('idle');
    setPendingCreate({});
    setPendingDelete({});
    addBotMessage(GREETING_TEXT, GREETING_ACTIONS);
  };

  // ── Create Task helpers ────────────────────────────────────────────────
  // Only projects the current user is actually assigned a task in — never
  // show projects they have no involvement with. Checked against the real
  // task list (taskStore), not project.tasks — that's a separate seed
  // checklist/template array (ids like 'pt-1') unrelated to actual tasks.
  const myProjects = () => projects.filter((p) => tasks.some((t) => t.projectId === p.id && t.assignedTo === user?.id));

  const topProjects = () =>
    [...myProjects()].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const projectActions = (list: typeof projects, offerMore: boolean): ChatAction[] => [
    ...list.map((p) => ({ label: `${p.icon} ${p.name}`, value: `project:${p.id}` })),
    ...(offerMore ? [{ label: 'More', value: 'more-projects' }] : []),
  ];

  const startCreateTaskFlow = () => {
    setPendingCreate({});
    const top3 = topProjects().slice(0, 3);
    if (top3.length === 0) {
      addBotMessage("⚠️ You're not assigned to any projects yet. Ask an admin to add you to one first.", GREETING_ACTIONS);
      setStep('idle');
      return;
    }
    setStep('create-ask-project');
    addBotMessage('Which project is this task for?', projectActions(top3, myProjects().length > 3));
  };

  const handleProjectChosen = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    const myTasksInProject = tasks
      .filter((t) => t.projectId === project.id && t.assignedTo === user?.id)
      .map((t) => ({ id: t.id, title: t.title }));

    setPendingCreate((prev) => ({
      ...prev,
      projectId: project.id,
      projectName: project.name,
      assigneeId: user?.id,
      assigneeName: user?.name,
      pickList: myTasksInProject,
    }));
    setStep('create-pick-task-or-title');

    let msg = `✅ Project: ${project.icon} ${project.name} — 💜 In-App\n\n`;
    if (myTasksInProject.length > 0) {
      msg += `Your tasks in this project:\n`;
      myTasksInProject.forEach((t, i) => { msg += `${i + 1}. ${t.title}\n`; });
      msg += `\nReply with a number to select a task, or type a new task title to create one.`;
    } else {
      msg += `No existing tasks assigned to you in this project yet.\n\nType a new task title to create one.`;
    }
    addBotMessage(msg);
  };

  // ── Edit Task helpers (existing tasks only) ──────────────────────────────
  const startEditTaskFlow = () => {
    setPendingCreate({});
    const top3 = topProjects().slice(0, 3);
    if (top3.length === 0) {
      addBotMessage("⚠️ You're not assigned to any projects yet. Ask an admin to add you to one first.", GREETING_ACTIONS);
      setStep('idle');
      return;
    }
    setStep('edit-ask-project');
    addBotMessage('Which project is the task in?', projectActions(top3, myProjects().length > 3));
  };

  const handleEditProjectChosen = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    const myTasks = tasks.filter((t) => t.projectId === project.id && t.assignedTo === user?.id).slice(0, 8);

    if (myTasks.length === 0) {
      addBotMessage(
        `✅ Project: ${project.icon} ${project.name} — 💜 In-App\n\nNo existing tasks in this project yet.`,
        GREETING_ACTIONS
      );
      setStep('idle');
      return;
    }

    setPendingCreate((prev) => ({
      ...prev,
      projectId: project.id,
      projectName: project.name,
      pickList: myTasks.map((t) => ({ id: t.id, title: t.title })),
    }));

    let msg = `✅ Project: ${project.icon} ${project.name} — 💜 In-App\n\n`;
    msg += `Which task would you like to edit?\n`;
    myTasks.forEach((t, i) => { msg += `${i + 1}. ${t.title}\n`; });
    msg += `\nReply with a number.`;

    setStep('edit-pick-task');
    addBotMessage(msg);
  };

  const startDeleteTaskFlow = () => {
    setPendingDelete({});
    // Only your own tasks (or legacy tasks with no tracked creator) show up
    // here — you can't even see, let alone select, someone else's task.
    const deletable = tasks.filter(
      (t) => (t.status === 'todo' || t.status === 'in-progress') && (!t.createdBy || t.createdBy === user?.id)
    );
    if (deletable.length === 0) {
      addBotMessage('⚠️ No tasks in To Do or In Progress to delete right now.', GREETING_ACTIONS);
      setStep('idle');
      return;
    }
    setStep('delete-ask-task');
    addBotMessage(
      'Which task would you like to delete?',
      deletable.map((t) => {
        const proj = projects.find((p) => p.id === t.projectId);
        return { label: `${t.title} — ${proj?.name || 'No project'}`, value: `task:${t.id}` };
      })
    );
  };

  // ── Edit Task flow (existing tasks only) ─────────────────────────────
  // Menu-driven, not linear: every action applies + persists immediately via
  // updateTask, shows a real-time confirmation, then redraws this same menu.
  const showEditMenu = (taskId: string) => {
    // Reads the store directly (not the `tasks` closure) — showEditMenu is
    // always called right after updateTask() in the same synchronous handler,
    // before React has re-rendered this component with the new `tasks` prop.
    const task = useTaskStore.getState().tasks.find((t) => t.id === taskId);
    if (!task) {
      addBotMessage('⚠️ That task no longer exists.', GREETING_ACTIONS);
      setStep('idle');
      return;
    }
    const subtaskCount = task.subtasks?.length || 0;
    const msg =
      `📋 ${task.title}\n` +
      `Status: ${STATUS_LABELS[task.status]} | Priority: ${task.priority[0].toUpperCase()}${task.priority.slice(1)}\n` +
      `${progressBar(task.progress)}`;
    const actions: ChatAction[] = [
      { label: '➕ Add Subtask', value: 'edit-subtask-add' },
      ...(subtaskCount > 0 ? [{ label: '☑️ Toggle Subtask', value: 'edit-subtask-toggle' }] : []),
      { label: '📊 Adjust Progress', value: 'edit-progress' },
      { label: '🔄 Change Status', value: 'edit-status' },
      { label: '🔥 Change Priority', value: 'edit-priority' },
      { label: '📝 Edit Description', value: 'edit-description' },
      { label: '📅 Change Due Date', value: 'edit-due-date' },
      { label: '⏱️ Change Hours', value: 'edit-hours' },
      { label: '🏷️ Edit Tags', value: 'edit-tags' },
      { label: '✅ Done Editing', value: 'edit-done' },
    ];
    setStep('edit-menu');
    addBotMessage(msg, actions);
  };

  // Create flow only creates brand-new tasks now — editing existing ones is
  // its own flow (startEditTaskFlow → edit-pick-task → showEditMenu).
  const finishCreateTask = (finalCreate: PendingCreate) => {
    const newSubtasks = (finalCreate.subtasks || []).map((title, i) => ({
      id: `chat-sub-${Date.now()}-${i}`,
      title,
      completed: false,
      createdAt: new Date(),
    }));

    if (finalCreate.mode === 'update' && finalCreate.existingTaskId) {
      const existing = tasks.find((t) => t.id === finalCreate.existingTaskId);
      updateTask(finalCreate.existingTaskId, {
        description: finalCreate.description,
        status: finalCreate.status || existing?.status || 'todo',
        priority: finalCreate.priority || existing?.priority || 'medium',
        dueDate: finalCreate.dueDate ? new Date(finalCreate.dueDate) : existing?.dueDate,
        estimatedHours: finalCreate.estimatedHours,
        tags: finalCreate.tags || [],
        subtasks: [...(existing?.subtasks || []), ...newSubtasks],
      });
      addBotMessage(
        `✅ Task updated! "${finalCreate.existingTaskTitle}" in ${finalCreate.projectName || 'your project'} now has your changes.`
      );
    } else {
      addTask({
        title: finalCreate.newTaskTitle || 'Untitled Task',
        description: finalCreate.description,
        status: finalCreate.status || 'todo',
        priority: finalCreate.priority || 'medium',
        projectId: finalCreate.projectId,
        assignedTo: finalCreate.assigneeId,
        createdBy: user?.id,
        dueDate: finalCreate.dueDate ? new Date(finalCreate.dueDate) : undefined,
        estimatedHours: finalCreate.estimatedHours,
        tags: finalCreate.tags || [],
        subtasks: newSubtasks,
        progress: 0,
        sourceChannel: 'in-app',
      });
      addBotMessage(
        `✅ Task created! "${finalCreate.newTaskTitle}" has been added to ${finalCreate.projectName || 'your project'}.`
      );
    }
    showGreeting();
  };

  // displayText lets a button click show its clean label in the chat
  // ("Create a Task") while the raw value ("create-a-task") still drives
  // the actual step logic below — free-typed input has no such split.
  const processInput = (userInput: string, displayText?: string) => {
    const text = userInput.trim();
    if (!text) return;

    addUserMessage(displayText ?? text);
    const lower = text.toLowerCase();

    switch (step) {
      // ── Greeting / Main menu ──────────────────────────────────────
      case 'idle': {
        if (text === 'create-a-task' || lower.includes('create a task')) {
          startCreateTaskFlow();
        } else if (text === 'edit-a-task' || lower.includes('edit a task') || lower.includes('edit task')) {
          startEditTaskFlow();
        } else if (text === 'delete-a-task' || lower.includes('delete a task')) {
          startDeleteTaskFlow();
        } else {
          addBotMessage(GREETING_TEXT, GREETING_ACTIONS);
        }
        break;
      }

      // ── FLOW 1: CREATE A TASK (brand-new tasks only) ────────────────
      case 'create-ask-project': {
        const top3 = topProjects().slice(0, 3);
        const hasMore = myProjects().length > 3;
        if (text === 'more-projects' && hasMore) {
          setStep('create-ask-project-more');
          addBotMessage('All your projects:', projectActions(topProjects(), false));
          return;
        }
        if (text.startsWith('project:')) {
          handleProjectChosen(text.split(':')[1]);
        } else {
          addBotMessage('Please pick one of the projects shown.', projectActions(top3, hasMore));
        }
        break;
      }

      case 'create-ask-project-more': {
        if (text.startsWith('project:')) {
          handleProjectChosen(text.split(':')[1]);
        } else {
          addBotMessage('Please pick one of the projects shown.', projectActions(topProjects(), false));
        }
        break;
      }

      case 'create-pick-task-or-title': {
        const num = parseInt(text, 10);
        const list = pendingCreate.pickList || [];
        let confirmLine: string;
        if (text && !isNaN(num) && num >= 1 && num <= list.length) {
          const picked = list[num - 1];
          setPendingCreate((prev) => ({ ...prev, mode: 'update', existingTaskId: picked.id, existingTaskTitle: picked.title }));
          confirmLine = `✅ Selected: ${picked.title}`;
        } else {
          if (!text) {
            addBotMessage('Reply with a number to select a task, or type a new task title to create one.');
            return;
          }
          setPendingCreate((prev) => ({ ...prev, mode: 'create', newTaskTitle: text }));
          confirmLine = `✅ New task: ${text}`;
        }
        setStep('create-ask-description');
        addBotMessage(`${confirmLine}\n\nWhat's the task description?`);
        break;
      }

      case 'create-ask-title': {
        if (!text) {
          addBotMessage("Please enter a task title.");
          return;
        }
        setPendingCreate((prev) => ({ ...prev, newTaskTitle: text }));
        setStep('create-ask-description');
        addBotMessage(`✅ New task: ${text}\n\nWhat's the task description?`);
        break;
      }

      // ── FLOW: EDIT A TASK (existing tasks only) ──────────────────────
      case 'edit-ask-project': {
        const top3 = topProjects().slice(0, 3);
        const hasMore = myProjects().length > 3;
        if (text === 'more-projects' && hasMore) {
          setStep('edit-ask-project-more');
          addBotMessage('All your projects:', projectActions(topProjects(), false));
          return;
        }
        if (text.startsWith('project:')) {
          handleEditProjectChosen(text.split(':')[1]);
        } else {
          addBotMessage('Please pick one of the projects shown.', projectActions(top3, hasMore));
        }
        break;
      }

      case 'edit-ask-project-more': {
        if (text.startsWith('project:')) {
          handleEditProjectChosen(text.split(':')[1]);
        } else {
          addBotMessage('Please pick one of the projects shown.', projectActions(topProjects(), false));
        }
        break;
      }

      case 'edit-pick-task': {
        const list = pendingCreate.pickList || [];
        const num = parseInt(text.trim(), 10);
        const picked = list[num - 1];
        if (!picked) {
          addBotMessage('Please reply with a valid number.');
          return;
        }
        setPendingCreate((prev) => ({ ...prev, mode: 'update', existingTaskId: picked.id, existingTaskTitle: picked.title }));
        showEditMenu(picked.id);
        break;
      }

      case 'create-ask-description': {
        if (!text) {
          addBotMessage("This field is required. What's the task description?");
          return;
        }
        setPendingCreate((prev) => ({ ...prev, description: text }));
        setStep('create-ask-subtask');
        addBotMessage('Would you like to add subtasks?', [
          { label: 'Add Subtask', value: 'add-subtask' },
          { label: 'Skip', value: 'skip' },
        ]);
        break;
      }

      case 'create-ask-status': {
        const sMap: Record<string, TaskStatus> = {
          'todo': 'todo', 'to do': 'todo',
          'in-progress': 'in-progress', 'in progress': 'in-progress',
          'review': 'review',
        };
        const s = sMap[lower];
        if (!s) {
          addBotMessage('Please reply: To Do, In Progress, or Review.', [
            { label: 'To Do', value: 'todo' },
            { label: 'In Progress', value: 'in-progress' },
            { label: 'Review', value: 'review' },
          ]);
          return;
        }
        setPendingCreate((prev) => ({ ...prev, status: s }));
        setStep('create-ask-priority');
        addBotMessage("What's the priority?", [
          { label: 'Low', value: 'low' },
          { label: 'Medium', value: 'medium' },
          { label: 'High', value: 'high' },
          { label: 'Urgent', value: 'urgent' },
        ]);
        break;
      }

      case 'create-ask-priority': {
        const pMap: Record<string, TaskPriority> = { low: 'low', medium: 'medium', high: 'high', urgent: 'urgent' };
        const p = pMap[lower];
        if (!p) {
          addBotMessage('Please reply: Low, Medium, High, or Urgent.', [
            { label: 'Low', value: 'low' },
            { label: 'Medium', value: 'medium' },
            { label: 'High', value: 'high' },
            { label: 'Urgent', value: 'urgent' },
          ]);
          return;
        }
        setPendingCreate((prev) => ({ ...prev, priority: p }));
        setStep('create-ask-due-date');
        addBotMessage("What's the due date?", DUE_DATE_QUICK_OPTIONS);
        break;
      }

      case 'create-ask-due-date': {
        if (text === 'custom-date') {
          addBotMessage('Type the due date — e.g. "tomorrow", "Friday", "next week", or YYYY-MM-DD.');
          return;
        }
        const parsed = parseNaturalDate(text);
        if (!parsed) {
          addBotMessage('Please provide a date — e.g. "tomorrow", "Friday", "next week", or YYYY-MM-DD.');
          return;
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const entered = new Date(`${parsed}T00:00:00`);
        if (entered < today) {
          addBotMessage('That date has already passed. Please provide a future date — e.g. "tomorrow", "Friday", or YYYY-MM-DD.');
          return;
        }
        setPendingCreate((prev) => ({ ...prev, dueDate: parsed }));
        setStep('create-ask-hours');
        addBotMessage("What's the estimated hours for this task?");
        break;
      }

      case 'create-ask-hours': {
        const hours = Number(text);
        if (isNaN(hours) || hours < 0) {
          addBotMessage('Please provide a valid number for estimated hours.');
          return;
        }
        setPendingCreate((prev) => ({ ...prev, estimatedHours: hours }));
        setStep('create-ask-tags');
        addBotMessage('Any tags to add?', [{ label: 'Skip', value: 'skip' }]);
        break;
      }

      case 'create-ask-tags': {
        const tags = lower === 'skip' ? [] : text.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
        const finalCreate = { ...pendingCreate, tags };
        finishCreateTask(finalCreate);
        break;
      }

      case 'create-ask-subtask': {
        if (text === 'add-subtask') {
          setStep('create-ask-subtask-more');
          addBotMessage('What is the subtask?');
        } else if (lower === 'skip') {
          setStep('create-ask-status');
          addBotMessage("What's the status?", [
            { label: 'To Do', value: 'todo' },
            { label: 'In Progress', value: 'in-progress' },
            { label: 'Review', value: 'review' },
          ]);
        } else {
          addBotMessage('Please choose Add Subtask or Skip.', [
            { label: 'Add Subtask', value: 'add-subtask' },
            { label: 'Skip', value: 'skip' },
          ]);
        }
        break;
      }

      case 'create-ask-subtask-more': {
        if (!text) {
          addBotMessage('Please enter the subtask text.');
          return;
        }
        setPendingCreate((prev) => ({ ...prev, subtasks: [...(prev.subtasks || []), text] }));
        setStep('create-ask-subtask');
        addBotMessage('Added. Add another subtask or skip?', [
          { label: 'Add More', value: 'add-subtask' },
          { label: 'Skip', value: 'skip' },
        ]);
        break;
      }

      // ── FLOW: EDIT AN EXISTING TASK (menu-driven, applies immediately) ──
      case 'edit-menu': {
        const id = pendingCreate.existingTaskId!;
        const progressActions: ChatAction[] = [
          { label: '+10%', value: '+10' }, { label: '+25%', value: '+25' }, { label: '+50%', value: '+50' },
          { label: '-10%', value: '-10' }, { label: '-25%', value: '-25' },
          { label: 'Reset 0%', value: 'reset' }, { label: 'Custom', value: 'custom' }, { label: 'Back', value: 'back' },
        ];
        if (text === 'edit-subtask-add') {
          setStep('edit-subtask-add');
          addBotMessage('What is the subtask?');
        } else if (text === 'edit-subtask-toggle') {
          const subtasks = tasks.find((t) => t.id === id)?.subtasks || [];
          if (subtasks.length === 0) {
            addBotMessage('No subtasks yet.');
            showEditMenu(id);
            return;
          }
          setStep('edit-subtask-toggle');
          addBotMessage(
            'Which subtask would you like to toggle?\n\n' +
              subtasks.map((s, i) => `${i + 1}. ${s.completed ? '☑️' : '☐'} ${s.title}`).join('\n'),
            [...subtasks.map((_, i) => ({ label: `${i + 1}`, value: `${i + 1}` })), { label: 'Back', value: 'back' }]
          );
        } else if (text === 'edit-progress') {
          const progress = tasks.find((t) => t.id === id)?.progress || 0;
          setStep('edit-progress');
          addBotMessage(`Current progress: ${progressBar(progress)}`, progressActions);
        } else if (text === 'edit-status') {
          setStep('edit-status');
          addBotMessage("What's the new status?", [
            { label: 'To Do', value: 'todo' },
            { label: 'In Progress', value: 'in-progress' },
            { label: 'Review', value: 'review' },
            { label: 'Completed', value: 'completed' },
          ]);
        } else if (text === 'edit-priority') {
          setStep('edit-priority');
          addBotMessage("What's the new priority?", [
            { label: 'Low', value: 'low' },
            { label: 'Medium', value: 'medium' },
            { label: 'High', value: 'high' },
            { label: 'Urgent', value: 'urgent' },
          ]);
        } else if (text === 'edit-description') {
          setStep('edit-description');
          addBotMessage('What is the new description?');
        } else if (text === 'edit-due-date') {
          setStep('edit-due-date');
          addBotMessage("What's the new due date?", DUE_DATE_QUICK_OPTIONS);
        } else if (text === 'edit-hours') {
          setStep('edit-hours');
          addBotMessage("What's the new estimated hours?");
        } else if (text === 'edit-tags') {
          setStep('edit-tags');
          addBotMessage('Enter tags (comma-separated), or Skip to clear tags.', [{ label: 'Skip', value: 'skip' }]);
        } else if (text === 'edit-done') {
          addBotMessage('💾 Changes saved.');
          showGreeting();
        } else {
          showEditMenu(id);
        }
        break;
      }

      case 'edit-description': {
        if (!text) {
          addBotMessage('This field is required. What is the new description?');
          return;
        }
        updateTask(pendingCreate.existingTaskId!, { description: text });
        addBotMessage('✅ Description updated.');
        showEditMenu(pendingCreate.existingTaskId!);
        break;
      }

      case 'edit-subtask-add': {
        if (!text) {
          addBotMessage('Please enter the subtask text.');
          return;
        }
        const existingSubtasks = tasks.find((t) => t.id === pendingCreate.existingTaskId)?.subtasks || [];
        const newSubtask = { id: `chat-sub-${Date.now()}`, title: text, completed: false, createdAt: new Date() };
        updateTask(pendingCreate.existingTaskId!, { subtasks: [...existingSubtasks, newSubtask] });
        addBotMessage(`✅ Subtask "${text}" added.`);
        setStep('edit-subtask-add-more');
        addBotMessage('Add another subtask?', [
          { label: 'Add Another', value: 'yes' },
          { label: 'Done', value: 'no' },
        ]);
        break;
      }

      case 'edit-subtask-add-more': {
        if (lower === 'yes' || text === 'add-subtask') {
          setStep('edit-subtask-add');
          addBotMessage('What is the subtask?');
        } else {
          showEditMenu(pendingCreate.existingTaskId!);
        }
        break;
      }

      case 'edit-subtask-toggle': {
        const id = pendingCreate.existingTaskId!;
        if (text === 'back') {
          showEditMenu(id);
          return;
        }
        const subtasks = tasks.find((t) => t.id === id)?.subtasks || [];
        const num = parseInt(text, 10);
        const target = subtasks[num - 1];
        if (!target) {
          addBotMessage('Please reply with a valid number.');
          return;
        }
        const updated = subtasks.map((s) => (s.id === target.id ? { ...s, completed: !s.completed } : s));
        updateTask(id, { subtasks: updated });
        addBotMessage(`✅ Subtask "${target.title}" marked ${target.completed ? 'incomplete' : 'complete'}.`);
        setStep('edit-subtask-toggle');
        addBotMessage(
          'Toggle another, or go Back to the menu:\n\n' +
            updated.map((s, i) => `${i + 1}. ${s.completed ? '☑️' : '☐'} ${s.title}`).join('\n'),
          [...updated.map((_, i) => ({ label: `${i + 1}`, value: `${i + 1}` })), { label: 'Back', value: 'back' }]
        );
        break;
      }

      case 'edit-progress': {
        const id = pendingCreate.existingTaskId!;
        const current = tasks.find((t) => t.id === id)?.progress || 0;
        if (text === 'back') {
          showEditMenu(id);
          return;
        }
        if (text === 'custom') {
          setStep('edit-progress-custom');
          addBotMessage('Enter the new progress (0-100):');
          return;
        }
        let next: number;
        if (text === 'reset') {
          next = 0;
        } else if (/^[+-]\d+$/.test(text)) {
          next = Math.max(0, Math.min(100, current + parseInt(text, 10)));
        } else {
          addBotMessage('Please choose one of the options shown.');
          return;
        }
        updateTask(id, { progress: next });
        addBotMessage(`✅ Progress updated: ${current}% → ${next}%`);
        setStep('edit-progress');
        addBotMessage(`Current progress: ${progressBar(next)}`, [
          { label: '+10%', value: '+10' }, { label: '+25%', value: '+25' }, { label: '+50%', value: '+50' },
          { label: '-10%', value: '-10' }, { label: '-25%', value: '-25' },
          { label: 'Reset 0%', value: 'reset' }, { label: 'Custom', value: 'custom' }, { label: 'Back', value: 'back' },
        ]);
        break;
      }

      case 'edit-progress-custom': {
        const id = pendingCreate.existingTaskId!;
        const value = Number(text);
        if (isNaN(value)) {
          addBotMessage('Please enter a number between 0 and 100.');
          return;
        }
        const current = tasks.find((t) => t.id === id)?.progress || 0;
        const next = Math.max(0, Math.min(100, value));
        updateTask(id, { progress: next });
        addBotMessage(`✅ Progress updated: ${current}% → ${next}%`);
        setStep('edit-progress');
        addBotMessage(`Current progress: ${progressBar(next)}`, [
          { label: '+10%', value: '+10' }, { label: '+25%', value: '+25' }, { label: '+50%', value: '+50' },
          { label: '-10%', value: '-10' }, { label: '-25%', value: '-25' },
          { label: 'Reset 0%', value: 'reset' }, { label: 'Custom', value: 'custom' }, { label: 'Back', value: 'back' },
        ]);
        break;
      }

      case 'edit-status': {
        const sMap: Record<string, TaskStatus> = {
          'todo': 'todo', 'to do': 'todo',
          'in-progress': 'in-progress', 'in progress': 'in-progress',
          'review': 'review',
          'completed': 'completed',
        };
        const s = sMap[lower];
        if (!s) {
          addBotMessage('Please choose one of the options shown.', [
            { label: 'To Do', value: 'todo' },
            { label: 'In Progress', value: 'in-progress' },
            { label: 'Review', value: 'review' },
            { label: 'Completed', value: 'completed' },
          ]);
          return;
        }
        const id = pendingCreate.existingTaskId!;
        const oldStatus = tasks.find((t) => t.id === id)?.status || 'todo';
        updateTask(id, { status: s });
        addBotMessage(`✅ Status changed: ${STATUS_LABELS[oldStatus]} → ${STATUS_LABELS[s]}`);
        showEditMenu(id);
        break;
      }

      case 'edit-priority': {
        const pMap: Record<string, TaskPriority> = { low: 'low', medium: 'medium', high: 'high', urgent: 'urgent' };
        const p = pMap[lower];
        if (!p) {
          addBotMessage('Please choose one of the options shown.', [
            { label: 'Low', value: 'low' },
            { label: 'Medium', value: 'medium' },
            { label: 'High', value: 'high' },
            { label: 'Urgent', value: 'urgent' },
          ]);
          return;
        }
        const id = pendingCreate.existingTaskId!;
        const oldP = tasks.find((t) => t.id === id)?.priority || 'medium';
        updateTask(id, { priority: p });
        addBotMessage(`✅ Priority changed: ${oldP[0].toUpperCase()}${oldP.slice(1)} → ${p[0].toUpperCase()}${p.slice(1)}`);
        showEditMenu(id);
        break;
      }

      case 'edit-due-date': {
        if (text === 'custom-date') {
          addBotMessage('Type the due date — e.g. "tomorrow", "Friday", "next week", or YYYY-MM-DD.');
          return;
        }
        const parsed = parseNaturalDate(text);
        if (!parsed) {
          addBotMessage('Please provide a date — e.g. "tomorrow", "Friday", "next week", or YYYY-MM-DD.');
          return;
        }
        const id = pendingCreate.existingTaskId!;
        updateTask(id, { dueDate: new Date(`${parsed}T00:00:00`) });
        addBotMessage(`✅ Due date updated: ${parsed}`);
        showEditMenu(id);
        break;
      }

      case 'edit-hours': {
        const hours = Number(text);
        if (isNaN(hours) || hours < 0) {
          addBotMessage('Please provide a valid number for estimated hours.');
          return;
        }
        const id = pendingCreate.existingTaskId!;
        updateTask(id, { estimatedHours: hours });
        addBotMessage(`✅ Estimated hours updated: ${hours}`);
        showEditMenu(id);
        break;
      }

      case 'edit-tags': {
        const tags = lower === 'skip' ? [] : text.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
        const id = pendingCreate.existingTaskId!;
        updateTask(id, { tags });
        addBotMessage(`✅ Tags updated: ${tags.length > 0 ? tags.join(', ') : '(none)'}`);
        showEditMenu(id);
        break;
      }

      // ── FLOW 2: DELETE A TASK ───────────────────────────────────────
      case 'delete-ask-task': {
        const deletable = tasks.filter(
          (t) => (t.status === 'todo' || t.status === 'in-progress') && (!t.createdBy || t.createdBy === user?.id)
        );
        if (text.startsWith('task:')) {
          const id = text.split(':')[1];
          const task = deletable.find((t) => t.id === id);
          if (!task) {
            addBotMessage("You can only delete tasks you created.");
            return;
          }
          setPendingDelete({ taskId: task.id, taskTitle: task.title });
          setStep('delete-ask-reason');
          addBotMessage("What's the reason for deleting this task?");
        } else {
          addBotMessage('Please pick one of the tasks shown.', deletable.map((t) => {
            const proj = projects.find((p) => p.id === t.projectId);
            return { label: `${t.title} — ${proj?.name || 'No project'}`, value: `task:${t.id}` };
          }));
        }
        break;
      }

      case 'delete-ask-reason': {
        if (!text) {
          addBotMessage("This field is required. What's the reason for deleting this task?");
          return;
        }
        const deleted = deleteTask(pendingDelete.taskId!, user?.id);
        if (deleted) {
          addBotMessage(`🗑️ Task deleted: ${pendingDelete.taskTitle}. Reason: ${text}.`);
        } else {
          addBotMessage("You can only delete tasks you created.");
        }
        showGreeting();
        break;
      }
    }
  };

  const handleSend = () => {
    processInput(input);
    setInput('');
  };

  const handleAction = (value: string, label?: string) => {
    processInput(value, label);
  };

  const inputPlaceholder = () => {
    switch (step) {
      case 'create-ask-title': return 'Enter task title...';
      case 'edit-pick-task': return 'Pick a number...';
      case 'create-ask-description': return 'Enter task description...';
      case 'create-ask-due-date': return '"tomorrow", "Friday", or YYYY-MM-DD';
      case 'create-ask-hours': return 'Number of hours...';
      case 'create-ask-tags': return 'tag1, tag2 (or Skip)';
      case 'create-ask-subtask-more': return 'Enter subtask...';
      case 'delete-ask-reason': return 'Reason for deleting...';
      case 'edit-description': return 'Enter new description...';
      case 'edit-due-date': return '"tomorrow", "Friday", or YYYY-MM-DD';
      case 'edit-hours': return 'Number of hours...';
      case 'edit-tags': return 'tag1, tag2 (or Skip)';
      case 'edit-subtask-add': return 'Enter subtask...';
      case 'edit-progress-custom': return 'Progress 0-100...';
      case 'edit-subtask-toggle': return 'Pick a number...';
      default: return 'Pick an option above or type here...';
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={clsx(
            'fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50',
            'w-14 h-14 rounded-full',
            'bg-gradient-to-r from-purple-600 to-blue-600',
            'text-white shadow-lg shadow-purple-500/40',
            'hover:shadow-xl hover:shadow-purple-500/50 hover:scale-110',
            'transition-all duration-300',
            'flex items-center justify-center',
            'animate-bounce-slow'
          )}
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div
          className={clsx(
            'fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50',
            'w-full sm:w-96 h-[100dvh] sm:h-[560px] flex flex-col',
            'bg-white dark:bg-slate-900',
            'border-0 sm:border border-gray-200 dark:border-slate-700',
            'sm:rounded-2xl shadow-2xl overflow-hidden'
          )}
        >
          {/* Chat Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
            <div className="flex items-center gap-2">
              <Bot size={20} />
              <div>
                <h3 className="font-semibold text-sm">Purple Bee Bot</h3>
                <p className="text-xs text-purple-200">Always online</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 rounded-lg p-1 transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Integration Buttons Bar */}
          <div className="px-3 py-2 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
            <p className="text-xs text-gray-500 dark:text-slate-500 mb-1.5">Also add tasks via:</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (isWhatsAppConfigured) {
                    addBotMessage("WhatsApp is connected! You'll get task updates and notifications there.");
                  } else {
                    addBotMessage("WhatsApp is not connected yet. Add your Phone ID and tokens to .env to enable.");
                  }
                }}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  isWhatsAppConfigured
                    ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600'
                )}
              >
                <WhatsAppIcon />
                <span>WhatsApp</span>
                {isWhatsAppConfigured && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
              </button>

              <button
                onClick={() => {
                  if (isTelegramConfigured) {
                    addBotMessage("Telegram is connected! Message @PurpleBee2bot on Telegram to create or delete tasks.");
                  } else {
                    addBotMessage("Telegram is not connected yet. Add your Bot Token to .env to enable.");
                  }
                }}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  isTelegramConfigured
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600'
                )}
              >
                <TelegramIcon />
                <span>Telegram</span>
                {isTelegramConfigured && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className={clsx('flex gap-2', msg.sender === 'user' ? 'justify-end' : 'justify-start')}>
                {msg.sender === 'bot' && (
                  <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot size={14} className="text-purple-600 dark:text-purple-400" />
                  </div>
                )}
                <div className="max-w-[75%]">
                  <div
                    className={clsx(
                      'px-3 py-2 rounded-2xl text-sm whitespace-pre-line',
                      msg.sender === 'user'
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-br-md'
                        : 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-200 rounded-bl-md'
                    )}
                  >
                    {msg.text}
                  </div>
                  {msg.actions && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {msg.actions.map((action) => (
                        <button
                          key={action.value}
                          onClick={() => handleAction(action.value, action.label)}
                          className={clsx(
                            'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium',
                            'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200',
                            'dark:bg-purple-900/20 dark:text-purple-300 dark:hover:bg-purple-900/40 dark:border-purple-700/30',
                            'transition-colors'
                          )}
                        >
                          {action.label}
                          <ArrowRight size={10} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {msg.sender === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User size={14} className="text-gray-500 dark:text-slate-400" />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.repeat) handleSend(); }}
                placeholder={inputPlaceholder()}
                className={clsx(
                  'flex-1 rounded-full px-4 py-2.5 text-sm',
                  'bg-gray-100 border-none text-gray-800 placeholder-gray-400',
                  'dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500',
                  'focus:outline-none focus:ring-2 focus:ring-purple-500/30'
                )}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className={clsx(
                  'w-10 h-10 rounded-full flex items-center justify-center',
                  'bg-gradient-to-r from-purple-600 to-blue-600 text-white',
                  'hover:shadow-lg transition-all',
                  'disabled:opacity-40 disabled:cursor-not-allowed'
                )}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
