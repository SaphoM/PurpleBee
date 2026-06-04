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
import type { Task, TaskStatus, TaskPriority } from '@/types/index';

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
}

/** Map a Supabase row → app Task */
const toTask = (row: DbTask): Task => ({
  id: row.id,
  title: row.title,
  description: row.description || undefined,
  status: row.status,
  priority: row.priority,
  assignedTo: row.assigned_to || undefined,
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
  created_by: createdBy || null,
});

export const taskDb = {
  /**
   * Fetch all tasks for the current user from Supabase.
   * Only called when mockMode is OFF and DB is connected.
   * Returns null when DB should not be used → caller keeps in-memory state.
   */
  async fetchAll(userId: string, mockMode?: boolean): Promise<Task[] | null> {
    if (!shouldPersist(mockMode)) return null;
    const { data, error } = await supabase!
      .from('tasks')
      .select('*')
      .or(`assigned_to.eq.${userId},created_by.eq.${userId}`)
      .order('created_at', { ascending: false });
    if (error) { console.error('[dataService] tasks.fetchAll', error); return null; }
    return (data as DbTask[]).map(toTask);
  },

  /** Insert a task — skipped when mock mode is ON */
  async insert(task: Task, createdBy?: string, mockMode?: boolean): Promise<boolean> {
    if (!shouldPersist(mockMode)) return true;
    const { error } = await supabase!
      .from('tasks')
      .insert(toDbInsert(task, createdBy));
    if (error) { console.error('[dataService] tasks.insert', error); return false; }
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

  /** Bulk insert — only used when restoring mock data with DB connected AND mock OFF */
  async bulkInsert(tasks: Task[], createdBy?: string, mockMode?: boolean): Promise<boolean> {
    if (!shouldPersist(mockMode)) return true;
    const rows = tasks.map((t) => toDbInsert(t, createdBy));
    const { error } = await supabase!.from('tasks').upsert(rows, { onConflict: 'id' });
    if (error) { console.error('[dataService] tasks.bulkInsert', error); return false; }
    return true;
  },

  /** Delete all tasks for a user — used when clearing data with DB connected */
  async deleteAllForUser(userId: string, mockMode?: boolean): Promise<boolean> {
    if (!shouldPersist(mockMode)) return true;
    const { error } = await supabase!
      .from('tasks')
      .delete()
      .or(`assigned_to.eq.${userId},created_by.eq.${userId}`);
    if (error) { console.error('[dataService] tasks.deleteAllForUser', error); return false; }
    return true;
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

  async deleteAllForUser(userId: string, mockMode?: boolean) {
    if (!shouldPersist(mockMode)) return true;
    const { error } = await supabase!.from('notifications').delete().eq('user_id', userId);
    if (error) { console.error('[dataService] notifications.deleteAllForUser', error); return false; }
    return true;
  },
};

// ═══════════════════════════════════════════════════════════════════════
// PROJECTS
// ═══════════════════════════════════════════════════════════════════════

export const projectDb = {
  async fetchAll(userId: string, mockMode?: boolean) {
    if (!shouldPersist(mockMode)) return null;
    const { data, error } = await supabase!
      .from('projects')
      .select('*, project_tasks(*)')
      .or(`created_by.eq.${userId}`)
      .order('created_at', { ascending: false });
    if (error) { console.error('[dataService] projects.fetchAll', error); return null; }
    return data;
  },

  async insert(project: Record<string, unknown>, mockMode?: boolean) {
    if (!shouldPersist(mockMode)) return true;
    const { error } = await supabase!.from('projects').insert(project);
    if (error) { console.error('[dataService] projects.insert', error); return false; }
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
    const { error } = await supabase!.from('projects').delete().eq('id', id);
    if (error) { console.error('[dataService] projects.delete', error); return false; }
    return true;
  },

  async deleteAllForUser(userId: string, mockMode?: boolean) {
    if (!shouldPersist(mockMode)) return true;
    const { error } = await supabase!.from('projects').delete().eq('created_by', userId);
    if (error) { console.error('[dataService] projects.deleteAllForUser', error); return false; }
    return true;
  },
};

// ═══════════════════════════════════════════════════════════════════════
// CONVERSATIONS / MESSAGES  (chat)
// ═══════════════════════════════════════════════════════════════════════

export const chatDb = {
  /** Fetch all conversations the user participates in, with participants */
  async fetchConversations(userId: string, mockMode?: boolean) {
    if (!shouldPersist(mockMode)) return null;
    const { data, error } = await supabase!
      .from('conversations')
      .select('*, conversation_participants!inner(*)')
      .eq('conversation_participants.user_id', userId)
      .order('updated_at', { ascending: false });
    if (error) { console.error('[dataService] chat.fetchConversations', error); return null; }
    return data;
  },

  /** Fetch all participants for a conversation */
  async fetchParticipants(conversationId: string, mockMode?: boolean) {
    if (!shouldPersist(mockMode)) return null;
    const { data, error } = await supabase!
      .from('conversation_participants')
      .select('*, profile:profiles(name, avatar, role)')
      .eq('conversation_id', conversationId);
    if (error) { console.error('[dataService] chat.fetchParticipants', error); return null; }
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
        attachments:attachments(*)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (error) { console.error('[dataService] chat.fetchMessages', error); return null; }
    return data;
  },

  /** Send a message — returns the inserted row's id */
  async sendMessage(
    msg: { id: string; conversationId: string; senderId: string; text: string },
    mockMode?: boolean
  ): Promise<boolean> {
    if (!shouldPersist(mockMode)) return true;
    const { error } = await supabase!.from('messages').insert({
      id: msg.id,
      conversation_id: msg.conversationId,
      sender_id: msg.senderId,
      text: msg.text,
    });
    if (error) { console.error('[dataService] chat.sendMessage', error); return false; }

    // Update conversation's updated_at timestamp
    await supabase!.from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', msg.conversationId);

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

  /** Mark a message as read */
  async markRead(messageId: string, userId: string, mockMode?: boolean): Promise<boolean> {
    if (!shouldPersist(mockMode)) return true;
    const { error } = await supabase!.from('message_reads').upsert(
      { message_id: messageId, user_id: userId },
      { onConflict: 'message_id,user_id' }
    );
    if (error) { console.error('[dataService] chat.markRead', error); return false; }
    return true;
  },

  /** Create a conversation + add participants */
  async createConversation(
    conv: { id: string; type: string; name: string; description?: string; taskId?: string; taskTitle?: string; teamId?: string },
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
    });
    if (convErr) { console.error('[dataService] chat.createConversation', convErr); return false; }

    const rows = participantUserIds.map((uid) => ({
      conversation_id: conv.id,
      user_id: uid,
    }));
    const { error: partErr } = await supabase!.from('conversation_participants').insert(rows);
    if (partErr) { console.error('[dataService] chat.createConversation participants', partErr); return false; }
    return true;
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

  async deleteAllForUser(_userId: string, mockMode?: boolean) {
    if (!shouldPersist(mockMode)) return true;
    // Conversations are shared — cascade via team deletion in practice
    return true;
  },
};

// ═══════════════════════════════════════════════════════════════════════
// USER SETTINGS
// ═══════════════════════════════════════════════════════════════════════

export const settingsDb = {
  async fetch(userId: string) {
    // Settings always read from DB if connected (not gated by mockMode)
    if (!isDbConnected()) return null;
    const { data, error } = await supabase!
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error) { console.error('[dataService] settings.fetch', error); return null; }
    return data;
  },

  async upsert(userId: string, settings: Record<string, unknown>) {
    // Settings always persist if connected (not gated by mockMode)
    if (!isDbConnected()) return true;
    const { error } = await supabase!
      .from('user_settings')
      .upsert({ user_id: userId, ...settings }, { onConflict: 'user_id' });
    if (error) { console.error('[dataService] settings.upsert', error); return false; }
    return true;
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
    if (error) { console.error('[dataService] auth.signIn', error); return null; }
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

  /** Sign out */
  async signOut() {
    if (!isDbConnected()) return;
    await supabase!.auth.signOut();
  },

  /** Get current session */
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

  /** Get the team a user belongs to */
  async getTeamForUser(userId: string) {
    if (!isDbConnected()) return null;
    // Step 1: get team_id from team_members
    const { data: membership, error: memErr } = await supabase!
      .from('team_members')
      .select('team_id, role')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();
    if (memErr) { console.error('[dataService] getTeamForUser membership', memErr); return null; }
    if (!membership) return null;
    // Step 2: get team name
    const { data: team, error: teamErr } = await supabase!
      .from('teams')
      .select('id, name')
      .eq('id', membership.team_id)
      .single();
    if (teamErr) { console.error('[dataService] getTeamForUser team', teamErr); return null; }
    return { team_id: membership.team_id, role: membership.role, team };
  },
};

// ── Invite DB helpers ──────────────────────────────────────────────────
export const inviteDb = {
  /** Create an invite */
  async create(teamId: string, invitedBy: string, role: string, email?: string) {
    if (!isDbConnected()) return null;
    const row: Record<string, unknown> = {
      team_id: teamId,
      invited_by: invitedBy,
      role,
    };
    if (email) row.email = email.toLowerCase();
    const { data, error } = await supabase!
      .from('invites')
      .insert(row)
      .select()
      .single();
    if (error) { console.error('[dataService] inviteDb.create', error); return null; }
    return data;
  },

  /** Fetch invite by token */
  async getByToken(token: string) {
    if (!isDbConnected()) return null;
    const { data, error } = await supabase!
      .from('invites')
      .select('*, teams(name), profiles!invites_invited_by_fkey(name, email)')
      .eq('token', token)
      .single();
    if (error) { console.error('[dataService] inviteDb.getByToken', error); return null; }
    return data;
  },

  /** List pending invites for a team */
  async listForTeam(teamId: string) {
    if (!isDbConnected()) return [];
    const { data, error } = await supabase!
      .from('invites')
      .select('*')
      .eq('team_id', teamId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) { console.error('[dataService] inviteDb.listForTeam', error); return []; }
    return data || [];
  },

  /** Revoke an invite */
  async revoke(inviteId: string) {
    if (!isDbConnected()) return false;
    const { error } = await supabase!
      .from('invites')
      .update({ status: 'revoked', updated_at: new Date().toISOString() })
      .eq('id', inviteId);
    if (error) { console.error('[dataService] inviteDb.revoke', error); return false; }
    return true;
  },

  /** Accept an invite (used after sign-up via invite link) */
  async accept(token: string, userId: string) {
    if (!isDbConnected()) return null;
    // Fetch the invite
    const invite = await this.getByToken(token);
    if (!invite || invite.status !== 'pending') return null;
    if (new Date(invite.expires_at) < new Date()) return null;

    // Mark accepted
    await supabase!
      .from('invites')
      .update({ status: 'accepted', accepted_by: userId, updated_at: new Date().toISOString() })
      .eq('id', invite.id);

    // Add to team if not already a member
    const { data: existing } = await supabase!
      .from('team_members')
      .select('id')
      .eq('team_id', invite.team_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (!existing) {
      await supabase!
        .from('team_members')
        .insert({ team_id: invite.team_id, user_id: userId, role: invite.role });
    }

    return invite;
  },
};
