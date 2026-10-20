import React, { useState } from 'react';
import clsx from 'clsx';
import { Camera } from 'lucide-react';
import { authDb } from '@/lib/dataService';
import { RAW_IMAGE_LIMIT_BYTES } from '@/lib/image';
import { useUserStore } from '@stores/userStore';
import { useToastStore } from '@components/Toast';

/**
 * Small camera badge that lets a member change their OWN profile picture
 * anywhere their avatar is prominently shown (Chat "My status" circle,
 * Team profile modal). Settings → Account holds the full-size upload UI;
 * this is the same upload flow in 20px.
 *
 * Must be a SIBLING of any surrounding <button> (an <input> inside a
 * button is invalid HTML) — callers position it absolutely next to the
 * avatar, not nested inside the avatar button.
 */
export const ChangeOwnAvatarBadge: React.FC<{ className?: string }> = ({ className }) => {
  const [uploading, setUploading] = useState(false);
  const { user, updateMyAvatar } = useUserStore();
  const { addToast } = useToastStore();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) {
      addToast({ type: 'error', title: 'Not an image', message: 'Please choose an image file', duration: 4000 });
      return;
    }
    if (file.size > RAW_IMAGE_LIMIT_BYTES) {
      addToast({ type: 'error', title: 'File too large', message: 'Photos must be under 15 MB — big camera photos are resized automatically', duration: 4000 });
      return;
    }
    setUploading(true);
    // uploadAvatar downscales to a 512px JPEG and rejects formats the
    // browser cannot decode, so the avatar always renders afterwards.
    const url = await authDb.uploadAvatar(user.id, file);
    if (url) {
      await updateMyAvatar(url);
      addToast({ type: 'success', title: 'Profile picture updated', message: 'Your new photo now shows everywhere in PurpleBee', duration: 4000 });
    } else {
      addToast({ type: 'error', title: 'Upload failed', message: 'Could not read that photo — please try a JPG or PNG under 15 MB', duration: 5000 });
    }
    setUploading(false);
  };

  return (
    <label
      title="Change profile picture"
      aria-label="Change profile picture"
      onClick={(e) => e.stopPropagation()}
      className={clsx(
        'absolute z-10 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full',
        'border-2 border-white bg-gray-700 text-white shadow-sm transition-colors hover:bg-gray-900',
        'dark:border-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500',
        uploading && 'opacity-60 pointer-events-none',
        className,
      )}
    >
      <Camera size={11} />
      <input
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFile}
        disabled={uploading}
      />
    </label>
  );
};
