import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import clsx from 'clsx';
import {
  CornerUpLeft,
  CornerUpRight,
  Copy,
  Pencil,
  Info,
  Star,
  Trash2,
  MoreHorizontal,
} from 'lucide-react';

export interface ContextMenuState {
  x: number;
  y: number;
  isMe: boolean;
  isDeleted?: boolean;
  starred?: boolean;
}

interface Props extends ContextMenuState {
  onReply: () => void;
  onForward: () => void;
  onCopy: () => void;
  onEdit: () => void;
  onInfo: () => void;
  onStar: () => void;
  onDelete: () => void;
  onMore: () => void;
  onClose: () => void;
}

const MENU_W = 200;
const MENU_H = 340;

interface ItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  red?: boolean;
}

const MessageContextMenu: React.FC<Props> = ({
  x, y, isMe, isDeleted, starred,
  onReply, onForward, onCopy, onEdit, onInfo, onStar, onDelete, onMore, onClose,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  const left = Math.min(x, window.innerWidth - MENU_W - 12);
  const top = Math.min(y, window.innerHeight - MENU_H - 12);

  useEffect(() => {
    const onMouse = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    // Small delay so the mousedown that opened the menu doesn't immediately close it
    const t = setTimeout(() => document.addEventListener('mousedown', onMouse), 50);
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', onMouse);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const Item: React.FC<ItemProps> = ({ icon, label, onClick, red }) => (
    <button
      onClick={() => { onClick(); onClose(); }}
      className={clsx(
        'flex items-center gap-3 w-full px-4 py-2.5 text-sm text-left transition-colors',
        red
          ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
          : 'text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700/60'
      )}
    >
      <span className={clsx('flex-shrink-0', red ? 'text-red-500' : 'text-gray-400 dark:text-slate-400')}>
        {icon}
      </span>
      {label}
    </button>
  );

  return ReactDOM.createPortal(
    <div
      ref={ref}
      style={{ position: 'fixed', left, top, zIndex: 9999, minWidth: MENU_W }}
      className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 overflow-hidden py-1.5"
    >
      <Item icon={<CornerUpLeft size={16} />} label="Reply" onClick={onReply} />
      <Item icon={<CornerUpRight size={16} />} label="Forward" onClick={onForward} />
      <Item icon={<Copy size={16} />} label="Copy" onClick={onCopy} />
      {isMe && !isDeleted && (
        <Item icon={<Pencil size={16} />} label="Edit" onClick={onEdit} />
      )}
      <Item icon={<Info size={16} />} label="Info" onClick={onInfo} />
      <Item
        icon={
          <Star
            size={16}
            className={starred ? 'fill-amber-400 text-amber-400' : ''}
          />
        }
        label={starred ? 'Unstar' : 'Star'}
        onClick={onStar}
      />
      {isMe && !isDeleted && (
        <Item icon={<Trash2 size={16} />} label="Delete" onClick={onDelete} red />
      )}
      <div className="border-t border-gray-100 dark:border-slate-700 my-1" />
      <Item icon={<MoreHorizontal size={16} />} label="More..." onClick={onMore} />
    </div>,
    document.body
  );
};

export default MessageContextMenu;
