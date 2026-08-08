import { create } from 'zustand';
import { Task, TaskStatus, TaskPriority, TaskCollaborator } from '@/types/index';
import { v4 as uuidv4 } from 'uuid';
import { taskDb, botTaskDb, taskActivityDb } from '@/lib/dataService';
import { notifyUser, notifyUsers } from '@/lib/notify';

import { useSettingsStore } from '@stores/settingsStore';
import { useProjectStore } from '@stores/projectStore';

/**
 * Returns true when mock/sample data mode is active.
 * When true, all DB reads and writes are skipped — data lives in-memory only.
 */
const isMockMode = () => useSettingsStore.getState().keepMockData;

/**
 * Module-level user context — set by userStore after login so taskStore
 * can stamp createdBy/teamId on new tasks and send notifications without
 * a circular require() dep (require is not defined in Vite's ESM runtime).
 */
let _ctx: { userId: string | null; teamId: string | null; userName: string } = {
  userId: null,
  teamId: null,
  userName: 'Someone',
};

/**
 * Called by userStore immediately after login / team resolve so every
 * subsequent task action has the right creator + team scope.
 */
export function setTaskUserContext(
  userId: string | null,
  teamId: string | null,
  userName: string,
) {
  _ctx = { userId, teamId, userName };
}

const getTeamContext = () => _ctx;

/** Looks up the parent project's name for a task, for contextual notification messages. Returns undefined if the task has no project or it can't be found. */
const getProjectName = (projectId?: string): string | undefined =>
  projectId ? useProjectStore.getState().getProjectById(projectId)?.name : undefined;

/**
 * Append an immutable activity-log entry for a task field change, upload,
 * link, or lifecycle event. Fire-and-forget, same pattern as notifyUser() —
 * never blocks or fails the action that triggered it. No-op in mock mode.
 */
function logActivity(entry: {
  taskId: string;
  taskTitle: string;
  action: import('@/types/index').TaskActivityAction;
  field?: string;
  oldValue?: string;
  newValue?: string;
}) {
  if (isMockMode()) return;
  const { userId, teamId, userName } = getTeamContext();
  if (!userId) return;
  taskActivityDb.insert(
    {
      taskId: entry.taskId,
      taskTitle: entry.taskTitle,
      teamId,
      actorId: userId,
      actorName: userName,
      action: entry.action,
      field: entry.field,
      oldValue: entry.oldValue,
      newValue: entry.newValue,
    },
    false,
  ).catch(() => {});
}

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
  // forcedId lets bot-created tasks (WhatsApp/Telegram) use the ID the
  // backend already generated for its confirmation link, instead of a
  // second, different ID being minted here. skipPersist is set when the
  // backend already wrote this task directly to Supabase (bot "database
  // mode") — avoids a duplicate-key insert error from writing it again here.
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>, forcedId?: string, skipPersist?: boolean) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  // requestingUserId enforces creator-only deletion: if the task has a
  // createdBy and it doesn't match, the delete is refused (returns false).
  // Tasks with no createdBy (e.g. legacy/unattributed) are always deletable —
  // there's nothing to check against.
  deleteTask: (id: string, requestingUserId?: string) => boolean;
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
  restoreMockData: (currentUserId?: string) => void;
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
    createdBy: 'user-1', // self-created
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
    createdBy: 'user-1', // admin assigned this to user-3 — user-3 cannot delete it
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
    createdBy: 'user-4', // self-created
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
    createdBy: 'user-1', // admin assigned this to user-5 — user-5 cannot delete it
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
    createdBy: 'user-2', // self-created
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
    createdBy: 'user-4', // manager assigned this to user-2 — user-2 cannot delete it
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
    createdBy: 'user-2', // self-created
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
    createdBy: 'user-4', // self-created
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
    createdBy: 'user-5', // self-created
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
    createdBy: 'user-3', // self-created
  },
];

// Read keepMockData from localStorage at module init to decide initial state.
// This avoids showing mock data on refresh when the user turned it off.
const shouldStartWithMock = (() => {
  try {
    const raw = localStorage.getItem('purplebee-settings');
    if (!raw) return true; // default is true
    const parsed = JSON.parse(raw);
    return parsed.keepMockData !== false;
  } catch { return true; }
})();

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: shouldStartWithMock ? mockTasks : [],
  selectedTaskId: null,
  filter: {},
  sortBy: 'dueDate',

  addTask: (taskData, forcedId, skipPersist) => {
    const { teamId, userId, userName } = getTeamContext();
    const newTask: Task = {
      ...taskData,
      id: forcedId || uuidv4(),
      teamId: taskData.teamId || teamId || undefined,
      createdBy: userId || undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    set((state) => ({ tasks: [newTask, ...state.tasks] }));
    // Persist to DB only when mock mode is OFF (fire-and-forget), and only
    // if it wasn't already written directly by the backend (bot "database
    // mode") — otherwise this would be a duplicate insert of the same id.
    // created_by is the real creator so RLS sees a valid author.
    if (!skipPersist) taskDb.insert(newTask, newTask.createdBy || userId || undefined, isMockMode());

    // Notify the assignee if they're someone other than the creator
    if (newTask.assignedTo && newTask.assignedTo !== userId) {
      const projectName = getProjectName(newTask.projectId);
      notifyUser({
        actorId: userId,
        recipientId: newTask.assignedTo,
        type: 'task-assigned',
        title: 'New task assigned to you',
        message: `${userName} assigned "${newTask.title}" to you${projectName ? ` in ${projectName}` : ''}`,
        actionUrl: `#tasks?taskId=${newTask.id}`,
        taskId: newTask.id,
      });
    }

    logActivity({ taskId: newTask.id, taskTitle: newTask.title, action: 'created' });
  },

  updateTask: (id, updates) => {
    const prevTask = get().tasks.find((t) => t.id === id);
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id
          ? { ...task, ...updates, updatedAt: new Date() }
          : task
      ),
    }));
    taskDb.update(id, updates, isMockMode());

    const { userId, userName } = getTeamContext();
    const projectName = getProjectName(prevTask?.projectId);

    // ── Notify assignee when the task is (re)assigned ──
    if (
      updates.assignedTo !== undefined &&
      updates.assignedTo !== prevTask?.assignedTo &&
      updates.assignedTo &&
      updates.assignedTo !== userId
    ) {
      const taskTitle = updates.title || prevTask?.title || 'a task';
      notifyUser({
        actorId: userId,
        recipientId: updates.assignedTo,
        type: 'task-assigned',
        title: 'Task assigned to you',
        message: `${userName} assigned "${taskTitle}" to you${projectName ? ` in ${projectName}` : ''}`,
        actionUrl: `#tasks?taskId=${id}`,
        taskId: id,
      });
    }

    // ── Notify creator when their task is marked complete ──
    if (
      updates.status === 'completed' &&
      prevTask?.status !== 'completed' &&
      prevTask?.createdBy &&
      prevTask.createdBy !== userId
    ) {
      const taskTitle = prevTask.title;
      notifyUser({
        actorId: userId,
        recipientId: prevTask.createdBy,
        type: 'task-completed',
        title: 'Task completed',
        message: `${userName} completed "${taskTitle}"${projectName ? ` in ${projectName}` : ''}`,
        actionUrl: `#tasks?taskId=${id}`,
        taskId: id,
      });
    }

    // ── Notify creator (and assignee, if different) when a completed task is reopened ──
    if (
      updates.status !== undefined &&
      updates.status !== 'completed' &&
      prevTask?.status === 'completed'
    ) {
      const taskTitle = updates.title || prevTask.title;
      const recipients = [prevTask.createdBy, prevTask.assignedTo].filter(
        (uid): uid is string => !!uid
      );
      recipients.forEach((recipientId) => {
        notifyUser({
          actorId: userId,
          recipientId,
          type: 'task-reopened',
          title: 'Task reopened',
          message: `${userName} reopened "${taskTitle}"${projectName ? ` in ${projectName}` : ''}`,
          actionUrl: `#tasks?taskId=${id}`,
          taskId: id,
        });
      });
    }

    // ── Notify assignee when due date or priority changes (not on the assignee's own edit) ──
    if (prevTask?.assignedTo && prevTask.assignedTo !== userId) {
      const taskTitle = updates.title || prevTask.title;
      if (
        updates.dueDate !== undefined &&
        updates.dueDate?.getTime() !== prevTask.dueDate?.getTime()
      ) {
        const formattedDate = updates.dueDate
          ? updates.dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : 'no due date';
        notifyUser({
          actorId: userId,
          recipientId: prevTask.assignedTo,
          type: 'task-updated',
          title: 'Due date changed',
          message: `${userName} moved the due date for "${taskTitle}" to ${formattedDate}`,
          actionUrl: `#tasks?taskId=${id}`,
          taskId: id,
        });
      }
      if (updates.priority !== undefined && updates.priority !== prevTask.priority) {
        notifyUser({
          actorId: userId,
          recipientId: prevTask.assignedTo,
          type: 'task-updated',
          title: 'Priority changed',
          message: `${userName} changed the priority of "${taskTitle}" to ${updates.priority}`,
          actionUrl: `#tasks?taskId=${id}`,
          taskId: id,
        });
      }
    }

    // ── Activity log — diff each field the caller actually touched ──
    if (prevTask) {
      const taskTitle = updates.title || prevTask.title;
      const logField = (field: string, oldVal?: string, newVal?: string) => {
        if (oldVal === newVal) return;
        logActivity({ taskId: id, taskTitle, action: 'updated', field, oldValue: oldVal, newValue: newVal });
      };
      if (updates.title !== undefined) logField('title', prevTask.title, updates.title);
      if (updates.description !== undefined) logField('description', prevTask.description, updates.description);
      if (updates.status !== undefined) logField('status', prevTask.status, updates.status);
      if (updates.priority !== undefined) logField('priority', prevTask.priority, updates.priority);
      if (updates.assignedTo !== undefined) logField('assignedTo', prevTask.assignedTo, updates.assignedTo);
      if (updates.dueDate !== undefined) {
        logField('dueDate', prevTask.dueDate?.toISOString(), updates.dueDate?.toISOString());
      }

      if (updates.attachments !== undefined) {
        const prevIds = new Set((prevTask.attachments || []).map((a) => a.id));
        const nextIds = new Set(updates.attachments.map((a) => a.id));
        const added = updates.attachments.filter((a) => !prevIds.has(a.id));
        added.forEach((a) =>
          logActivity({ taskId: id, taskTitle, action: 'attachment_added', newValue: a.name }));
        (prevTask.attachments || []).filter((a) => !nextIds.has(a.id)).forEach((a) =>
          logActivity({ taskId: id, taskTitle, action: 'attachment_removed', oldValue: a.name }));

        // Notify the assignee (if someone else added it) so they don't have to re-open the task to notice
        if (added.length > 0 && prevTask.assignedTo && prevTask.assignedTo !== userId) {
          notifyUser({
            actorId: userId,
            recipientId: prevTask.assignedTo,
            type: 'attachment-added',
            title: 'New attachment',
            message: added.length === 1
              ? `${userName} added "${added[0].name}" to "${taskTitle}"`
              : `${userName} added ${added.length} attachments to "${taskTitle}"`,
            actionUrl: `#tasks?taskId=${id}`,
            taskId: id,
          });
        }
      }
      if (updates.links !== undefined) {
        const prevIds = new Set((prevTask.links || []).map((l) => l.id));
        const nextIds = new Set(updates.links.map((l) => l.id));
        updates.links.filter((l) => !prevIds.has(l.id)).forEach((l) =>
          logActivity({ taskId: id, taskTitle, action: 'link_added', newValue: l.title }));
        (prevTask.links || []).filter((l) => !nextIds.has(l.id)).forEach((l) =>
          logActivity({ taskId: id, taskTitle, action: 'link_removed', oldValue: l.title }));
      }
      if (updates.subtasks !== undefined) {
        logActivity({ taskId: id, taskTitle, action: 'subtask_changed' });
      }
    }
  },

  deleteTask: (id, requestingUserId) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return false;
    if (requestingUserId && task.createdBy && task.createdBy !== requestingUserId) {
      return false; // not the creator — refuse, even if called directly
    }
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
      selectedTaskId: state.selectedTaskId === id ? null : state.selectedTaskId,
    }));
    // Log before the delete so the FK is still valid at insert time — the
    // row itself survives the task's deletion (task_id becomes null via
    // ON DELETE SET NULL), preserving the audit trail permanently.
    logActivity({ taskId: id, taskTitle: task.title, action: 'deleted' });
    taskDb.delete(id, isMockMode());

    // Notify the assignee and creator (excluding whoever just deleted it) —
    // no actionUrl/taskId since the task no longer exists to link to.
    const { userId: actorId, userName } = getTeamContext();
    notifyUsers(
      [task.assignedTo, task.createdBy].filter((uid): uid is string => !!uid),
      {
        actorId,
        type: 'update',
        title: 'Task deleted',
        message: `${userName} deleted "${task.title}"`,
      }
    );

    return true;
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

  moveTask: (taskId, newStatus, newIndex) => {
    const task = get().tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Mirror the same progress mapping as updateTaskStatus
    let progress = task.progress;
    if (newStatus === 'completed') progress = 100;
    else if (newStatus === 'todo') progress = 0;
    else if (newStatus === 'review' && task.progress < 75) progress = 75;
    else if (newStatus === 'in-progress' && task.progress === 0) progress = 10;

    // Reorder within the destination column (optimistic UI)
    set((state) => {
      const otherTasks = state.tasks.filter((t) => t.id !== taskId);
      const updatedTask = { ...task, status: newStatus, progress, updatedAt: new Date() };
      const columnTasks = otherTasks.filter((t) => t.status === newStatus);
      const nonColumnTasks = otherTasks.filter((t) => t.status !== newStatus);
      columnTasks.splice(newIndex, 0, updatedTask);
      return { tasks: [...nonColumnTasks, ...columnTasks] };
    });

    // Persist to DB and fire assignment/completion notifications
    get().updateTask(taskId, { status: newStatus, progress });
  },

  getTasksForUser: (userId) => {
    return get().tasks.filter((t) => t.assignedTo === userId);
  },

  completeTask: (id) => {
    get().updateTask(id, { status: 'completed', progress: 100 });
  },

  addCollaborator: (taskId, collaborator) => {
    const task = get().tasks.find((t) => t.id === taskId);
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
    }));

    // Notify the invited collaborator (reuses the existing task-assigned
    // type — an invite is a task-relevant responsibility just like an
    // assignment; not adding a new NotificationType for this).
    if (task) {
      const { userId: actorId, userName } = getTeamContext();
      notifyUser({
        actorId,
        recipientId: collaborator.userId,
        type: 'task-assigned',
        title: 'Added as collaborator',
        message: `${userName} added you as a ${collaborator.role} on "${task.title}"`,
        actionUrl: `#tasks?taskId=${taskId}`,
        taskId,
      });
    }
  },

  removeCollaborator: (taskId, userId) => {
    const task = get().tasks.find((t) => t.id === taskId);
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
    }));

    if (task) {
      const { userId: actorId, userName } = getTeamContext();
      notifyUser({
        actorId,
        recipientId: userId,
        type: 'update',
        title: 'Removed from task',
        message: `${userName} removed you as a collaborator on "${task.title}"`,
        actionUrl: `#tasks?taskId=${taskId}`,
        taskId,
      });
    }
  },

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
   * Shows DB tasks only — never seeds mock data into live mode.
   * An empty DB returns an empty board so users can create their own tasks.
   */
  hydrateFromDb: async (userId: string) => {
    const mock = isMockMode();
    if (mock) return; // Mock mode ON → don't touch DB
    const { teamId } = getTeamContext();
    const [dbTasks, botTasks] = await Promise.all([
      taskDb.fetchAll(userId, false, teamId),
      botTaskDb.fetchAllForUser(userId, false),
    ]);
    if (dbTasks === null && botTasks === null) return; // DB error — keep current state

    // bot_tasks and tasks use disjoint id spaces (both UUID, generated
    // independently) — a plain concat is safe, no dedupe needed. Empty array
    // is correct for a fresh account — sample data only shows when toggle ON.
    set({ tasks: [...(dbTasks || []), ...(botTasks || [])] });
  },

  clearMockData: () => {
    // Mock data ON → OFF: clear in-memory only.
    // The toggle handler in SettingsPage is the one that decides the new mode.
    set({ tasks: [], selectedTaskId: null });
  },

  restoreMockData: (currentUserId?: string) => {
    // Mock mode ON → populate in-memory only, never write to DB.
    // Assign ALL mock tasks to the current user so the full set is visible
    // on the dashboard (which filters by assignedTo for non-admin users).
    if (currentUserId) {
      const reassigned = mockTasks.map((t) => ({
        ...t,
        assignedTo: currentUserId,
      }));
      set({ tasks: reassigned, selectedTaskId: null });
    } else {
      set({ tasks: mockTasks, selectedTaskId: null });
    }
  },
}));

// Listen for tasks created/deleted by the Telegram/WhatsApp bot via the
// backend socket, and push a live task snapshot so the bot can show real
// tasks (never hardcoded/hallucinated ones) for its Delete Task flow.
import('@/lib/botSocket').then(({ getBotSocket }) => {
  const socket = getBotSocket();

  socket.on('task:bot-created', (payload: {
    id: string; title: string; description?: string; projectId?: string; assignedTo?: string;
    createdBy?: string;
    priority: string; status: string; dueDate?: string; estimatedHours?: number;
    tags?: string[]; subtasks?: { id: string; title: string; completed: boolean; createdAt: string }[];
    sourceChannel: 'telegram' | 'whatsapp';
    createdAt: string;
    persisted?: boolean; // true when the backend already wrote this directly (bot "database mode")
  }) => {
    useTaskStore.getState().addTask({
      title: payload.title,
      description: payload.description,
      status: (payload.status as any) || 'todo',
      priority: (payload.priority as any) || 'medium',
      projectId: payload.projectId,
      assignedTo: payload.assignedTo,
      createdBy: payload.createdBy,
      dueDate: payload.dueDate ? new Date(payload.dueDate) : undefined,
      estimatedHours: payload.estimatedHours,
      sourceChannel: payload.sourceChannel,
      tags: payload.tags || [],
      subtasks: (payload.subtasks || []).map((s) => ({ ...s, createdAt: new Date(s.createdAt) })),
      progress: 0,
    }, payload.id, payload.persisted);
    // Confirm back to the bot that this task was actually persisted, so its
    // confirmation message (and task link) is only sent once this succeeds.
    // (Harmless no-op from the bot's perspective in "database mode", where
    // it already knows the write succeeded and isn't waiting on this ack.)
    socket.emit('task:bot-created:ack', { id: payload.id });
  });

  socket.on('task:bot-updated', (payload: {
    id: string; description?: string; status?: string; priority?: string; dueDate?: string;
    estimatedHours?: number; tags?: string[]; progress?: number;
    subtasksToAdd?: string[]; // reset mode: raw titles to append to the existing task
    subtasks?: { id: string; title: string; completed: boolean; createdAt: string }[]; // database mode: already-merged final array
    persisted?: boolean;
  }) => {
    const state = useTaskStore.getState();
    const existing = state.tasks.find((t) => t.id === payload.id);
    if (!existing) return;

    const mergedSubtasks = payload.persisted
      ? (payload.subtasks || []).map((s) => ({ ...s, createdAt: new Date(s.createdAt) }))
      : [
          ...(existing.subtasks || []),
          ...(payload.subtasksToAdd || []).map((title, i) => ({
            id: `chat-sub-${Date.now()}-${i}`,
            title,
            completed: false,
            createdAt: new Date(),
          })),
        ];

    state.updateTask(payload.id, {
      description: payload.description,
      status: (payload.status as any) || existing.status,
      priority: (payload.priority as any) || existing.priority,
      dueDate: payload.dueDate ? new Date(payload.dueDate) : existing.dueDate,
      estimatedHours: payload.estimatedHours,
      tags: payload.tags || existing.tags,
      progress: payload.persisted && payload.progress !== undefined ? payload.progress : existing.progress,
      subtasks: mergedSubtasks,
    });
    socket.emit('task:bot-updated:ack', { id: payload.id });
  });

  socket.on('task:bot-deleted', (payload: { id: string }) => {
    useTaskStore.getState().deleteTask(payload.id);
  });

  const pushSnapshot = () => {
    const tasks = useTaskStore.getState().tasks;
    socket.emit('tasks:sync', tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      projectId: t.projectId,
      assignedTo: t.assignedTo,
      createdBy: t.createdBy,
    })));
  };
  socket.on('connect', pushSnapshot);
  useTaskStore.subscribe(pushSnapshot);
});
