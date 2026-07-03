import React, { useState, useRef, useEffect, useMemo } from 'react';
import clsx from 'clsx';
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  Plus,
  Zap,
  ArrowRight,
  FolderKanban,
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
  icon?: React.ReactNode;
}

type ConversationStep =
  | 'idle'
  | 'ask-project'
  | 'show-project-tasks'
  | 'ask-title'
  | 'ask-priority'
  | 'ask-status'
  | 'confirm';

interface PendingTask {
  title: string;
  priority: TaskPriority;
  status: TaskStatus;
  projectId: string;
  projectName: string;
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

const channelTag = (channel: 'whatsapp' | 'telegram' | 'in-app') => {
  if (channel === 'whatsapp') return '🟢 WhatsApp';
  if (channel === 'telegram') return '✈ Telegram';
  return '💜 In-App';
};

export const ChatBot: React.FC = () => {
  const { chatBotOpen: isOpen, setChatBotOpen: setIsOpen } = useChatStore();
  const [input, setInput] = useState('');
  const [step, setStep] = useState<ConversationStep>('idle');
  const [pending, setPending] = useState<Partial<PendingTask>>({});
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'bot',
      text: "Hi! I'm Purple Bee Bot. I can help you create tasks quickly. Type 'new task' or click below to get started!",
      timestamp: new Date(),
      actions: [
        { label: 'New Task', value: 'new task', icon: <Plus size={14} /> },
        { label: 'Quick Add', value: 'quick', icon: <Zap size={14} /> },
      ],
    },
  ]);

  const { addTask } = useTaskStore();
  const projects = useProjectStore((s) => s.projects);
  const user = useUserStore((s) => s.user);
  const canManageTeam = useUserStore((s) => s.canManageTeam);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Top 3 projects assigned to the current user, ranked by most recently updated
  const top3Projects = useMemo(() => {
    const userProjects = canManageTeam()
      ? projects
      : projects.filter((p) => p.tasks.some((t) => t.assignedTo === user?.id));
    return [...userProjects]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 3);
  }, [projects, user, canManageTeam]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const addBotMessage = (text: string, actions?: ChatAction[]) => {
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), sender: 'bot', text, timestamp: new Date(), actions },
    ]);
  };

  const addUserMessage = (text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), sender: 'user', text, timestamp: new Date() },
    ]);
  };

  const startNewTaskFlow = () => {
    setPending({});
    if (top3Projects.length === 0) {
      // No projects — skip project step
      setStep('ask-title');
      addBotMessage("What's the title for your new task?");
      return;
    }
    setStep('ask-project');
    addBotMessage(
      "Which project is this task for? Here are your top assigned projects:",
      top3Projects.map((p) => ({
        label: `${p.icon} ${p.name}`,
        value: `project:${p.id}:${p.name}`,
        icon: <FolderKanban size={12} />,
      }))
    );
  };

  const handleProjectSelected = (projectId: string, projectName: string) => {
    setPending((prev) => ({ ...prev, projectId, projectName }));

    // Find tasks in this project assigned to current user
    const project = projects.find((p) => p.id === projectId);
    const assignedTasks = project?.tasks.filter((t) => t.assignedTo === user?.id) || [];

    let taskListText = `✅ Project: ${projectName} — ${channelTag('in-app')}\n\n`;
    if (assignedTasks.length > 0) {
      taskListText += `Your tasks in this project:\n`;
      assignedTasks.slice(0, 5).forEach((t, i) => {
        taskListText += `${i + 1}. ${t.title}\n`;
      });
      taskListText += `\nReady to add a new task?`;
    } else {
      taskListText += `No existing tasks assigned to you in this project yet.\nReady to add the first one?`;
    }

    setStep('show-project-tasks');
    addBotMessage(taskListText, [
      { label: '+ New Task', value: 'create-task', icon: <Plus size={14} /> },
      { label: 'Change Project', value: 'change-project', icon: <FolderKanban size={12} /> },
    ]);
  };

  const createTask = (task: Partial<PendingTask>) => {
    addTask({
      title: task.title || 'Untitled Task',
      status: task.status || 'todo',
      priority: task.priority || 'medium',
      tags: [],
      progress: 0,
      projectId: task.projectId || undefined,
      assignedTo: user?.id || undefined,
      sourceChannel: 'in-app',
    });
  };

  const processInput = (userInput: string) => {
    const text = userInput.trim();
    if (!text) return;

    addUserMessage(text);

    switch (step) {
      case 'idle': {
        const lower = text.toLowerCase();
        if (lower.includes('new task') || lower.includes('create') || lower.includes('add task') || lower === 'quick') {
          startNewTaskFlow();
        } else {
          addBotMessage("I can help you create tasks! Try saying 'new task' or click a button below.", [
            { label: 'New Task', value: 'new task', icon: <Plus size={14} /> },
          ]);
        }
        break;
      }

      case 'ask-project': {
        // Handle project selection via text (e.g., project name or number)
        if (text.startsWith('project:')) {
          const [, id, ...nameParts] = text.split(':');
          handleProjectSelected(id, nameParts.join(':'));
        } else {
          // Try to match by name
          const match = top3Projects.find((p) =>
            p.name.toLowerCase().includes(text.toLowerCase())
          );
          if (match) {
            handleProjectSelected(match.id, match.name);
          } else {
            addBotMessage("Please select one of the projects shown, or type the project name.", [
              ...top3Projects.map((p) => ({
                label: `${p.icon} ${p.name}`,
                value: `project:${p.id}:${p.name}`,
              })),
            ]);
          }
        }
        break;
      }

      case 'show-project-tasks': {
        if (text === 'create-task') {
          setStep('ask-title');
          addBotMessage("What's the title for this new task?");
        } else if (text === 'change-project') {
          startNewTaskFlow();
        } else {
          addBotMessage("Click '+ New Task' to create a task, or 'Change Project' to pick a different project.", [
            { label: '+ New Task', value: 'create-task', icon: <Plus size={14} /> },
            { label: 'Change Project', value: 'change-project', icon: <FolderKanban size={12} /> },
          ]);
        }
        break;
      }

      case 'ask-title': {
        setPending((p) => ({ ...p, title: text }));
        setStep('ask-priority');
        addBotMessage(`Title: "${text}"\n\nWhat priority?`, [
          { label: 'Low', value: 'low' },
          { label: 'Medium', value: 'medium' },
          { label: 'High', value: 'high' },
          { label: 'Urgent', value: 'urgent' },
        ]);
        break;
      }

      case 'ask-priority': {
        const priorities: Record<string, TaskPriority> = {
          low: 'low', medium: 'medium', high: 'high', urgent: 'urgent',
        };
        const p = priorities[text.toLowerCase()] || 'medium';
        setPending((prev) => ({ ...prev, priority: p }));
        setStep('ask-status');
        addBotMessage('Which column?', [
          { label: 'To Do', value: 'todo' },
          { label: 'In Progress', value: 'in-progress' },
          { label: 'Review', value: 'review' },
        ]);
        break;
      }

      case 'ask-status': {
        const statuses: Record<string, TaskStatus> = {
          'todo': 'todo', 'to do': 'todo',
          'in-progress': 'in-progress', 'in progress': 'in-progress',
          'review': 'review',
        };
        const s = statuses[text.toLowerCase()] || 'todo';
        const finalTask = { ...pending, status: s };
        setPending(finalTask);
        setStep('confirm');
        addBotMessage(
          `Ready to create:\n• Title: ${finalTask.title}\n• Project: ${finalTask.projectName || 'None'}\n• Priority: ${finalTask.priority || 'medium'}\n• Status: ${s}\n• Channel: ${channelTag('in-app')}\n\nCreate it?`,
          [
            { label: 'Create Task', value: 'yes' },
            { label: 'Cancel', value: 'no' },
          ]
        );
        break;
      }

      case 'confirm': {
        const lower = text.toLowerCase();
        if (lower === 'yes' || lower === 'create' || lower === 'create task') {
          createTask(pending);
          addBotMessage("✅ Task created! It's now on your Tasks page. Want to add another?", [
            { label: 'New Task', value: 'new task', icon: <Plus size={14} /> },
          ]);
        } else {
          addBotMessage("Cancelled. Want to start over?", [
            { label: 'New Task', value: 'new task', icon: <Plus size={14} /> },
          ]);
        }
        setStep('idle');
        setPending({});
        break;
      }
    }
  };

  const handleSend = () => {
    processInput(input);
    setInput('');
  };

  const handleAction = (value: string) => {
    processInput(value);
  };

  const inputPlaceholder = () => {
    switch (step) {
      case 'ask-project': return 'Type a project name or pick one above...';
      case 'ask-title': return 'Enter task title...';
      case 'ask-priority': return 'low / medium / high / urgent';
      case 'ask-status': return 'todo / in-progress / review';
      default: return "Type 'new task' to start...";
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
                    addBotMessage("WhatsApp is connected! Send '/newtask [title]' to your Purple Bee bot on WhatsApp to create tasks.");
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
                    addBotMessage("Telegram is connected! Send '/newtask [title]' to @Purple_BeeBot on Telegram to create tasks.");
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
                          onClick={() => handleAction(action.value)}
                          className={clsx(
                            'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium',
                            'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200',
                            'dark:bg-purple-900/20 dark:text-purple-300 dark:hover:bg-purple-900/40 dark:border-purple-700/30',
                            'transition-colors'
                          )}
                        >
                          {action.icon}
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
                onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
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
