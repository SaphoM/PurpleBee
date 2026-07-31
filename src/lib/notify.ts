/**
 * notify.ts — the single place every store creates an in-app notification
 * from. Wraps `notificationDb.insert` directly (not the notificationStore
 * Zustand hook) to avoid the circular-import issues that come from stores
 * reaching into each other; the notificationStore's own Supabase Realtime
 * subscription is what actually appends the row to that store's state in
 * live mode, exactly like every other notify call site in this codebase
 * already relied on before this file existed.
 */
import { v4 as uuidv4 } from 'uuid';
import { notificationDb } from '@/lib/dataService';
import { useSettingsStore } from '@stores/settingsStore';
import type { NotificationType } from '@/types/index';

const isMockMode = () => useSettingsStore.getState().keepMockData;

export interface NotifyParams {
  /** The user performing the action — used only to skip self-notifications. */
  actorId?: string | null;
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  taskId?: string;
  conversationId?: string;
}

/** Create one in-app notification for one recipient. No-op in mock mode or when the recipient is the actor. */
export function notifyUser(params: NotifyParams): void {
  if (isMockMode()) return;
  if (!params.recipientId) return;
  if (params.actorId && params.actorId === params.recipientId) return;
  notificationDb.insert(
    {
      id: uuidv4(),
      userId: params.recipientId,
      type: params.type,
      title: params.title,
      message: params.message,
      read: false,
      actionUrl: params.actionUrl,
      taskId: params.taskId,
      conversationId: params.conversationId,
    },
    false,
  ).catch(() => {});
}

/** Same as notifyUser, fanned out to multiple recipients (each still individually self-notify-guarded and deduped). */
export function notifyUsers(recipientIds: string[], params: Omit<NotifyParams, 'recipientId'>): void {
  const seen = new Set<string>();
  for (const recipientId of recipientIds) {
    if (!recipientId || seen.has(recipientId)) continue;
    seen.add(recipientId);
    notifyUser({ ...params, recipientId });
  }
}
