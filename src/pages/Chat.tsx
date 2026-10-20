import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import clsx from 'clsx';
import {
  MessageSquare,
  Search,
  Send,
  Hash,
  Users,
  AtSign,
  Megaphone,
  CheckSquare,
  Pin,
  PinOff,
  Plus,
  ArrowLeft,
  Smile,
  Paperclip,
  X,
  PanelBottomClose,
  File,
  Download,
  SmilePlus,
  CornerUpLeft,
  Trash2,
  Mic,
  Image as ImageIcon,
} from 'lucide-react';

const TelegramIcon = ({ size = 16 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}>
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);
import { useChatStore } from '@stores/chatStore';
import { useUserStore } from '@stores/userStore';
import { useSettingsStore } from '@stores/settingsStore';
import { chatDb, statusDb, type StatusRow } from '@/lib/dataService';
import { ConversationType, Attachment, ReplyRef, ChatMessage } from '@/types/index';
import TaskRefCard from '@components/TaskRefCard';
import MessageContextMenu from '@components/MessageContextMenu';
import { useToastStore } from '@components/Toast';
import { ChangeOwnAvatarBadge } from '@components/shared/ChangeOwnAvatarBadge';
import { QuickReactionPicker } from '@components/shared/QuickReactionPicker';
import { linkifyText } from '@/utils/linkify';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

// ── Emoji Picker Data ───────────────────────────────────────────────
const emojiCategories = [
  {
    name: 'Smileys',
    emojis: ['😀','😂','🤣','😊','😍','🥰','😘','😎','🤩','🥳','😇','🤔','😏','😬','😅','🙃','😉','😋','🤗','🤭','😶','😑','😤','😡','😢','😭','🥺','😱','🤯','😴'],
  },
  {
    name: 'Gestures',
    emojis: ['👍','👎','👏','🙌','🤝','✌️','🤞','💪','👋','🙏','🎉','🔥','❤️','💯','⭐','✅','❌','⚡','💡','🎯','🚀','💬','👀','🤷','🤦','💀','🫡','🫶','🤌','👌'],
  },
  {
    name: 'Work',
    emojis: ['📋','📊','📈','📉','💻','📱','⏰','📅','📌','📎','✏️','📝','📁','🗂️','💼','🔗','🔒','🔑','🏆','🎖️','📣','💰','⚙️','🛠️','🧪','📐','🗓️','📬','🏷️','🧾'],
  },
];

// ── Emoji Picker Component ──────────────────────────────────────────
const EmojiPicker: React.FC<{
  onSelect: (emoji: string) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement>;
}> = ({ onSelect, onClose, anchorRef }) => {
  const [activeCategory, setActiveCategory] = useState(0);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; openUp: boolean } | null>(null);

  useEffect(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const pickerH = 320;
    const pickerW = 300;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < pickerH + 16;
    setPos({
      top: openUp ? rect.top : rect.bottom + 8,
      left: Math.min(rect.right - pickerW, window.innerWidth - pickerW - 8),
      openUp,
    });
  }, [anchorRef]);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node) &&
          anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [onClose, anchorRef]);

  if (!pos) return null;

  return ReactDOM.createPortal(
    <div
      ref={pickerRef}
      className={clsx(
        'fixed z-[9999] w-[300px]',
        'bg-white dark:bg-slate-800',
        'border border-gray-200 dark:border-slate-700',
        'rounded-xl shadow-2xl overflow-hidden',
      )}
      style={{
        top: pos.openUp ? undefined : pos.top,
        bottom: pos.openUp ? window.innerHeight - pos.top + 8 : undefined,
        left: Math.max(8, pos.left),
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Category tabs */}
      <div className="flex border-b border-gray-100 dark:border-slate-700/50 px-2 pt-2">
        {emojiCategories.map((cat, i) => (
          <button
            key={cat.name}
            onClick={() => setActiveCategory(i)}
            className={clsx(
              'px-3 py-1.5 text-xs font-semibold rounded-t-lg transition-colors',
              activeCategory === i
                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                : 'text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300'
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>
      {/* Emoji grid */}
      <div className="p-2 h-[240px] overflow-y-auto">
        <div className="grid grid-cols-10 gap-0.5">
          {emojiCategories[activeCategory].emojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onSelect(emoji)}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-lg"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
};

// ── File size formatter ─────────────────────────────────────────────
const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ── Attachment preview in messages ──────────────────────────────────
const downloadAttachment = (attachment: Attachment) => {
  const link = document.createElement('a');
  link.href = attachment.previewUrl || attachment.url;
  link.download = attachment.name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const AttachmentBubble: React.FC<{ attachment: Attachment; isMe: boolean; compact?: boolean }> = ({ attachment, isMe, compact }) => {
  const isImage = attachment.type.startsWith('image/');
  const isAudio = attachment.type.startsWith('audio/');
  const iconSize = compact ? 12 : 16;
  const dlIconSize = compact ? 12 : 14;
  return (
    <div className={clsx(
      'mt-1.5 rounded-lg overflow-hidden border',
      isMe ? 'border-white/20' : 'border-gray-200 dark:border-slate-600',
    )}>
      {isAudio ? (
        /* Voice message — inline player (WhatsApp-style) */
        <div
          className={clsx('flex items-center gap-2 px-2 py-1.5', isMe ? 'bg-white/10' : 'bg-gray-50 dark:bg-slate-700/50')}
          onClick={(e) => e.stopPropagation()}
        >
          <Mic size={iconSize} className={clsx('flex-shrink-0', isMe ? 'text-white/70' : 'text-purple-500')} />
          <audio controls preload="metadata" src={attachment.url} className={compact ? 'w-36 h-8' : 'w-56 h-9'} />
        </div>
      ) : isImage && attachment.previewUrl ? (
        <div className="relative group">
          <img src={attachment.previewUrl} alt={attachment.name} className={clsx(compact ? 'max-w-[160px] max-h-[120px]' : 'max-w-[240px] max-h-[180px]', 'object-cover rounded-lg')} />
          <button
            onClick={(e) => { e.stopPropagation(); downloadAttachment(attachment); }}
            className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
            title="Download"
          >
            <Download size={dlIconSize} />
          </button>
        </div>
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); downloadAttachment(attachment); }}
          className={clsx(
            'flex items-center gap-2 w-full text-left',
            compact ? 'px-2 py-1.5' : 'px-3 py-2',
            'rounded-lg hover:brightness-95 dark:hover:brightness-110 transition-all',
            isMe ? 'bg-white/10' : 'bg-gray-50 dark:bg-slate-700/50'
          )}
        >
          <File size={iconSize} className={isMe ? 'text-white/70' : 'text-gray-400 dark:text-slate-500'} />
          <div className="flex-1 min-w-0">
            <p className={clsx(compact ? 'text-[10px]' : 'text-xs', 'font-medium truncate', isMe ? 'text-white' : 'text-gray-700 dark:text-slate-300')}>
              {attachment.name}
            </p>
            <p className={clsx(compact ? 'text-[9px]' : 'text-[10px]', isMe ? 'text-white/60' : 'text-gray-400 dark:text-slate-500')}>
              {formatFileSize(attachment.size)}
            </p>
          </div>
          <Download size={dlIconSize} className={clsx(isMe ? 'text-white/70 hover:text-white' : 'text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300', 'transition-colors')} />
        </button>
      )}
    </div>
  );
};

// ── Reaction bar under messages ─────────────────────────────────────
const ReactionBar: React.FC<{
  reactions: { emoji: string; users: string[] }[];
  onToggle: (emoji: string) => void;
  currentUserId: string;
}> = ({ reactions, onToggle, currentUserId }) => {
  if (!reactions || reactions.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {reactions.map((r) => (
        <button
          key={r.emoji}
          onClick={(e) => { e.stopPropagation(); onToggle(r.emoji); }}
          className={clsx(
            'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs transition-all border',
            r.users.includes(currentUserId)
              ? 'bg-purple-100 border-purple-300 dark:bg-purple-900/30 dark:border-purple-700'
              : 'bg-gray-100 border-gray-200 dark:bg-slate-700/50 dark:border-slate-600 hover:bg-gray-200 dark:hover:bg-slate-700'
          )}
        >
          <span>{r.emoji}</span>
          <span className={clsx(
            'text-[10px] font-semibold',
            r.users.includes(currentUserId) ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-slate-400'
          )}>
            {r.users.length}
          </span>
        </button>
      ))}
    </div>
  );
};

// Category config
const categoryConfig: { value: ConversationType | 'all'; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'all', label: 'All', icon: <MessageSquare size={14} />, color: 'text-gray-600 dark:text-slate-300' },
  { value: 'task', label: 'Tasks', icon: <CheckSquare size={14} />, color: 'text-purple-600 dark:text-purple-400' },
  { value: 'dm', label: 'Direct', icon: <AtSign size={14} />, color: 'text-blue-600 dark:text-blue-400' },
  { value: 'team', label: 'Teams', icon: <Users size={14} />, color: 'text-emerald-600 dark:text-emerald-400' },
  { value: 'announcement', label: 'Announce', icon: <Megaphone size={14} />, color: 'text-amber-600 dark:text-amber-400' },
  { value: 'telegram', label: 'Telegram', icon: <TelegramIcon size={14} />, color: 'text-sky-500 dark:text-sky-400' },
];

const getConversationIcon = (type: ConversationType) => {
  switch (type) {
    case 'task': return <CheckSquare size={16} className="text-purple-500" />;
    case 'dm': return <AtSign size={16} className="text-blue-500" />;
    case 'team': return <Hash size={16} className="text-emerald-500" />;
    case 'announcement': return <Megaphone size={16} className="text-amber-500" />;
    case 'telegram': return <TelegramIcon size={16} />;
  }
};

const getTypeBadgeClass = (type: ConversationType) => {
  switch (type) {
    case 'task': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
    case 'dm': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    case 'team': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
    case 'announcement': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    case 'telegram': return 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300';
  }
};

const formatMessageTime = (date: Date) => {
  if (isToday(date)) return format(date, 'h:mm a');
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMM d');
};

const formatFullTime = (date: Date) => {
  if (isToday(date)) return format(date, 'h:mm a');
  if (isYesterday(date)) return `Yesterday ${format(date, 'h:mm a')}`;
  return format(date, 'MMM d, h:mm a');
};

// New DM modal
const NewDMModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { teamMembers, createDM, currentUserId } = useChatStore();
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filtered = teamMembers
    .filter((m) => m.userId !== currentUserId)
    .filter((m) => m.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className={clsx(
          'relative w-full max-w-md mx-4',
          'bg-white dark:bg-slate-800 rounded-2xl shadow-2xl',
          'border border-gray-200 dark:border-slate-700'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">New Message</h3>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
              <X size={18} />
            </button>
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search team members..."
              className={clsx(
                'w-full pl-9 pr-4 py-2.5 rounded-lg text-sm',
                'bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400',
                'dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500',
                'focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
              )}
              autoFocus
            />
          </div>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400 dark:text-slate-500">No members found</div>
          ) : (
            filtered.map((member) => (
              <button
                key={member.userId}
                onClick={() => { createDM(member); onClose(); }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <div className="relative">
                  <img src={member.avatar} alt={member.name} className="w-10 h-10 rounded-full" />
                  <span className={clsx(
                    'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-800',
                    member.online ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-600'
                  )} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{member.name}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500">
                    {member.online ? 'Online' : member.lastSeen ? `Last seen ${formatDistanceToNow(member.lastSeen, { addSuffix: true })}` : 'Offline'}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export const Chat: React.FC = () => {
  const {
    activeConversationId, setActiveConversation,
    filterCategory, setFilterCategory,
    searchQuery, setSearchQuery,
    getFilteredConversations, getConversationMessages,
    sendMessage, editMessage, deleteMessage, starMessage, forwardMessage,
    togglePin, teamMembers, dockChat,
    currentUserId, toggleReaction, createDM,
    conversations: allConversations,
    subscribeTyping, unsubscribeTyping, setTyping,
  } = useChatStore();
  const typingNames = useChatStore((s) =>
    activeConversationId ? (s.typingUsers[activeConversationId]?.map((u) => u.name) ?? []) : []
  );
  const typingUsersMap = useChatStore((s) => s.typingUsers);
  const { addToast } = useToastStore();
  const { isAdmin } = useUserStore();
  const EDIT_WINDOW_MS = 15 * 60 * 1000;
  const msgCanEdit = (msg: { senderId: string; timestamp: Date; isDeleted?: boolean }) =>
    !msg.isDeleted && msg.senderId === currentUserId &&
    (isAdmin() || Date.now() - new Date(msg.timestamp).getTime() < EDIT_WINDOW_MS);

  const [messageInput, setMessageInput] = useState('');
  const [showNewDM, setShowNewDM] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ msg: ChatMessage; x: number; y: number } | null>(null);
  const [pendingReply, setPendingReply] = useState<ChatMessage | null>(null);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [forwardMsg, setForwardMsg] = useState<ChatMessage | null>(null);
  const [infoMsgId, setInfoMsgId] = useState<string | null>(null);
  const [deleteMsgConfirm, setDeleteMsgConfirm] = useState<{ conversationId: string; messageId: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reactionBtnRef = useRef<HTMLButtonElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSendingRef = useRef(false);
  const typingStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Voice recording (WhatsApp-style voice notes) ──
  const canRecord = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined';
  const [isRecording, setIsRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [isSendingVoice, setIsSendingVoice] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recChunksRef = useRef<Blob[]>([]);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recCancelledRef = useRef(false);
  const recConvIdRef = useRef<string | null>(null);

  // ── WhatsApp-style statuses (24h) ──
  const [statuses, setStatuses] = useState<StatusRow[]>([]);
  const [statusViewerId, setStatusViewerId] = useState<string | null>(null);
  const [showStatusComposer, setShowStatusComposer] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [statusImage, setStatusImage] = useState<File | null>(null);
  const [postingStatus, setPostingStatus] = useState(false);
  const statusImageRef = useRef<HTMLInputElement>(null);

  const conversations = getFilteredConversations();
  // Direct tab: every team member is always reachable, even without an
  // existing DM — members without an open DM are listed as one click away.
  const directMemberRows = filterCategory === 'dm'
    ? (() => {
        const q = searchQuery.trim().toLowerCase();
        const dmOtherIds = new Set(
          conversations
            .filter((c) => c.type === 'dm')
            .map((c) => c.participants.find((p) => p.userId !== currentUserId)?.userId)
            .filter(Boolean) as string[]
        );
        return teamMembers.filter(
          (m) =>
            m.userId !== currentUserId &&
            !dmOtherIds.has(m.userId) &&
            (!q || m.name.toLowerCase().includes(q))
        );
      })()
    : [];
  const activeConversation = useChatStore((s) => s.conversations.find((c) => c.id === s.activeConversationId));
  const activeMessages = activeConversationId ? getConversationMessages(activeConversationId) : [];
  const currentUserAvatar = useChatStore((s) => s.currentUserAvatar);
  const viewingStatus = statuses.find((st) => st.id === statusViewerId) || null;
  const statusImagePreview = statusImage ? URL.createObjectURL(statusImage) : null;

  const loadStatuses = React.useCallback(async () => {
    const teamId = useUserStore.getState().currentTeamId;
    if (!teamId) return;
    const rows = await statusDb.fetchActive(teamId, useSettingsStore.getState().keepMockData);
    if (rows) setStatuses(rows);
  }, []);

  // Load statuses, self-clean expired rows, live-refresh on insert/delete
  useEffect(() => {
    loadStatuses();
    const uid = useUserStore.getState().user?.id;
    if (uid) statusDb.cleanupExpired(uid, useSettingsStore.getState().keepMockData);
    const unsub = statusDb.subscribe(() => { loadStatuses(); });
    return () => unsub();
  }, [loadStatuses]);

  // Viewer target expired or was deleted while open → close it
  useEffect(() => {
    if (statusViewerId && statuses.length >= 0 && !statuses.some((st) => st.id === statusViewerId)) {
      setStatusViewerId(null);
    }
  }, [statuses, statusViewerId]);

  // ── Voice recording engine ──────────────────────────────────────────
  const formatRecTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const finishVoiceNote = async (blob: Blob) => {
    const convId = recConvIdRef.current;
    recConvIdRef.current = null;
    if (!convId) return;
    setIsSendingVoice(true);
    try {
      const url = await chatDb.uploadVoiceNote(currentUserId, blob, useSettingsStore.getState().keepMockData);
      if (!url) {
        addToast({ type: 'error', title: 'Voice message failed', message: 'Could not upload the recording — please try again', duration: 5000 });
        return;
      }
      const att: Attachment = {
        id: uuidv4(),
        name: `Voice message · ${format(new Date(), 'MMM d, HH:mm')}`,
        url,
        type: blob.type || 'audio/webm',
        size: blob.size,
        uploadedAt: new Date(),
      };
      sendMessage(convId, '', [att]);
    } finally {
      setIsSendingVoice(false);
    }
  };

  const stopRecording = (cancelled = false) => {
    recCancelledRef.current = cancelled;
    if (recTimerRef.current) { clearInterval(recTimerRef.current); recTimerRef.current = null; }
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== 'inactive') rec.stop();
    else if (cancelled) { setIsRecording(false); recConvIdRef.current = null; }
  };

  const startRecording = async () => {
    if (!canRecord || isRecording || isSendingVoice) return;
    if (!activeConversationId) {
      addToast({ type: 'info', title: 'Open a chat first', message: 'Pick a conversation to send a voice message', duration: 3500 });
      return;
    }
    try {
      // Ask for clean speech capture: browser-side echo cancellation, noise
      // suppression and automatic gain (mic level normalisation).
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((m) => MediaRecorder.isTypeSupported?.(m)) || '';
      // 96 kbps mono Opus/AAC is well above speech quality needs — the codec
      // defaults are tuned for tiny WebRTC packets and sound muffled.
      const rec = new MediaRecorder(stream, {
        ...(mime ? { mimeType: mime } : {}),
        audioBitsPerSecond: 96_000,
      });
      recChunksRef.current = [];
      recCancelledRef.current = false;
      recConvIdRef.current = activeConversationId;
      rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) recChunksRef.current.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setIsRecording(false);
        const wasCancelled = recCancelledRef.current;
        const chunks = recChunksRef.current;
        recChunksRef.current = [];
        if (wasCancelled) return;
        const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
        if (blob.size < 300) return;
        void finishVoiceNote(blob);
      };
      rec.start();
      mediaRecorderRef.current = rec;
      setIsRecording(true);
      setRecSeconds(0);
      recTimerRef.current = setInterval(() => setRecSeconds((sec) => sec + 1), 1000);
    } catch (err) {
      console.warn('[chat] microphone unavailable', err);
      addToast({ type: 'error', title: 'Microphone unavailable', message: 'Allow microphone access to record a voice message', duration: 5000 });
    }
  };

  // ── Status composer ────────────────────────────────────────────────
  const postStatus = async () => {
    const teamId = useUserStore.getState().currentTeamId;
    if (!teamId) return;
    if (!statusText.trim() && !statusImage) return;
    setPostingStatus(true);
    try {
      const keepMock = useSettingsStore.getState().keepMockData;
      let mediaUrl: string | null = null;
      let mediaType: string | undefined;
      if (statusImage) {
        mediaUrl = await statusDb.uploadImage(currentUserId, statusImage, keepMock);
        if (!mediaUrl) {
          addToast({ type: 'error', title: 'Upload failed', message: 'Could not upload the photo — please try again', duration: 5000 });
          return;
        }
        mediaType = 'image';
      }
      const ok = await statusDb.post(
        { userId: currentUserId, teamId, text: statusText.trim() || undefined, mediaUrl: mediaUrl || undefined, mediaType },
        keepMock
      );
      if (ok) {
        addToast({ type: 'success', title: 'Status posted', message: 'It disappears automatically after 24 hours', duration: 4000 });
        setShowStatusComposer(false);
        setStatusText('');
        setStatusImage(null);
        await loadStatuses();
      } else {
        addToast({ type: 'error', title: 'Could not post status', message: 'Please try again', duration: 5000 });
      }
    } finally {
      setPostingStatus(false);
    }
  };

  const deleteOwnStatus = async (id: string) => {
    const ok = await statusDb.remove(id, useSettingsStore.getState().keepMockData);
    setStatusViewerId(null);
    if (ok) {
      addToast({ type: 'info', title: 'Status deleted', message: 'It is no longer visible to your team', duration: 3500 });
      await loadStatuses();
    }
  };

  // Scroll to bottom whenever new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages.length]);

  // Jump to bottom instantly when switching conversations
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
  }, [activeConversationId]);

  // Close reaction picker on click outside
  useEffect(() => {
    if (!reactionPickerMsgId) return;
    const handle = () => setReactionPickerMsgId(null);
    // Delay to avoid closing immediately on the same click that opened it
    const timer = setTimeout(() => document.addEventListener('click', handle), 0);
    return () => { clearTimeout(timer); document.removeEventListener('click', handle); };
  }, [reactionPickerMsgId]);

  useEffect(() => {
    if (activeConversationId) inputRef.current?.focus();
  }, [activeConversationId]);

  // Listen for the other participant's typing presence on the active conversation
  useEffect(() => {
    if (!activeConversationId) return;
    subscribeTyping(activeConversationId);
    return () => {
      if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
      unsubscribeTyping(activeConversationId);
    };
  }, [activeConversationId, subscribeTyping, unsubscribeTyping]);

  // Also listen on every conversation in the sidebar list so "X is typing…"
  // can replace the last-message preview even when that conversation isn't
  // the one currently open (subscribeTyping/unsubscribeTyping are
  // refcounted, so this safely shares the channel with the effect above).
  // Sorted so reordering the list (e.g. a new message bumps a conversation
  // to the top) doesn't change this key — only the underlying *set* of
  // conversation ids should re-trigger a subscribe/unsubscribe cycle.
  const conversationIdsKey = conversations.map((c) => c.id).slice().sort().join(',');
  useEffect(() => {
    const ids = conversationIdsKey ? conversationIdsKey.split(',') : [];
    // Stagger the joins instead of firing them all in the same tick —
    // bursting many simultaneous channel subscribes over one multiplexed
    // Realtime socket can leave some broadcast bindings unregistered
    // server-side even though the client reports them as joined.
    const subscribed: string[] = [];
    const timers = ids.map((id, i) => setTimeout(() => {
      subscribeTyping(id);
      subscribed.push(id);
    }, i * 120));
    return () => {
      timers.forEach(clearTimeout);
      // Only unsubscribe ids whose staggered subscribe actually ran —
      // otherwise this would decrement a refcount that was never incremented
      subscribed.forEach((id) => unsubscribeTyping(id));
    };
  }, [conversationIdsKey, subscribeTyping, unsubscribeTyping]);

  const handleInputChange = (value: string) => {
    setMessageInput(value);
    if (!activeConversationId) return;
    setTyping(activeConversationId, true);
    if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
    typingStopTimer.current = setTimeout(() => setTyping(activeConversationId, false), 2000);
  };

  const startLongPress = (msg: ChatMessage, e: React.MouseEvent | React.TouchEvent) => {
    const x = 'clientX' in e ? e.clientX : e.touches[0].clientX;
    const y = 'clientY' in e ? e.clientY : e.touches[0].clientY;
    longPressTimer.current = setTimeout(() => setContextMenu({ msg, x, y }), 500);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  };
  const handleMsgContextMenu = (msg: ChatMessage, e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ msg, x: e.clientX, y: e.clientY });
  };
  const confirmEdit = (msgId: string) => {
    if (!activeConversationId) return;
    if (editingText.trim()) editMessage(activeConversationId, msgId, editingText);
    setEditingMsgId(null);
    setEditingText('');
  };

  const handleSend = () => {
    if (!activeConversationId || (!messageInput.trim() && pendingAttachments.length === 0)) return;
    // Guard against double-submission (Enter key-repeat, double-click, or
    // a stray duplicate event firing handleSend twice for one user action)
    if (isSendingRef.current) return;
    isSendingRef.current = true;
    setTimeout(() => { isSendingRef.current = false; }, 300);
    if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
    setTyping(activeConversationId, false);
    const replyTo: ReplyRef | undefined = pendingReply
      ? { id: pendingReply.id, text: pendingReply.text, senderName: pendingReply.senderName, taskRef: pendingReply.taskRef }
      : undefined;
    sendMessage(activeConversationId, messageInput, pendingAttachments.length > 0 ? pendingAttachments : undefined, undefined, replyTo);
    setMessageInput('');
    setPendingAttachments([]);
    setPendingReply(null);
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessageInput((prev) => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newAttachments: Attachment[] = Array.from(files).map((file) => {
      const isImage = file.type.startsWith('image/');
      const previewUrl = isImage ? URL.createObjectURL(file) : undefined;
      return {
        id: uuidv4(),
        name: file.name,
        url: URL.createObjectURL(file),
        type: file.type,
        size: file.size,
        previewUrl,
        uploadedAt: new Date(),
      };
    });
    setPendingAttachments((prev) => [...prev, ...newAttachments]);
    // Reset the input so the same file can be re-selected
    e.target.value = '';
  };

  const removePendingAttachment = (id: string) => {
    setPendingAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversation(id);
    if (window.innerWidth < 768) {
      // Mobile: use the wallet (DockedChats) rather than the in-page overlay
      dockChat(id);
    }
  };

  const onlineCount = teamMembers.filter((m) => m.online).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100">Chat</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1">
            {conversations.length} conversations • {onlineCount} online
          </p>
        </div>
        <button
          onClick={() => setShowNewDM(true)}
          className={clsx(
            'w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold',
            'bg-gradient-to-r from-purple-600 to-blue-600 text-white',
            'hover:from-purple-700 hover:to-blue-700',
            'shadow-md shadow-purple-500/20 transition-all'
          )}
        >
          <Plus size={18} />
          New Message
        </button>
      </div>

      {/* Chat Layout */}
      <div className={clsx(
        'flex rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-700/50',
        'bg-white dark:bg-slate-800/50',
        'shadow-sm',
        'h-[calc(100vh-220px)] min-h-[500px]'
      )}>
        {/* Sidebar - Conversation List */}
        <div className="w-full md:w-80 lg:w-96 flex-shrink-0 border-r border-gray-200 dark:border-slate-700/50 flex flex-col">
          {/* WhatsApp-style statuses (24h) */}
          <div className="px-3 pt-3 pb-2 border-b border-gray-100 dark:border-slate-700/30">
            <div className="flex gap-3 overflow-x-auto scrollbar-hide">
              {/* My status */}
              {(() => {
                const myStatus = statuses.find((st) => st.userId === currentUserId);
                return (
                  <div className="relative w-16 flex-shrink-0">
                    <button
                      onClick={() => (myStatus ? setStatusViewerId(myStatus.id) : setShowStatusComposer(true))}
                      className="flex flex-col items-center gap-1 w-full group"
                      title={myStatus ? 'View my status' : 'Add status'}
                    >
                      <div className="relative">
                        <div className={clsx('w-14 h-14 rounded-full p-0.5', myStatus ? 'bg-gradient-to-tr from-purple-500 via-pink-500 to-amber-400' : 'bg-gray-200 dark:bg-slate-600')}>
                          <img
                            src={currentUserAvatar}
                            alt="You"
                            className="w-full h-full rounded-full object-cover border-2 border-white dark:border-slate-800 bg-gray-100 dark:bg-slate-700"
                          />
                        </div>
                        {!myStatus && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center border-2 border-white dark:border-slate-800">
                            <Plus size={11} />
                          </span>
                        )}
                        {myStatus && (
                          <span className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/25 transition-colors" />
                        )}
                      </div>
                      <p className="text-[10px] text-gray-500 dark:text-slate-400 truncate w-full text-center">
                        {myStatus ? 'My status' : 'Add status'}
                      </p>
                    </button>
                    {/* Change my picture from where my avatar is shown — must be
                        a sibling of the button (inputs can't live in buttons) */}
                    <ChangeOwnAvatarBadge className="left-1 top-[42px]" />
                  </div>
                );
              })()}
              {/* Team members with an active status */}
              {statuses.filter((st) => st.userId !== currentUserId).map((st) => (
                <button
                  key={st.id}
                  onClick={() => setStatusViewerId(st.id)}
                  className="flex flex-col items-center gap-1 w-16 flex-shrink-0"
                  title={`${st.userName}'s status`}
                >
                  <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-purple-500 via-pink-500 to-amber-400">
                    <img
                      src={st.userAvatar}
                      alt={st.userName}
                      className="w-full h-full rounded-full object-cover border-2 border-white dark:border-slate-800 bg-gray-100 dark:bg-slate-700"
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-slate-400 truncate w-full text-center">
                    {st.userName.split(' ')[0]}
                  </p>
                </button>
              ))}
              {statuses.length === 1 && statuses[0]?.userId === currentUserId && (
                <p className="self-center text-[10px] text-gray-400 dark:text-slate-500 pr-1">
                  Nobody else has a status yet
                </p>
              )}
            </div>
          </div>
          {/* Category Tabs */}
          <div className="p-3 border-b border-gray-100 dark:border-slate-700/30">
            <div className="flex gap-1 overflow-x-auto scrollbar-hide">
              {categoryConfig.map((cat) => {
                const count = cat.value === 'all'
                  ? useChatStore.getState().conversations.length
                  : useChatStore.getState().conversations.filter((c) => c.type === cat.value).length;
                return (
                  <button
                    key={cat.value}
                    onClick={() => setFilterCategory(cat.value)}
                    className={clsx(
                      'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap',
                      filterCategory === cat.value
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                        : 'text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700/50'
                    )}
                  >
                    {cat.icon}
                    {cat.label}
                    <span className={clsx(
                      'inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold',
                      filterCategory === cat.value
                        ? 'bg-purple-200 text-purple-800 dark:bg-purple-800/50 dark:text-purple-200'
                        : 'bg-gray-200 text-gray-500 dark:bg-slate-700 dark:text-slate-400'
                    )}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search */}
          <div className="px-3 py-2">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className={clsx(
                  'w-full pl-9 pr-4 py-2 rounded-lg text-sm',
                  'bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400',
                  'dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-500',
                  'focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20'
                )}
              />
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 && directMemberRows.length === 0 ? (
              <div className="py-12 text-center">
                <MessageSquare size={32} className="mx-auto mb-3 text-gray-300 dark:text-slate-600" />
                <p className="text-sm text-gray-400 dark:text-slate-500">No conversations found</p>
              </div>
            ) : (
              <div className="px-2 py-1 space-y-0.5">
                {conversations.map((conv) => (
                  <div key={conv.id} className="relative group/conv">
                  <button
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/chat-conversation-id', conv.id);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onClick={() => handleSelectConversation(conv.id)}
                    onDoubleClick={() => handleSelectConversation(conv.id)}
                    className={clsx(
                      'w-full flex items-start gap-3 px-3 py-3 rounded-xl text-left transition-all',
                      activeConversationId === conv.id
                        ? 'bg-purple-50 dark:bg-purple-900/20 ring-1 ring-purple-200 dark:ring-purple-700/30'
                        : 'hover:bg-gray-50 dark:hover:bg-slate-700/30'
                    )}
                  >
                    {/* Avatar / Icon */}
                    <div className="flex-shrink-0 mt-0.5">
                      {conv.type === 'dm' ? (
                        <div className="relative">
                          <img
                            src={conv.participants.find((p) => p.userId !== currentUserId)?.avatar}
                            alt={conv.name}
                            className="w-10 h-10 rounded-full"
                          />
                          <span className={clsx(
                            'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2',
                            activeConversationId === conv.id ? 'border-purple-50 dark:border-purple-900/20' : 'border-white dark:border-slate-800',
                            conv.participants.find((p) => p.userId !== currentUserId)?.online ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-600'
                          )} />
                        </div>
                      ) : (
                        <div className={clsx(
                          'w-10 h-10 rounded-full flex items-center justify-center',
                          conv.type === 'task' && 'bg-purple-100 dark:bg-purple-900/30',
                          conv.type === 'team' && 'bg-emerald-100 dark:bg-emerald-900/30',
                          conv.type === 'announcement' && 'bg-amber-100 dark:bg-amber-900/30',
                          conv.type === 'telegram' && 'bg-sky-100 dark:bg-sky-900/30 text-sky-500',
                        )}>
                          {getConversationIcon(conv.type)}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {conv.pinned && <Pin size={10} className="text-purple-500 flex-shrink-0" />}
                          <span className={clsx(
                            'text-sm font-semibold truncate',
                            conv.unreadCount > 0 ? 'text-gray-900 dark:text-slate-100' : 'text-gray-700 dark:text-slate-300'
                          )}>
                            {conv.name}
                          </span>
                        </div>
                        {conv.lastMessage && (
                          <span className="text-[10px] text-gray-400 dark:text-slate-500 flex-shrink-0 ml-2">
                            {formatMessageTime(new Date(conv.lastMessage.timestamp))}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        {(typingUsersMap[conv.id]?.length ?? 0) > 0 ? (
                          <p className="text-xs truncate flex-1 italic text-purple-500 dark:text-purple-400 flex items-center gap-1.5">
                            <span className="flex gap-0.5 flex-shrink-0">
                              <span className="w-1 h-1 rounded-full bg-purple-400 dark:bg-purple-500 animate-bounce [animation-delay:-0.3s]" />
                              <span className="w-1 h-1 rounded-full bg-purple-400 dark:bg-purple-500 animate-bounce [animation-delay:-0.15s]" />
                              <span className="w-1 h-1 rounded-full bg-purple-400 dark:bg-purple-500 animate-bounce" />
                            </span>
                            {typingUsersMap[conv.id].length === 1
                              ? `${typingUsersMap[conv.id][0].name} is typing…`
                              : `${typingUsersMap[conv.id].map((u) => u.name).join(', ')} are typing…`}
                          </p>
                        ) : (
                          <p className={clsx(
                            'text-xs truncate flex-1',
                            conv.unreadCount > 0 ? 'text-gray-600 dark:text-slate-300 font-medium' : 'text-gray-400 dark:text-slate-500'
                          )}>
                            {conv.lastMessage
                              ? `${conv.lastMessage.senderId === currentUserId ? 'You: ' : ''}${conv.lastMessage.text}`
                              : 'No messages yet'}
                          </p>
                        )}
                        {/* Sent-message read receipt ticks (sidebar) — 1 sent · 2 delivered · 2 blue seen */}
                        {conv.unreadCount === 0 && conv.lastMessage?.senderId === currentUserId && !conv.lastMessage?.isDeleted && (() => {
                          const others = conv.participants.filter((p) => p.userId !== currentUserId);
                          const seenIds = (conv.lastMessage!.seenBy ?? (conv.lastMessage!.readBy || []).filter((id) => id !== conv.lastMessage!.senderId)).filter((id) => id !== currentUserId);
                          const deliveredIds = (conv.lastMessage!.deliveredBy || []).filter((id) => id !== currentUserId);
                          const anyDelivered = deliveredIds.length > 0 || seenIds.length > 0;
                          const allSeen = others.length > 0 && others.every((p) => seenIds.includes(p.userId));
                          const isSending = conv.lastMessage!.status === 'sending';
                          return (
                            <span
                              title={allSeen ? 'Seen' : anyDelivered ? 'Delivered' : 'Sent'}
                              className={clsx(
                                'flex -space-x-0.5 flex-shrink-0 ml-1',
                                allSeen ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400/50 dark:text-slate-600',
                                isSending && 'opacity-40'
                              )}
                            >
                              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              {(!isSending && anyDelivered) || allSeen ? (
                                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                  <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              ) : null}
                            </span>
                          );
                        })()}
                        {conv.unreadCount > 0 && (
                          <span className="ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold bg-purple-600 text-white flex-shrink-0">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                  {/* Dock to bottom button — desktop only */}
                  <button
                    onClick={(e) => { e.stopPropagation(); dockChat(conv.id); }}
                    className={clsx(
                      'hidden md:block absolute top-2 right-2 p-1.5 rounded-lg transition-all',
                      'bg-white dark:bg-slate-700 shadow-sm border border-gray-200 dark:border-slate-600',
                      'text-gray-400 hover:text-purple-600 dark:text-slate-400 dark:hover:text-purple-400',
                      'opacity-0 group-hover/conv:opacity-100 hover:scale-110',
                      'z-10'
                    )}
                    title="Dock chat to bottom"
                  >
                    <PanelBottomClose size={12} />
                  </button>
                  </div>
                ))}
                {/* Direct tab: all team members as one-click DMs (WhatsApp-style contact list) */}
                {filterCategory === 'dm' && directMemberRows.length > 0 && (
                  <>
                    <div className="pt-3 pb-1 px-3 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                      Team members
                    </div>
                    {directMemberRows.map((m) => (
                      <button
                        key={m.userId}
                        onClick={() => createDM(m)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all hover:bg-gray-50 dark:hover:bg-slate-700/30"
                      >
                        <div className="relative flex-shrink-0">
                          <img src={m.avatar} alt={m.name} className="w-10 h-10 rounded-full" />
                          <span className={clsx(
                            'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800',
                            m.online ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-600'
                          )} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-700 dark:text-slate-300 truncate">{m.name}</p>
                          <p className="text-xs text-gray-400 dark:text-slate-500 truncate">
                            {m.online
                              ? 'Online'
                              : m.lastSeen
                                ? `Last seen ${formatDistanceToNow(new Date(m.lastSeen), { addSuffix: true })}`
                                : 'Offline'}
                          </p>
                        </div>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Chat Area — desktop inline */}
        <div className="hidden md:flex flex-1 flex-col">
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-800/30">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { setMobileShowChat(false); setActiveConversation(null); }}
                    className="md:hidden p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  {activeConversation.type === 'dm' ? (
                    <div className="relative">
                      <img
                        src={activeConversation.participants.find((p) => p.userId !== currentUserId)?.avatar}
                        alt={activeConversation.name}
                        className="w-9 h-9 rounded-full"
                      />
                      <span className={clsx(
                        'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-50 dark:border-slate-800',
                        activeConversation.participants.find((p) => p.userId !== currentUserId)?.online ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-600'
                      )} />
                    </div>
                  ) : (
                    <div className={clsx(
                      'w-9 h-9 rounded-full flex items-center justify-center',
                      activeConversation.type === 'task' && 'bg-purple-100 dark:bg-purple-900/30',
                      activeConversation.type === 'team' && 'bg-emerald-100 dark:bg-emerald-900/30',
                      activeConversation.type === 'announcement' && 'bg-amber-100 dark:bg-amber-900/30',
                    )}>
                      {getConversationIcon(activeConversation.type)}
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100">{activeConversation.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className={clsx('inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase', getTypeBadgeClass(activeConversation.type))}>
                        {activeConversation.type}
                      </span>
                      <span className="text-[11px] text-gray-400 dark:text-slate-500">
                        {activeConversation.participants.length} members
                        {activeConversation.type === 'dm' && (() => {
                          const other = activeConversation.participants.find((p) => p.userId !== currentUserId);
                          return other?.online
                            ? ' • Online'
                            : other?.lastSeen
                              ? ` • Last seen ${formatDistanceToNow(new Date(other.lastSeen), { addSuffix: true })}`
                              : ' • Offline';
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => togglePin(activeConversation.id)}
                    className={clsx(
                      'p-2 rounded-lg transition-colors',
                      activeConversation.pinned
                        ? 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-900/20'
                        : 'text-gray-400 hover:bg-gray-100 dark:text-slate-500 dark:hover:bg-slate-700'
                    )}
                    title={activeConversation.pinned ? 'Unpin' : 'Pin'}
                  >
                    {activeConversation.pinned ? <PinOff size={16} /> : <Pin size={16} />}
                  </button>
                  <div className="flex -space-x-2">
                    {activeConversation.participants.slice(0, 4).map((p) => (
                      <img key={p.userId} src={p.avatar} alt={p.name} className="w-7 h-7 rounded-full border-2 border-white dark:border-slate-800" title={p.name} />
                    ))}
                    {activeConversation.participants.length > 4 && (
                      <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-slate-700 border-2 border-white dark:border-slate-800 flex items-center justify-center text-[10px] font-bold text-gray-500 dark:text-slate-400">
                        +{activeConversation.participants.length - 4}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {activeMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <div className={clsx(
                      'w-16 h-16 rounded-2xl flex items-center justify-center mb-4',
                      activeConversation.type === 'task' && 'bg-purple-100 dark:bg-purple-900/20',
                      activeConversation.type === 'dm' && 'bg-blue-100 dark:bg-blue-900/20',
                      activeConversation.type === 'team' && 'bg-emerald-100 dark:bg-emerald-900/20',
                      activeConversation.type === 'announcement' && 'bg-amber-100 dark:bg-amber-900/20',
                    )}>
                      {getConversationIcon(activeConversation.type)}
                    </div>
                    <p className="text-sm font-medium text-gray-500 dark:text-slate-400">
                      Start the conversation
                    </p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                      Send the first message in <strong>{activeConversation.name}</strong>
                    </p>
                  </div>
                ) : (
                  activeMessages.map((msg, idx) => {
                    const isMe = msg.senderId === currentUserId;
                    const showTimeSeparator = idx === 0 || (
                      new Date(msg.timestamp).getTime() - new Date(activeMessages[idx - 1].timestamp).getTime() > 30 * 60 * 1000
                    );
                    // Always re-show avatar/name after a time separator or sender change
                    const showAvatar = idx === 0 || showTimeSeparator || activeMessages[idx - 1].senderId !== msg.senderId;

                    return (
                      <React.Fragment key={msg.id}>
                        {showTimeSeparator && (
                          <div className="flex items-center gap-3 py-2">
                            <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700/50" />
                            <span className="text-[10px] font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                              {formatFullTime(new Date(msg.timestamp))}
                            </span>
                            <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700/50" />
                          </div>
                        )}
                        <div className={clsx('flex gap-2.5 group/msg', isMe && 'flex-row-reverse')}>
                          {showAvatar ? (
                            <img
                              src={msg.senderAvatar}
                              alt={msg.senderName}
                              className="w-8 h-8 rounded-full flex-shrink-0 mt-0.5"
                            />
                          ) : (
                            <div className="w-8 flex-shrink-0" />
                          )}
                          <div className={clsx('flex flex-col max-w-[70%]', isMe ? 'items-end' : 'items-start')}>
                            {showAvatar && (
                              <p className={clsx('text-[11px] font-semibold mb-1', isMe ? 'text-right' : 'text-left', 'text-gray-500 dark:text-slate-400')}>
                                {isMe ? 'You' : msg.senderName}
                              </p>
                            )}
                            <div className="relative">
                              <div
                                className={clsx(
                                  'rounded-2xl text-sm leading-relaxed overflow-hidden select-none',
                                  isMe
                                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-tr-md'
                                    : 'bg-gray-100 dark:bg-slate-700/50 text-gray-800 dark:text-slate-200 rounded-tl-md',
                                  msg.isDeleted && 'opacity-60'
                                )}
                                onMouseDown={(e) => !msg.isDeleted && startLongPress(msg, e)}
                                onMouseUp={cancelLongPress}
                                onMouseLeave={cancelLongPress}
                                onContextMenu={(e) => !msg.isDeleted && handleMsgContextMenu(msg, e)}
                                onTouchStart={(e) => !msg.isDeleted && startLongPress(msg, e)}
                                onTouchEnd={cancelLongPress}
                              >
                                {/* Reply quote */}
                                {msg.replyTo && !msg.isDeleted && (
                                  <div className={clsx(
                                    'px-3.5 pt-2 pb-1.5 border-b border-l-[3px]',
                                    isMe
                                      ? 'border-white/30 border-l-white/60 bg-white/10'
                                      : 'border-gray-200 dark:border-slate-600 border-l-purple-400 bg-gray-50 dark:bg-slate-900/50'
                                  )}>
                                    <p className={clsx('text-[10px] font-semibold', isMe ? 'text-purple-200' : 'text-purple-500 dark:text-purple-400')}>
                                      {msg.replyTo.senderName}
                                    </p>
                                    <p className={clsx('text-xs truncate opacity-75 mt-0.5', isMe ? 'text-white' : 'text-gray-600 dark:text-slate-400')}>
                                      {msg.replyTo.taskRef ? `📋 ${msg.replyTo.taskRef.title}` : msg.replyTo.text || '—'}
                                    </p>
                                  </div>
                                )}
                                {/* Task card attachment */}
                                {msg.taskRef && !msg.isDeleted && <TaskRefCard taskRef={msg.taskRef} isMe={isMe} />}
                                <div className="px-3.5 py-2.5">
                                {msg.isDeleted ? (
                                  <span className="italic opacity-60 text-sm">Message deleted</span>
                                ) : editingMsgId === msg.id ? (
                                  <div className="flex flex-col gap-1.5 w-full" onClick={(e) => e.stopPropagation()}>
                                    <textarea
                                      autoFocus
                                      value={editingText}
                                      onChange={(e) => { setEditingText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); confirmEdit(msg.id); } if (e.key === 'Escape') { setEditingMsgId(null); setEditingText(''); } }}
                                      ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
                                      rows={1}
                                      className="w-full bg-transparent border-b border-white/50 outline-none text-sm resize-none overflow-hidden leading-relaxed"
                                    />
                                    <div className="flex items-center justify-end gap-2 text-[10px] opacity-70">
                                      <span>Shift+Enter for new line</span>
                                      <button onClick={() => { setEditingMsgId(null); setEditingText(''); }} className="px-2 py-0.5 rounded bg-white/20 hover:bg-white/30">Cancel</button>
                                      <button onClick={() => confirmEdit(msg.id)} className="px-2 py-0.5 rounded bg-white/30 hover:bg-white/40 font-medium">Save</button>
                                    </div>
                                  </div>
                                ) : (
                                  <span>
                                    {linkifyText(msg.text)}
                                    {msg.starred && <span className="inline ml-1 text-amber-400">★</span>}
                                  </span>
                                )}
                                {/* Attachments */}
                                {msg.attachments && msg.attachments.length > 0 && !msg.isDeleted && (
                                  <div className="space-y-1">
                                    {msg.attachments.map((att) => (
                                      <AttachmentBubble key={att.id} attachment={att} isMe={isMe} />
                                    ))}
                                  </div>
                                )}
                                </div>
                              </div>
                              {/* Edited + info labels */}
                              {(msg.editedAt || infoMsgId === msg.id) && !msg.isDeleted && (
                                <div className={clsx('mt-0.5 flex gap-2 text-[10px] text-gray-400 dark:text-slate-500', isMe ? 'justify-end' : 'justify-start')}>
                                  {msg.editedAt && <span>edited</span>}
                                  {infoMsgId === msg.id && (
                                    <span onClick={() => setInfoMsgId(null)} className="cursor-pointer">
                                      {format(new Date(msg.timestamp), 'MMM d · h:mm a')}
                                    </span>
                                  )}
                                </div>
                              )}
                              {/* Read receipts — only on sent messages (WhatsApp-style) */}
                              {isMe && !msg.isDeleted && (() => {
                                const others = (activeConversation?.participants || []).filter((p) => p.userId !== currentUserId);
                                const seenIds = (msg.seenBy ?? (msg.readBy || []).filter((id) => id !== msg.senderId))
                                  .filter((id) => id !== currentUserId);
                                const deliveredIds = (msg.deliveredBy || []).filter((id) => id !== currentUserId);
                                const anyDelivered = deliveredIds.length > 0 || seenIds.length > 0;
                                const allSeen = others.length > 0 && others.every((p) => seenIds.includes(p.userId));
                                const isSeen = allSeen;
                                const isSending = msg.status === 'sending';
                                const isFailed = msg.status === 'failed';
                                const readerParticipants = seenIds
                                  .map((id) => activeConversation?.participants.find((p) => p.userId === id))
                                  .filter(Boolean);
                                const seenNames = readerParticipants.map((p) => p!.name);
                                const waitingCount = Math.max(others.length - seenIds.length, 0);
                                const tickTitle = isFailed ? 'Not sent'
                                  : isSending ? 'Sending…'
                                    : isSeen ? `Seen by ${seenNames.join(', ') || 'everyone'}`
                                      : anyDelivered ? `Delivered (${deliveredIds.length}/${others.length})`
                                        : 'Sent';
                                return (
                                  <div className="mt-0.5 flex flex-col items-end gap-0.5">
                                    <div className="flex items-center justify-end gap-1">
                                      {/* Ticks: 1 = sent · 2 grey = delivered · 2 blue = seen */}
                                      <span
                                        title={tickTitle}
                                        className={clsx(
                                          'flex -space-x-0.5',
                                          isSeen ? 'text-blue-500 dark:text-blue-400'
                                            : anyDelivered ? 'text-gray-400/60 dark:text-slate-500/60'
                                              : isFailed ? 'text-red-400'
                                                : 'text-gray-400/60 dark:text-slate-500/60',
                                          isSending && 'opacity-40'
                                        )}
                                      >
                                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                        {(!isSending && !isFailed && anyDelivered) || isSeen ? (
                                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                        ) : null}
                                      </span>
                                      {/* Reader avatars */}
                                      {readerParticipants.length > 0 && (
                                        <div className="flex -space-x-1">
                                          {readerParticipants.slice(0, 3).map((p) => (
                                            <img
                                              key={p!.userId}
                                              src={p!.avatar}
                                              alt={p!.name}
                                              title={`Seen by ${p!.name}`}
                                              className="w-3.5 h-3.5 rounded-full ring-1 ring-white dark:ring-slate-800"
                                            />
                                          ))}
                                          {readerParticipants.length > 3 && (
                                            <span className="w-3.5 h-3.5 rounded-full ring-1 ring-white dark:ring-slate-800 bg-gray-300 dark:bg-slate-600 text-[7px] flex items-center justify-center text-gray-600 dark:text-slate-300">
                                              +{readerParticipants.length - 3}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    {/* Announcements: explicit seen-by list (like WhatsApp "Message info") */}
                                    {activeConversation?.type === 'announcement' && others.length > 1 && (
                                      <p className="text-[9px] leading-tight text-gray-400 dark:text-slate-500 text-right max-w-[240px]">
                                        {seenNames.length > 0
                                          ? `Seen by ${seenNames.slice(0, 3).join(', ')}${seenNames.length > 3 ? ` +${seenNames.length - 3}` : ''}`
                                          : 'Not seen yet'}
                                        {waitingCount > 0 && ` • Waiting for ${waitingCount}`}
                                      </p>
                                    )}
                                  </div>
                                );
                              })()}
                              {/* Reaction add button — hover only */}
                              <button
                                ref={reactionPickerMsgId === msg.id ? reactionBtnRef : undefined}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setReactionPickerMsgId(reactionPickerMsgId === msg.id ? null : msg.id);
                                }}
                                className={clsx(
                                  'absolute -bottom-2 p-1 rounded-full transition-all',
                                  'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 shadow-sm',
                                  'text-gray-400 hover:text-purple-500 dark:text-slate-500 dark:hover:text-purple-400',
                                  'opacity-0 group-hover/msg:opacity-100',
                                  reactionPickerMsgId === msg.id && 'opacity-100',
                                  isMe ? 'left-0' : 'right-0',
                                )}
                              >
                                <SmilePlus size={12} />
                              </button>
                              {/* Quick reaction picker for this message — portal +
                                  fixed positioning so the scrolling message list can
                                  never clip the emojis on small screens */}
                              {reactionPickerMsgId === msg.id && (
                                <QuickReactionPicker
                                  anchorRef={reactionBtnRef}
                                  align={isMe ? 'left' : 'right'}
                                  onPick={(emoji) => {
                                    toggleReaction(msg.conversationId, msg.id, emoji);
                                    setReactionPickerMsgId(null);
                                  }}
                                  onClose={() => setReactionPickerMsgId(null)}
                                />
                              )}
                            </div>
                            {/* Reaction bar */}
                            <ReactionBar
                              reactions={msg.reactions || []}
                              onToggle={(emoji) => toggleReaction(msg.conversationId, msg.id, emoji)}
                              currentUserId={currentUserId}
                            />
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })
                )}
                {typingNames.length > 0 && (
                  <div className="flex items-center gap-1.5 px-1">
                    <span className="flex gap-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-slate-500 animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-slate-500 animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-slate-500 animate-bounce" />
                    </span>
                    <span className="text-xs text-gray-400 dark:text-slate-500 italic">
                      {typingNames.length === 1 ? `${typingNames[0]} is typing…` : `${typingNames.join(', ')} are typing…`}
                    </span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-800/30">
                {/* Reply banner */}
                {pendingReply && (
                  <div className="mb-2 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700/50">
                    <CornerUpLeft size={12} className="text-purple-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-purple-600 dark:text-purple-400">{pendingReply.senderName}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                        {pendingReply.taskRef ? `📋 ${pendingReply.taskRef.title}` : pendingReply.text}
                      </p>
                    </div>
                    <button onClick={() => setPendingReply(null)} className="text-gray-400 hover:text-gray-600 flex-shrink-0"><X size={12} /></button>
                  </div>
                )}
                {/* Pending attachments preview */}
                {pendingAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {pendingAttachments.map((att) => (
                      <div
                        key={att.id}
                        className={clsx(
                          'relative group/att flex items-center gap-2 px-2.5 py-1.5 rounded-lg',
                          'bg-gray-100 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600',
                        )}
                      >
                        {att.type.startsWith('image/') && att.previewUrl ? (
                          <img src={att.previewUrl} alt={att.name} className="w-8 h-8 rounded object-cover" />
                        ) : (
                          <File size={14} className="text-gray-400 dark:text-slate-500" />
                        )}
                        <div className="min-w-0">
                          <p className="text-[11px] font-medium text-gray-700 dark:text-slate-300 truncate max-w-[120px]">{att.name}</p>
                          <p className="text-[9px] text-gray-400 dark:text-slate-500">{formatFileSize(att.size)}</p>
                        </div>
                        <button
                          onClick={() => removePendingAttachment(att.id)}
                          className="p-0.5 rounded-full bg-gray-200 dark:bg-slate-600 text-gray-500 dark:text-slate-400 hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="sr-only"
                    onChange={handleFileSelect}
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.csv"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300 transition-colors"
                    title="Attach file"
                  >
                    <Paperclip size={18} />
                  </button>
                  {canRecord && (
                    <button
                      onClick={() => (isRecording ? stopRecording() : startRecording())}
                      className={clsx(
                        'p-2 rounded-lg transition-colors',
                        isRecording
                          ? 'text-red-500 bg-red-50 dark:bg-red-900/20'
                          : 'text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300'
                      )}
                      title={isRecording ? 'Stop & send voice message' : 'Record voice message'}
                    >
                      <Mic size={18} />
                    </button>
                  )}
                  <input
                    ref={inputRef}
                    type="text"
                    value={messageInput}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && !e.repeat) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={`Message ${activeConversation.name}...`}
                    className={clsx(
                      'flex-1 rounded-xl px-4 py-2.5 text-sm',
                      'bg-white border border-gray-200 text-gray-800 placeholder-gray-400',
                      'dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500',
                      'focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                    )}
                  />
                  <button
                    ref={emojiButtonRef}
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={clsx(
                      'p-2 rounded-lg transition-colors',
                      showEmojiPicker
                        ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                        : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300'
                    )}
                    title="Emoji"
                  >
                    <Smile size={18} />
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={!messageInput.trim() && pendingAttachments.length === 0}
                    className={clsx(
                      'p-2.5 rounded-xl transition-all',
                      (messageInput.trim() || pendingAttachments.length > 0)
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md shadow-purple-500/20 hover:shadow-lg'
                        : 'bg-gray-100 text-gray-300 dark:bg-slate-700/30 dark:text-slate-600 cursor-not-allowed'
                    )}
                  >
                    <Send size={18} />
                  </button>
                </div>

                {/* Emoji Picker */}
                {showEmojiPicker && (
                  <EmojiPicker
                    onSelect={handleEmojiSelect}
                    onClose={() => setShowEmojiPicker(false)}
                    anchorRef={emojiButtonRef as React.RefObject<HTMLElement>}
                  />
                )}
              </div>

              {/* Context menu portal */}
              {contextMenu && (
                <MessageContextMenu
                  x={contextMenu.x}
                  y={contextMenu.y}
                  isMe={contextMenu.msg.senderId === currentUserId}
                  isDeleted={contextMenu.msg.isDeleted}
                  starred={contextMenu.msg.starred}
                  canEdit={msgCanEdit(contextMenu.msg)}
                  onReply={() => { setPendingReply(contextMenu.msg); setTimeout(() => inputRef.current?.focus(), 50); }}
                  onForward={() => setForwardMsg(contextMenu.msg)}
                  onCopy={() => navigator.clipboard.writeText(contextMenu.msg.text)}
                  onEdit={() => { setEditingMsgId(contextMenu.msg.id); setEditingText(contextMenu.msg.text); }}
                  onInfo={() => setInfoMsgId(infoMsgId === contextMenu.msg.id ? null : contextMenu.msg.id)}
                  onStar={() => activeConversationId && starMessage(activeConversationId, contextMenu.msg.id)}
                  onDelete={() => { if (activeConversationId) { setDeleteMsgConfirm({ conversationId: activeConversationId, messageId: contextMenu.msg.id }); setContextMenu(null); } }}
                  onMore={() => {}}
                  onClose={() => setContextMenu(null)}
                />
              )}

              {/* Forward modal */}
              {forwardMsg && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setForwardMsg(null)}>
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-72 p-4" onClick={(e) => e.stopPropagation()}>
                    <p className="text-sm font-semibold text-gray-800 dark:text-slate-100 mb-3">Forward to…</p>
                    <div className="space-y-1 max-h-60 overflow-y-auto">
                      {allConversations.filter((c) => c.id !== activeConversationId).map((c) => (
                        <button
                          key={c.id}
                          onClick={() => { if (activeConversationId) { forwardMessage(activeConversationId, forwardMsg.id, c.id); } setForwardMsg(null); }}
                          className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 text-left"
                        >
                          <span className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-xs font-bold text-purple-600 flex-shrink-0">
                            {c.name.charAt(0).toUpperCase()}
                          </span>
                          <span className="truncate">{c.name}</span>
                        </button>
                      ))}
                    </div>
                    <button onClick={() => setForwardMsg(null)} className="mt-3 w-full text-xs text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 py-1">Cancel</button>
                  </div>
                </div>
              )}

              {/* Delete message confirm modal */}
              {deleteMsgConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setDeleteMsgConfirm(null)}>
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                  <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 w-full max-w-md z-10 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-5">
                      <Trash2 size={28} className="text-red-500 dark:text-red-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">Delete Message?</h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">Are you sure you want to delete this message? This action cannot be undone.</p>
                    <div className="flex items-center justify-center gap-3">
                      <button onClick={() => setDeleteMsgConfirm(null)} className="px-6 py-2.5 rounded-lg text-sm font-medium bg-transparent hover:bg-gray-100 text-gray-600 border border-gray-300 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-slate-600 transition-colors">Cancel</button>
                      <button
                        onClick={() => {
                          deleteMessage(deleteMsgConfirm.conversationId, deleteMsgConfirm.messageId);
                          addToast({ type: 'success', title: 'Message deleted', message: 'Your message has been deleted.', duration: 3000 });
                          setDeleteMsgConfirm(null);
                        }}
                        className="px-6 py-2.5 rounded-lg text-sm font-medium bg-red-500 hover:bg-red-600 text-white transition-colors"
                      >Delete Message</button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-20 h-20 rounded-2xl bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center mb-5">
                <MessageSquare size={36} className="text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-2">
                Select a conversation
              </h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 max-w-sm mb-6">
                Choose a conversation from the sidebar or start a new one. Chat with your team about tasks, share updates, or send direct messages.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {categoryConfig.slice(1).map((cat) => (
                  <div key={cat.value} className={clsx('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium', getTypeBadgeClass(cat.value as ConversationType))}>
                    {cat.icon}
                    {cat.label}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Floating Chat Overlay */}
      {mobileShowChat && activeConversation && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col" onClick={() => { setMobileShowChat(false); setActiveConversation(null); }}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Chat Bubble */}
          <div
            className={clsx(
              'relative mt-auto mx-2 mb-2 flex flex-col',
              'bg-white dark:bg-slate-800 rounded-2xl shadow-2xl',
              'border border-gray-200 dark:border-slate-700',
              'h-[75dvh] max-h-[600px]',
              'animate-[slideUp_0.25s_ease-out]',
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Overlay Chat Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700/50 rounded-t-2xl bg-gray-50/80 dark:bg-slate-800/80">
              <div className="flex items-center gap-3">
                {activeConversation.type === 'dm' ? (
                  <div className="relative">
                    <img
                      src={activeConversation.participants.find((p) => p.userId !== currentUserId)?.avatar}
                      alt={activeConversation.name}
                      className="w-9 h-9 rounded-full"
                    />
                    <span className={clsx(
                      'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-50 dark:border-slate-800',
                      activeConversation.participants.find((p) => p.userId !== currentUserId)?.online ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-600'
                    )} />
                  </div>
                ) : (
                  <div className={clsx(
                    'w-9 h-9 rounded-full flex items-center justify-center',
                    activeConversation.type === 'task' && 'bg-purple-100 dark:bg-purple-900/30',
                    activeConversation.type === 'team' && 'bg-emerald-100 dark:bg-emerald-900/30',
                    activeConversation.type === 'announcement' && 'bg-amber-100 dark:bg-amber-900/30',
                  )}>
                    {getConversationIcon(activeConversation.type)}
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100">{activeConversation.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className={clsx('inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase', getTypeBadgeClass(activeConversation.type))}>
                      {activeConversation.type}
                    </span>
                    <span className="text-[11px] text-gray-400 dark:text-slate-500">
                      {activeConversation.participants.length} members
                      {activeConversation.type === 'dm' && (
                        activeConversation.participants.find((p) => p.userId !== currentUserId)?.online
                          ? ' • Online'
                          : ' • Offline'
                      )}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => { setMobileShowChat(false); setActiveConversation(null); }}
                className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Overlay Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {activeMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className={clsx(
                    'w-14 h-14 rounded-2xl flex items-center justify-center mb-3',
                    activeConversation.type === 'task' && 'bg-purple-100 dark:bg-purple-900/20',
                    activeConversation.type === 'dm' && 'bg-blue-100 dark:bg-blue-900/20',
                    activeConversation.type === 'team' && 'bg-emerald-100 dark:bg-emerald-900/20',
                    activeConversation.type === 'announcement' && 'bg-amber-100 dark:bg-amber-900/20',
                  )}>
                    {getConversationIcon(activeConversation.type)}
                  </div>
                  <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Start the conversation</p>
                </div>
              ) : (
                activeMessages.map((msg, idx) => {
                  const isMe = msg.senderId === currentUserId;
                  const showTimeSeparator = idx === 0 || (
                    new Date(msg.timestamp).getTime() - new Date(activeMessages[idx - 1].timestamp).getTime() > 30 * 60 * 1000
                  );
                  const showAvatar = idx === 0 || showTimeSeparator || activeMessages[idx - 1].senderId !== msg.senderId;

                  return (
                    <React.Fragment key={msg.id}>
                      {showTimeSeparator && (
                        <div className="flex items-center gap-3 py-2">
                          <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700/50" />
                          <span className="text-[10px] font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                            {formatFullTime(new Date(msg.timestamp))}
                          </span>
                          <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700/50" />
                        </div>
                      )}
                      <div className={clsx('flex gap-2.5', isMe && 'flex-row-reverse')}>
                        {showAvatar ? (
                          <img src={msg.senderAvatar} alt={msg.senderName} className="w-7 h-7 rounded-full flex-shrink-0 mt-0.5" />
                        ) : (
                          <div className="w-7 flex-shrink-0" />
                        )}
                        <div className={clsx('flex flex-col max-w-[75%]', isMe ? 'items-end' : 'items-start')}>
                          {showAvatar && (
                            <p className={clsx('text-[11px] font-semibold mb-1', isMe ? 'text-right' : 'text-left', 'text-gray-500 dark:text-slate-400')}>
                              {isMe ? 'You' : msg.senderName}
                            </p>
                          )}
                          <div
                            className={clsx(
                              'rounded-2xl text-sm leading-relaxed overflow-hidden select-none',
                              isMe
                                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-tr-md'
                                : 'bg-gray-100 dark:bg-slate-700/50 text-gray-800 dark:text-slate-200 rounded-tl-md',
                              msg.isDeleted && 'opacity-60'
                            )}
                            onMouseDown={(e) => !msg.isDeleted && startLongPress(msg, e)}
                            onMouseUp={cancelLongPress}
                            onMouseLeave={cancelLongPress}
                            onContextMenu={(e) => !msg.isDeleted && handleMsgContextMenu(msg, e)}
                            onTouchStart={(e) => !msg.isDeleted && startLongPress(msg, e)}
                            onTouchEnd={cancelLongPress}
                          >
                            {/* Reply quote */}
                            {msg.replyTo && !msg.isDeleted && (
                              <div className={clsx(
                                'px-3 pt-1.5 pb-1 border-b border-l-[3px]',
                                isMe
                                  ? 'border-white/30 border-l-white/60 bg-white/10'
                                  : 'border-gray-200 dark:border-slate-600 border-l-purple-400 bg-gray-50 dark:bg-slate-900/50'
                              )}>
                                <p className={clsx('text-[10px] font-semibold', isMe ? 'text-purple-200' : 'text-purple-500 dark:text-purple-400')}>
                                  {msg.replyTo.senderName}
                                </p>
                                <p className={clsx('text-xs truncate opacity-75 mt-0.5', isMe ? 'text-white' : 'text-gray-600 dark:text-slate-400')}>
                                  {msg.replyTo.taskRef ? `📋 ${msg.replyTo.taskRef.title}` : msg.replyTo.text || '—'}
                                </p>
                              </div>
                            )}
                            {/* Task card attachment */}
                            {msg.taskRef && !msg.isDeleted && <TaskRefCard taskRef={msg.taskRef} isMe={isMe} />}
                            <div className="px-3 py-2">
                            {msg.isDeleted ? (
                              <span className="italic opacity-60">Message deleted</span>
                            ) : (
                              <span>
                                {linkifyText(msg.text)}
                                {msg.starred && <span className="inline ml-1 text-amber-400">★</span>}
                              </span>
                            )}
                            {msg.attachments && msg.attachments.length > 0 && !msg.isDeleted && (
                              <div className="space-y-1">
                                {msg.attachments.map((att) => (
                                  <AttachmentBubble key={att.id} attachment={att} isMe={isMe} compact />
                                ))}
                              </div>
                            )}
                            </div>
                          </div>
                          {msg.editedAt && !msg.isDeleted && (
                            <p className={clsx('text-[9px] mt-0.5 text-gray-400 dark:text-slate-500', isMe ? 'text-right' : 'text-left')}>edited</p>
                          )}
                          <ReactionBar
                            reactions={msg.reactions || []}
                            onToggle={(emoji) => toggleReaction(msg.conversationId, msg.id, emoji)}
                            currentUserId={currentUserId}
                          />
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })
              )}
              {typingNames.length > 0 && (
                <div className="flex items-center gap-1.5 px-1">
                  <span className="flex gap-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-slate-500 animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-slate-500 animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-slate-500 animate-bounce" />
                  </span>
                  <span className="text-xs text-gray-400 dark:text-slate-500 italic">
                    {typingNames.length === 1 ? `${typingNames[0]} is typing…` : `${typingNames.join(', ')} are typing…`}
                  </span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Overlay Input */}
            <div className="px-3 py-2.5 border-t border-gray-200 dark:border-slate-700/50 rounded-b-2xl bg-gray-50/80 dark:bg-slate-800/80">
              {pendingAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {pendingAttachments.map((att) => (
                    <div key={att.id} className="relative flex items-center gap-2 px-2 py-1 rounded-lg bg-gray-100 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600">
                      {att.type.startsWith('image/') && att.previewUrl ? (
                        <img src={att.previewUrl} alt={att.name} className="w-7 h-7 rounded object-cover" />
                      ) : (
                        <File size={12} className="text-gray-400 dark:text-slate-500" />
                      )}
                      <p className="text-[10px] font-medium text-gray-700 dark:text-slate-300 truncate max-w-[100px]">{att.name}</p>
                      <button onClick={() => removePendingAttachment(att.id)} className="p-0.5 rounded-full bg-gray-200 dark:bg-slate-600 text-gray-500 hover:text-red-500 transition-colors">
                        <X size={9} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <input ref={fileInputRef} type="file" multiple className="sr-only" onChange={handleFileSelect} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.csv" />
                <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:text-slate-500 dark:hover:bg-slate-700 transition-colors" title="Attach file">
                  <Paperclip size={18} />
                </button>
                {canRecord && (
                  <button
                    onClick={() => (isRecording ? stopRecording() : startRecording())}
                    className={clsx(
                      'p-2 rounded-lg transition-colors',
                      isRecording
                        ? 'text-red-500 bg-red-50 dark:bg-red-900/20'
                        : 'text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300'
                    )}
                    title={isRecording ? 'Stop & send voice message' : 'Record voice message'}
                  >
                    <Mic size={18} />
                  </button>
                )}
                <input
                  ref={inputRef}
                  type="text"
                  value={messageInput}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.repeat) { e.preventDefault(); handleSend(); } }}
                  placeholder={`Message ${activeConversation.name}...`}
                  className={clsx(
                    'flex-1 rounded-xl px-3 py-2 text-sm',
                    'bg-white border border-gray-200 text-gray-800 placeholder-gray-400',
                    'dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500',
                    'focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                  )}
                />
                <button
                  ref={emojiButtonRef}
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={clsx(
                    'p-2 rounded-lg transition-colors',
                    showEmojiPicker
                      ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                      : 'text-gray-400 hover:bg-gray-100 dark:text-slate-500 dark:hover:bg-slate-700'
                  )}
                  title="Emoji"
                >
                  <Smile size={18} />
                </button>
                <button
                  onClick={handleSend}
                  disabled={!messageInput.trim() && pendingAttachments.length === 0}
                  className={clsx(
                    'p-2 rounded-xl transition-all',
                    (messageInput.trim() || pendingAttachments.length > 0)
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md shadow-purple-500/20'
                      : 'bg-gray-100 text-gray-300 dark:bg-slate-700/30 dark:text-slate-600 cursor-not-allowed'
                  )}
                >
                  <Send size={18} />
                </button>
              </div>
              {showEmojiPicker && (
                <EmojiPicker
                  onSelect={handleEmojiSelect}
                  onClose={() => setShowEmojiPicker(false)}
                  anchorRef={emojiButtonRef as React.RefObject<HTMLElement>}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* New DM Modal */}
      {/* Voice recording pill (visible while recording) */}
      {isRecording && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[250] flex items-center gap-3 px-4 py-3 rounded-2xl bg-gray-900 dark:bg-slate-900 text-white shadow-2xl border border-red-500/40">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
          </span>
          <span className="text-sm font-medium tabular-nums">
            {isSendingVoice ? 'Sending voice message…' : `Recording ${formatRecTime(recSeconds)}`}
          </span>
          <button
            onClick={() => stopRecording(true)}
            disabled={isSendingVoice}
            title="Cancel recording"
            className="p-2 rounded-full hover:bg-white/10 text-red-300 disabled:opacity-50 transition-colors"
          >
            <Trash2 size={16} />
          </button>
          <button
            onClick={() => stopRecording()}
            disabled={isSendingVoice}
            title="Send voice message"
            className="p-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white disabled:opacity-50 transition-colors"
          >
            <Mic size={16} />
          </button>
        </div>
      )}

      {/* Status composer (WhatsApp-style 24h status) */}
      {showStatusComposer && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowStatusComposer(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 shadow-xl border border-gray-200 dark:border-slate-700 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">Add status</h3>
              <button onClick={() => setShowStatusComposer(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700" title="Close">
                <X size={16} />
              </button>
            </div>
            <textarea
              value={statusText}
              onChange={(e) => setStatusText(e.target.value)}
              rows={3}
              placeholder="What's on your mind? Disappears after 24 hours…"
              className="w-full rounded-xl px-3.5 py-2.5 text-sm resize-none bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
            />
            {statusImagePreview && (
              <div className="relative inline-block">
                <img src={statusImagePreview} alt="Status preview" className="max-h-48 rounded-xl object-cover" />
                <button
                  onClick={() => setStatusImage(null)}
                  className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/55 text-white hover:bg-black/75"
                  title="Remove photo"
                >
                  <X size={12} />
                </button>
              </div>
            )}
            <div className="flex items-center justify-between">
              <button
                onClick={() => statusImageRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                title="Add a photo"
              >
                <ImageIcon size={16} /> {statusImage ? 'Change photo' : 'Photo'}
              </button>
              <button
                onClick={postStatus}
                disabled={postingStatus || (!statusText.trim() && !statusImage)}
                className={clsx(
                  'px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                  statusText.trim() || statusImage
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-md shadow-purple-500/20'
                    : 'bg-gray-100 text-gray-400 dark:bg-slate-700/50 dark:text-slate-600 cursor-not-allowed'
                )}
              >
                {postingStatus ? 'Posting…' : 'Post status'}
              </button>
            </div>
            <input
              ref={statusImageRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) {
                  if (!f.type.startsWith('image/')) {
                    addToast({ type: 'error', title: 'Not an image', message: 'Please choose an image file', duration: 4000 });
                    return;
                  }
                  if (f.size > 5 * 1024 * 1024) {
                    addToast({ type: 'error', title: 'File too large', message: 'Status photos must be under 5 MB', duration: 4000 });
                    return;
                  }
                  setStatusImage(f);
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Status viewer */}
      {viewingStatus && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/85" onClick={() => setStatusViewerId(null)} />
          <div className="relative w-full max-w-lg rounded-2xl overflow-hidden bg-white dark:bg-slate-800 shadow-2xl">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-slate-700/50">
              <img
                src={viewingStatus.userAvatar}
                alt={viewingStatus.userName}
                className="w-9 h-9 rounded-full object-cover bg-gray-100 dark:bg-slate-700"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-slate-100 truncate">
                  {viewingStatus.userId === currentUserId ? 'Your status' : viewingStatus.userName}
                </p>
                <p className="text-[11px] text-gray-400 dark:text-slate-500">
                  {format(viewingStatus.createdAt, 'MMM d, HH:mm')} · Expires {formatDistanceToNow(viewingStatus.expiresAt, { addSuffix: true })}
                </p>
              </div>
              <button
                onClick={() => setStatusViewerId(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
            {viewingStatus.mediaType === 'image' && viewingStatus.mediaUrl ? (
              <img src={viewingStatus.mediaUrl} alt="" className="w-full max-h-[55vh] object-contain bg-black" />
            ) : null}
            {viewingStatus.text && (
              <p className="px-5 py-4 text-gray-800 dark:text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                {viewingStatus.text}
              </p>
            )}
            {!viewingStatus.text && !viewingStatus.mediaUrl && (
              <p className="px-5 py-4 text-sm text-gray-400 dark:text-slate-500">This status is empty.</p>
            )}
            {viewingStatus.userId === currentUserId && (
              <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-100 dark:border-slate-700/50">
                <button
                  onClick={() => { setStatusViewerId(null); setShowStatusComposer(true); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                >
                  Add new status
                </button>
                <button
                  onClick={() => deleteOwnStatus(viewingStatus.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 size={13} /> Delete status
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <NewDMModal isOpen={showNewDM} onClose={() => setShowNewDM(false)} />
    </div>
  );
};
