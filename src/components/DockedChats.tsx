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
import { useTaskStore } from '@stores/taskStore';
import { useProjectStore } from '@stores/projectStore';
import { ConversationType, Attachment, TaskRef } from '@/types/index';
import TaskRefCard from '@components/TaskRefCard';
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
  const tasks = useTaskStore((s) => s.tasks);
  const { getProjectById } = useProjectStore();
  const [isExpanded, setIsExpanded] = useState(true);
  const [input, setInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isDragOverWindow, setIsDragOverWindow] = useState(false);
  const [isDragOverBubble, setIsDragOverBubble] = useState(false);
  const [pendingTaskRef, setPendingTaskRef] = useState<TaskRef | null>(null);
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

  const handleSend = () => {
    if (!input.trim() && pendingAttachments.length === 0 && !pendingTaskRef) return;
    sendMessage(
      conversationId,
      input,
      pendingAttachments.length > 0 ? pendingAttachments : undefined,
      pendingTaskRef ?? undefined,
    );
    setInput('');
    setPendingAttachments([]);
    setPendingTaskRef(null);
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
                return (
                  <div key={msg.id} className={clsx('flex gap-1.5 group/msg', isMe && 'flex-row-reverse')}>
                    <img src={msg.senderAvatar} alt="" className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5" />
                    <div className={clsx('max-w-[75%] relative')}>
                      <div className={clsx(
                        'rounded-xl text-xs leading-relaxed overflow-hidden',
                        isMe
                          ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-tr-sm'
                          : 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-200 rounded-tl-sm'
                      )}>
                        {/* Task card attachment */}
                        {msg.taskRef && <TaskRefCard taskRef={msg.taskRef} isMe={isMe} />}
                        <div className="px-2.5 py-1.5">
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
                        </div>{/* closes px-2.5 py-1.5 text content wrapper */}
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
          <div className="px-2.5 py-2 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex-shrink-0">
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

// Mobile bottom-sheet with swipe-to-dismiss
const MobileBottomSheet: React.FC<{ conversationId: string; onDismiss: () => void }> = ({ conversationId, onDismiss }) => {
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

  return (
    <div
      ref={sheetRef}
      className="md:hidden fixed bottom-0 left-0 right-0 z-[60] flex flex-col bg-white dark:bg-slate-900 rounded-t-2xl shadow-[0_-4px_30px_rgba(0,0,0,0.15)] border-t border-gray-200 dark:border-slate-700"
      style={{ height: '70dvh', transform: 'translateY(0)', willChange: 'transform' }}
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
  );
};

// Main DockedChats container — renders all docked bubbles
export const DockedChats: React.FC = () => {
  const dockedChatIds = useChatStore((s) => s.dockedChatIds);
  const chatBotOpen = useChatStore((s) => s.chatBotOpen);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isTaskDrag, setIsTaskDrag] = useState(false);
  const { dockChat, undockChat } = useChatStore();

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

      {/* Mobile: bottom-sheet chat panel with swipe-to-dismiss */}
      {dockedChatIds.length > 0 && (
        <MobileBottomSheet
          conversationId={dockedChatIds[dockedChatIds.length - 1]}
          onDismiss={() => undockChat(dockedChatIds[dockedChatIds.length - 1])}
        />
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
