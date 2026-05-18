import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import clsx from 'clsx';
import {
  X,
  Send,
  Minimize2,
  Maximize2,
  Hash,
  AtSign,
  CheckSquare,
  Megaphone,
  Smile,
  Paperclip,
  File,
  Download,
  SmilePlus,
} from 'lucide-react';
import { useChatStore } from '@stores/chatStore';
import { ConversationType, Attachment } from '@/types/index';
import { format, isToday, isYesterday } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const downloadAttachment = (attachment: Attachment) => {
  const link = document.createElement('a');
  link.href = attachment.previewUrl || attachment.url;
  link.download = attachment.name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const quickEmojis = ['😀','👍','❤️','😂','🔥','👏','🎉','✅','🚀','💯'];

const MiniEmojiPicker: React.FC<{ anchorRef: React.RefObject<HTMLButtonElement | null>; onSelect: (e: string) => void; onClose: () => void }> = ({ anchorRef, onSelect, onClose }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && anchorRef.current && !anchorRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose, anchorRef]);

  if (!anchorRef.current) return null;
  const rect = anchorRef.current.getBoundingClientRect();
  return ReactDOM.createPortal(
    <div ref={ref} className="fixed z-[100] bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl shadow-xl p-2 flex flex-wrap gap-1 w-[200px]"
      style={{ bottom: window.innerHeight - rect.top + 4, left: rect.left }}>
      {quickEmojis.map((e) => (
        <button key={e} onClick={() => { onSelect(e); onClose(); }} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-sm">{e}</button>
      ))}
    </div>,
    document.body
  );
};

const getConvIcon = (type: ConversationType) => {
  switch (type) {
    case 'task': return <CheckSquare size={12} className="text-purple-500" />;
    case 'dm': return <AtSign size={12} className="text-blue-500" />;
    case 'team': return <Hash size={12} className="text-emerald-500" />;
    case 'announcement': return <Megaphone size={12} className="text-amber-500" />;
  }
};

const formatTime = (date: Date) => {
  if (isToday(date)) return format(date, 'h:mm a');
  if (isYesterday(date)) return `Yesterday ${format(date, 'h:mm a')}`;
  return format(date, 'MMM d, h:mm a');
};

// Single docked mini chat window
const DockedChatWindow: React.FC<{ conversationId: string }> = ({ conversationId }) => {
  const { conversations, getConversationMessages, sendMessage, toggleReaction, undockChat, currentUserId } = useChatStore();
  const [isExpanded, setIsExpanded] = useState(true);
  const [input, setInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reactionBtnRef = useRef<HTMLButtonElement>(null);

  const conv = conversations.find((c) => c.id === conversationId);
  const messages = getConversationMessages(conversationId);

  useEffect(() => {
    if (isExpanded) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [isExpanded, messages.length]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newAttachments: Attachment[] = Array.from(files).map((f) => ({
      id: uuidv4(),
      name: f.name,
      url: URL.createObjectURL(f),
      type: f.type,
      size: f.size,
      previewUrl: f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined,
      uploadedAt: new Date(),
    }));
    setPendingAttachments((prev) => [...prev, ...newAttachments]);
    e.target.value = '';
  }, []);

  if (!conv) return null;

  const otherParticipant = conv.type === 'dm'
    ? conv.participants.find((p) => p.userId !== currentUserId)
    : null;

  const avatar = otherParticipant?.avatar || conv.participants[0]?.avatar;
  const displayName = conv.name;
  const isOnline = otherParticipant?.online ?? false;

  const handleSend = () => {
    if (!input.trim() && pendingAttachments.length === 0) return;
    sendMessage(conversationId, input, pendingAttachments.length > 0 ? pendingAttachments : undefined);
    setInput('');
    setPendingAttachments([]);
  };

  return (
    <div className="flex flex-col items-center flex-shrink-0">
      {/* Expanded chat window */}
      {isExpanded && (
        <div className={clsx(
          'mb-2 w-80 h-96 flex flex-col',
          'bg-white dark:bg-slate-900',
          'border border-gray-200 dark:border-slate-700',
          'rounded-2xl shadow-2xl',
          'animate-in slide-in-from-bottom-2',
        )} style={{ overflow: 'hidden', isolation: 'isolate', transform: 'translateZ(0)', zIndex: 60 }}>
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
            <div className="flex items-center gap-2 min-w-0">
              <img src={avatar} alt={displayName} className="w-7 h-7 rounded-full flex-shrink-0" />
              <div className="min-w-0">
                <h4 className="text-xs font-bold truncate">{displayName}</h4>
                <div className="flex items-center gap-1">
                  {getConvIcon(conv.type)}
                  <span className="text-[10px] text-purple-200 capitalize">{conv.type}</span>
                  {conv.type === 'dm' && (
                    <span className="text-[10px] text-purple-200">
                      • {isOnline ? 'Online' : 'Offline'}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 rounded hover:bg-white/20 transition-colors"
                title="Minimize"
              >
                <Minimize2 size={14} />
              </button>
              <button
                onClick={() => undockChat(conversationId)}
                className="p-1 rounded hover:bg-white/20 transition-colors"
                title="Close"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2.5 bg-white dark:bg-slate-900">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-xs text-gray-400 dark:text-slate-500">No messages yet. Say hi!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId === currentUserId;
                const reactions = msg.reactions || [];
                return (
                  <div key={msg.id} className={clsx('flex gap-1.5 group/msg', isMe && 'flex-row-reverse')}>
                    <img src={msg.senderAvatar} alt="" className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5" />
                    <div className={clsx('max-w-[75%] relative')}>
                      <div className={clsx(
                        'px-2.5 py-1.5 rounded-xl text-xs leading-relaxed',
                        isMe
                          ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-tr-sm'
                          : 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-200 rounded-tl-sm'
                      )}>
                        {msg.text}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="space-y-1">
                            {msg.attachments.map((att) => {
                              const isImage = att.type.startsWith('image/');
                              return (
                                <div key={att.id} className={clsx('mt-1 rounded-lg overflow-hidden border', isMe ? 'border-white/20' : 'border-gray-200 dark:border-slate-600')}>
                                  {isImage && att.previewUrl ? (
                                    <div className="relative group/img">
                                      <img src={att.previewUrl} alt={att.name} className="max-w-[160px] max-h-[100px] object-cover rounded-lg" />
                                      <button onClick={(e) => { e.stopPropagation(); downloadAttachment(att); }} className="absolute top-1 right-1 p-1 rounded bg-black/50 text-white opacity-0 group-hover/img:opacity-100 transition-opacity" title="Download">
                                        <Download size={10} />
                                      </button>
                                    </div>
                                  ) : (
                                    <button onClick={(e) => { e.stopPropagation(); downloadAttachment(att); }} className={clsx('flex items-center gap-1.5 w-full text-left px-2 py-1.5 rounded-lg hover:brightness-95 dark:hover:brightness-110 transition-all', isMe ? 'bg-white/10' : 'bg-gray-50 dark:bg-slate-700/50')}>
                                      <File size={12} className={isMe ? 'text-white/70' : 'text-gray-400 dark:text-slate-500'} />
                                      <div className="flex-1 min-w-0">
                                        <p className={clsx('text-[10px] font-medium truncate', isMe ? 'text-white' : 'text-gray-700 dark:text-slate-300')}>{att.name}</p>
                                        <p className={clsx('text-[9px]', isMe ? 'text-white/60' : 'text-gray-400 dark:text-slate-500')}>{formatFileSize(att.size)}</p>
                                      </div>
                                      <Download size={10} className={isMe ? 'text-white/70' : 'text-gray-400 dark:text-slate-500'} />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      {/* Reaction button */}
                      <button
                        ref={reactionPickerMsgId === msg.id ? reactionBtnRef : undefined}
                        onClick={() => setReactionPickerMsgId(reactionPickerMsgId === msg.id ? null : msg.id)}
                        className={clsx('absolute -bottom-2 opacity-0 group-hover/msg:opacity-100 transition-opacity p-0.5 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 shadow-sm hover:scale-110', isMe ? 'left-0' : 'right-0')}
                      >
                        <SmilePlus size={10} className="text-gray-400" />
                      </button>
                      {reactionPickerMsgId === msg.id && (
                        <div className={clsx('absolute -bottom-7 flex gap-0.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-full px-1 py-0.5 shadow-lg z-10', isMe ? 'left-0' : 'right-0')}>
                          {['👍','❤️','😂','🔥','👏','🎉'].map((emoji) => (
                            <button key={emoji} onClick={() => { toggleReaction(conversationId, msg.id, emoji); setReactionPickerMsgId(null); }} className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-[10px]">{emoji}</button>
                          ))}
                        </div>
                      )}
                      {/* Reaction bar */}
                      {reactions.length > 0 && (
                        <div className={clsx('flex flex-wrap gap-0.5 mt-0.5', isMe && 'justify-end')}>
                          {reactions.map((r) => (
                            <button key={r.emoji} onClick={() => toggleReaction(conversationId, msg.id, r.emoji)} className={clsx('inline-flex items-center gap-0.5 px-1 py-0.5 rounded-full text-[9px] border transition-colors', r.users.includes(currentUserId) ? 'bg-purple-100 border-purple-300 dark:bg-purple-900/30 dark:border-purple-600' : 'bg-gray-50 border-gray-200 dark:bg-slate-800 dark:border-slate-600')}>
                              <span>{r.emoji}</span>
                              <span className="text-gray-500 dark:text-slate-400">{r.users.length}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      <p className={clsx('text-[9px] text-gray-400 dark:text-slate-600 mt-0.5', isMe && 'text-right')}>
                        {formatTime(new Date(msg.timestamp))}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-2.5 py-2 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900">
            {/* Pending attachments */}
            {pendingAttachments.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1.5">
                {pendingAttachments.map((att) => (
                  <div key={att.id} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700/40">
                    <File size={10} className="text-purple-500" />
                    <span className="text-[9px] text-purple-700 dark:text-purple-300 max-w-[80px] truncate">{att.name}</span>
                    <button onClick={() => setPendingAttachments((p) => p.filter((a) => a.id !== att.id))} className="text-purple-400 hover:text-purple-600"><X size={10} /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-1">
              <button
                ref={emojiButtonRef}
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-1.5 rounded-full text-gray-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                title="Emoji"
              >
                <Smile size={14} />
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 rounded-full text-gray-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                title="Attach file"
              >
                <Paperclip size={14} />
              </button>
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
                placeholder={`Message ${displayName}...`}
                className={clsx(
                  'flex-1 rounded-full px-3 py-2 text-xs',
                  'bg-gray-100 border-none text-gray-800 placeholder-gray-400',
                  'dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500',
                  'focus:outline-none focus:ring-2 focus:ring-purple-500/30'
                )}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() && pendingAttachments.length === 0}
                className={clsx(
                  'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                  'bg-gradient-to-r from-purple-600 to-blue-600 text-white',
                  'hover:shadow-lg transition-all',
                  'disabled:opacity-40 disabled:cursor-not-allowed'
                )}
              >
                <Send size={12} />
              </button>
            </div>
            {showEmojiPicker && (
              <MiniEmojiPicker
                anchorRef={emojiButtonRef}
                onSelect={(emoji) => setInput((prev) => prev + emoji)}
                onClose={() => setShowEmojiPicker(false)}
              />
            )}
          </div>
        </div>
      )}

      {/* Bubble */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={clsx(
          'relative w-12 h-12 rounded-full',
          'shadow-lg hover:shadow-xl hover:scale-110',
          'transition-all duration-200',
          'ring-2 ring-white dark:ring-slate-900',
          'group'
        )}
        title={displayName}
      >
        <img
          src={avatar}
          alt={displayName}
          className="w-full h-full rounded-full object-cover"
        />
        {/* Online indicator */}
        {conv.type === 'dm' && (
          <span className={clsx(
            'absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900',
            isOnline ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-600'
          )} />
        )}
        {/* Non-DM type badge */}
        {conv.type !== 'dm' && (
          <span className={clsx(
            'absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center',
            'bg-white dark:bg-slate-800 shadow-sm border border-gray-200 dark:border-slate-700'
          )}>
            {getConvIcon(conv.type)}
          </span>
        )}
        {/* Unread badge */}
        {conv.unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
            {conv.unreadCount}
          </span>
        )}
        {/* Tooltip */}
        <span className={clsx(
          'absolute bottom-full mb-2 left-1/2 -translate-x-1/2',
          'px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap',
          'bg-gray-900 text-white dark:bg-slate-700 dark:text-slate-100',
          'opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity',
          'shadow-lg'
        )}>
          {displayName}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-slate-700" />
        </span>
      </button>
    </div>
  );
};

// Drop zone indicator
const DropZone: React.FC<{ isDragOver: boolean }> = ({ isDragOver }) => (
  <div className={clsx(
    'fixed bottom-0 left-0 right-0 h-20 z-40 flex items-center justify-center transition-all duration-300 pointer-events-none',
    isDragOver
      ? 'bg-gradient-to-t from-purple-500/30 to-transparent opacity-100'
      : 'opacity-0'
  )}>
    <div className={clsx(
      'px-4 py-2 rounded-full text-sm font-semibold transition-all',
      isDragOver
        ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/40 scale-100'
        : 'bg-purple-600/50 text-white/70 scale-90'
    )}>
      Drop here to dock chat
    </div>
  </div>
);

// Main DockedChats container — renders all docked bubbles
export const DockedChats: React.FC = () => {
  const dockedChatIds = useChatStore((s) => s.dockedChatIds);
  const chatBotOpen = useChatStore((s) => s.chatBotOpen);
  const [isDragOver, setIsDragOver] = useState(false);
  const { dockChat } = useChatStore();

  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      const data = e.dataTransfer?.types.includes('text/chat-conversation-id');
      if (!data) return;
      e.preventDefault();
      // Check if near bottom of screen
      if (e.clientY > window.innerHeight - 100) {
        setIsDragOver(true);
      } else {
        setIsDragOver(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const convId = e.dataTransfer?.getData('text/chat-conversation-id');
      if (convId && e.clientY > window.innerHeight - 100) {
        dockChat(convId);
      }
    };

    const handleDragLeave = () => setIsDragOver(false);

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);
    window.addEventListener('dragleave', handleDragLeave);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
      window.removeEventListener('dragleave', handleDragLeave);
    };
  }, [dockChat]);

  if (dockedChatIds.length === 0 && !isDragOver) return null;

  return (
    <>
      <DropZone isDragOver={isDragOver} />
      {/* Docked bubbles — desktop only, always below the ChatBot (z-50) */}
      <div
        className="hidden md:block fixed bottom-6 z-[45] transition-all duration-300"
        style={{ right: chatBotOpen ? 420 : 88, left: 0, pointerEvents: 'none' }}
      >
        <div
          className="flex items-end gap-3 overflow-x-auto pb-2 docked-chats-scroll"
          style={{ pointerEvents: 'none', direction: 'rtl' }}
        >
          {dockedChatIds.map((id) => (
            <div key={id} style={{ direction: 'ltr', pointerEvents: 'auto' }}>
              <DockedChatWindow conversationId={id} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
