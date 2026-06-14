import { create } from 'zustand';
import { Conversation, ChatMessage, ConversationType, ChatParticipant } from '@/types/index';
import { v4 as uuidv4 } from 'uuid';
import { chatDb, notificationDb } from '@/lib/dataService';

/**
 * Returns true when mock/sample data mode is active.
 * When true, all DB reads and writes are skipped — data lives in-memory only.
 * This keeps a clean separation: mock operations never touch the DB.
 */
import { useSettingsStore } from '@stores/settingsStore';
const isMockMode = () => useSettingsStore.getState().keepMockData;

// Lazy import to avoid circular dependency (userStore → chatStore → userStore)
const getUserStore = () => import('@stores/userStore').then((m) => m.useUserStore);

/** Aggregate DB reaction rows into the app's { emoji, users[] } shape */
function aggregateReactions(rows: { emoji: string; user_id: string }[]): { emoji: string; users: string[] }[] {
  const map = new Map<string, string[]>();
  for (const r of rows) {
    const arr = map.get(r.emoji) || [];
    arr.push(r.user_id);
    map.set(r.emoji, arr);
  }
  return Array.from(map, ([emoji, users]) => ({ emoji, users }));
}

// ─── Team members (shared reference) ──────────────────────────────────
interface TeamMemberInfo {
  id: string;
  name: string;
  firstName: string;
  avatar: string;
  role: 'admin' | 'member';
  department: string;
}

const allTeamMembers: TeamMemberInfo[] = [
  { id: 'user-1', name: 'Sapho Maqhwazima', firstName: 'Sapho', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sapho', role: 'admin', department: 'Engineering' },
  { id: 'user-2', name: 'Thando Nkosi', firstName: 'Thando', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Thando', role: 'member', department: 'Design' },
  { id: 'user-3', name: 'Lerato Molefe', firstName: 'Lerato', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lerato', role: 'member', department: 'Engineering' },
  { id: 'user-4', name: 'Kabelo Dlamini', firstName: 'Kabelo', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kabelo', role: 'member', department: 'Engineering' },
  { id: 'user-5', name: 'Naledi Khumalo', firstName: 'Naledi', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Naledi', role: 'member', department: 'Engineering' },
];

function getMemberInfo(id: string): TeamMemberInfo {
  return allTeamMembers.find((m) => m.id === id) || allTeamMembers[0];
}

function toParticipant(member: TeamMemberInfo, online?: boolean): ChatParticipant {
  return {
    userId: member.id,
    name: member.name,
    avatar: member.avatar,
    role: member.role,
    online: online ?? Math.random() > 0.4,
    lastSeen: online === false ? new Date(Date.now() - Math.random() * 4 * 60 * 60 * 1000) : undefined,
  };
}

// ─── Detect demo/quick-login user IDs (user-1 … user-5) ──────────────
const isDemoUserId = (id: string) => /^user-\d+$/.test(id);

// ─── Stable DM conversation ID from two user IDs (order-independent) ──
function dmConvId(a: string, b: string): string {
  const sorted = [a, b].sort();
  return `conv-dm-${sorted[0]}-${sorted[1]}`;
}

// ─── Seed data: generated ONCE, shared across all logins ──────────────
let seeded = false;
let seedConversations: Conversation[] = [];
let seedMessages: Record<string, ChatMessage[]> = {};

function ensureSeedData() {
  if (seeded) return;
  seeded = true;

  const now = Date.now();
  const min = 60 * 1000;
  const hr = 60 * min;

  const u1 = getMemberInfo('user-1');
  const u2 = getMemberInfo('user-2');
  const u3 = getMemberInfo('user-3');
  const u4 = getMemberInfo('user-4');
  const u5 = getMemberInfo('user-5');

  const p1 = toParticipant(u1, true);
  const p2 = toParticipant(u2, true);
  const p3 = toParticipant(u3, false);
  const p4 = toParticipant(u4, true);
  const p5 = toParticipant(u5, false);

  // ── Task conversations (visible to participants) ──────────────
  const taskConvId1 = 'conv-task-quarterly-report';
  const taskConvId2 = 'conv-task-vendor-contracts';

  seedMessages[taskConvId1] = [
    { id: uuidv4(), conversationId: taskConvId1, senderId: u2.id, senderName: u2.name, senderAvatar: u2.avatar, text: `I've started pulling together the quarterly numbers. Should we include the regional breakdown this time?`, timestamp: new Date(now - 3 * hr), readBy: [u1.id, u2.id] },
    { id: uuidv4(), conversationId: taskConvId1, senderId: u1.id, senderName: u1.name, senderAvatar: u1.avatar, text: `Yes, leadership specifically asked for regional splits. I'll share the template I used last quarter.`, timestamp: new Date(now - 2.5 * hr), readBy: [u1.id, u2.id] },
    { id: uuidv4(), conversationId: taskConvId1, senderId: u4.id, senderName: u4.name, senderAvatar: u4.avatar, text: `I can help with the revenue figures. Finance sent me the updated spreadsheet yesterday.`, timestamp: new Date(now - 2 * hr), readBy: [u1.id, u4.id] },
    { id: uuidv4(), conversationId: taskConvId1, senderId: u2.id, senderName: u2.name, senderAvatar: u2.avatar, text: `Perfect — let's aim to have all sections in by Thursday. Progress is at about 65%.`, timestamp: new Date(now - 1 * hr), readBy: [u1.id, u2.id, u4.id] },
  ];

  seedMessages[taskConvId2] = [
    { id: uuidv4(), conversationId: taskConvId2, senderId: u1.id, senderName: u1.name, senderAvatar: u1.avatar, text: `The vendor contracts expire next week. We need legal to review the renewals ASAP.`, timestamp: new Date(now - 5 * hr), readBy: [u1.id, u3.id] },
    { id: uuidv4(), conversationId: taskConvId2, senderId: u3.id, senderName: u3.name, senderAvatar: u3.avatar, text: `I'll flag it with legal today. Two of the five vendors have new pricing terms — should we negotiate or accept?`, timestamp: new Date(now - 4 * hr), readBy: [u1.id, u3.id] },
    { id: uuidv4(), conversationId: taskConvId2, senderId: u1.id, senderName: u1.name, senderAvatar: u1.avatar, text: `Let's push back on the price increase for the top 2 vendors. I'll draft talking points.`, timestamp: new Date(now - 3.5 * hr), readBy: [u1.id, u3.id] },
  ];

  // ── DM conversations (stable IDs based on user pairs) ─────────
  const dm12 = dmConvId(u1.id, u2.id);
  const dm13 = dmConvId(u1.id, u3.id);
  const dm14 = dmConvId(u1.id, u4.id);
  const dm15 = dmConvId(u1.id, u5.id);
  const dm23 = dmConvId(u2.id, u3.id);
  const dm24 = dmConvId(u2.id, u4.id);
  const dm35 = dmConvId(u3.id, u5.id);

  seedMessages[dm12] = [
    { id: uuidv4(), conversationId: dm12, senderId: u2.id, senderName: u2.name, senderAvatar: u2.avatar, text: `Hey! Do you have the latest compliance checklist? I need it for the audit prep.`, timestamp: new Date(now - 45 * min), readBy: [u2.id] },
    { id: uuidv4(), conversationId: dm12, senderId: u1.id, senderName: u1.name, senderAvatar: u1.avatar, text: `Sure, I'll send it over. Also check the shared drive — there's a newer version from last week.`, timestamp: new Date(now - 40 * min), readBy: [u1.id, u2.id] },
    { id: uuidv4(), conversationId: dm12, senderId: u2.id, senderName: u2.name, senderAvatar: u2.avatar, text: `Found it, thanks! One more thing — are we still meeting at 2pm to discuss the onboarding plan?`, timestamp: new Date(now - 20 * min), readBy: [u2.id] },
  ];

  seedMessages[dm13] = [
    { id: uuidv4(), conversationId: dm13, senderId: u3.id, senderName: u3.name, senderAvatar: u3.avatar, text: `The client proposal feedback is ready. I've flagged a few pricing concerns in the margins.`, timestamp: new Date(now - 8 * hr), readBy: [u1.id, u3.id] },
    { id: uuidv4(), conversationId: dm13, senderId: u1.id, senderName: u1.name, senderAvatar: u1.avatar, text: `Great, I'll review it this afternoon. Did the client mention a deadline for the final version?`, timestamp: new Date(now - 7 * hr), readBy: [u1.id, u3.id] },
    { id: uuidv4(), conversationId: dm13, senderId: u3.id, senderName: u3.name, senderAvatar: u3.avatar, text: `They want it by Monday. Should be doable if we lock in the pricing today.`, timestamp: new Date(now - 6.5 * hr), readBy: [u1.id, u3.id] },
  ];

  seedMessages[dm14] = [
    { id: uuidv4(), conversationId: dm14, senderId: u4.id, senderName: u4.name, senderAvatar: u4.avatar, text: `Quick update — the infrastructure migration is complete. All tests passing on staging.`, timestamp: new Date(now - 12 * hr), readBy: [u1.id, u4.id] },
    { id: uuidv4(), conversationId: dm14, senderId: u1.id, senderName: u1.name, senderAvatar: u1.avatar, text: `Excellent work! Let's schedule the production cutover for next week then.`, timestamp: new Date(now - 11 * hr), readBy: [u1.id, u4.id] },
  ];

  seedMessages[dm15] = [
    { id: uuidv4(), conversationId: dm15, senderId: u5.id, senderName: u5.name, senderAvatar: u5.avatar, text: `I've finished the data privacy checklist. Want me to share it with the compliance team directly?`, timestamp: new Date(now - 24 * hr), readBy: [u1.id, u5.id] },
    { id: uuidv4(), conversationId: dm15, senderId: u1.id, senderName: u1.name, senderAvatar: u1.avatar, text: `Yes please — and CC me so I can track the sign-off.`, timestamp: new Date(now - 23 * hr), readBy: [u1.id, u5.id] },
  ];

  seedMessages[dm23] = [
    { id: uuidv4(), conversationId: dm23, senderId: u2.id, senderName: u2.name, senderAvatar: u2.avatar, text: `Hey Lerato, are you free to pair on the payment gateway edge cases tomorrow?`, timestamp: new Date(now - 10 * hr), readBy: [u2.id, u3.id] },
    { id: uuidv4(), conversationId: dm23, senderId: u3.id, senderName: u3.name, senderAvatar: u3.avatar, text: `Sure, let's block 10-12pm. I'll prep the test cases.`, timestamp: new Date(now - 9.5 * hr), readBy: [u2.id, u3.id] },
  ];

  seedMessages[dm24] = [
    { id: uuidv4(), conversationId: dm24, senderId: u4.id, senderName: u4.name, senderAvatar: u4.avatar, text: `Thando, the brand guidelines doc looks great. Just a small tweak on the colour section.`, timestamp: new Date(now - 15 * hr), readBy: [u2.id, u4.id] },
    { id: uuidv4(), conversationId: dm24, senderId: u2.id, senderName: u2.name, senderAvatar: u2.avatar, text: `Thanks! I'll update the hex values and push a new version by EOD.`, timestamp: new Date(now - 14 * hr), readBy: [u2.id, u4.id] },
  ];

  seedMessages[dm35] = [
    { id: uuidv4(), conversationId: dm35, senderId: u5.id, senderName: u5.name, senderAvatar: u5.avatar, text: `Lerato, did you see the new POPIA update? Might affect our data retention policy.`, timestamp: new Date(now - 6 * hr), readBy: [u3.id, u5.id] },
    { id: uuidv4(), conversationId: dm35, senderId: u3.id, senderName: u3.name, senderAvatar: u3.avatar, text: `Yes, I'm already reviewing it. Let's loop in Sapho if we need policy changes.`, timestamp: new Date(now - 5.5 * hr), readBy: [u3.id, u5.id] },
  ];

  // ── Team & announcement (everyone is a participant) ───────────
  const teamConvId = 'conv-team-general';
  const announceConvId = 'conv-announce-main';

  seedMessages[teamConvId] = [
    { id: uuidv4(), conversationId: teamConvId, senderId: u1.id, senderName: u1.name, senderAvatar: u1.avatar, text: `Morning everyone — quick check-in. What's on everyone's plate today?`, timestamp: new Date(now - 6 * hr), readBy: [u1.id, u2.id, u3.id, u4.id, u5.id] },
    { id: uuidv4(), conversationId: teamConvId, senderId: u4.id, senderName: u4.name, senderAvatar: u4.avatar, text: `Wrapping up the payment integration tests. Two edge cases left to verify.`, timestamp: new Date(now - 5.5 * hr), readBy: [u1.id, u4.id] },
    { id: uuidv4(), conversationId: teamConvId, senderId: u5.id, senderName: u5.name, senderAvatar: u5.avatar, text: `I'm reviewing the data privacy audit findings. Will share a summary by EOD.`, timestamp: new Date(now - 5 * hr), readBy: [u1.id, u5.id] },
    { id: uuidv4(), conversationId: teamConvId, senderId: u2.id, senderName: u2.name, senderAvatar: u2.avatar, text: `Working on the quarterly report. Sapho, can we sync on the KPIs section later?`, timestamp: new Date(now - 4.5 * hr), readBy: [u1.id, u2.id] },
    { id: uuidv4(), conversationId: teamConvId, senderId: u1.id, senderName: u1.name, senderAvatar: u1.avatar, text: `Absolutely — let's do 3pm. I'll pull the latest numbers beforehand.`, timestamp: new Date(now - 4 * hr), readBy: [u1.id, u2.id] },
  ];

  seedMessages[announceConvId] = [
    { id: uuidv4(), conversationId: announceConvId, senderId: u1.id, senderName: u1.name, senderAvatar: u1.avatar, text: `Reminder: All task estimates for next sprint are due by Friday EOD. We're focusing on vendor contracts, compliance, and the client proposal delivery.`, timestamp: new Date(now - 24 * hr), readBy: [u1.id, u2.id, u3.id, u4.id, u5.id] },
    { id: uuidv4(), conversationId: announceConvId, senderId: u1.id, senderName: u1.name, senderAvatar: u1.avatar, text: `Also — welcome to Naledi who's officially joining the ops team this week. Please reach out if you need anything!`, timestamp: new Date(now - 20 * hr), readBy: [u1.id, u2.id, u3.id, u4.id, u5.id] },
  ];

  // ── Build conversation objects ────────────────────────────────
  seedConversations = [
    {
      id: taskConvId1, type: 'task', name: 'Prepare quarterly report', description: 'Q2 financials and KPIs discussion',
      participants: [p1, p2, p4],
      taskId: '1', taskTitle: 'Prepare quarterly report',
      lastMessage: seedMessages[taskConvId1][3], unreadCount: 0, pinned: true,
      createdAt: new Date(now - 48 * hr), updatedAt: new Date(now - 1 * hr),
    },
    {
      id: taskConvId2, type: 'task', name: 'Update vendor contracts', description: 'Contract renewal coordination',
      participants: [p1, p3],
      taskId: '2', taskTitle: 'Update vendor contracts',
      lastMessage: seedMessages[taskConvId2][2], unreadCount: 0, pinned: false,
      createdAt: new Date(now - 24 * hr), updatedAt: new Date(now - 3.5 * hr),
    },
    // DM conversations — one per pair
    {
      id: dm12, type: 'dm', name: '', // name resolved at view time
      participants: [p1, p2],
      lastMessage: seedMessages[dm12][2], unreadCount: 0, pinned: false,
      createdAt: new Date(now - 72 * hr), updatedAt: new Date(now - 20 * min),
    },
    {
      id: dm13, type: 'dm', name: '',
      participants: [p1, p3],
      lastMessage: seedMessages[dm13][2], unreadCount: 0, pinned: false,
      createdAt: new Date(now - 96 * hr), updatedAt: new Date(now - 6.5 * hr),
    },
    {
      id: dm14, type: 'dm', name: '',
      participants: [p1, p4],
      lastMessage: seedMessages[dm14][1], unreadCount: 0, pinned: false,
      createdAt: new Date(now - 48 * hr), updatedAt: new Date(now - 11 * hr),
    },
    {
      id: dm15, type: 'dm', name: '',
      participants: [p1, p5],
      lastMessage: seedMessages[dm15][1], unreadCount: 0, pinned: false,
      createdAt: new Date(now - 120 * hr), updatedAt: new Date(now - 23 * hr),
    },
    {
      id: dm23, type: 'dm', name: '',
      participants: [p2, p3],
      lastMessage: seedMessages[dm23][1], unreadCount: 0, pinned: false,
      createdAt: new Date(now - 50 * hr), updatedAt: new Date(now - 9.5 * hr),
    },
    {
      id: dm24, type: 'dm', name: '',
      participants: [p2, p4],
      lastMessage: seedMessages[dm24][1], unreadCount: 0, pinned: false,
      createdAt: new Date(now - 60 * hr), updatedAt: new Date(now - 14 * hr),
    },
    {
      id: dm35, type: 'dm', name: '',
      participants: [p3, p5],
      lastMessage: seedMessages[dm35][1], unreadCount: 0, pinned: false,
      createdAt: new Date(now - 30 * hr), updatedAt: new Date(now - 5.5 * hr),
    },
    // Team & announcement
    {
      id: teamConvId, type: 'team', name: 'General', description: 'Team-wide discussions and check-ins',
      participants: [p1, p2, p3, p4, p5],
      teamId: 'team-1',
      lastMessage: seedMessages[teamConvId][4], unreadCount: 0, pinned: true,
      createdAt: new Date(now - 168 * hr), updatedAt: new Date(now - 4 * hr),
    },
    {
      id: announceConvId, type: 'announcement', name: 'Announcements', description: 'Company-wide announcements',
      participants: [p1, p2, p3, p4, p5],
      lastMessage: seedMessages[announceConvId][1], unreadCount: 0, pinned: true,
      createdAt: new Date(now - 720 * hr), updatedAt: new Date(now - 20 * hr),
    },
  ];
}

// ─── Helper: get conversations visible to a user ──────────────────────
function getConversationsForUser(userId: string): Conversation[] {
  return seedConversations
    .filter((c) => c.participants.some((p) => p.userId === userId))
    .map((c) => {
      // For DMs, set the name to the OTHER participant's name
      if (c.type === 'dm') {
        const other = c.participants.find((p) => p.userId !== userId);
        return { ...c, name: other?.name || 'Unknown' };
      }
      return { ...c };
    });
}

// ─── Store ─────────────────────────────────────────────────────────────
interface ChatStore {
  conversations: Conversation[];
  messages: Record<string, ChatMessage[]>;
  activeConversationId: string | null;
  filterCategory: ConversationType | 'all';
  searchQuery: string;
  teamMembers: ChatParticipant[];
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar: string;

  // Actions
  loadForUser: (userId: string) => void;
  setActiveConversation: (id: string | null) => void;
  setFilterCategory: (category: ConversationType | 'all') => void;
  setSearchQuery: (query: string) => void;
  sendMessage: (conversationId: string, text: string, attachments?: import('@/types/index').Attachment[], taskRef?: import('@/types/index').TaskRef, replyTo?: import('@/types/index').ReplyRef) => void;
  editMessage: (conversationId: string, messageId: string, newText: string) => void;
  deleteMessage: (conversationId: string, messageId: string) => void;
  starMessage: (conversationId: string, messageId: string) => void;
  forwardMessage: (fromConversationId: string, messageId: string, toConversationId: string) => void;
  toggleReaction: (conversationId: string, messageId: string, emoji: string) => void;
  getConversationMessages: (conversationId: string) => ChatMessage[];
  getFilteredConversations: () => Conversation[];
  markAsRead: (conversationId: string) => void;
  createDM: (participant: ChatParticipant) => string;
  createTaskChat: (taskId: string, taskTitle: string, participants: ChatParticipant[]) => string;
  togglePin: (conversationId: string) => void;
  getTotalUnread: () => number;
  dockedChatIds: string[];
  dockChat: (conversationId: string) => void;
  undockChat: (conversationId: string) => void;
  isDocked: (conversationId: string) => boolean;
  chatBotOpen: boolean;
  setChatBotOpen: (open: boolean) => void;
  hydrateFromDb: (userId: string) => Promise<void>;
  clearMockData: () => void;
  restoreMockData: (userId: string) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: [],
  messages: {},
  activeConversationId: null,
  filterCategory: 'all',
  searchQuery: '',
  teamMembers: [],
  currentUserId: '',
  currentUserName: '',
  currentUserAvatar: '',
  dockedChatIds: [],
  chatBotOpen: false,
  setChatBotOpen: (open) => set({ chatBotOpen: open }),

  loadForUser: (userId) => {
    ensureSeedData(); // only generates once

    // ── Flush current Zustand messages back to seedMessages ──
    // so reactions, read receipts, and attachments survive user switches
    const currentMessages = get().messages;
    for (const [convId, msgs] of Object.entries(currentMessages)) {
      if (msgs.length > 0) {
        seedMessages[convId] = msgs;
      }
    }
    // Also sync conversation pin/unread state back to seed
    for (const conv of get().conversations) {
      const seedConv = seedConversations.find((c) => c.id === conv.id);
      if (seedConv) {
        seedConv.pinned = conv.pinned;
        seedConv.lastMessage = conv.lastMessage;
        seedConv.updatedAt = conv.updatedAt;
      }
    }

    const me = getMemberInfo(userId);
    const userConversations = getConversationsForUser(userId);
    const participants = allTeamMembers.map((m) => toParticipant(m, m.id === userId ? true : undefined));

    // Compute unread counts for this user
    const convs = userConversations.map((c) => {
      const msgs = seedMessages[c.id] || [];
      const unread = msgs.filter((m) => m.senderId !== userId && !m.readBy.includes(userId)).length;
      return { ...c, unreadCount: unread };
    });

    set({
      conversations: convs,
      messages: { ...seedMessages },
      currentUserId: userId,
      currentUserName: me.name,
      currentUserAvatar: me.avatar,
      teamMembers: participants,
      activeConversationId: null,
      dockedChatIds: [],
    });
  },

  setActiveConversation: (id) => {
    set({ activeConversationId: id });
    if (id) get().markAsRead(id);
  },

  setFilterCategory: (category) => set({ filterCategory: category }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  sendMessage: (conversationId, text, attachments, taskRef, replyTo) => {
    const trimmed = text.trim();
    if (!trimmed && (!attachments || attachments.length === 0) && !taskRef) return;

    const { currentUserId, currentUserName, currentUserAvatar } = get();

    const newMessage: ChatMessage = {
      id: uuidv4(),
      conversationId,
      senderId: currentUserId,
      senderName: currentUserName,
      senderAvatar: currentUserAvatar,
      text: trimmed,
      timestamp: new Date(),
      readBy: [currentUserId],
      ...(attachments && attachments.length > 0 ? { attachments } : {}),
      ...(taskRef ? { taskRef } : {}),
      ...(replyTo ? { replyTo } : {}),
    };

    // Persist to the shared seed data so other users see it on login (in-memory)
    if (!seedMessages[conversationId]) seedMessages[conversationId] = [];
    seedMessages[conversationId].push(newMessage);

    // Also update the seed conversation's lastMessage
    const seedConv = seedConversations.find((c) => c.id === conversationId);
    if (seedConv) {
      seedConv.lastMessage = newMessage;
      seedConv.updatedAt = new Date();
    }

    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: [...(state.messages[conversationId] || []), newMessage],
      },
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, lastMessage: newMessage, updatedAt: new Date() }
          : c
      ),
    }));

    // ── DB persistence (fire-and-forget, skipped when mock mode ON) ──
    // Also skip if conversationId is not a real UUID — string IDs like
    // "conv-dm-..." or "conv-task-..." are mock-only and would cause a
    // Postgres "invalid input syntax for type uuid" error on insert.
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(conversationId);
    const mock = isMockMode() || !isUuid;
    chatDb.sendMessage(
      { id: newMessage.id, conversationId, senderId: currentUserId, text: trimmed, taskRef: taskRef ?? undefined, replyTo: replyTo ?? undefined },
      mock
    );
    if (attachments && attachments.length > 0) {
      chatDb.insertAttachments(newMessage.id, attachments, currentUserId, mock);
    }

    // ── Notify other participants of new message (live mode only) ──
    // Direct notificationDb.insert() avoids the circular require() that
    // fails in Vite's ESM runtime. The recipient's Realtime subscription
    // picks up the new row and lights up their bell without any polling.
    if (!mock) {
      const conv = get().conversations.find((c) => c.id === conversationId);
      if (conv) {
        const preview = trimmed.length > 60 ? trimmed.slice(0, 57) + '…' : trimmed;
        const convLabel = conv.type === 'dm' ? currentUserName : `#${conv.name}`;
        for (const participant of conv.participants) {
          if (participant.userId === currentUserId) continue;
          notificationDb.insert(
            {
              id: uuidv4(),
              userId: participant.userId,
              type: 'mention',
              title: `New message from ${currentUserName}`,
              message: `${convLabel}: ${preview}`,
              read: false,
              actionUrl: '#chat',
            },
            false,
          );
        }
      }
    }
  },

  toggleReaction: (conversationId, messageId, emoji) => {
    const { currentUserId } = get();

    // Determine if adding or removing for the DB call
    const msgs = get().messages[conversationId] || [];
    const targetMsg = msgs.find((m) => m.id === messageId);
    const existingReaction = targetMsg?.reactions?.find((r) => r.emoji === emoji);
    const isRemoving = existingReaction?.users.includes(currentUserId) ?? false;

    // Optimistic Zustand update
    set((state) => {
      const convMsgs = state.messages[conversationId] || [];
      return {
        messages: {
          ...state.messages,
          [conversationId]: convMsgs.map((msg) => {
            if (msg.id !== messageId) return msg;
            const reactions = [...(msg.reactions || [])];
            const existing = reactions.find((r) => r.emoji === emoji);
            if (existing) {
              if (existing.users.includes(currentUserId)) {
                existing.users = existing.users.filter((u) => u !== currentUserId);
                if (existing.users.length === 0) {
                  return { ...msg, reactions: reactions.filter((r) => r.emoji !== emoji) };
                }
              } else {
                existing.users.push(currentUserId);
              }
              return { ...msg, reactions: [...reactions] };
            }
            return { ...msg, reactions: [...reactions, { emoji, users: [currentUserId] }] };
          }),
        },
      };
    });

    // ── Sync back to seedMessages so it survives user switches ──
    const updatedMsgs = get().messages[conversationId] || [];
    seedMessages[conversationId] = updatedMsgs;

    // DB persistence (fire-and-forget)
    const convIsUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(conversationId);
    chatDb.toggleReaction(messageId, currentUserId, emoji, !isRemoving, isMockMode() || !convIsUuid);
  },

  editMessage: (conversationId, messageId, newText) => {
    const trimmed = newText.trim();
    if (!trimmed) return;
    const editedAt = new Date();
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: (state.messages[conversationId] || []).map((m) =>
          m.id === messageId ? { ...m, text: trimmed, editedAt } : m
        ),
      },
    }));
    seedMessages[conversationId] = get().messages[conversationId] || [];
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(messageId);
    chatDb.editMessage(messageId, trimmed, isMockMode() || !isUuid);
  },

  deleteMessage: (conversationId, messageId) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: (state.messages[conversationId] || []).map((m) =>
          m.id === messageId ? { ...m, isDeleted: true } : m
        ),
      },
    }));
    seedMessages[conversationId] = get().messages[conversationId] || [];
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(messageId);
    chatDb.deleteMessage(messageId, isMockMode() || !isUuid);
  },

  starMessage: (conversationId, messageId) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: (state.messages[conversationId] || []).map((m) =>
          m.id === messageId ? { ...m, starred: !m.starred } : m
        ),
      },
    }));
    seedMessages[conversationId] = get().messages[conversationId] || [];
  },

  forwardMessage: (fromConversationId, messageId, toConversationId) => {
    const msg = (get().messages[fromConversationId] || []).find((m) => m.id === messageId);
    if (!msg || msg.isDeleted) return;
    get().sendMessage(toConversationId, msg.text, msg.attachments, msg.taskRef);
  },

  getConversationMessages: (conversationId) => {
    return get().messages[conversationId] || [];
  },

  getFilteredConversations: () => {
    const { conversations, filterCategory, searchQuery } = get();
    let filtered = conversations;

    if (filterCategory !== 'all') {
      filtered = filtered.filter((c) => c.type === filterCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q) ||
          c.taskTitle?.toLowerCase().includes(q) ||
          c.lastMessage?.text.toLowerCase().includes(q)
      );
    }

    // Sort: pinned first, then by updatedAt desc
    return [...filtered].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });
  },

  markAsRead: (conversationId) => {
    const { currentUserId } = get();

    // Also update seed data so the read state persists across logins
    const seedMsgs = seedMessages[conversationId];
    if (seedMsgs) {
      seedMsgs.forEach((m) => {
        if (!m.readBy.includes(currentUserId)) {
          m.readBy.push(currentUserId);
        }
      });
    }

    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c
      ),
      messages: {
        ...state.messages,
        [conversationId]: (state.messages[conversationId] || []).map((m) =>
          m.readBy.includes(currentUserId) ? m : { ...m, readBy: [...m.readBy, currentUserId] }
        ),
      },
    }));
  },

  createDM: (participant) => {
    const { currentUserId, currentUserName, currentUserAvatar } = get();
    const mockMode = isMockMode();

    if (mockMode) {
      // ── Mock mode: use stable human-readable string ID (never written to DB) ──
      const convId = dmConvId(currentUserId, participant.userId);

      const existing = get().conversations.find((c) => c.id === convId);
      if (existing) {
        set({ activeConversationId: existing.id });
        return existing.id;
      }

      const seedExists = seedConversations.find((c) => c.id === convId);
      if (seedExists) {
        const other = seedExists.participants.find((p) => p.userId !== currentUserId);
        const conv = { ...seedExists, name: other?.name || participant.name };
        set((state) => ({
          conversations: [conv, ...state.conversations],
          activeConversationId: convId,
        }));
        return convId;
      }

      const newConv: Conversation = {
        id: convId,
        type: 'dm',
        name: participant.name,
        participants: [
          { userId: currentUserId, name: currentUserName, avatar: currentUserAvatar, role: 'admin', online: true },
          participant,
        ],
        unreadCount: 0,
        pinned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      seedConversations.push(newConv);
      seedMessages[convId] = [];

      set((state) => ({
        conversations: [{ ...newConv }, ...state.conversations],
        messages: { ...state.messages, [convId]: [] },
        activeConversationId: convId,
      }));

      return convId;
    }

    // ── Live mode: conversations have UUID IDs loaded from DB by hydrateFromDb ──
    // Find existing DM between the two users rather than reconstructing a string ID.
    // (String IDs like "conv-dm-uuid1-uuid2" are not valid Postgres UUIDs and would
    //  fail the conversations.id column constraint.)
    const existingDM = get().conversations.find(
      (c) =>
        c.type === 'dm' &&
        c.participants.some((p) => p.userId === participant.userId) &&
        c.participants.some((p) => p.userId === currentUserId)
    );
    if (existingDM) {
      set({ activeConversationId: existingDM.id });
      return existingDM.id;
    }

    // Create brand new DM with a proper UUID so the DB insert succeeds.
    const convId = uuidv4();
    const newConv: Conversation = {
      id: convId,
      type: 'dm',
      name: participant.name,
      participants: [
        { userId: currentUserId, name: currentUserName, avatar: currentUserAvatar, role: 'admin', online: true },
        participant,
      ],
      unreadCount: 0,
      pinned: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    set((state) => ({
      conversations: [{ ...newConv }, ...state.conversations],
      messages: { ...state.messages, [convId]: [] },
      activeConversationId: convId,
    }));

    // DB persistence (fire-and-forget) — convId is now a real UUID
    chatDb.createConversation(
      { id: convId, type: 'dm', name: participant.name },
      [currentUserId, participant.userId],
      false
    );

    return convId;
  },

  createTaskChat: (taskId, taskTitle, participants) => {
    const mockMode = isMockMode();

    if (mockMode) {
      // ── Mock mode: use human-readable string ID (never written to DB) ──
      const convId = `conv-task-${taskId}`;

      const existing = get().conversations.find((c) => c.id === convId);
      if (existing) {
        set({ activeConversationId: existing.id });
        return existing.id;
      }

      const newConv: Conversation = {
        id: convId,
        type: 'task',
        name: taskTitle,
        taskId,
        taskTitle,
        participants,
        unreadCount: 0,
        pinned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      seedConversations.push(newConv);
      seedMessages[convId] = [];

      set((state) => ({
        conversations: [{ ...newConv }, ...state.conversations],
        messages: { ...state.messages, [convId]: [] },
        activeConversationId: convId,
      }));

      return convId;
    }

    // ── Live mode: look up by taskId, then create with real UUID if missing ──
    const existing = get().conversations.find(
      (c) => c.type === 'task' && c.taskId === taskId
    );
    if (existing) {
      set({ activeConversationId: existing.id });
      return existing.id;
    }

    const convId = uuidv4();
    const newConv: Conversation = {
      id: convId,
      type: 'task',
      name: taskTitle,
      taskId,
      taskTitle,
      participants,
      unreadCount: 0,
      pinned: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    set((state) => ({
      conversations: [{ ...newConv }, ...state.conversations],
      messages: { ...state.messages, [convId]: [] },
      activeConversationId: convId,
    }));

    // DB persistence (fire-and-forget) — convId is now a real UUID
    chatDb.createConversation(
      { id: convId, type: 'task', name: taskTitle, taskId, taskTitle },
      participants.map((p) => p.userId),
      false
    );

    return convId;
  },

  togglePin: (conversationId) => {
    const conv = get().conversations.find((c) => c.id === conversationId);
    const newPinned = conv ? !conv.pinned : false;
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, pinned: newPinned } : c
      ),
    }));
    const pinIsUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(conversationId);
    chatDb.updatePin(conversationId, newPinned, isMockMode() || !pinIsUuid);
  },

  getTotalUnread: () => {
    return get().conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  },

  dockChat: (conversationId) => {
    set((state) => ({
      dockedChatIds: state.dockedChatIds.includes(conversationId)
        ? state.dockedChatIds
        : [...state.dockedChatIds, conversationId].slice(-4),
    }));
    get().markAsRead(conversationId);
  },

  undockChat: (conversationId) => {
    set((state) => ({
      dockedChatIds: state.dockedChatIds.filter((id) => id !== conversationId),
    }));
  },

  isDocked: (conversationId) => {
    return get().dockedChatIds.includes(conversationId);
  },

  /**
   * Hydrate chat store from Supabase when mock mode is OFF and DB is connected.
   * When mock mode is ON, this is a no-op.
   *
   * Always initialises currentUserId, teamMembers etc. even when the DB has
   * no conversations yet — so the Chat UI is functional (user can create new
   * DMs/channels) even on a fresh account.
   */
  hydrateFromDb: async (userId: string) => {
    const mock = isMockMode();
    if (mock) return;

    // ── 1. Load real team members from DB ──────────────────────────
    const useUserStore = await getUserStore();
    const teamId = useUserStore.getState().currentTeamId;
    const dbMembers = await chatDb.fetchTeamMembers(userId, teamId, false);

    let realParticipants: ChatParticipant[];
    let myName = 'Me';
    let myAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`;

    if (dbMembers && dbMembers.length > 0) {
      realParticipants = dbMembers.map((row: any) => {
        const p = row.profiles || row;
        const uid = p.id || row.user_id;
        const name = p.name || p.email?.split('@')[0] || 'User';
        const avatar = p.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`;
        if (uid === userId) { myName = name; myAvatar = avatar; }
        return {
          userId: uid,
          name,
          avatar,
          role: (row.role || p.role || 'user') as 'admin' | 'member',
          online: uid === userId,
        };
      });
    } else {
      // Fallback: at least include the current user
      const userState = useUserStore.getState().user;
      if (userState) { myName = userState.name; myAvatar = userState.avatar || myAvatar; }
      realParticipants = [{
        userId,
        name: myName,
        avatar: myAvatar,
        role: 'admin',
        online: true,
      }];
    }

    // ── 2. Ensure user is participant in all team/announcement channels ──
    // New team members won't be in conversation_participants for channels
    // created before they joined — auto-join them now so fetchConversations
    // returns those channels on this and all future logins.
    if (teamId) {
      await chatDb.joinTeamChannels(userId, teamId, false);
    }

    // ── 3. Load conversations from DB ──────────────────────────────
    const dbConversations = await chatDb.fetchConversations(userId, false);

    let convs: Conversation[] = [];
    const msgs: Record<string, ChatMessage[]> = {};

    if (dbConversations && dbConversations.length > 0) {
      for (const dbConv of dbConversations) {
        const dbMessages = await chatDb.fetchMessages(dbConv.id, false);

        const convParticipants: ChatParticipant[] = (dbConv.conversation_participants || []).map((cp: any) => {
          // Prefer data from our already-loaded team members list (has online status),
          // then fall back to the profile joined in the query.
          const known = realParticipants.find((rp) => rp.userId === cp.user_id);
          const profile = cp.profile || {};
          return {
            userId: cp.user_id,
            name: known?.name || profile.name || cp.user_id,
            avatar: known?.avatar || profile.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${cp.user_id}`,
            role: (cp.role || profile.role || 'member') as 'admin' | 'member',
            online: cp.user_id === userId,
          };
        });

        const chatMessages: ChatMessage[] = (dbMessages || []).map((m: any) => ({
          id: m.id,
          conversationId: m.conversation_id,
          senderId: m.sender_id,
          senderName: m.sender?.name || 'Unknown',
          senderAvatar: m.sender?.avatar,
          text: m.text,
          timestamp: new Date(m.created_at),
          readBy: [m.sender_id],
          attachments: (m.attachments || []).map((a: any) => ({
            id: a.id,
            name: a.name,
            url: a.url,
            type: a.type,
            size: a.size,
            previewUrl: a.preview_url,
            uploadedAt: new Date(a.uploaded_at),
          })),
          reactions: aggregateReactions(m.reactions || []),
          ...(m.task_ref ? { taskRef: m.task_ref } : {}),
          ...(m.reply_to ? { replyTo: m.reply_to } : {}),
          ...(m.edited_at ? { editedAt: new Date(m.edited_at) } : {}),
          ...(m.is_deleted ? { isDeleted: true } : {}),
        }));

        msgs[dbConv.id] = chatMessages;
        const lastMsg = chatMessages.length > 0 ? chatMessages[chatMessages.length - 1] : undefined;

        let convName = dbConv.name;
        if (dbConv.type === 'dm') {
          const other = convParticipants.find((p) => p.userId !== userId);
          convName = other?.name || dbConv.name;
        }

        convs.push({
          id: dbConv.id,
          type: dbConv.type,
          name: convName,
          description: dbConv.description,
          participants: convParticipants,
          taskId: dbConv.task_id,
          taskTitle: dbConv.task_title,
          teamId: dbConv.team_id,
          lastMessage: lastMsg,
          unreadCount: 0,
          pinned: dbConv.pinned,
          createdAt: new Date(dbConv.created_at),
          updatedAt: new Date(dbConv.updated_at),
        });
      }
    }

    // ── 4. Seed default channels if user has none ───────────────────
    // Guard: only seed when this user truly has zero conversations for
    // this team. This prevents duplicates on concurrent calls.
    if (convs.length === 0 && teamId) {
      const generalId = uuidv4();
      const announceId = uuidv4();
      const participantIds = realParticipants.map((p) => p.userId);
      const now = new Date();

      const seedChannels: Conversation[] = [
        {
          id: generalId,
          type: 'team',
          name: 'General',
          description: 'Team-wide discussions and check-ins',
          participants: realParticipants,
          teamId,
          unreadCount: 0,
          pinned: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: announceId,
          type: 'announcement',
          name: 'Announcements',
          description: 'Company-wide announcements',
          participants: realParticipants,
          teamId,
          unreadCount: 0,
          pinned: true,
          createdAt: now,
          updatedAt: now,
        },
      ];

      convs = seedChannels;
      msgs[generalId] = [];
      msgs[announceId] = [];

      // Persist to DB (await so they exist before next refresh)
      for (const ch of seedChannels) {
        await chatDb.createConversation(
          { id: ch.id, type: ch.type, name: ch.name, description: ch.description, teamId, pinned: ch.pinned },
          participantIds,
          false,
        );
      }
    }

    // ── 5. Always set user context + team members ──────────────────
    // Auto-select the first pinned conversation (or just the first one)
    // so the chat panel shows messages immediately after hydration.
    // Prefer to keep the previously active conversation if it still exists.
    const prevActiveId = get().activeConversationId;
    const autoSelectId =
      (prevActiveId && convs.find((c) => c.id === prevActiveId)?.id) ||
      convs.find((c) => c.pinned)?.id ||
      convs[0]?.id ||
      null;

    set({
      conversations: convs,
      messages: msgs,
      currentUserId: userId,
      currentUserName: myName,
      currentUserAvatar: myAvatar,
      teamMembers: realParticipants,
      activeConversationId: autoSelectId,
      dockedChatIds: [],
    });
  },

  clearMockData: () => {
    set({
      conversations: [],
      messages: {},
      activeConversationId: null,
      dockedChatIds: [],
      teamMembers: [],
    });
  },

  restoreMockData: (userId) => {
    // Re-seed and reload for the user.
    // Real Supabase users (UUIDs) are mapped to 'user-1' (admin demo profile)
    // so the seed conversations are visible to them in mock mode.
    // Quick Login users (user-1 … user-5) use their own demo ID directly.
    seeded = false;
    seedConversations = [];
    seedMessages = {};
    const demoId = isDemoUserId(userId) ? userId : 'user-1';
    get().loadForUser(demoId);
  },
}));
