import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import clsx from 'clsx';
import {
  X,
  Send,
  Minimize2,
  Hash,
  AtSign,
  CheckSquare,
  Megaphone,
  Smile,
  Paperclip,
  File,
  Download,
  SmilePlus,
  CornerUpLeft,
  Star,
  Check,
  Trash2,
} from 'lucide-react';
import { useChatStore } from '@stores/chatStore';
import { useTaskStore } from '@stores/taskStore';
import { useProjectStore } from '@stores/projectStore';
import { useToastStore } from '@components/Toast';
import { linkifyText } from '@/utils/linkify';
import { useUserStore } from '@stores/userStore';
import { ConversationType, Attachment, TaskRef, ReplyRef, ChatMessage, Conversation } from '@/types/index';
import TaskRefCard from '@components/TaskRefCard';
import MessageContextMenu from '@components/MessageContextMenu';
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
  const {
    conversations, getConversationMessages, sendMessage,
    editMessage, deleteMessage, starMessage, forwardMessage,
    toggleReaction, undockChat, currentUserId,
    subscribeTyping, unsubscribeTyping, setTyping,
  } = useChatStore();
  const typingNames = useChatStore((s) => s.typingUsers[conversationId]?.map((u) => u.name) ?? []);
  const tasks = useTaskStore((s) => s.tasks);
  const { getProjectById } = useProjectStore();
  const { addToast } = useToastStore();
  const { isAdmin } = useUserStore();
  const EDIT_WINDOW_MS = 15 * 60 * 1000;
  const msgCanEdit = (msg: { senderId: string; timestamp: Date; isDeleted?: boolean }) =>
    !msg.isDeleted && msg.senderId === currentUserId &&
    (isAdmin() || Date.now() - new Date(msg.timestamp).getTime() < EDIT_WINDOW_MS);
  const [isExpanded, setIsExpanded] = useState(true);
  const [input, setInput] = useState('');
  const [deleteMsgConfirm, setDeleteMsgConfirm] = useState<{ messageId: string } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isDragOverWindow, setIsDragOverWindow] = useState(false);
  const [isDragOverBubble, setIsDragOverBubble] = useState(false);
  const [pendingTaskRef, setPendingTaskRef] = useState<TaskRef | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ msg: ChatMessage; x: number; y: number } | null>(null);
  const [pendingReply, setPendingReply] = useState<ChatMessage | null>(null);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [forwardMsg, setForwardMsg] = useState<ChatMessage | null>(null);
  const [infoMsgId, setInfoMsgId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reactionBtnRef = useRef<HTMLButtonElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSendingRef = useRef(false);
  const typingStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const conv = conversations.find((c) => c.id === conversationId);
  const messages = getConversationMessages(conversationId);

  useEffect(() => {
    if (isExpanded) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [isExpanded, messages.length]);

  // Listen for the other participant's typing presence while this window is open
  useEffect(() => {
    subscribeTyping(conversationId);
    return () => {
      if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
      unsubscribeTyping(conversationId);
    };
  }, [conversationId, subscribeTyping, unsubscribeTyping]);

  const handleInputChange = (value: string) => {
    setInput(value);
    setTyping(conversationId, true);
    if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
    typingStopTimer.current = setTimeout(() => setTyping(conversationId, false), 2000);
  };

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

  const buildTaskRef = (taskId: string): TaskRef | null => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return null;
    const project = task.projectId ? getProjectById(task.projectId) : null;
    const completed = (task.subtasks || []).filter((s) => s.completed).length;
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      progress: task.progress,
      projectName: project?.name,
      subtasksCompleted: completed,
      subtasksTotal: (task.subtasks || []).length,
    };
  };

  const attachTask = (taskId: string) => {
    const ref = buildTaskRef(taskId);
    if (!ref) return;
    setPendingTaskRef(ref);
    setIsExpanded(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleTaskDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('text/task-ref')) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverWindow(true);
  };

  const handleTaskDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverWindow(false);
    const taskId = e.dataTransfer.getData('text/task-id');
    if (taskId) attachTask(taskId);
  };

  const handleBubbleDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('text/task-ref')) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverBubble(true);
  };

  const handleBubbleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverBubble(false);
    const taskId = e.dataTransfer.getData('text/task-id');
    if (taskId) attachTask(taskId);
  };

  if (!conv) return null;

  const otherParticipant = conv.type === 'dm'
    ? conv.participants.find((p) => p.userId !== currentUserId)
    : null;

  const avatar = otherParticipant?.avatar || conv.participants[0]?.avatar;
  const displayName = conv.name;
  const isOnline = otherParticipant?.online ?? false;

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
    if (editingText.trim()) editMessage(conversationId, msgId, editingText);
    setEditingMsgId(null);
    setEditingText('');
  };

  const handleSend = () => {
    if (!input.trim() && pendingAttachments.length === 0 && !pendingTaskRef) return;
    // Guard against double-submission (Enter key-repeat, double-click, or
    // a stray duplicate event firing handleSend twice for one user action)
    if (isSendingRef.current) return;
    isSendingRef.current = true;
    setTimeout(() => { isSendingRef.current = false; }, 300);
    if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
    setTyping(conversationId, false);
    const replyTo: ReplyRef | undefined = pendingReply
      ? { id: pendingReply.id, text: pendingReply.text, senderName: pendingReply.senderName, taskRef: pendingReply.taskRef }
      : undefined;
    sendMessage(
      conversationId,
      input,
      pendingAttachments.length > 0 ? pendingAttachments : undefined,
      pendingTaskRef ?? undefined,
      replyTo,
    );
    setInput('');
    setPendingAttachments([]);
    setPendingTaskRef(null);
    setPendingReply(null);
  };

  return (
    <div className="flex flex-col items-center flex-1 min-h-0 md:flex-initial md:flex-shrink-0">
      {/* Expanded chat window */}
      {isExpanded && (
        <div
          className={clsx(
            'flex flex-col flex-1 min-h-0',
            'bg-white dark:bg-slate-900',
            'md:border md:dark:border-slate-700',
            isDragOverWindow
              ? 'md:border-purple-400 md:ring-2 md:ring-purple-400/40'
              : 'md:border-gray-200',
            'md:shadow-2xl md:overflow-hidden',
            'animate-in slide-in-from-bottom-2',
            'w-full rounded-none md:mb-2 md:w-80 md:h-96 md:flex-initial md:rounded-2xl',
          )}
          style={{ isolation: 'isolate', transform: 'translateZ(0)', zIndex: 60, position: 'relative' }}
          onDragOver={handleTaskDragOver}
          onDragLeave={() => setIsDragOverWindow(false)}
          onDrop={handleTaskDrop}
        >
          {/* Task drop overlay */}
          {isDragOverWindow && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-purple-500/10 pointer-events-none">
              <div className="px-3 py-1.5 rounded-full bg-purple-600 text-white text-xs font-semibold shadow-lg">
                Drop to attach task
              </div>
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white flex-shrink-0">
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
              {/* Minimize — desktop only (mobile has no bubble to re-expand) */}
              <button
                onClick={() => setIsExpanded(false)}
                className="hidden md:block p-1 rounded hover:bg-white/20 transition-colors"
                title="Minimize"
              >
                <Minimize2 size={14} />
              </button>
              <button
                onClick={() => undockChat(conversationId)}
                className="p-1.5 md:p-1 rounded hover:bg-white/20 transition-colors"
                title="Close"
              >
                <X size={18} className="md:hidden" />
                <X size={14} className="hidden md:block" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 min-h-0 overflow-y-auto px-3 pt-2 pb-2.5 space-y-2.5 bg-white dark:bg-slate-900">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-xs text-gray-400 dark:text-slate-500">No messages yet. Say hi!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId === currentUserId;
                const reactions = msg.reactions || [];
                const isEditing = editingMsgId === msg.id;
                return (
                  <div key={msg.id} className={clsx('flex gap-1.5 group/msg', isMe && 'flex-row-reverse')}>
                    <img src={msg.senderAvatar} alt="" className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5" />
                    <div className={clsx('max-w-[75%] relative')}>
                      <div
                        className={clsx(
                          'rounded-xl text-xs leading-relaxed overflow-hidden select-none',
                          isMe
                            ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-tr-sm'
                            : 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-200 rounded-tl-sm',
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
                            'px-2.5 pt-1.5 pb-1 border-b border-l-2',
                            isMe
                              ? 'border-white/30 border-l-white/50 bg-white/10'
                              : 'border-gray-200 dark:border-slate-700 border-l-purple-400 bg-gray-50 dark:bg-slate-900/60'
                          )}>
                            <p className={clsx('text-[9px] font-semibold truncate', isMe ? 'text-purple-200' : 'text-purple-500 dark:text-purple-400')}>
                              {msg.replyTo.senderName}
                            </p>
                            <p className={clsx('text-[9px] truncate mt-0.5 opacity-80', isMe ? 'text-white' : 'text-gray-600 dark:text-slate-400')}>
                              {msg.replyTo.taskRef ? `📋 ${msg.replyTo.taskRef.title}` : msg.replyTo.text || '—'}
                            </p>
                          </div>
                        )}
                        {/* Task card attachment */}
                        {msg.taskRef && !msg.isDeleted && <TaskRefCard taskRef={msg.taskRef} isMe={isMe} />}
                        <div className="px-2.5 py-1.5">
                        {msg.isDeleted ? (
                          <span className="italic opacity-60 text-[10px]">Message deleted</span>
                        ) : isEditing ? (
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <input
                              autoFocus
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') confirmEdit(msg.id); if (e.key === 'Escape') { setEditingMsgId(null); setEditingText(''); } }}
                              className="flex-1 bg-transparent border-b border-white/50 outline-none text-xs"
                            />
                            <button onClick={() => confirmEdit(msg.id)} className="p-0.5 rounded-full bg-white/20 hover:bg-white/30">
                              <Check size={10} />
                            </button>
                          </div>
                        ) : (
                          <span>
                            {linkifyText(msg.text)}
                            {msg.starred && <Star size={8} className="inline ml-1 fill-amber-400 text-amber-400" />}
                          </span>
                        )}
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
                        </div>{/* closes px-2.5 py-1.5 text content wrapper */}
                      </div>
                      {/* Edited label */}
                      {msg.editedAt && !msg.isDeleted && (
                        <p className={clsx('text-[8px] mt-0.5 opacity-50', isMe ? 'text-right' : 'text-left')}>edited</p>
                      )}
                      {/* Info overlay */}
                      {infoMsgId === msg.id && (
                        <div
                          className={clsx(
                            'absolute -top-7 px-2 py-1 rounded-lg text-[9px] shadow-lg bg-gray-800 dark:bg-slate-700 text-white whitespace-nowrap z-10',
                            isMe ? 'right-0' : 'left-0'
                          )}
                          onClick={() => setInfoMsgId(null)}
                        >
                          {format(new Date(msg.timestamp), 'MMM d, yyyy · h:mm a')} · {msg.senderName}
                        </div>
                      )}
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
            {typingNames.length > 0 && (
              <div className="flex items-center gap-1.5 px-1">
                <span className="flex gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-slate-500 animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-slate-500 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-slate-500 animate-bounce" />
                </span>
                <span className="text-[10px] text-gray-400 dark:text-slate-500 italic">
                  {typingNames.length === 1 ? `${typingNames[0]} is typing…` : `${typingNames.join(', ')} are typing…`}
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Context menu */}
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
              onStar={() => starMessage(conversationId, contextMenu.msg.id)}
              onDelete={() => { setDeleteMsgConfirm({ messageId: contextMenu.msg.id }); setContextMenu(null); }}
              onMore={() => {}}
              onClose={() => setContextMenu(null)}
            />
          )}

          {/* Forward modal */}
          {forwardMsg && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 rounded-2xl" onClick={() => setForwardMsg(null)}>
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-56 p-3" onClick={(e) => e.stopPropagation()}>
                <p className="text-xs font-semibold text-gray-700 dark:text-slate-200 mb-2">Forward to…</p>
                <div className="space-y-0.5 max-h-48 overflow-y-auto">
                  {conversations.filter((c) => c.id !== conversationId).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { forwardMessage(conversationId, forwardMsg.id, c.id); setForwardMsg(null); }}
                      className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                      <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-[9px] font-bold text-purple-600 flex-shrink-0">
                        {c.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="truncate">{c.name}</span>
                    </button>
                  ))}
                </div>
                <button onClick={() => setForwardMsg(null)} className="mt-2 w-full text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">Cancel</button>
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
                      deleteMessage(conversationId, deleteMsgConfirm.messageId);
                      addToast({ type: 'success', title: 'Message deleted', message: 'Your message has been deleted.', duration: 3000 });
                      setDeleteMsgConfirm(null);
                    }}
                    className="px-6 py-2.5 rounded-lg text-sm font-medium bg-red-500 hover:bg-red-600 text-white transition-colors"
                  >Delete Message</button>
                </div>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="px-2.5 py-2 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex-shrink-0">
            {/* Reply banner */}
            {pendingReply && (
              <div className="mb-1.5 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700">
                <CornerUpLeft size={9} className="text-purple-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[8px] font-semibold text-purple-500 dark:text-purple-400 truncate">{pendingReply.senderName}</p>
                  <p className="text-[9px] text-gray-500 dark:text-slate-400 truncate">
                    {pendingReply.taskRef ? `📋 ${pendingReply.taskRef.title}` : pendingReply.text}
                  </p>
                </div>
                <button onClick={() => setPendingReply(null)} className="text-gray-400 hover:text-gray-600 flex-shrink-0"><X size={9} /></button>
              </div>
            )}
            {/* Pending task attachment preview */}
            {pendingTaskRef && (
              <div className="mb-1.5 rounded-xl border border-purple-200 dark:border-purple-700/50 bg-purple-50 dark:bg-purple-900/20 overflow-hidden">
                <div className="flex items-center justify-between px-2 pt-1.5 pb-0.5">
                  <span className="text-[9px] font-semibold text-purple-500 dark:text-purple-400 uppercase tracking-wide flex items-center gap-1">
                    <CheckSquare size={9} /> Attaching task
                  </span>
                  <button onClick={() => setPendingTaskRef(null)} className="text-purple-400 hover:text-purple-600"><X size={10} /></button>
                </div>
                <div className="px-2 pb-1.5">
                  <p className="text-[11px] font-semibold text-gray-800 dark:text-slate-100 truncate leading-tight">{pendingTaskRef.title}</p>
                  {pendingTaskRef.projectName && (
                    <p className="text-[9px] text-purple-500 dark:text-purple-400 truncate mt-0.5">{pendingTaskRef.projectName}</p>
                  )}
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={clsx('text-[9px] font-medium px-1.5 py-0.5 rounded-full', {
                      'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300': pendingTaskRef.status === 'todo',
                      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300': pendingTaskRef.status === 'in-progress',
                      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300': pendingTaskRef.status === 'review',
                      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300': pendingTaskRef.status === 'completed',
                    })}>
                      {{ todo: 'To Do', 'in-progress': 'In Progress', review: 'Review', completed: 'Completed' }[pendingTaskRef.status] ?? pendingTaskRef.status}
                    </span>
                    <span className={clsx('text-[9px] font-medium px-1.5 py-0.5 rounded-full', {
                      'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400': pendingTaskRef.priority === 'low',
                      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300': pendingTaskRef.priority === 'medium',
                      'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300': pendingTaskRef.priority === 'high',
                      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300': pendingTaskRef.priority === 'urgent',
                    })}>
                      {pendingTaskRef.priority.charAt(0).toUpperCase() + pendingTaskRef.priority.slice(1)}
                    </span>
                    {pendingTaskRef.subtasksTotal > 0 && (
                      <span className="text-[9px] text-gray-400 dark:text-slate-500">{pendingTaskRef.subtasksCompleted}/{pendingTaskRef.subtasksTotal} subtasks</span>
                    )}
                  </div>
                  {pendingTaskRef.progress > 0 && (
                    <div className="mt-1 h-1 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className={clsx('h-full rounded-full', pendingTaskRef.progress >= 100 ? 'bg-emerald-500' : 'bg-purple-500')} style={{ width: `${pendingTaskRef.progress}%` }} />
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* Pending file attachments */}
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
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.repeat) handleSend(); }}
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

      {/* Bubble — hidden on mobile (full-screen overlay used instead) */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        onDragOver={handleBubbleDragOver}
        onDragLeave={() => setIsDragOverBubble(false)}
        onDrop={handleBubbleDrop}
        className={clsx(
          'relative w-12 h-12 rounded-full',
          'shadow-lg hover:shadow-xl hover:scale-110',
          'transition-all duration-200',
          isDragOverBubble
            ? 'ring-4 ring-purple-400 scale-110'
            : 'ring-2 ring-white dark:ring-slate-900',
          'group',
          'hidden md:block'
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
const DropZone: React.FC<{ isDragOver: boolean; isTaskDrag?: boolean }> = ({ isDragOver, isTaskDrag }) => (
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
      {isTaskDrag ? 'Drop on a chat bubble to share task' : 'Drop here to dock chat'}
    </div>
  </div>
);

// Mobile "wallet" view — when more than one chat is docked, default to a
// stacked-card overview (like boarding passes in a wallet app) instead of
// dropping straight into the most recently docked conversation. Tapping a
// card opens that conversation in the full MobileBottomSheet.
const MobileWalletStack: React.FC<{
  conversationIds: string[];
  onSelect: (id: string) => void;
  // Which chat (if any) is currently open in the bottom sheet above
  expandedId?: string | null;
}> = ({ conversationIds, onSelect, expandedId }) => {
  const conversations = useChatStore((s) => s.conversations);
  const currentUserId = useChatStore((s) => s.currentUserId);

  // Local display order — lets a tap on a background card shuffle it to the
  // front instead of jumping straight into the conversation. Reconciled
  // against conversationIds below so docking/undocking still works.
  const [order, setOrder] = useState<string[]>(conversationIds);
  const [swapPair, setSwapPair] = useState<[string, string] | null>(null);

  useEffect(() => {
    setOrder((prev) => {
      const known = new Set(conversationIds);
      const kept = prev.filter((id) => known.has(id));
      const added = conversationIds.filter((id) => !kept.includes(id));
      return [...kept, ...added];
    });
  }, [conversationIds]);

  const cards = order
    .map((id) => conversations.find((c) => c.id === id))
    .filter((c): c is Conversation => !!c);

  if (cards.length === 0) return null;

  const PEEK = 44; // px of each underlying card visible above the one in front of it
  const FRONT_HEIGHT = 96;
  const BEHIND_HEIGHT = 56;
  const frontIndex = cards.length - 1;
  const frontId = cards[frontIndex].id;

  const handleCardClick = (id: string, index: number) => {
    // Tapping the card that is already open in the sheet above does nothing —
    // it's already the active conversation.
    if (id === expandedId) return;

    if (index === frontIndex) {
      // Front card: open immediately without any shuffle.
      onSelect(id);
      return;
    }
    // Background card: shuffle-swap then open in a single tap.
    // Flick both cards left, swap their positions, then call onSelect so the
    // newly-promoted card opens straight into the bottom sheet.
    setSwapPair([id, frontId]);
    // 180ms: 150ms for the flick animation + ~30ms buffer for React's render
    // delay so the flick fully completes before the position swap begins.
    setTimeout(() => {
      setOrder((prev) => {
        const next = [...prev];
        const tappedIdx = next.indexOf(id);
        const frontIdx = next.indexOf(frontId);
        [next[tappedIdx], next[frontIdx]] = [next[frontIdx], next[tappedIdx]];
        return next;
      });
      setSwapPair(null);
      // Open immediately after the swap settles — one tap to switch chats.
      onSelect(id);
    }, 180);
  };

  return (
    // z-[58]: sits below the backdrop (z-[59]) and sheet (z-[60]) so the
    // wallet is always visible in the strip the sheet leaves uncovered.
    <div
      className="md:hidden fixed bottom-0 left-0 right-0 z-[58] px-3"
      style={{ paddingBottom: 'max(14px, env(safe-area-inset-bottom))' }}
    >
      <p className="text-center text-[11px] font-semibold text-gray-400 dark:text-slate-500 mb-2 tracking-wide uppercase">
        {cards.length} chat{cards.length !== 1 ? 's' : ''} docked — {cards.length > 1 ? 'tap to switch' : 'tap to reopen'}
      </p>
      <div className="relative" style={{ height: FRONT_HEIGHT + frontIndex * PEEK }}>
        {cards.map((conv, i) => {
          const otherParticipant = conv.type === 'dm'
            ? conv.participants.find((p) => p.userId !== currentUserId)
            : null;
          const avatar = otherParticipant?.avatar || conv.participants[0]?.avatar;
          const isFront = i === frontIndex;
          const fromFront = frontIndex - i;
          const isSwapping = !!swapPair && swapPair.includes(conv.id);
          const isCurrentlyOpen = conv.id === expandedId;
          // The front card is taller than the rest (it shows a last-message
          // preview), so the first card behind it needs an extra offset
          // equal to that height difference — otherwise it only peeks out
          // by a few px instead of a full PEEK, making it nearly invisible
          // and hard to tap.
          const bottomOffset = isFront ? 0 : (FRONT_HEIGHT - BEHIND_HEIGHT) + fromFront * PEEK;
          return (
            <button
              key={conv.id}
              onClick={() => handleCardClick(conv.id, i)}
              className={clsx(
                'absolute left-0 right-0 rounded-2xl text-left overflow-hidden',
                'bg-white dark:bg-slate-800 shadow-lg border',
                isCurrentlyOpen
                  ? 'border-purple-400 dark:border-purple-500'
                  : 'border-gray-200/70 dark:border-slate-700/70',
                // active:scale-[0.98] is intentionally omitted — it's overridden by
                // the inline transform style and would silently do nothing. Use
                // active:opacity-90 instead so tap feedback still works.
                'transition-all ease-out active:opacity-90'
              )}
              style={{
                bottom: bottomOffset,
                zIndex: i,
                height: isFront ? FRONT_HEIGHT : BEHIND_HEIGHT,
                // 40px flick is pronounced enough to read as a deliberate shuffle
                // on any phone screen without feeling jarring.
                transform: isSwapping ? 'translateX(-40px)' : 'translateX(0)',
                transitionDuration: isSwapping ? '150ms' : '280ms',
              }}
            >
              <div className="h-9 px-3 flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 flex-shrink-0">
                {avatar ? (
                  <img src={avatar} alt={conv.name} className="w-5 h-5 rounded-full flex-shrink-0 ring-1 ring-white/50" />
                ) : (
                  <span className="w-5 h-5 rounded-full flex-shrink-0 ring-1 ring-white/50 bg-white/20 flex items-center justify-center">
                    {getConvIcon(conv.type)}
                  </span>
                )}
                <span className="text-xs font-bold text-white truncate flex-1">{conv.name}</span>
                {/* "Open" pill for the currently expanded chat */}
                {isCurrentlyOpen && (
                  <span className="text-[8px] font-semibold bg-white/25 text-white px-1.5 py-0.5 rounded-full flex-shrink-0">
                    Open
                  </span>
                )}
                {conv.unreadCount > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                    {conv.unreadCount}
                  </span>
                )}
              </div>
              {isFront && (
                <div className="px-3 py-2">
                  <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                    {conv.lastMessage
                      ? `${conv.lastMessage.senderId === currentUserId ? 'You: ' : ''}${conv.lastMessage.text}`
                      : 'No messages yet'}
                  </p>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Mobile bottom-sheet with swipe-to-dismiss
const MobileBottomSheet: React.FC<{
  conversationId: string;
  onDismiss: () => void;
  // px to lift the sheet (and backdrop) above the wallet stack when 2+ chats
  // are docked so the wallet cards remain visible and tappable below the sheet.
  walletOffset?: number;
}> = ({ conversationId, onDismiss, walletOffset = 0 }) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startY: number; currentY: number; dragging: boolean }>({ startY: 0, currentY: 0, dragging: false });
  const DISMISS_THRESHOLD = 120; // px to drag before auto-dismiss

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    dragState.current = { startY: e.touches[0].clientY, currentY: e.touches[0].clientY, dragging: true };
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragState.current.dragging) return;
    const currentY = e.touches[0].clientY;
    const deltaY = Math.max(0, currentY - dragState.current.startY); // only allow downward drag
    dragState.current.currentY = currentY;
    if (sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${deltaY}px)`;
      sheetRef.current.style.transition = 'none';
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!dragState.current.dragging) return;
    const deltaY = dragState.current.currentY - dragState.current.startY;
    dragState.current.dragging = false;

    if (deltaY > DISMISS_THRESHOLD) {
      // Animate off-screen then dismiss
      if (sheetRef.current) {
        sheetRef.current.style.transition = 'transform 0.25s ease-out';
        sheetRef.current.style.transform = 'translateY(100%)';
      }
      setTimeout(onDismiss, 250);
    } else {
      // Snap back
      if (sheetRef.current) {
        sheetRef.current.style.transition = 'transform 0.2s ease-out';
        sheetRef.current.style.transform = 'translateY(0)';
      }
    }
  }, [onDismiss]);

  // When walletOffset > 0 the wallet cards are visible below the sheet, so we
  // cap the sheet height so it doesn't run off the top of the screen.
  const sheetHeight = walletOffset > 0
    ? `calc(100dvh - ${walletOffset}px - 60px)`
    : '70dvh';

  return (
    <>
      {/* Backdrop — tapping it minimizes to the wallet/bubble, same as
          dragging the sheet down. Never undocks; only the header's ×
          button does that.
          When walletOffset > 0 the backdrop stops at the wallet strip so
          the wallet cards underneath remain visible and tappable. */}
      <div
        className="md:hidden fixed inset-x-0 top-0 z-[59] bg-black/30"
        style={{ bottom: walletOffset || undefined }}
        onClick={onDismiss}
      />
      <div
        ref={sheetRef}
        className="md:hidden fixed left-0 right-0 z-[60] flex flex-col bg-white dark:bg-slate-900 rounded-t-2xl shadow-[0_-4px_30px_rgba(0,0,0,0.15)] border-t border-gray-200 dark:border-slate-700"
        style={{ height: sheetHeight, bottom: walletOffset, transform: 'translateY(0)', willChange: 'transform' }}
      >
        {/* Drag handle — touch target */}
        <div
          className="flex justify-center py-3 flex-shrink-0 cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-10 h-1.5 rounded-full bg-gray-300 dark:bg-slate-600" />
        </div>
        <div className="flex-1 min-h-0 flex flex-col">
          <DockedChatWindow conversationId={conversationId} />
        </div>
      </div>
    </>
  );
};

// Main DockedChats container — renders all docked bubbles
export const DockedChats: React.FC = () => {
  const dockedChatIds = useChatStore((s) => s.dockedChatIds);
  const chatBotOpen = useChatStore((s) => s.chatBotOpen);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isTaskDrag, setIsTaskDrag] = useState(false);
  const { dockChat } = useChatStore();
  // Mobile only: which docked conversation (if any) is currently expanded
  // into the full bottom sheet. Tapping the backdrop or dragging the sheet
  // down minimizes back to the wallet stack — it never undocks. Only the
  // header's × button (undockChat) actually removes a docked chat.
  const [mobileExpandedId, setMobileExpandedId] = useState<string | null>(null);
  const prevDockedIdsRef = useRef<string[]>(dockedChatIds);

  useEffect(() => {
    if (mobileExpandedId && !dockedChatIds.includes(mobileExpandedId)) {
      setMobileExpandedId(null);
    }
  }, [dockedChatIds, mobileExpandedId]);

  // Auto-expand a conversation the moment it's freshly docked, so docking
  // still feels immediate — minimizing afterwards just returns it to the
  // wallet stack instead of closing it, so more chats can be docked alongside it.
  useEffect(() => {
    const prev = prevDockedIdsRef.current;
    const newlyDocked = dockedChatIds.find((id) => !prev.includes(id));
    if (newlyDocked) {
      setMobileExpandedId(newlyDocked);
    }
    prevDockedIdsRef.current = dockedChatIds;
  }, [dockedChatIds]);

  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      const isConvDrag = e.dataTransfer?.types.includes('text/chat-conversation-id');
      const isTaskDragEvent = e.dataTransfer?.types.includes('text/task-ref');
      if (!isConvDrag && !isTaskDragEvent) return;
      e.preventDefault();
      setIsTaskDrag(!!isTaskDragEvent);
      if (e.clientY > window.innerHeight - 100) {
        setIsDragOver(true);
      } else {
        setIsDragOver(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      setIsTaskDrag(false);
      const convId = e.dataTransfer?.getData('text/chat-conversation-id');
      if (convId && e.clientY > window.innerHeight - 100) {
        dockChat(convId);
      }
    };

    const handleDragLeave = () => { setIsDragOver(false); setIsTaskDrag(false); };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);
    window.addEventListener('dragleave', handleDragLeave);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
      window.removeEventListener('dragleave', handleDragLeave);
    };
  }, [dockChat]);

  if (dockedChatIds.length === 0 && !isDragOver && !isTaskDrag) return null;

  return (
    <>
      <DropZone isDragOver={isDragOver} isTaskDrag={isTaskDrag} />

      {/* ── Mobile chat UI ──────────────────────────────────────────────────
          Layout when 2+ chats are docked:
            z-[58]  MobileWalletStack — always visible at the bottom
            z-[59]  Backdrop (stops at walletOffset so wallet stays exposed)
            z-[60]  MobileBottomSheet (lifted by walletOffset)
          Tapping any wallet card while the sheet is open triggers a
          shuffle-swap (if it's a background card) and switches the chat
          in one tap — no separate minimize step needed.

          When only 1 chat is docked the wallet shows only when the sheet
          is not open (tap its single card to re-expand). */}

      {/* Wallet — always mounted when 2+ chats are docked */}
      {dockedChatIds.length > 1 && (
        <MobileWalletStack
          conversationIds={dockedChatIds}
          onSelect={(id) => setMobileExpandedId(id)}
          expandedId={mobileExpandedId}
        />
      )}

      {dockedChatIds.length > 0 && (
        mobileExpandedId ? (
          <MobileBottomSheet
            key={mobileExpandedId}
            conversationId={mobileExpandedId}
            onDismiss={() => setMobileExpandedId(null)}
            walletOffset={dockedChatIds.length > 1
              // label (~24px) + card stack + safe-area padding (~14px)
              ? 38 + 96 + (dockedChatIds.length - 1) * 44
              : 0}
          />
        ) : (
          /* Single-chat wallet: show a one-card stack so the user can tap to reopen */
          dockedChatIds.length === 1 ? (
            <MobileWalletStack
              conversationIds={dockedChatIds}
              onSelect={(id) => setMobileExpandedId(id)}
            />
          ) : null
        )
      )}

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
