import React, { useState } from 'react';
import clsx from 'clsx';
import { Camera } from 'lucide-react';
import { AvatarPickerModal } from '@components/shared/AvatarPickerModal';

/**
 * Small camera badge that lets a member change their OWN profile picture
 * anywhere their avatar is prominently shown (Chat "My status" circle,
 * Team profile modal). Clicking it opens the shared AvatarPickerModal —
 * the preset avatar grid with a "Choose image" upload option below it —
 * so every entry point behaves the same (Settings → Account opens the
 * same modal). Uploads still go through authDb.uploadAvatar inside the
 * modal.
 *
 * Must be a SIBLING of any surrounding <button> — callers position it
 * absolutely next to the avatar, not nested inside the avatar button.
 */
export const ChangeOwnAvatarBadge: React.FC<{ className?: string }> = ({ className }) => {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        title="Change profile picture"
        aria-label="Change profile picture"
        onClick={(e) => {
          e.stopPropagation();
          setPickerOpen(true);
        }}
        className={clsx(
          'absolute z-10 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full',
          'border-2 border-white bg-gray-700 text-white shadow-sm transition-colors hover:bg-gray-900',
          'dark:border-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500',
          className,
        )}
      >
        <Camera size={11} />
      </button>
      <AvatarPickerModal isOpen={pickerOpen} onClose={() => setPickerOpen(false)} />
    </>
  );
};
