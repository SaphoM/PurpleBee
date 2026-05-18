import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Circle,
  MoreVertical,
  Plus,
  ArrowLeft,
  Smile,
  Paperclip,
  X,
  ChevronDown,
  PanelBottomClose,
  FileText,
  Image as ImageIcon,
  File,
  Download,
  SmilePlus,
} from 'lucide-react';
import { useChatStore } from '@stores/chatStore';
import { ConversationType, Conversation, ChatParticipant, Attachment } from '@/types/index';
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
  const iconSize = compact ? 12 : 16;
  const dlIconSize = compact ? 12 : 14;
  return (
    <div className={clsx(
      'mt-1.5 rounded-lg overflow-hidden border',
      isMe ? 'border-white/20' : 'border-gray-200 dark:border-slate-600',
    )}>
      {isImage && attachment.previewUrl ? (
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
];

const getConversationIcon = (type: ConversationType) => {
  switch (type) {
    case 'task': return <CheckSquare size={16} className="text-purple-500" />;
    case 'dm': return <AtSign size={16} className="text-blue-500" />;
    case 'team': return <Hash size={16} className="text-emerald-500" />;
    case 'announcement': return <Megaphone size={16} className="text-amber-500" />;
  }
};

const getTypeBadgeClass = (type: ConversationType) => {
  switch (type) {
    case 'task': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
    case 'dm': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    case 'team': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
    case 'announcement': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
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
    sendMessage, togglePin, teamMembers, dockChat,
    currentUserId, toggleReaction,
  } = useChatStore();

  const [messageInput, setMessageInput] = useState('');
  const [showNewDM, setShowNewDM] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reactionBtnRef = useRef<HTMLButtonElement>(null);

  const conversations = getFilteredConversations();
  const activeConversation = useChatStore((s) => s.conversations.find((c) => c.id === s.activeConversationId));
  const activeMessages = activeConversationId ? getConversationMessages(activeConversationId) : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages.length]);

  // Close reaction picker on click outside
  useEffect(() => {
    if (!reactionPickerMsgId) return;
    const handle = (e: MouseEvent) => setReactionPickerMsgId(null);
    // Delay to avoid closing immediately on the same click that opened it
    const timer = setTimeout(() => document.addEventListener('click', handle), 0);
    return () => { clearTimeout(timer); document.removeEventListener('click', handle); };
  }, [reactionPickerMsgId]);

  useEffect(() => {
    if (activeConversationId) inputRef.current?.focus();
  }, [activeConversationId]);

  const handleSend = () => {
    if (!activeConversationId || (!messageInput.trim() && pendingAttachments.length === 0)) return;
    sendMessage(activeConversationId, messageInput, pendingAttachments.length > 0 ? pendingAttachments : undefined);
    setMessageInput('');
    setPendingAttachments([]);
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
    setMobileShowChat(true);
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
            {conversations.length === 0 ? (
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
                        <p className={clsx(
                          'text-xs truncate flex-1',
                          conv.unreadCount > 0 ? 'text-gray-600 dark:text-slate-300 font-medium' : 'text-gray-400 dark:text-slate-500'
                        )}>
                          {conv.lastMessage
                            ? `${conv.lastMessage.senderId === currentUserId ? 'You: ' : ''}${conv.lastMessage.text}`
                            : 'No messages yet'}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span className="ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold bg-purple-600 text-white flex-shrink-0">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                  {/* Dock to bottom button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); dockChat(conv.id); }}
                    className={clsx(
                      'absolute top-2 right-2 p-1.5 rounded-lg transition-all',
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
                        {activeConversation.type === 'dm' && (
                          activeConversation.participants.find((p) => p.userId !== currentUserId)?.online
                            ? ' • Online'
                            : ' • Offline'
                        )}
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
                    const showAvatar = idx === 0 || activeMessages[idx - 1].senderId !== msg.senderId;
                    const showTimeSeparator = idx === 0 || (
                      new Date(msg.timestamp).getTime() - new Date(activeMessages[idx - 1].timestamp).getTime() > 30 * 60 * 1000
                    );

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
                          <div className={clsx('max-w-[70%]', isMe && 'items-end')}>
                            {showAvatar && (
                              <p className={clsx('text-[11px] font-semibold mb-1', isMe ? 'text-right' : 'text-left', 'text-gray-500 dark:text-slate-400')}>
                                {isMe ? 'You' : msg.senderName}
                              </p>
                            )}
                            <div className="relative">
                              <div className={clsx(
                                'px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed',
                                isMe
                                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-tr-md'
                                  : 'bg-gray-100 dark:bg-slate-700/50 text-gray-800 dark:text-slate-200 rounded-tl-md'
                              )}>
                                {msg.text}
                                {/* Attachments */}
                                {msg.attachments && msg.attachments.length > 0 && (
                                  <div className="space-y-1">
                                    {msg.attachments.map((att) => (
                                      <AttachmentBubble key={att.id} attachment={att} isMe={isMe} />
                                    ))}
                                  </div>
                                )}
                              </div>
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
                              {/* Quick reaction picker for this message */}
                              {reactionPickerMsgId === msg.id && (
                                <div className={clsx(
                                  'absolute -bottom-9 z-50 flex items-center gap-0.5 p-1 rounded-full',
                                  'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-lg',
                                  isMe ? 'left-0' : 'right-0',
                                )}>
                                  {['👍','❤️','😂','🔥','👏','🎉'].map((emoji) => (
                                    <button
                                      key={emoji}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleReaction(msg.conversationId, msg.id, emoji);
                                        setReactionPickerMsgId(null);
                                      }}
                                      className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-sm"
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
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
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-800/30">
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
                    className="hidden"
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
                  <input
                    ref={inputRef}
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
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
                  const showAvatar = idx === 0 || activeMessages[idx - 1].senderId !== msg.senderId;
                  const showTimeSeparator = idx === 0 || (
                    new Date(msg.timestamp).getTime() - new Date(activeMessages[idx - 1].timestamp).getTime() > 30 * 60 * 1000
                  );

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
                        <div className={clsx('max-w-[75%]', isMe && 'items-end')}>
                          {showAvatar && (
                            <p className={clsx('text-[11px] font-semibold mb-1', isMe ? 'text-right' : 'text-left', 'text-gray-500 dark:text-slate-400')}>
                              {isMe ? 'You' : msg.senderName}
                            </p>
                          )}
                          <div className={clsx(
                            'px-3 py-2 rounded-2xl text-sm leading-relaxed',
                            isMe
                              ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-tr-md'
                              : 'bg-gray-100 dark:bg-slate-700/50 text-gray-800 dark:text-slate-200 rounded-tl-md'
                          )}>
                            {msg.text}
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="space-y-1">
                                {msg.attachments.map((att) => (
                                  <AttachmentBubble key={att.id} attachment={att} isMe={isMe} compact />
                                ))}
                              </div>
                            )}
                          </div>
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
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.csv" />
                <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:text-slate-500 dark:hover:bg-slate-700 transition-colors" title="Attach file">
                  <Paperclip size={18} />
                </button>
                <input
                  ref={inputRef}
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
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
      <NewDMModal isOpen={showNewDM} onClose={() => setShowNewDM(false)} />
    </div>
  );
};
