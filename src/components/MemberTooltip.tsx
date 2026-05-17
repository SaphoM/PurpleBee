import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import clsx from 'clsx';
import { TaskCollaborator } from '@/types/index';
import {
  UserPlus, X, Timer, UserMinus,
} from 'lucide-react';
import { teamProfiles } from '@stores/userStore';
import { useSettingsStore } from '@stores/settingsStore';

// ── Time allocation presets ───────────────────────────────────────────
const timePresets = [15, 30, 45, 60, 90, 120];
const formatMinutes = (m: number) => (m >= 60 ? `${m / 60}h` : `${m}m`);

export interface MemberInfo {
  id: string;
  name: string;
  avatar: string;
  role: 'owner' | 'helper' | 'reviewer' | 'member';
  allocatedMinutes?: number;
}

interface MemberTooltipProps {
  /** All current members (owner + collaborators) */
  members: MemberInfo[];
  /** Collaborator data for showing time allocations */
  collaborators?: TaskCollaborator[];
  /** Called when a team member is invited */
  onInvite?: (profile: typeof teamProfiles[0], role: 'helper' | 'reviewer', minutes: number) => void;
  /** Called when a collaborator is removed */
  onRemove?: (userId: string) => void;
  /** IDs to exclude from the invitable list (e.g. assignedTo) */
  excludeIds?: string[];
  /** Whether invite functionality is available */
  canInvite?: boolean;
}

export const MemberTooltip: React.FC<MemberTooltipProps> = ({
  members,
  collaborators = [],
  onInvite,
  onRemove,
  excludeIds = [],
  canInvite = true,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [showInvitePanel, setShowInvitePanel] = useState(false);
  const [selectedTime, setSelectedTime] = useState<Record<string, number>>({});
  const [inviteRole, setInviteRole] = useState<'helper' | 'reviewer'>('helper');
  const [panelPos, setPanelPos] = useState<{ top: number; left: number; openUp: boolean } | null>(null);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const tooltipTimeout = useRef<ReturnType<typeof setTimeout>>();
  const keepMockData = useSettingsStore((s) => s.keepMockData);

  const invitableMembers = keepMockData && canInvite
    ? teamProfiles.filter(
        (p) =>
          !excludeIds.includes(p.id) &&
          !collaborators.some((c) => c.userId === p.id) &&
          !members.some((m) => m.id === p.id)
      )
    : [];

  // Position the portal panel relative to the anchor button
  const updatePosition = useCallback(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const panelHeight = 400; // estimated
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < panelHeight && rect.top > panelHeight;

    // Anchor panel right edge to avatar button right edge
    const panelWidth = 288; // w-72 = 18rem = 288px
    let left = rect.right - panelWidth;
    // Clamp: don't go off-screen left or right
    if (left < 8) left = 8;
    if (left + panelWidth > window.innerWidth - 8) left = window.innerWidth - panelWidth - 8;

    setPanelPos({
      top: openUp ? rect.top : rect.bottom + 8,
      left,
      openUp,
    });
  }, []);

  useEffect(() => {
    if (showInvitePanel) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [showInvitePanel, updatePosition]);

  // Click outside to close the panel
  useEffect(() => {
    if (!showInvitePanel) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) {
        setShowInvitePanel(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showInvitePanel]);

  const handleInvite = (profile: typeof teamProfiles[0]) => {
    const minutes = selectedTime[profile.id] || 30;
    onInvite?.(profile, inviteRole, minutes);
    setSelectedTime((prev) => {
      const next = { ...prev };
      delete next[profile.id];
      return next;
    });
  };

  const memberCount = members.length;

  return (
    <div className="relative">
      {/* Avatar stack — hover for tooltip, click for invite */}
      <button
        ref={anchorRef}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setShowInvitePanel(!showInvitePanel);
          setShowTooltip(false);
        }}
        onMouseEnter={() => {
          clearTimeout(tooltipTimeout.current);
          if (!showInvitePanel) setShowTooltip(true);
        }}
        onMouseLeave={() => {
          tooltipTimeout.current = setTimeout(() => setShowTooltip(false), 150);
        }}
        className="flex items-center -space-x-1.5 group/avatars"
      >
        {members.slice(0, 4).map((member, i) => (
          <img
            key={member.id}
            src={member.avatar}
            alt={member.name}
            className={clsx(
              'w-6 h-6 rounded-full ring-2 ring-white dark:ring-slate-800 object-cover',
              'transition-transform group-hover/avatars:scale-110',
            )}
            style={{ zIndex: members.length - i }}
          />
        ))}
        {members.length > 4 && (
          <span className="w-6 h-6 rounded-full bg-gray-200 dark:bg-slate-600 ring-2 ring-white dark:ring-slate-800 flex items-center justify-center text-[9px] font-bold text-gray-500 dark:text-slate-300">
            +{members.length - 4}
          </span>
        )}
        {/* Invite "+" hint */}
        {canInvite && onInvite && (
          <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/30 ring-2 ring-white dark:ring-slate-800 flex items-center justify-center opacity-0 group-hover/avatars:opacity-100 transition-opacity">
            <UserPlus size={10} className="text-purple-500 dark:text-purple-400" />
          </span>
        )}
      </button>

      {/* ── Hover Tooltip ── */}
      {showTooltip && !showInvitePanel && (
        <div
          className={clsx(
            'absolute bottom-full right-0 mb-2 z-[60]',
            'bg-gray-900 dark:bg-slate-700 text-white',
            'rounded-lg shadow-xl py-2 px-3 min-w-[160px]',
          )}
        >
          <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-slate-400 mb-1.5 font-semibold">
            {memberCount === 1 ? 'Assigned to' : `${memberCount} members`}
          </p>
          {members.map((member) => (
            <div key={member.id} className="flex items-center gap-2 py-1">
              <img src={member.avatar} alt="" className="w-5 h-5 rounded-full" />
              <span className="text-xs font-medium truncate">{member.name}</span>
              <span className={clsx(
                'ml-auto text-[9px] px-1.5 py-0.5 rounded-full font-medium',
                member.role === 'owner'
                  ? 'bg-purple-500/20 text-purple-300'
                  : member.role === 'member'
                  ? 'bg-green-500/20 text-green-300'
                  : member.role === 'helper'
                  ? 'bg-blue-500/20 text-blue-300'
                  : 'bg-amber-500/20 text-amber-300'
              )}>
                {member.role === 'owner' ? 'Owner' : member.role === 'member' ? 'Member' : member.role === 'helper' ? 'Helper' : 'Reviewer'}
              </span>
            </div>
          ))}
          {/* Tooltip arrow */}
          <div className="absolute -bottom-1 right-4 w-2 h-2 bg-gray-900 dark:bg-slate-700 rotate-45" />
        </div>
      )}

      {/* ── Invite / Manage Collaborators Panel (Portal) ── */}
      {showInvitePanel && panelPos && ReactDOM.createPortal(
        <div
          ref={panelRef}
          className={clsx(
            'fixed z-[9999] w-72',
            'bg-white dark:bg-slate-800',
            'border border-gray-200 dark:border-slate-700',
            'rounded-xl shadow-2xl overflow-hidden',
          )}
          style={{
            top: panelPos.openUp ? undefined : panelPos.top,
            bottom: panelPos.openUp ? window.innerHeight - panelPos.top + 8 : undefined,
            left: panelPos.left,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-4 pt-3 pb-2 border-b border-gray-100 dark:border-slate-700/50 flex items-center justify-between">
            <div>
              <h5 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                Task Members
              </h5>
              <p className="text-[10px] text-gray-400 dark:text-slate-500">
                Invite others to collaborate
              </p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setShowInvitePanel(false); }}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              <X size={14} className="text-gray-400" />
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {/* Current members */}
            <div className="px-4 py-2">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-slate-500 font-semibold mb-1">
                Current ({members.length})
              </p>
              {members.map((member) => {
                const collab = collaborators.find((c) => c.userId === member.id);
                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-2 py-1.5 group/member"
                  >
                    <img src={member.avatar} alt="" className="w-6 h-6 rounded-full" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 dark:text-slate-200 truncate">
                        {member.name}
                      </p>
                      <div className="flex items-center gap-1">
                        <span className={clsx(
                          'text-[9px] font-medium',
                          member.role === 'owner' ? 'text-purple-500' :
                          member.role === 'member' ? 'text-green-500' :
                          member.role === 'helper' ? 'text-blue-500' : 'text-amber-500'
                        )}>
                          {member.role === 'owner' ? 'Owner' : member.role === 'member' ? 'Member' : member.role === 'helper' ? 'Helper' : 'Reviewer'}
                        </span>
                        {collab?.allocatedMinutes && (
                          <span className="text-[9px] text-gray-400 dark:text-slate-500 flex items-center gap-0.5">
                            <Timer size={8} /> {formatMinutes(collab.allocatedMinutes)}
                          </span>
                        )}
                      </div>
                    </div>
                    {member.role !== 'owner' && onRemove && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onRemove(member.id); }}
                        className="p-1 rounded-lg opacity-0 group-hover/member:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                        title="Remove"
                      >
                        <UserMinus size={12} className="text-red-400" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Invite new members */}
            {invitableMembers.length > 0 && onInvite && (
              <div className="px-4 py-2 border-t border-gray-100 dark:border-slate-700/50">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-slate-500 font-semibold">
                    Invite
                  </p>
                  {/* Role toggle */}
                  <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-700/50 rounded-full p-0.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); setInviteRole('helper'); }}
                      className={clsx(
                        'text-[9px] font-medium px-2 py-0.5 rounded-full transition-colors',
                        inviteRole === 'helper'
                          ? 'bg-blue-500 text-white'
                          : 'text-gray-500 dark:text-slate-400'
                      )}
                    >
                      Helper
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setInviteRole('reviewer'); }}
                      className={clsx(
                        'text-[9px] font-medium px-2 py-0.5 rounded-full transition-colors',
                        inviteRole === 'reviewer'
                          ? 'bg-amber-500 text-white'
                          : 'text-gray-500 dark:text-slate-400'
                      )}
                    >
                      Reviewer
                    </button>
                  </div>
                </div>

                {invitableMembers.map((profile) => (
                  <div
                    key={profile.id}
                    className="flex items-center gap-2 py-1.5"
                  >
                    <img
                      src={profile.avatar}
                      alt=""
                      className="w-6 h-6 rounded-full"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 dark:text-slate-300 truncate">
                        {profile.name}
                      </p>
                      <p className="text-[9px] text-gray-400 dark:text-slate-500">
                        {profile.title}
                      </p>
                    </div>

                    {/* Time selector */}
                    <select
                      onClick={(e) => e.stopPropagation()}
                      value={selectedTime[profile.id] || 30}
                      onChange={(e) => {
                        e.stopPropagation();
                        setSelectedTime((prev) => ({
                          ...prev,
                          [profile.id]: Number(e.target.value),
                        }));
                      }}
                      className="text-[10px] w-14 py-0.5 px-1 rounded border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-600 dark:text-slate-300"
                    >
                      {timePresets.map((t) => (
                        <option key={t} value={t}>
                          {formatMinutes(t)}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={(e) => { e.stopPropagation(); handleInvite(profile); }}
                      className={clsx(
                        'flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all',
                        'bg-purple-100 text-purple-700 hover:bg-purple-200',
                        'dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50',
                      )}
                    >
                      <UserPlus size={10} />
                      Invite
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer hint */}
          <div className="px-4 py-2 bg-gray-50 dark:bg-slate-800/80 border-t border-gray-100 dark:border-slate-700/50">
            <p className="text-[9px] text-gray-400 dark:text-slate-500 flex items-center gap-1">
              <Timer size={9} />
              Each member allocates time from their own task manager
            </p>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
