import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import clsx from 'clsx';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🔥', '👏', '🎉'];

/**
 * Quick reaction popup anchored to a message's hover "+" button.
 *
 * It renders into a portal with `position: fixed` and clamps itself to the
 * viewport. The previous inline `absolute` version hung off the message
 * bubble inside the scrolling message list, so on narrow screens (and inside
 * the small docked-chat windows) the container clipped the popup and some
 * emojis became unreachable.
 */
export const QuickReactionPicker: React.FC<{
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onPick: (emoji: string) => void;
  onClose: () => void;
  /** Which edge of the anchor button the picker aligns to. */
  align?: 'left' | 'right';
  /** md = full-size chat bubbles, sm = compact docked chats. */
  size?: 'md' | 'sm';
}> = ({ anchorRef, onPick, onClose, align = 'left', size = 'md' }) => {
  const pickerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // Measure and clamp into view. Runs after every paint; the functional
  // setPos keeps the previous object when the numbers are unchanged, so
  // it settles instead of looping. The first pass uses the estimated size
  // (nothing is rendered yet), the next one refines with real pixels.
  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const el = pickerRef.current;
    const w = el?.offsetWidth || (size === 'sm' ? 150 : 206);
    const h = el?.offsetHeight || (size === 'sm' ? 30 : 44);
    const gap = 8;
    const spaceBelow = window.innerHeight - rect.bottom;
    const rawTop = spaceBelow < h + gap + 12 ? rect.top - h - gap : rect.bottom + gap;
    const rawLeft = align === 'left' ? rect.left : rect.right - w;
    const next = {
      top: Math.min(Math.max(8, rawTop), Math.max(8, window.innerHeight - h - 8)),
      left: Math.min(Math.max(8, rawLeft), Math.max(8, window.innerWidth - w - 8)),
    };
    setPos((prev) => (prev && prev.top === next.top && prev.left === next.left ? prev : next));
  });

  // The popup is anchored to viewport coordinates — dismiss it when the
  // surrounding list scrolls or the window resizes underneath it.
  useEffect(() => {
    const close = () => onClose();
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [onClose]);

  if (!pos) return null;

  return ReactDOM.createPortal(
    <div
      ref={pickerRef}
      style={{ position: 'fixed', top: pos.top, left: pos.left }}
      className={clsx(
        'flex items-center rounded-full border shadow-lg z-[9999]',
        'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700',
        size === 'sm' ? 'gap-0.5 px-1 py-0.5' : 'gap-0.5 p-1',
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {QUICK_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={(e) => {
            e.stopPropagation();
            onPick(emoji);
          }}
          className={clsx(
            'flex items-center justify-center rounded-full transition-colors',
            'hover:bg-gray-100 dark:hover:bg-slate-700',
            size === 'sm' ? 'w-5 h-5 text-[10px]' : 'w-7 h-7 text-sm',
          )}
        >
          {emoji}
        </button>
      ))}
    </div>,
    document.body,
  );
};
