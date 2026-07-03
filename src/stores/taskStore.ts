import { create } from 'zustand';
import { Task, TaskStatus, TaskPriority, TaskCollaborator } from '@/types/index';
import { v4 as uuidv4 } from 'uuid';
import { taskDb } from '@/lib/dataService';

/**
 * Helper: read keepMockData at call-time.
 * We import settingsStore directly — there's no circular dep because
 * settingsStore doesn't import taskStore at module level (only in event handlers).
 */
import { useSettingsStore } from '@stores/settingsStore';
const isMockMode = () => useSettingsStore.getState().keepMockData;

interface TaskStore {
  tasks: Task[];
  selectedTaskId: string | null;
  filter: {
    status?: TaskStatus;
    priority?: TaskPriority;
    assignedTo?: string;
    tags?: string[];
  };
  sortBy: 'dueDate' | 'priority' | 'created';

  // Actions
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  selectTask: (id: string | null) => void;
  setFilter: (filter: Partial<TaskStore['filter']>) => void;
  setSortBy: (sortBy: TaskStore['sortBy']) => void;
  getFilteredTasks: () => Task[];
  getSortedTasks: () => Task[];
  getTasksByStatus: (status: TaskStatus) => Task[];
  updateTaskStatus: (id: string, status: TaskStatus) => void;
  moveTask: (taskId: string, newStatus: TaskStatus, newIndex: number) => void;
  completeTask: (id: string) => void;
  getTasksForUser: (userId: string) => Task[];
  addCollaborator: (taskId: string, collaborator: Omit<TaskCollaborator, 'addedAt'>) => void;
  removeCollaborator: (taskId: string, userId: string) => void;
  updateCollaboratorTime: (taskId: string, userId: string, minutes: number) => void;
  hydrateFromDb: (userId: string) => Promise<void>;
  clearMockData: () => void;
  restoreMockData: () => void;
}

const day = 24 * 60 * 60 * 1000;

const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Prepare quarterly report',
    description: 'Compile Q2 financials, KPIs, and team performance metrics for leadership review',
    status: 'in-progress',
    priority: 'high',
    assignedTo: 'user-1',
    dueDate: new Date(Date.now() + 2 * day),
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: ['reporting', 'finance'],
    progress: 65,
    estimatedHours: 12,
    actualHours: 8,
    projectId: 'proj-3',
  },
  {
    id: '2',
    title: 'Update vendor contracts',
    description: 'Review and renew annual contracts with top 5 suppliers before expiry',
    status: 'todo',
    priority: 'urgent',
    assignedTo: 'user-3',
    dueDate: new Date(Date.now() + 1 * day),
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: ['legal', 'procurement'],
    progress: 0,
    estimatedHours: 10,
    projectId: 'proj-3',
  },
  {
    id: '3',
    title: 'Review client proposal',
    description: 'Provide feedback on the Acme Corp engagement proposal and pricing',
    status: 'review',
    priority: 'medium',
    assignedTo: 'user-4',
    dueDate: new Date(Date.now() + 3 * day),
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: ['sales', 'client'],
    progress: 85,
    estimatedHours: 6,
    actualHours: 5,
    projectId: 'proj-1',
  },
  {
    id: '4',
    title: 'Onboard new team members',
    description: 'Set up accounts, schedule orientation, and assign mentors for June hires',
    status: 'todo',
    priority: 'medium',
    assignedTo: 'user-5',
    dueDate: new Date(Date.now() + 5 * day),
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: ['hr', 'onboarding'],
    progress: 0,
    estimatedHours: 16,
    projectId: 'proj-3',
  },
  {
    id: '5',
    title: 'Finalise brand guidelines',
    description: 'Consolidate logo usage, colour palette, and typography standards into a shared doc',
    status: 'completed',
    priority: 'high',
    assignedTo: 'user-2',
    dueDate: new Date(Date.now() - 2 * day),
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: ['branding', 'design'],
    progress: 100,
    estimatedHours: 14,
    actualHours: 12,
    projectId: 'proj-2',
  },
  {
    id: '6',
    title: 'Conduct user interviews',
    description: 'Run 8 customer discovery interviews and synthesise findings into themes',
    status: 'in-progress',
    priority: 'high',
    assignedTo: 'user-2',
    dueDate: new Date(Date.now() + 4 * day),
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: ['research', 'ux'],
    progress: 40,
    estimatedHours: 20,
    actualHours: 8,
    projectId: 'proj-1',
  },
  {
    id: '7',
    title: 'Draft marketing campaign',
    description: 'Create content calendar and copy drafts for the winter product launch',
    status: 'todo',
    priority: 'medium',
    assignedTo: 'user-2',
    dueDate: new Date(Date.now() + 7 * day),
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: ['marketing', 'content'],
    progress: 0,
    estimatedHours: 18,
    projectId: 'proj-2',
  },
  {
    id: '8',
    title: 'Migrate cloud infrastructure',
    description: 'Move staging environment to new hosting provider and validate performance',
    status: 'completed',
    priority: 'high',
    assignedTo: 'user-4',
    dueDate: new Date(Date.now() - 3 * day),
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: ['devops', 'infrastructure'],
    progress: 100,
    estimatedHours: 8,
    actualHours: 6,
    projectId: 'proj-3',
  },
  {
    id: '9',
    title: 'Audit data privacy compliance',
    description: 'Review data handling processes against POPIA and GDPR requirements',
    status: 'in-progress',
    priority: 'medium',
    assignedTo: 'user-5',
    dueDate: new Date(Date.now() + 6 * day),
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: ['compliance', 'security'],
    progress: 30,
    estimatedHours: 16,
    actualHours: 4,
    projectId: 'proj-3',
  },
  {
    id: '10',
    title: 'Test payment integration',
    description: 'Verify end-to-end payment flows across all supported gateways',
    status: 'review',
    priority: 'medium',
    assignedTo: 'user-3',
    dueDate: new Date(Date.now() + 1 * day),
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: ['testing', 'payments'],
    progress: 90,
    estimatedHours: 8,
    actualHours: 7,
    projectId: 'proj-3',
  },
];

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: mockTasks,
  selectedTaskId: null,
  filter: {},
  sortBy: 'dueDate',

  addTask: (taskData) => {
    const newTask: Task = {
      ...taskData,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    set((state) => ({ tasks: [newTask, ...state.tasks] }));
    // Persist to DB only when mock mode is OFF (fire-and-forget)
    taskDb.insert(newTask, taskData.assignedTo, isMockMode());
  },

  updateTask: (id, updates) => {
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id
          ? { ...task, ...updates, updatedAt: new Date() }
          : task
      ),
    }));
    taskDb.update(id, updates, isMockMode());
  },

  deleteTask: (id) => {
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== id),
      selectedTaskId: state.selectedTaskId === id ? null : state.selectedTaskId,
    }));
    taskDb.delete(id, isMockMode());
  },

  selectTask: (id) => set({ selectedTaskId: id }),

  setFilter: (filter) =>
    set((state) => ({
      filter: { ...state.filter, ...filter },
    })),

  setSortBy: (sortBy) => set({ sortBy }),

  getFilteredTasks: () => {
    const state = get();
    return state.tasks.filter((task) => {
      if (state.filter.status && task.status !== state.filter.status) return false;
      if (state.filter.priority && task.priority !== state.filter.priority) return false;
      if (state.filter.assignedTo && task.assignedTo !== state.filter.assignedTo) return false;
      if (state.filter.tags && !state.filter.tags.some((tag) => task.tags.includes(tag))) {
        return false;
      }
      return true;
    });
  },

  getSortedTasks: () => {
    const filtered = get().getFilteredTasks();
    const sortBy = get().sortBy;

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'dueDate':
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return a.dueDate.getTime() - b.dueDate.getTime();
        case 'priority':
          const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        case 'created':
          return b.createdAt.getTime() - a.createdAt.getTime();
        default:
          return 0;
      }
    });
  },

  getTasksByStatus: (status) => {
    return get().tasks.filter((task) => task.status === status);
  },

  updateTaskStatus: (id, status) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;
    let progress = task.progress;
    if (status === 'completed') progress = 100;
    else if (status === 'todo') progress = 0;
    else if (status === 'review' && task.progress < 75) progress = 75;
    else if (status === 'in-progress' && task.progress === 0) progress = 10;
    get().updateTask(id, { status, progress });
  },

  moveTask: (taskId, newStatus, newIndex) =>
    set((state) => {
      const task = state.tasks.find((t) => t.id === taskId);
      if (!task) return state;

      const otherTasks = state.tasks.filter((t) => t.id !== taskId);
      const updatedTask = { ...task, status: newStatus, updatedAt: new Date() };

      const columnTasks = otherTasks.filter((t) => t.status === newStatus);
      const nonColumnTasks = otherTasks.filter((t) => t.status !== newStatus);

      columnTasks.splice(newIndex, 0, updatedTask);

      return { tasks: [...nonColumnTasks, ...columnTasks] };
    }),

  getTasksForUser: (userId) => {
    return get().tasks.filter((t) => t.assignedTo === userId);
  },

  completeTask: (id) => {
    get().updateTask(id, { status: 'completed', progress: 100 });
  },

  addCollaborator: (taskId, collaborator) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              collaborators: [
                ...(task.collaborators || []),
                { ...collaborator, addedAt: new Date() },
              ],
              updatedAt: new Date(),
            }
          : task
      ),
    })),

  removeCollaborator: (taskId, userId) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              collaborators: (task.collaborators || []).filter(
                (c) => c.userId !== userId
              ),
              updatedAt: new Date(),
            }
          : task
      ),
    })),

  updateCollaboratorTime: (taskId, userId, minutes) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              collaborators: (task.collaborators || []).map((c) =>
                c.userId === userId ? { ...c, allocatedMinutes: minutes } : c
              ),
              updatedAt: new Date(),
            }
          : task
      ),
    })),

  /**
   * Hydrate store from Supabase when mock mode is OFF and DB is connected.
   * When mock mode is ON, this is a no-op — stores stay in-memory.
   */
  hydrateFromDb: async (userId: string) => {
    const mock = isMockMode();
    if (mock) return; // Mock mode ON → don't touch DB
    const dbTasks = await taskDb.fetchAll(userId, false);
    if (dbTasks !== null) {
      set({ tasks: dbTasks });
    }
  },

  clearMockData: () => {
    // Mock data ON → OFF: clear in-memory only.
    // The toggle handler in SettingsPage is the one that decides the new mode.
    set({ tasks: [], selectedTaskId: null });
  },

  restoreMockData: () => {
    // Mock mode is being turned ON → populate in-memory only, never write to DB.
    set({ tasks: mockTasks });
  },
}));

// Listen for tasks created by the Telegram/WhatsApp bot via the backend socket
import('@/lib/botSocket').then(({ getBotSocket }) => {
  const socket = getBotSocket();
  socket.on('task:bot-created', (payload: {
    id: string; title: string; projectId?: string; assignedTo?: string;
    priority: string; status: string; sourceChannel: 'telegram' | 'whatsapp';
    createdAt: string;
  }) => {
    useTaskStore.getState().addTask({
      title: payload.title,
      status: (payload.status as any) || 'todo',
      priority: (payload.priority as any) || 'medium',
      projectId: payload.projectId,
      assignedTo: payload.assignedTo,
      sourceChannel: payload.sourceChannel,
      tags: [],
      progress: 0,
    });
  });
});
