import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import {
  Layout,
  FolderKanban,
  MessageSquare,
  BarChart3,
  Bell,
  Lightbulb,
  Zap,
  CheckSquare,
  Calendar,
  Users,
  Sparkles,
} from 'lucide-react';
import { useSettingsStore } from '@stores/settingsStore';

// ─── Inject keyframes once ────────────────────────────────────────────
const STYLE_ID = 'tip-keyframes';
if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes tip-fade-in {
      from { opacity: 0; transform: translateY(4px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    .tip-enter { animation: tip-fade-in 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

    @keyframes tip-pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.4); }
      50%      { box-shadow: 0 0 0 6px rgba(139, 92, 246, 0); }
    }
    .tip-beacon { animation: tip-pulse 2s ease-in-out infinite; }
  `;
  document.head.appendChild(style);
}

// ─── Positions ────────────────────────────────────────────────────────
type TipPosition = 'top' | 'bottom' | 'left' | 'right';

// ─── Tip Component (portal-based, never clipped) ──────────────────────
interface TipProps {
  content: string;
  position?: TipPosition;
  children: React.ReactNode;
  forceShow?: boolean;
  beacon?: boolean;
}

// ─── Mobile toast state (shared across all Tip instances) ────────────
let mobileToastTimeout: ReturnType<typeof setTimeout> | null = null;
let setMobileToastGlobal: ((msg: string | null) => void) | null = null;

export const MobileToastProvider: React.FC = () => {
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    setMobileToastGlobal = setToast;
    return () => { setMobileToastGlobal = null; };
  }, []);

  if (!toast) return null;

  return createPortal(
    <div
      className="tip-enter pointer-events-none fixed top-24 left-4 right-4 z-[9999] flex justify-center"
    >
      <div className={clsx(
        'px-4 py-3 rounded-xl shadow-lg',
        'bg-purple-600',
        'text-white text-sm font-medium',
        'max-w-sm text-center leading-relaxed',
      )}>
        {toast}
      </div>
    </div>,
    document.body
  );
};

export const showMobileToast = (msg: string) => {
  if (mobileToastTimeout) clearTimeout(mobileToastTimeout);
  setMobileToastGlobal?.(msg);
  mobileToastTimeout = setTimeout(() => {
    setMobileToastGlobal?.(null);
  }, 2500);
};

// Detect mobile via viewport width
const isMobileViewport = () => typeof window !== 'undefined' && window.innerWidth < 768;

export const Tip: React.FC<TipProps> = ({
  content,
  position = 'top',
  children,
  forceShow = false,
  beacon = false,
}) => {
  const showTips = useSettingsStore((s) => s.showTips);
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isActive = showTips && (forceShow || hovered);

  const computePosition = useCallback(() => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const gap = 8;

    let top = 0;
    let left = 0;

    switch (position) {
      case 'top':
        top = rect.top - gap;
        left = rect.left + rect.width / 2;
        break;
      case 'bottom':
        top = rect.bottom + gap;
        left = rect.left + rect.width / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2;
        left = rect.left - gap;
        break;
      case 'right':
        top = rect.top + rect.height / 2;
        left = rect.right + gap;
        break;
    }

    setCoords({ top, left });
  }, [position]);

  useEffect(() => {
    if (isActive && !isMobileViewport()) {
      timeoutRef.current = setTimeout(() => {
        computePosition();
        setVisible(true);
      }, forceShow ? 0 : 400);
    } else {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setVisible(false);
      setCoords(null);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isActive, forceShow, computePosition]);

  // Clamp tooltip to viewport after it renders
  useEffect(() => {
    if (!visible || !coords || !tooltipRef.current) return;
    const tt = tooltipRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let { top, left } = coords;
    let changed = false;

    if (position === 'right' && left + tt.width > vw - 8) { left = vw - tt.width - 8; changed = true; }
    if ((position === 'left') && left - tt.width < 8) { left = 8 + tt.width; changed = true; }
    if ((position === 'top' || position === 'bottom') && left - tt.width / 2 < 8) { left = 8 + tt.width / 2; changed = true; }
    if ((position === 'top' || position === 'bottom') && left + tt.width / 2 > vw - 8) { left = vw - 8 - tt.width / 2; changed = true; }
    if (position === 'top' && top - tt.height < 8) { top = 8 + tt.height; changed = true; }
    if (position === 'bottom' && top + tt.height > vh - 8) { top = vh - 8 - tt.height; changed = true; }

    if (changed) setCoords({ top, left });
  }, [visible, coords, position]);

  if (!showTips && !forceShow) {
    return <>{children}</>;
  }

  const transformOrigin: Record<TipPosition, string> = {
    top: 'translate(-50%, -100%)',
    bottom: 'translate(-50%, 0)',
    left: 'translate(-100%, -50%)',
    right: 'translate(0, -50%)',
  };

  const arrowStyle: Record<TipPosition, React.CSSProperties> = {
    top: { bottom: -9, left: '50%', transform: 'translateX(-50%)', borderWidth: 5, borderColor: 'rgb(147 51 234) transparent transparent transparent' },
    bottom: { top: -9, left: '50%', transform: 'translateX(-50%)', borderWidth: 5, borderColor: 'transparent transparent rgb(147 51 234) transparent' },
    left: { right: -9, top: '50%', transform: 'translateY(-50%)', borderWidth: 5, borderColor: 'transparent transparent transparent rgb(147 51 234)' },
    right: { left: -9, top: '50%', transform: 'translateY(-50%)', borderWidth: 5, borderColor: 'transparent rgb(147 51 234) transparent transparent' },
  };

  // On mobile: render children with zero wrapper interference.
  // Tips are shown as toasts via a global provider (rendered once in the tree).
  if (isMobileViewport()) {
    return <>{children}</>;
  }

  return (
    <div
      ref={wrapperRef}
      className="relative inline-flex"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}

      {/* Beacon indicator */}
      {beacon && showTips && !hovered && (
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-purple-500 tip-beacon z-10" />
      )}

      {/* Tooltip via portal — renders on <body>, never clipped */}
      {visible && coords && createPortal(
        <div
          ref={tooltipRef}
          className="tip-enter pointer-events-none"
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            transform: transformOrigin[position],
            zIndex: 9999,
          }}
        >
          <div className={clsx(
            'relative px-3 py-2 rounded-lg shadow-lg',
            'bg-purple-600',
            'text-white text-xs font-medium',
            'max-w-[240px]',
          )}>
            <span className="leading-relaxed">{content}</span>
            <span className="absolute w-0 h-0" style={{ ...arrowStyle[position], borderStyle: 'solid' }} />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

// ─── Welcome Tips Modal (shown on first login) ───────────────────────
interface WelcomeTip {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const welcomeTips: WelcomeTip[] = [
  {
    icon: <Layout size={20} />,
    title: 'Kanban Board',
    description: 'Drag and drop tasks between columns to update their status. Use the view switcher to toggle between Kanban, List, Calendar, and Timeline views.',
  },
  {
    icon: <FolderKanban size={20} />,
    title: 'Projects',
    description: 'Organise tasks into projects. Managers can reassign tasks, and members can add project tasks to their personal board.',
  },
  {
    icon: <MessageSquare size={20} />,
    title: 'Team Chat',
    description: 'Message your team directly, discuss tasks in context, or check announcements. Dock chats for quick access.',
  },
  {
    icon: <BarChart3 size={20} />,
    title: 'Analytics',
    description: 'Track your productivity score, completion trends, and team velocity. AI insights help you stay on top of bottlenecks.',
  },
  {
    icon: <Bell size={20} />,
    title: 'Smart Notifications',
    description: 'Get notified about assignments, due dates, and mentions. Customise what you receive in Settings → Notifications.',
  },
  {
    icon: <Lightbulb size={20} />,
    title: 'Hover Tips',
    description: 'Look for pulsing dots and hover over UI elements for helpful tips. You can toggle tips on/off anytime in Settings → General.',
  },
];

export const WelcomeTipsModal: React.FC = () => {
  const { showWelcomeModal, closeWelcomeModal } = useSettingsStore();
  const [currentPage, setCurrentPage] = useState(0);

  if (!showWelcomeModal) return null;

  const tipsPerPage = 3;
  const pages = Math.ceil(welcomeTips.length / tipsPerPage);
  const pageTips = welcomeTips.slice(currentPage * tipsPerPage, (currentPage + 1) * tipsPerPage);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center" onClick={closeWelcomeModal}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className={clsx(
          'relative w-full max-w-lg mx-4',
          'bg-white dark:bg-slate-800 rounded-2xl shadow-2xl',
          'border border-gray-200 dark:border-slate-700',
          'tip-enter'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white">
              <Zap size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">Welcome to Purple Bee!</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400">Here are some tips to get you started</p>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="px-6 pb-4 space-y-3">
          {pageTips.map((tip, i) => (
            <div
              key={i}
              className={clsx(
                'flex items-start gap-3.5 p-4 rounded-xl',
                'bg-gray-50 dark:bg-slate-700/40',
                'border border-gray-100 dark:border-slate-700/50'
              )}
            >
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                {tip.icon}
              </div>
              <div className="pt-0.5">
                <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{tip.title}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 leading-relaxed">{tip.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-between">
          {/* Page dots */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: pages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className={clsx(
                  'h-2 rounded-full transition-all',
                  i === currentPage
                    ? 'bg-purple-500 w-5'
                    : 'bg-gray-300 dark:bg-slate-600 hover:bg-gray-400 w-2'
                )}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {currentPage > 0 && (
              <button
                onClick={() => setCurrentPage((p) => p - 1)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              >
                Back
              </button>
            )}
            {currentPage < pages - 1 ? (
              <button
                onClick={() => setCurrentPage((p) => p + 1)}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:shadow-lg hover:shadow-purple-500/25 transition-all"
              >
                Next
              </button>
            ) : (
              <button
                onClick={closeWelcomeModal}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:shadow-lg hover:shadow-purple-500/25 transition-all"
              >
                Get Started
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
