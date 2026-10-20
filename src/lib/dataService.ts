/**
 * DataService — persistence bridge between Zustand stores and Supabase.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  Keep Mock Data ON  →  Zustand only (in-memory). DB is never      │
 * │                        touched. Mock arrays drive the UI.          │
 * │                                                                    │
 * │  Keep Mock Data OFF →  Zustand + Supabase. Every mutation writes  │
 * │                        to the DB. On login, stores hydrate FROM    │
 * │                        the DB. This is the "real" production path. │
 * │                                                                    │
 * │  No Supabase env    →  Always in-memory regardless of the toggle. │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * This file does NOT import any Zustand store (avoids circular deps).
 * Instead, callers pass `keepMockData` or we read it via a getter.
 */

import { supabase, isDbConnected } from './supabase';
import { elapsedMinutesSince } from '@/utils/time';
import { prepareAvatarImage } from '@/lib/image';
import type { Task, TaskStatus, TaskPriority, Subtask, TaskActivityEntry, TaskActivityAction } from '@/types/index';

// ── Central gate ──────────────────────────────────────────────────────
// We can't import useSettingsStore here (circular), so every public
// method receives a `mockMode` flag from the caller. If the caller
// doesn't pass it, we default to skipping DB (safe fallback).

/** Returns true when the DB should be used for persistence */
const shouldPersist = (mockMode?: boolean): boolean => {
  // mockMode === true  → Keep Mock Data is ON  → DON'T persist
  // mockMode === false → Keep Mock Data is OFF → DO persist (if DB connected)
  if (mockMode === true) return false;
  return isDbConnected();
};

// ═══════════════════════════════════════════════════════════════════════
// TASKS
// ═══════════════════════════════════════════════════════════════════════

export interface DbTask {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to: string | null;
  due_date: string | null;
  tags: string[];
  progress: number;
  is_recurring: boolean;
  estimated_hours: number | null;
  actual_hours: number | null;
  project_id: string | null;
  team_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  links: import('@/types/index').TaskLink[] | null;
  attachments: import('@/types/index').Attachment[] | null;
}

/** Map a Supabase row → app Task */
const toTask = (row: DbTask): Task => ({
  id: row.id,
  title: row.title,
  description: row.description || undefined,
  status: row.status,
  priority: row.priority,
  assignedTo: row.assigned_to || undefined,
  createdBy: row.created_by || undefined,
  dueDate: row.due_date ? new Date(row.due_date) : undefined,
  tags: row.tags || [],
  progress: row.progress,
  isRecurring: row.is_recurring,
  estimatedHours: row.estimated_hours || undefined,
  actualHours: row.actual_hours || undefined,
  projectId: row.project_id || undefined,
  teamId: row.team_id || undefined,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
  links: row.links || [],
  attachments: row.attachments || [],
});

/** Map an app Task → Supabase insert payload */
const toDbInsert = (task: Task, createdBy?: string) => ({
  id: task.id,
  title: task.title,
  description: task.description || null,
  status: task.status,
  priority: task.priority,
  assigned_to: task.assignedTo || null,
  due_date: task.dueDate ? task.dueDate.toISOString() : null,
  tags: task.tags,
  progress: task.progress,
  is_recurring: task.isRecurring || false,
  estimated_hours: task.estimatedHours || null,
  actual_hours: task.actualHours || null,
  project_id: task.projectId || null,
  team_id: task.teamId || null,
  created_by: createdBy || task.createdBy || null,
  links: task.links && task.links.length > 0 ? task.links : null,
  attachments: task.attachments && task.attachments.length > 0 ? task.attachments : null,
});

// ── Subtask persistence ────────────────────────────────────────────────────────
export const subtaskDb = {
  /** Fetch all subtasks for the given task IDs, returns a map keyed by task_id */
  async fetchForTasks(taskIds: string[], mockMode?: boolean): Promise<Map<string, Subtask[]>> {
    if (!shouldPersist(mockMode) || taskIds.length === 0) return new Map();
    const { data, error } = await supabase!
      .from('subtasks')
      .select('*')
      .in('task_id', taskIds)
      .order('order', { ascending: true });
    if (error) { console.error('[dataService] subtasks.fetchForTasks', error); return new Map(); }
    const map = new Map<string, Subtask[]>();
    for (const row of (data as { id: string; task_id: string; title: string; description: string | null; completed: boolean; created_at: string }[])) {
      const arr = map.get(row.task_id) ?? [];
      arr.push({ id: row.id, title: row.title, description: row.description ?? undefined, completed: row.completed, createdAt: new Date(row.created_at) });
      map.set(row.task_id, arr);
    }
    return map;
  },

  /**
   * Replace all subtasks for a task with the given array.
   * Deletes existing rows then inserts fresh ones, preserving order.
   */
  async replaceForTask(taskId: string, subtasks: Subtask[], mockMode?: boolean): Promise<boolean> {
    if (!shouldPersist(mockMode)) return true;
    const { error: delErr } = await supabase!.from('subtasks').delete().eq('task_id', taskId);
    if (delErr) { console.error('[dataService] subtasks.replaceForTask delete', delErr); return false; }
    if (subtasks.length === 0) return true;
    const rows = subtasks.map((s, i) => ({
      id: s.id,
      task_id: taskId,
      title: s.title,
      description: s.description ?? null,
      completed: s.completed,
      order: i,
    }));
    const { error: insErr } = await supabase!.from('subtasks').insert(rows);
    if (insErr) { console.error('[dataService] subtasks.replaceForTask insert', insErr); return false; }
    return true;
  },
};

export const taskDb = {
  /**
   * Fetch all tasks for the current user from Supabase, including their subtasks.
   * Only called when mockMode is OFF and DB is connected.
   * Returns null when DB should not be used → caller keeps in-memory state.
   */
  async fetchAll(userId: string, mockMode?: boolean, teamId?: string | null): Promise<Task[] | null> {
    if (!shouldPersist(mockMode)) return null;
    // Single round-trip: join subtasks inline instead of two sequential queries.
    let q = supabase!
      .from('tasks')
      .select('*, subtasks(*)')
      .order('created_at', { ascending: false })
      .order('order', { referencedTable: 'subtasks', ascending: true });
    if (teamId) {
      q = q.or(`team_id.eq.${teamId},assigned_to.eq.${userId},created_by.eq.${userId}`);
    } else {
      q = q.or(`assigned_to.eq.${userId},created_by.eq.${userId}`);
    }
    const { data, error } = await q;
    if (error) { console.error('[dataService] tasks.fetchAll', error); return null; }
    return (data as (DbTask & { subtasks: { id: string; title: string; description: string | null; completed: boolean; created_at: string }[] })[]).map((row) => ({
      ...toTask(row),
      subtasks: (row.subtasks ?? []).map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description ?? undefined,
        completed: s.completed,
        createdAt: new Date(s.created_at),
      })),
    }));
  },

  /** Insert a task — skipped when mock mode is ON */
  async insert(task: Task, createdBy?: string, mockMode?: boolean): Promise<boolean> {
    if (!shouldPersist(mockMode)) return true;
    const { error } = await supabase!
      .from('tasks')
      .insert(toDbInsert(task, createdBy));
    if (error) { console.error('[dataService] tasks.insert', error); return false; }
    // Track task creation in activity log (fire-and-forget)
    const userId = createdBy || task.createdBy || undefined;
    if (userId) {
      activityLogDb.insert({
        userId,
        eventType: 'task_created',
        outcome: 'success',
        recordId: task.id,
        metadata: { taskTitle: task.title, hasAttachments: !!task.attachments?.length }
      }, mockMode).catch(() => {});
    }
    if (task.subtasks && task.subtasks.length > 0) {
      subtaskDb.replaceForTask(task.id, task.subtasks, mockMode);
    }
    return true;
  },

  /** Update a task — skipped when mock mode is ON */
  async update(id: string, updates: Partial<Task>, mockMode?: boolean): Promise<boolean> {
    if (!shouldPersist(mockMode)) return true;
    const payload: Record<string, unknown> = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.description !== undefined) payload.description = updates.description || null;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.priority !== undefined) payload.priority = updates.priority;
    if (updates.assignedTo !== undefined) payload.assigned_to = updates.assignedTo || null;
    if (updates.dueDate !== undefined) payload.due_date = updates.dueDate ? updates.dueDate.toISOString() : null;
    if (updates.tags !== undefined) payload.tags = updates.tags;
    if (updates.progress !== undefined) payload.progress = updates.progress;
    if (updates.estimatedHours !== undefined) payload.estimated_hours = updates.estimatedHours;
    if (updates.actualHours !== undefined) payload.actual_hours = updates.actualHours;
    if (updates.projectId !== undefined) payload.project_id = updates.projectId || null;
    if (updates.links !== undefined) payload.links = updates.links;
    if (updates.attachments !== undefined) payload.attachments = updates.attachments;

    // Sync subtasks to their own table (fire-and-forget alongside the main update)
    if (updates.subtasks !== undefined) {
      subtaskDb.replaceForTask(id, updates.subtasks, mockMode);
    }

    if (Object.keys(payload).length === 0) return true;

    const { error } = await supabase!.from('tasks').update(payload).eq('id', id);
    if (error) { console.error('[dataService] tasks.update', error); return false; }
    return true;
  },

  /** Delete a task — skipped when mock mode is ON */
  async delete(id: string, mockMode?: boolean): Promise<boolean> {
    if (!shouldPersist(mockMode)) return true;
    const { error } = await supabase!.from('tasks').delete().eq('id', id);
    if (error) { console.error('[dataService] tasks.delete', error); return false; }
    return true;
  },
};

// ═══════════════════════════════════════════════════════════════════════
// BOT TASKS
// ═══════════════════════════════════════════════════════════════════════
// Telegram/WhatsApp "database mode" tasks live in public.bot_tasks (text
// user/project ids), separate from public.tasks (UUID FKs to profiles).
// hydrateFromDb merges these in so bot-created tasks survive a refresh
// and show up on the Tasks page — see taskStore.ts hydrateFromDb.

interface DbBotTask {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  estimated_hours: number | null;
  tags: string[];
  subtasks: { id: string; title: string; completed: boolean; createdAt: string }[];
  progress: number;
  source_channel: string;
  created_at: string;
  updated_at: string;
}

const toTaskFromBot = (row: DbBotTask): Task => ({
  id: row.id,
  title: row.title,
  description: row.description || undefined,
  status: row.status,
  priority: row.priority,
  assignedTo: row.user_id,
  createdBy: row.user_id,
  dueDate: row.due_date ? new Date(row.due_date) : undefined,
  tags: row.tags || [],
  progress: row.progress ?? 0,
  estimatedHours: row.estimated_hours || undefined,
  projectId: row.project_id || undefined,
  subtasks: (row.subtasks || []).map((s) => ({ ...s, createdAt: new Date(s.createdAt) })),
  sourceChannel: row.source_channel as Task['sourceChannel'],
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
});

// ═══════════════════════════════════════════════════════════════════════
// TIME TRACKING (time_entries — one row per timer session)
// A DB trigger (sync_task_actual_hours) mirrors the sum into
// tasks.actual_hours, which is what the Analytics "Time Tracking Summary"
// card and the task detail modal read — the entries table is the source.
// ═══════════════════════════════════════════════════════════════════════

export interface DbTimeEntrySession {
  id: string;
  task_id: string;
  started_at: string;
}

export const timeDb = {
  /** The user's currently running timer, if any (partial unique index keeps it to one). */
  async getActiveEntry(userId: string): Promise<DbTimeEntrySession | null> {
    if (!isDbConnected()) return null;
    const { data, error } = await supabase!
      .from('time_entries')
      .select('id, task_id, started_at')
      .eq('user_id', userId)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1);
    if (error) { console.error('[dataService] time_entries.getActiveEntry', error); return null; }
    return (data?.[0] as DbTimeEntrySession | undefined) ?? null;
  },

  /**
   * Start a timer for a task. One running timer per user: any previous
   * session is stopped first (timestamps intact) before the new row is
   * inserted, satisfying the partial unique index.
   */
  async startEntry(taskId: string, userId: string): Promise<DbTimeEntrySession | null> {
    if (!isDbConnected()) return null;
    const active = await timeDb.getActiveEntry(userId);
    if (active) await timeDb.stopEntry(active.id, active.started_at, active.task_id);
    const { data, error } = await supabase!
      .from('time_entries')
      .insert({ task_id: taskId, user_id: userId })
      .select('id, task_id, started_at')
      .single();
    if (error) { console.error('[dataService] time_entries.insert', error); return null; }
    return data as DbTimeEntrySession;
  },

  /**
   * Stop a running timer. Returns the session length plus the task's exact
   * new tracked total (re-summed from the entries table), so callers can
   * refresh the in-memory task without racing other members' sessions.
   */
  async stopEntry(
    entryId: string,
    startedAt: string,
    taskId: string,
  ): Promise<{ duration_minutes: number; task_actual_hours: number } | null> {
    if (!isDbConnected()) return null;
    const minutes = Math.round(elapsedMinutesSince(startedAt) * 100) / 100;
    const { data: stopped, error } = await supabase!
      .from('time_entries')
      .update({ ended_at: new Date().toISOString(), duration_minutes: minutes })
      .eq('id', entryId)
      .is('ended_at', null)
      .select('id')
      .maybeSingle();
    if (error) { console.error('[dataService] time_entries.update', error); return null; }
    if (!stopped) return null; // already stopped (e.g. in another tab)
    const { data: rows, error: sumError } = await supabase!
      .from('time_entries')
      .select('duration_minutes')
      .eq('task_id', taskId);
    if (sumError) { console.error('[dataService] time_entries.sum', sumError); return null; }
    const totalMinutes = (rows || []).reduce(
      (sum, r) => sum + Number((r as { duration_minutes: number | string }).duration_minutes || 0),
      0,
    );
    return { duration_minutes: minutes, task_actual_hours: Math.round((totalMinutes / 60) * 100) / 100 };
  },
};

export const botTaskDb = {
  /** Fetch bot-created tasks for a user (merged into the main task list on hydrate) */
  async fetchAllForUser(userId: string, mockMode?: boolean): Promise<Task[] | null> {
    if (!shouldPersist(mockMode)) return null;
    const { data, error } = await supabase!
      .from('bot_tasks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) { console.error('[dataService] bot_tasks.fetchAllForUser', error); return null; }
    return (data as DbBotTask[]).map(toTaskFromBot);
  },
};

// ═══════════════════════════════════════════════════════════════════════
// TASK ACTIVITY — append-only audit log (who/when/what changed)
// ═══════════════════════════════════════════════════════════════════════

interface DbTaskActivity {
  id: string;
  task_id: string | null;
  task_title: string;
  team_id: string | null;
  actor_id: string;
  actor_name: string;
  action: string;
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

const toTaskActivity = (row: DbTaskActivity): TaskActivityEntry => ({
  id: row.id,
  taskId: row.task_id,
  taskTitle: row.task_title,
  teamId: row.team_id,
  actorId: row.actor_id,
  actorName: row.actor_name,
  action: row.action as TaskActivityAction,
  field: row.field || undefined,
  oldValue: row.old_value || undefined,
  newValue: row.new_value || undefined,
  createdAt: new Date(row.created_at),
});

export const taskActivityDb = {
  /** Fire-and-forget insert — never blocks the UI action that triggered it */
  async insert(entry: {
    taskId: string;
    taskTitle: string;
    teamId?: string | null;
    actorId: string;
    actorName: string;
    action: TaskActivityAction;
    field?: string;
    oldValue?: string;
    newValue?: string;
  }, mockMode?: boolean): Promise<boolean> {
    if (!shouldPersist(mockMode)) return true;
    const { error } = await supabase!.from('task_activity').insert({
      task_id: entry.taskId,
      task_title: entry.taskTitle,
      team_id: entry.teamId || null,
      actor_id: entry.actorId,
      actor_name: entry.actorName,
      action: entry.action,
      field: entry.field || null,
      old_value: entry.oldValue ?? null,
      new_value: entry.newValue ?? null,
    });
    if (error) { console.error('[dataService] task_activity.insert', error); return false; }
    return true;
  },

  /** Paginated fetch, newest first. Pass `before` (an ISO timestamp) to load older pages. */
  async fetchForTask(taskId: string, opts: { limit?: number; before?: string } = {}, mockMode?: boolean): Promise<TaskActivityEntry[] | null> {
    if (!shouldPersist(mockMode)) return null;
    let q = supabase!
      .from('task_activity')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })
      .limit(opts.limit ?? 20);
    if (opts.before) q = q.lt('created_at', opts.before);
    const { data, error } = await q;
    if (error) { console.error('[dataService] task_activity.fetchForTask', error); return null; }
    return (data as DbTaskActivity[]).map(toTaskActivity);
  },
};

// ═══════════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════

export const notificationDb = {
  async fetchAll(userId: string, mockMode?: boolean) {
    if (!shouldPersist(mockMode)) return null;
    const { data, error } = await supabase!
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) { console.error('[dataService] notifications.fetchAll', error); return null; }
    return data;
  },

  async insert(notification: {
    id: string;
    userId: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    actionUrl?: string;
    taskId?: string;
    conversationId?: string;
  }, mockMode?: boolean) {
    if (!shouldPersist(mockMode)) return true;
    const { error } = await supabase!.from('notifications').insert({
      id: notification.id,
      user_id: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      read: notification.read,
      action_url: notification.actionUrl || null,
      task_id: notification.taskId || null,
      conversation_id: notification.conversationId || null,
    });
    if (error) { console.error('[dataService] notifications.insert', error); return false; }
    return true;
  },

  async markRead(id: string, mockMode?: boolean) {
    if (!shouldPersist(mockMode)) return true;
    const { error } = await supabase!.from('notifications').update({ read: true }).eq('id', id);
    if (error) { console.error('[dataService] notifications.markRead', error); return false; }
    return true;
  },

  async markAllRead(userId: string, mockMode?: boolean) {
    if (!shouldPersist(mockMode)) return true;
    const { error } = await supabase!
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);
    if (error) { console.error('[dataService] notifications.markAllRead', error); return false; }
    return true;
  },

  async delete(id: string, mockMode?: boolean) {
    if (!shouldPersist(mockMode)) return true;
    const { error } = await supabase!.from('notifications').delete().eq('id', id);
    if (error) { console.error('[dataService] notifications.delete', error); return false; }
    return true;
  },

  async deleteAll(userId: string, mockMode?: boolean) {
    if (!shouldPersist(mockMode)) return true;
    const { error } = await supabase!.from('notifications').delete().eq('user_id', userId);
    if (error) { console.error('[dataService] notifications.deleteAll', error); return false; }
    return true;
  },
};

// ═══════════════════════════════════════════════════════════════════════
// PROJECTS
// ═══════════════════════════════════════════════════════════════════════

export interface DbProjectTaskInsert {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  estimated_hours: number;
  tags: string[];
  assigned_to: string | null;
  order: number;
  linked_task_id: string | null;
}

export const projectDb = {
  /**
   * Fetch all projects for the user's team, with their project_tasks nested.
   * Team-scoped so every member sees the shared portfolio.
   */
  async fetchAll(userId: string, mockMode?: boolean, teamId?: string | null, role?: string | null) {
    if (!shouldPersist(mockMode)) return null;
    // Explicit column list — deliberately excludes `value`/`currency`. Those
    // two columns are only ever readable via the get_project_value() RPC
    // (see getValue below), which enforces per-project visibility. Never
    // add them back to this bulk select — doing so would leak financial
    // data to every viewer regardless of their permission, since RLS here
    // is row-level only.
    let q = supabase!
      .from('projects')
      .select('id, name, description, icon, color, template_id, status, team_id, created_by, created_at, updated_at, product_name, attachments, links, card_display, project_type, planned_start_date, planned_completion_date, project_tasks(*)')
      .order('created_at', { ascending: false })
      .order('order', { referencedTable: 'project_tasks', ascending: true });
    // Admins/managers: let RLS is_admin_or_manager() return everything — no client filter.
    // Regular users: scope to team projects + anything they personally created.
    const isPrivileged = role === 'admin' || role === 'manager';
    if (!isPrivileged) {
      if (teamId) {
        q = q.or(`team_id.eq.${teamId},created_by.eq.${userId}`);
      } else {
        q = q.eq('created_by', userId);
      }
    }
    const { data, error } = await q;
    if (error) { console.error('[dataService] projects.fetchAll', error); return null; }
    return data;
  },

  /** Insert a project AND its project_tasks in one go */
  async insertWithTasks(
    project: Record<string, unknown>,
    tasks: DbProjectTaskInsert[],
    mockMode?: boolean
  ) {
    if (!shouldPersist(mockMode)) return true;
    const { error: projErr } = await supabase!.from('projects').insert(project);
    if (projErr) { console.error('[dataService] projects.insertWithTasks project', projErr); return false; }
    // Track project creation in activity log (fire-and-forget, valid actor only)
    const projectCreatedBy = project.created_by as string | undefined;
    if (projectCreatedBy) {
      activityLogDb.insert({
        userId: projectCreatedBy,
        eventType: 'project_created',
        outcome: 'success',
        recordId: project.id as string | undefined,
        metadata: { projectTitle: String(project.name || project.title || ''), taskCount: tasks.length }
      }, mockMode).catch(() => {});
    }
    if (tasks.length === 0) return true;
    const { error: tasksErr } = await supabase!.from('project_tasks').insert(tasks);
    if (tasksErr) { console.error('[dataService] projects.insertWithTasks tasks', tasksErr); return false; }
    return true;
  },

  async update(id: string, updates: Record<string, unknown>, mockMode?: boolean) {
    if (!shouldPersist(mockMode)) return true;
    const { error } = await supabase!.from('projects').update(updates).eq('id', id);
    if (error) { console.error('[dataService] projects.update', error); return false; }
    return true;
  },

  async delete(id: string, mockMode?: boolean) {
    if (!shouldPersist(mockMode)) return true;
    // project_tasks cascade via ON DELETE CASCADE
    const { error } = await supabase!.from('projects').delete().eq('id', id);
    if (error) { console.error('[dataService] projects.delete', error); return false; }
    return true;
  },

  /** Attach orphaned projects (team_id IS NULL) to the user's team */
  async claimOrphanedProjects(userId: string, teamId: string, mockMode?: boolean) {
    if (!shouldPersist(mockMode)) return true;
    const { error } = await supabase!
      .from('projects')
      .update({ team_id: teamId })
      .eq('created_by', userId)
      .is('team_id', null);
    if (error) { console.error('[dataService] projects.claimOrphaned', error); return false; }
    return true;
  },

  /** Project-task subtable CRUD */
  async insertTask(task: DbProjectTaskInsert, mockMode?: boolean) {
    if (!shouldPersist(mockMode)) return true;
    const { error } = await supabase!.from('project_tasks').insert(task);
    if (error) { console.error('[dataService] project_tasks.insert', error); return false; }
    return true;
  },

  async updateTask(id: string, updates: Record<string, unknown>, mockMode?: boolean) {
    if (!shouldPersist(mockMode)) return true;
    const { error } = await supabase!.from('project_tasks').update(updates).eq('id', id);
    if (error) { console.error('[dataService] project_tasks.update', error); return false; }
    return true;
  },

  async deleteTask(id: string, mockMode?: boolean) {
    if (!shouldPersist(mockMode)) return true;
    const { error } = await supabase!.from('project_tasks').delete().eq('id', id);
    if (error) { console.error('[dataService] project_tasks.delete', error); return false; }
    return true;
  },

  /**
   * The sole authorized read path for a project's value/currency — calls
   * the get_project_value() SECURITY DEFINER RPC, which returns nulls when
   * the caller isn't permitted to see it. Real (server-side) enforcement,
   * not a client-side hide.
   */
  async getValue(projectId: string, mockMode?: boolean): Promise<{ value: number | null; currency: string | null } | null> {
    if (!shouldPersist(mockMode)) return null;
    const { data, error } = await supabase!.rpc('get_project_value', { p_project_id: projectId });
    if (error) { console.error('[dataService] projects.getValue', error); return null; }
    const row = Array.isArray(data) ? data[0] : data;
    return { value: row?.value ?? null, currency: row?.currency ?? null };
  },
};

// ═══════════════════════════════════════════════════════════════════════
// PROJECT VALUE HISTORY  (narrow audit trail — value/currency changes only)
// ═══════════════════════════════════════════════════════════════════════

export const projectValueHistoryDb = {
  /** Fire-and-forget insert — never blocks the edit action that triggered it */
  async insert(entry: {
    projectId: string;
    projectName: string;
    teamId?: string | null;
    actorId: string;
    actorName: string;
    oldValue: number | null;
    oldCurrency: string | null;
    newValue: number | null;
    newCurrency: string | null;
  }, mockMode?: boolean): Promise<boolean> {
    if (!shouldPersist(mockMode)) return true;
    const { error } = await supabase!.from('project_value_history').insert({
      project_id: entry.projectId,
      project_name: entry.projectName,
      team_id: entry.teamId || null,
      actor_id: entry.actorId,
      actor_name: entry.actorName,
      old_value: entry.oldValue,
      old_currency: entry.oldCurrency,
      new_value: entry.newValue,
      new_currency: entry.newCurrency,
    });
    if (error) { console.error('[dataService] project_value_history.insert', error); return false; }
    return true;
  },

  async fetchForProject(projectId: string, mockMode?: boolean) {
    if (!shouldPersist(mockMode)) return null;
    const { data, error } = await supabase!
      .from('project_value_history')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) { console.error('[dataService] project_value_history.fetchForProject', error); return null; }
    return data;
  },
};

// ═══════════════════════════════════════════════════════════════════════
// CONVERSATIONS / MESSAGES  (chat)
// ═══════════════════════════════════════════════════════════════════════

export const chatDb = {
  /** Fetch all conversations the user participates in, with ALL participants and their profiles */
  async fetchConversations(userId: string, mockMode?: boolean) {
    if (!shouldPersist(mockMode)) return null;

    // Step 1: get conversation IDs the user belongs to
    const { data: membership, error: memErr } = await supabase!
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId);
    if (memErr) { console.error('[dataService] chat.fetchConversations membership', memErr); return null; }
    if (!membership || membership.length === 0) return [];

    const convIds = membership.map((r: any) => r.conversation_id as string);

    // Step 2: fetch full conversation rows + ALL participants (with profiles)
    // Using a separate select avoids PostgREST filtering the participants array
    // to only the current user (which happens with !inner + .eq()).
    const { data, error } = await supabase!
      .from('conversations')
      .select('*, conversation_participants(*, profile:profiles(id, name, avatar, role, last_seen_at))')
      .in('id', convIds)
      .order('updated_at', { ascending: false });
    if (error) { console.error('[dataService] chat.fetchConversations', error); return null; }
    return data;
  },

  /** Fetch messages for a conversation, with reactions and attachments */
  async fetchMessages(conversationId: string, mockMode?: boolean) {
    if (!shouldPersist(mockMode)) return null;
    const { data, error } = await supabase!
      .from('messages')
      .select(`
        *,
        sender:profiles!sender_id(name, avatar),
        reactions:message_reactions(*),
        attachments:attachments(*),
        reads:message_reads(user_id, read_at)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (error) { console.error('[dataService] chat.fetchMessages', error); return null; }
    return data;
  },

  /** Reset unread_count to 0 and update last_read_at for the current user in a conversation */
  async markConversationRead(conversationId: string, userId: string, mockMode?: boolean) {
    if (!shouldPersist(mockMode)) return;
    await supabase!
      .from('conversation_participants')
      .update({ unread_count: 0, last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    // Also write per-message seen receipts (message_reads) so senders get
    // the blue double-tick. Rows are upserted: a delivered-only row (no
    // read_at) becomes seen; existing seen rows are refreshed harmlessly.
    // Fire-and-forget — unread badge clearing above already succeeded.
    try {
      const { data: unread } = await supabase!
        .from('messages')
        .select('id')
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId)
        .limit(500);
      if (unread && unread.length > 0) {
        await supabase!
          .from('message_reads')
          .upsert(
            unread.map((m) => ({ message_id: m.id, user_id: userId, read_at: new Date().toISOString() })),
            { onConflict: 'message_id,user_id' }
          );
      }
    } catch (err) {
      console.warn('[dataService] chat.markConversationRead receipts', err);
    }
  },

  /**
   * Delivery receipt: record that this user's client received the message
   * (double grey tick for the sender). read_at stays null until the message
   * is actually viewed (markConversationRead). Upsert — receiving the same
   * message twice (reconnect/replay) must not create duplicate rows.
   */
  async markMessageDelivered(messageId: string, userId: string, mockMode?: boolean) {
    if (!shouldPersist(mockMode)) return;
    const { error } = await supabase!
      .from('message_reads')
      .upsert(
        { message_id: messageId, user_id: userId, read_at: null },
        { onConflict: 'message_id,user_id', ignoreDuplicates: true }
      );
    if (error) console.warn('[dataService] chat.markMessageDelivered', error);
  },

  /** Heartbeat: persist "last seen" for the WhatsApp-style presence display. */
  async touchLastSeen(userId: string, mockMode?: boolean) {
    if (!shouldPersist(mockMode)) return;
    const { error } = await supabase!
      .from('profiles')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', userId);
    if (error) console.warn('[dataService] profiles.touchLastSeen', error);
  },

  /** Increment unread_count for a specific participant in a conversation */
  async incrementUnreadCount(conversationId: string, userId: string, mockMode?: boolean) {
    if (!shouldPersist(mockMode)) return;
    const { data } = await supabase!
      .from('conversation_participants')
      .select('unread_count')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .single();
    if (data) {
      await supabase!
        .from('conversation_participants')
        .update({ unread_count: (data.unread_count || 0) + 1 })
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);
    }
  },

  /** Fetch a single message by ID, with reactions and attachments */
  async fetchMessageById(messageId: string, mockMode?: boolean) {
    if (!shouldPersist(mockMode)) return null;
    const { data, error } = await supabase!
      .from('messages')
      .select(`
        *,
        sender:profiles!sender_id(name, avatar),
        reactions:message_reactions(*),
        attachments:attachments(*),
        reads:message_reads(user_id, read_at)
      `)
      .eq('id', messageId)
      .single();
    if (error) { console.error('[dataService] chat.fetchMessageById', error); return null; }
    return data;
  },

  /** Send a message — returns the inserted row's id */
  async sendMessage(
    msg: {
      id: string;
      conversationId: string;
      senderId: string;
      text: string;
      taskRef?: import('@/types/index').TaskRef;
      replyTo?: import('@/types/index').ReplyRef;
    },
    mockMode?: boolean
  ): Promise<boolean> {
    if (!shouldPersist(mockMode)) return true;
    const { error } = await supabase!.from('messages').insert({
      id: msg.id,
      conversation_id: msg.conversationId,
      sender_id: msg.senderId,
      text: msg.text,
      ...(msg.taskRef ? { task_ref: msg.taskRef } : {}),
      ...(msg.replyTo ? { reply_to: msg.replyTo } : {}),
    });
    if (error) { console.error('[dataService] chat.sendMessage', error); return false; }

    await supabase!.from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', msg.conversationId);

    return true;
  },

  /** Edit a message text */
  async editMessage(messageId: string, newText: string, mockMode?: boolean): Promise<boolean> {
    if (!shouldPersist(mockMode)) return true;
    const { error } = await supabase!
      .from('messages')
      .update({ text: newText, edited_at: new Date().toISOString() })
      .eq('id', messageId);
    if (error) { console.error('[dataService] chat.editMessage', error); return false; }
    return true;
  },

  /** Soft-delete a message */
  async deleteMessage(messageId: string, mockMode?: boolean): Promise<boolean> {
    if (!shouldPersist(mockMode)) return true;
    const { error } = await supabase!
      .from('messages')
      .update({ is_deleted: true })
      .eq('id', messageId);
    if (error) { console.error('[dataService] chat.deleteMessage', error); return false; }
    return true;
  },

  /** Insert attachment rows linked to a message */
  async insertAttachments(
    messageId: string,
    attachments: { id: string; name: string; url: string; type: string; size: number; previewUrl?: string }[],
    uploadedBy: string,
    mockMode?: boolean
  ): Promise<boolean> {
    if (!shouldPersist(mockMode)) return true;
    if (attachments.length === 0) return true;
    const rows = attachments.map((a) => ({
      id: a.id,
      message_id: messageId,
      name: a.name,
      url: a.url,
      type: a.type,
      size: a.size,
      preview_url: a.previewUrl || null,
      uploaded_by: uploadedBy,
    }));
    const { error } = await supabase!.from('attachments').insert(rows);
    if (error) { console.error('[dataService] chat.insertAttachments', error); return false; }
    return true;
  },

  /** Toggle a reaction on a message (upsert / delete) */
  async toggleReaction(
    messageId: string,
    userId: string,
    emoji: string,
    add: boolean,
    mockMode?: boolean
  ): Promise<boolean> {
    if (!shouldPersist(mockMode)) return true;
    if (add) {
      const { error } = await supabase!.from('message_reactions').upsert(
        { message_id: messageId, user_id: userId, emoji },
        { onConflict: 'message_id,user_id,emoji' }
      );
      if (error) { console.error('[dataService] chat.toggleReaction add', error); return false; }
    } else {
      const { error } = await supabase!.from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', userId)
        .eq('emoji', emoji);
      if (error) { console.error('[dataService] chat.toggleReaction remove', error); return false; }
    }
    return true;
  },

  /** Create a conversation + add participants */
  async createConversation(
    conv: { id: string; type: string; name: string; description?: string; taskId?: string; taskTitle?: string; teamId?: string; pinned?: boolean },
    participantUserIds: string[],
    mockMode?: boolean
  ): Promise<boolean> {
    if (!shouldPersist(mockMode)) return true;
    const { error: convErr } = await supabase!.from('conversations').insert({
      id: conv.id,
      type: conv.type,
      name: conv.name,
      description: conv.description || null,
      task_id: conv.taskId || null,
      task_title: conv.taskTitle || null,
      team_id: conv.teamId || null,
      pinned: conv.pinned ?? false,
    });
    if (convErr) { console.error('[dataService] chat.createConversation', convErr); return false; }

    // Insert own row first so the updated RLS WITH CHECK
    // (is_conversation_participant) passes for the second insert.
    const { data: authData } = await supabase!.auth.getUser();
    const currentUid = authData.user?.id ?? null;
    const selfId = currentUid && participantUserIds.includes(currentUid) ? currentUid : null;
    const otherIds = participantUserIds.filter((uid) => uid !== selfId);

    if (selfId) {
      const { error: selfErr } = await supabase!
        .from('conversation_participants')
        .insert({ conversation_id: conv.id, user_id: selfId });
      if (selfErr) { console.error('[dataService] chat.createConversation self participant', selfErr); return false; }
      if (otherIds.length > 0) {
        const { error: othersErr } = await supabase!
          .from('conversation_participants')
          .insert(otherIds.map((uid) => ({ conversation_id: conv.id, user_id: uid })));
        if (othersErr) { console.error('[dataService] chat.createConversation other participants', othersErr); return false; }
      }
    } else {
      // Admin/manager path where current user isn't in the list, or no session — try all at once.
      const { error: partErr } = await supabase!
        .from('conversation_participants')
        .insert(participantUserIds.map((uid) => ({ conversation_id: conv.id, user_id: uid })));
      if (partErr) { console.error('[dataService] chat.createConversation participants', partErr); return false; }
    }
    return true;
  },

  /**
   * Auto-join a user to any announcement/team channels for their team that they
   * are not yet a participant of. Called on every live-mode hydration so new
   * team members always see shared channels, even if they joined after the
   * channel was originally created.
   */
  async joinTeamChannels(userId: string, teamId: string, mockMode?: boolean): Promise<void> {
    if (!shouldPersist(mockMode)) return;

    // Find all announcement/team channels for this team (RLS now allows this)
    const { data: teamChannels, error: chErr } = await supabase!
      .from('conversations')
      .select('id')
      .eq('team_id', teamId)
      .in('type', ['announcement', 'team']);
    if (chErr || !teamChannels || teamChannels.length === 0) return;

    // Find which ones the user is already in
    const { data: existing } = await supabase!
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId)
      .in('conversation_id', teamChannels.map((c: any) => c.id));

    const joinedIds = new Set(((existing as any[]) || []).map((r: any) => r.conversation_id));
    const toJoin = teamChannels.filter((c: any) => !joinedIds.has(c.id));
    if (toJoin.length === 0) return;

    const rows = toJoin.map((c: any) => ({ conversation_id: c.id, user_id: userId }));
    const { error: insErr } = await supabase!.from('conversation_participants').insert(rows);
    if (insErr) console.error('[dataService] chat.joinTeamChannels', insErr);
  },

  /** Update conversation pin status */
  async updatePin(conversationId: string, pinned: boolean, mockMode?: boolean): Promise<boolean> {
    if (!shouldPersist(mockMode)) return true;
    const { error } = await supabase!.from('conversations')
      .update({ pinned })
      .eq('id', conversationId);
    if (error) { console.error('[dataService] chat.updatePin', error); return false; }
    return true;
  },

  /** Fetch all team members (profiles) for use in the chat member list */
  async fetchTeamMembers(userId: string, teamId: string | null, mockMode?: boolean) {
    if (!shouldPersist(mockMode)) return null;

    // If we have a team, fetch team_members + joined profiles
    if (teamId) {
      const { data, error } = await supabase!
        .from('team_members')
        .select('user_id, role, profiles!inner(id, name, email, avatar, role, title, department, last_seen_at)')
        .eq('team_id', teamId);
      if (error) { console.error('[dataService] chat.fetchTeamMembers', error); return null; }
      return data;
    }

    // No team — just fetch the user's own profile
    const { data, error } = await supabase!
      .from('profiles')
      .select('id, name, email, avatar, role, title, department')
      .eq('id', userId);
    if (error) { console.error('[dataService] chat.fetchTeamMembers solo', error); return null; }
    return data?.map((p: any) => ({ user_id: p.id, role: p.role, profiles: p })) || null;
  },

  /**
   * Upload a voice recording to the attachments bucket and return a
   * long-lived signed URL (the bucket is private — participants play the
   * signed URL directly, no auth header needed).
   */
  async uploadVoiceNote(userId: string, blob: Blob, mockMode?: boolean): Promise<string | null> {
    if (!shouldPersist(mockMode)) return null;
    const ext = blob.type.includes('mpeg') ? 'mp3' : blob.type.includes('ogg') ? 'ogg' : blob.type.includes('mp4') ? 'm4a' : 'webm';
    const path = `voice/${userId}/vn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase!.storage
      .from('attachments')
      .upload(path, blob, { contentType: blob.type || 'audio/webm', upsert: false });
    if (error) { console.error('[dataService] chat.uploadVoiceNote', error); return null; }
    const { data } = await supabase!.storage.from('attachments').createSignedUrl(path, 60 * 60 * 24 * 3650);
    return data?.signedUrl || null;
  },
};

// ═══════════════════════════════════════════════════════════════════════
// STATUSES — WhatsApp-style 24h posts (one active status per user)
// ═══════════════════════════════════════════════════════════════════════

export interface StatusRow {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: string;
  createdAt: Date;
  expiresAt: Date;
}

export const statusDb = {
  /** Active (not yet expired) statuses of a team, newest first */
  async fetchActive(teamId: string, mockMode?: boolean): Promise<StatusRow[] | null> {
    if (!shouldPersist(mockMode)) return null;
    const { data, error } = await supabase!
      .from('user_statuses')
      .select('*, profile:profiles(name, avatar)')
      .eq('team_id', teamId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    if (error) { console.error('[dataService] status.fetchActive', error); return null; }
    return (data || []).map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      userName: r.profile?.name || 'Member',
      userAvatar: r.profile?.avatar,
      text: r.text || undefined,
      mediaUrl: r.media_url || undefined,
      mediaType: r.media_type || undefined,
      createdAt: new Date(r.created_at),
      expiresAt: new Date(r.expires_at),
    }));
  },

  /** Post my status for the team — replaces my previous one (WhatsApp: one at a time) */
  async post(
    input: { userId: string; teamId: string; text?: string; mediaUrl?: string; mediaType?: string },
    mockMode?: boolean
  ): Promise<boolean> {
    if (!shouldPersist(mockMode)) return false;
    await supabase!.from('user_statuses')
      .delete()
      .eq('user_id', input.userId)
      .eq('team_id', input.teamId);
    const { error } = await supabase!.from('user_statuses').insert({
      user_id: input.userId,
      team_id: input.teamId,
      text: input.text || null,
      media_url: input.mediaUrl || null,
      media_type: input.mediaType || null,
    });
    if (error) { console.error('[dataService] status.post', error); return false; }
    return true;
  },

  async remove(id: string, mockMode?: boolean): Promise<boolean> {
    if (!shouldPersist(mockMode)) return true;
    const { error } = await supabase!.from('user_statuses').delete().eq('id', id);
    if (error) { console.error('[dataService] status.remove', error); return false; }
    return true;
  },

  /** Self-cleanup of my expired rows (everyone else's disappear from queries at expiry) */
  async cleanupExpired(userId: string, mockMode?: boolean): Promise<void> {
    if (!shouldPersist(mockMode)) return;
    await supabase!.from('user_statuses')
      .delete()
      .eq('user_id', userId)
      .lt('expires_at', new Date().toISOString());
  },

  /** Upload a status photo to the attachments bucket → signed URL valid past the 24h window */
  async uploadImage(userId: string, file: File, mockMode?: boolean): Promise<string | null> {
    if (!shouldPersist(mockMode)) return null;
    const ext = ((file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')) || 'jpg';
    const path = `statuses/${userId}/st-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase!.storage
      .from('attachments')
      .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: false });
    if (error) { console.error('[dataService] status.uploadImage', error); return null; }
    const { data } = await supabase!.storage.from('attachments').createSignedUrl(path, 60 * 60 * 24 * 7);
    return data?.signedUrl || null;
  },

  /** Live story-strip updates — insert/delete events on user_statuses. Returns unsubscribe. */
  subscribe(onChange: () => void): () => void {
    const sb = supabase;
    if (!sb) return () => {};
    const channel = sb
      .channel('purplebee-statuses')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_statuses' }, () => onChange())
      .subscribe();
    return () => { sb.removeChannel(channel); };
  },
};

// ═══════════════════════════════════════════════════════════════════════
// AUTH — Supabase Auth bridge
// ═══════════════════════════════════════════════════════════════════════

export const authDb = {
  /** Sign in with email + password via Supabase Auth */
  async signIn(email: string, password: string) {
    if (!isDbConnected()) return null;
    const { data, error } = await supabase!.auth.signInWithPassword({ email, password });
    if (error) {
      // Surface real reasons (wrong password etc.) to the caller for messaging.
      throw error;
    }
    return data;
  },

  /** Sign up a new user */
  async signUp(email: string, password: string, name: string, companyName?: string) {
    if (!isDbConnected()) return null;
    const metadata: Record<string, string> = { name };
    if (companyName) metadata.company_name = companyName;
    const { data, error } = await supabase!.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) { console.error('[dataService] auth.signUp', error); return null; }
    return data;
  },

  /** Update the authenticated user's password */
  async updatePassword(newPassword: string) {
    if (!isDbConnected()) return false;
    const { error } = await supabase!.auth.updateUser({ password: newPassword });
    if (error) { console.error('[dataService] auth.updatePassword', error); return false; }
    return true;
  },

  /** Send a password reset email via Supabase Auth */
  async resetPasswordForEmail(email: string) {
    if (!isDbConnected()) return { success: false, error: 'Database not connected' };
    const { error } = await supabase!.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}`,
    });
    if (error) {
      console.error('[dataService] auth.resetPasswordForEmail', error);
      return { success: false, error: error.message };
    }
    return { success: true, error: null };
  },

  /** Sign out of Supabase Auth (clears the persisted session) */
  async signOut() {
    if (supabase) await supabase.auth.signOut().catch(() => {});
  },

  /** Get the current session (auto-refreshes an expired access token) */
  async getSession() {
    if (!isDbConnected()) return null;
    const { data } = await supabase!.auth.getSession();
    return data.session;
  },

  /** Fetch the user's profile row */
  async getProfile(userId: string) {
    if (!isDbConnected()) return null;
    const { data, error } = await supabase!
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) { console.error('[dataService] auth.getProfile', error); return null; }
    return data;
  },

  /** Update a team member's profile fields and optionally their team role */
  async updateProfile(
    userId: string,
    teamId: string | null,
    updates: { name?: string; title?: string; department?: string; role?: string; avatar?: string }
  ) {
    if (!isDbConnected()) return false;
    const profilePayload: Record<string, unknown> = {};
    if (updates.name !== undefined) profilePayload.name = updates.name;
    if (updates.title !== undefined) profilePayload.title = updates.title;
    if (updates.department !== undefined) profilePayload.department = updates.department;
    if (updates.role !== undefined) profilePayload.role = updates.role;
    if (updates.avatar !== undefined) profilePayload.avatar = updates.avatar;
    if (Object.keys(profilePayload).length > 0) {
      const { error } = await supabase!.from('profiles').update(profilePayload).eq('id', userId);
      if (error) { console.error('[dataService] auth.updateProfile profiles', error); return false; }
    }
    // Keep team_members.role in sync
    if (updates.role !== undefined && teamId) {
      const { error } = await supabase!
        .from('team_members')
        .update({ role: updates.role })
        .eq('user_id', userId)
        .eq('team_id', teamId);
      if (error) { console.error('[dataService] auth.updateProfile team_members', error); }
    }
    return true;
  },

  /**
   * Upload a new profile picture to the public `avatars` bucket (RLS only
   * allows your own folder) and return its public URL for profiles.avatar.
   */
  async uploadAvatar(userId: string, file: File): Promise<string | null> {
    if (!isDbConnected()) return null;
    // Downscale to a 512px JPEG first: keeps uploads fast, accepts big phone
    // photos (raw guard lives in callers at 15 MB), and guarantees a format
    // every browser can render. Undecodable files (e.g. HEIC on Chrome)
    // throw here → null, so we never store an avatar <img> can't display.
    let blob: Blob = file;
    let ext = ((file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '')) || 'png';
    try {
      const prepared = await prepareAvatarImage(file);
      blob = prepared.blob;
      ext = prepared.ext;
    } catch (err) {
      console.error('[dataService] avatars.prepare — image could not be decoded:', err);
      return null;
    }
    const path = `${userId}/avatar-${Date.now().toString(36)}.${ext}`;
    const { error } = await supabase!.storage
      .from('avatars')
      .upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: false });
    if (error) { console.error('[dataService] avatars.upload', error); return null; }
    const { data } = supabase!.storage.from('avatars').getPublicUrl(path);
    return data?.publicUrl || null;
  },

  /** Persist notification preferences (in-app/email/per-category toggles) so they follow the account across devices, not just localStorage on one browser. */
  async updateNotificationPreferences(userId: string, preferences: Record<string, unknown>) {
    if (!isDbConnected()) return false;
    const { error } = await supabase!.from('profiles').update({ notification_preferences: preferences }).eq('id', userId);
    if (error) { console.error('[dataService] auth.updateNotificationPreferences', error); return false; }
    return true;
  },

  /** Get the team a user belongs to.
   *  Deterministic selection: a user may belong to several teams (their own
   *  auto-created one plus any they were invited to). We prefer a team the
   *  user did NOT create (i.e. one they were invited to — the real shared
   *  workspace), and tiebreak by the oldest team. This prevents the app from
   *  flip-flopping between teams across sessions.
   *  IMPORTANT: throws on a read error rather than returning null, so callers
   *  (getOrCreateTeam) don't mistake a transient failure for "no team" and
   *  create a duplicate team. */
  async getTeamForUser(userId: string) {
    if (!isDbConnected()) return null;

    // Step 1: get the user's team memberships (always readable — user_id = auth.uid())
    const { data: memberships, error: memErr } = await supabase!
      .from('team_members')
      .select('team_id, role')
      .eq('user_id', userId);
    if (memErr) {
      console.error('[dataService] getTeamForUser membership', memErr);
      throw memErr;
    }
    if (!memberships || memberships.length === 0) return null;

    const teamIds = memberships.map((m: any) => m.team_id as string);

    // Step 2: fetch team rows — now readable by members after the RLS fix.
    // If for any reason the SELECT is denied, fall back gracefully using
    // the membership data alone (team name will be unknown but hydration works).
    const { data: teams } = await supabase!
      .from('teams')
      .select('id, name, created_by, created_at')
      .in('id', teamIds)
      .order('created_at', { ascending: true });

    if (!teams || teams.length === 0) {
      // RLS blocked team rows — return membership with unknown name
      const m: any = memberships[0];
      return { team_id: m.team_id, role: m.role, team: null };
    }

    // Prefer teams the user was invited to (didn't create); tiebreak: oldest
    const sorted = [...teams].sort((a: any, b: any) => {
      const aInvited = a.created_by !== userId ? 0 : 1;
      const bInvited = b.created_by !== userId ? 0 : 1;
      if (aInvited !== bInvited) return aInvited - bInvited;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    const t: any = sorted[0];
    const role = memberships.find((m: any) => m.team_id === t.id)?.role || 'user';
    return {
      team_id: t.id,
      role,
      team: { id: t.id, name: t.name },
    };
  },

  /** Get the user's team, auto-creating one if none exists */
  async getOrCreateTeam(userId: string, userName: string) {
    if (!isDbConnected()) throw new Error('Database not connected');
    // Try existing team first
    const existing = await this.getTeamForUser(userId);
    if (existing) return existing;

    // No team — auto-create one using the user's name
    const teamName = `${userName.split(' ')[0]}'s Team`;
    const { data: newTeam, error: createErr } = await supabase!
      .from('teams')
      .insert({ name: teamName, created_by: userId })
      .select('id, name')
      .single();
    if (createErr) {
      console.error('[dataService] getOrCreateTeam create team', createErr);
      throw new Error(`Failed to create team: ${createErr.message}`);
    }

    // Add user as admin member
    const { error: memberErr } = await supabase!
      .from('team_members')
      .insert({ team_id: newTeam.id, user_id: userId, role: 'admin' });
    if (memberErr) {
      console.error('[dataService] getOrCreateTeam add member', memberErr);
      // Team was created, still usable — log but don't throw
    }

    return { team_id: newTeam.id, role: 'admin' as const, team: newTeam };
  },

  /** Send a magic-link invite email via Supabase OTP */
  async sendMagicLinkInvite(email: string, inviteToken: string) {
    if (!isDbConnected()) return { success: false, error: 'No DB connection' };
    // Supabase redirect strips hash fragments, so pass the invite token as
    // a query param on the origin. App.tsx reads it and shows the accept page.
    const redirectUrl = `${window.location.origin}?invite_token=${inviteToken}`;
    const { error } = await supabase!.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: redirectUrl,
      },
    });
    if (error) {
      console.error('[dataService] sendMagicLinkInvite', error);
      return { success: false, error: error.message };
    }
    return { success: true, error: null };
  },
};

// ── Invite DB helpers ──────────────────────────────────────────────────
export const inviteDb = {
  /** Create an invite */
  async create(teamId: string, invitedBy: string, role: string, email?: string, department?: string) {
    if (!isDbConnected()) throw new Error('Database not connected');
    const row: Record<string, unknown> = {
      team_id: teamId,
      invited_by: invitedBy,
      role,
      department: department || 'General',
    };
    if (email) row.email = email.toLowerCase();
    const { data, error } = await supabase!
      .from('invites')
      .insert(row)
      .select()
      .single();
    if (error) {
      console.error('[dataService] inviteDb.create', error);
      throw new Error(`Failed to create invite: ${error.message}`);
    }
    return data;
  },

  /** Fetch invite by token.
   *  Goes through the SECURITY DEFINER helper `get_invite_by_token` instead
   *  of a direct table read: the invites table deliberately has no SELECT
   *  policy (so invites can't be enumerated), and the accept page must work
   *  before sign-up (anon). Possession of the exact token is the capability. */
  async getByToken(token: string) {
    if (!isDbConnected()) return null;
    const { data, error } = await supabase!
      .rpc('get_invite_by_token', { p_token: token });
    if (error) { console.error('[dataService] inviteDb.getByToken', error); return null; }
    return data;
  },

  /** Accept an invite (used after sign-up via invite link).
   *  One atomic SECURITY DEFINER call — the invitee is a brand-new 'user'
   *  who cannot insert into team_members under RLS themselves. Returns the
   *  invite row, or null when the token is invalid/expired/already used. */
  async accept(token: string, userId: string) {
    if (!isDbConnected()) return null;
    const { data, error } = await supabase!
      .rpc('accept_invite', { p_token: token, p_user_id: userId });
    if (error) { console.error('[dataService] inviteDb.accept', error); return null; }
    return data;
  },
};

/** Insert an activity log entry — fire-and-forget, never blocks UI */
/** Row shape returned by activityLogDb.fetchRecent (dates pre-parsed). */
export interface ActivityLogRow {
  id: string;
  userId: string;
  eventType: string;
  eventTimestamp: Date;
  recordId: string | null;
  outcome: 'success' | 'failure';
  metadata: Record<string, any> | null;
}

export const activityLogDb = {
  /**
   * Fire-and-forget insert — never blocks or throws, so callers awaiting it
   * (login, session restore) can never fail because auditing failed. Errors
   * are logged and reported as `false` instead.
   */
  async insert(entry: {
    userId: string;
    eventType: string;
    outcome?: 'success' | 'failure';
    recordId?: string;
    metadata?: Record<string, any>;
  }, mockMode?: boolean): Promise<boolean> {
    if (!entry.userId) return false; // no valid actor — never write bogus rows
    if (!shouldPersist(mockMode)) return true;
    try {
      const { error } = await supabase!.from('activity_log').insert({
        user_id: entry.userId,
        event_type: entry.eventType,
        event_timestamp: new Date().toISOString(),
        record_id: entry.recordId || null,
        outcome: entry.outcome ?? 'success',
        metadata: entry.metadata || null,
      });
      if (error) { console.error('[dataService] activity_log.insert', error); return false; }
      return true;
    } catch (err) {
      console.error('[dataService] activity_log.insert threw', err);
      return false;
    }
  },

  /**
   * Fetch a user's recent activity-log rows (RLS scopes to own rows).
   * Returns null on DB error so callers can distinguish "no data" from
   * "could not verify".
   */
  async fetchRecent(
    userId: string,
    opts?: { days?: number; limit?: number },
    mockMode?: boolean
  ): Promise<ActivityLogRow[] | null> {
    if (!userId) return null;
    // Mock/disconnected mode: nothing is persisted — an honest empty list,
    // not an error. Null is reserved for "tried and could not verify".
    if (!shouldPersist(mockMode)) return [];
    try {
      const days = opts?.days ?? 30;
      const limit = opts?.limit ?? 50;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase!
        .from('activity_log')
        .select('id, user_id, event_type, event_timestamp, record_id, outcome, metadata')
        .eq('user_id', userId)
        .gte('event_timestamp', since)
        .order('event_timestamp', { ascending: false })
        .limit(limit);
      if (error) { console.error('[dataService] activity_log.fetchRecent', error); return null; }
      return (data ?? []).map((r) => ({
        id: r.id as string,
        userId: r.user_id as string,
        eventType: r.event_type as string,
        eventTimestamp: new Date(r.event_timestamp as string),
        recordId: (r.record_id as string | null) ?? null,
        outcome: (r.outcome as 'success' | 'failure') ?? 'success',
        metadata: (r.metadata as Record<string, any> | null) ?? null,
      }));
    } catch (err) {
      console.error('[dataService] activity_log.fetchRecent threw', err);
      return null;
    }
  },
};
