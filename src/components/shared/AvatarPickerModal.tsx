import React, { useRef, useState } from 'react';
import clsx from 'clsx';
import { X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { authDb } from '@/lib/dataService';
import { RAW_IMAGE_LIMIT_BYTES } from '@/lib/image';
import { FEMALE_AVATAR_PRESETS, MALE_AVATAR_PRESETS } from '@/lib/avatarPresets';
import { useUserStore } from '@stores/userStore';
import { useToastStore } from '@components/Toast';

/**
 * Profile-picture picker: the built-in avatar presets (24 female + 24 male,
 * grouped in two sections) with a "Choose image" button underneath for
 * uploading your own photo.
 *
 * Self-contained: presets apply straight to profiles.avatar via
 * updateMyAvatar, uploads go through the exact same
 * authDb.uploadAvatar → updateMyAvatar flow the old inline file inputs
 * used. Opened by the Chat/Team camera badge (ChangeOwnAvatarBadge) and
 * Settings → Account, so every entry point behaves identically.
 *
 * z-[120] so it stacks above every modal that can open it (Team profile
 * modal is z-50).
 */
export const AvatarPickerModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { user, updateMyAvatar } = useUserStore();
  const { addToast } = useToastStore();
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const applyAvatar = async (avatarUrl: string) => {
    await updateMyAvatar(avatarUrl);
    addToast({ type: 'success', title: 'Profile picture updated', message: 'Your new photo now shows everywhere in PurpleBee', duration: 4000 });
  };

  const handlePreset = async (preset: string) => {
    if (!user || busy) return;
    setBusy(true);
    await applyAvatar(preset);
    setBusy(false);
    onClose();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user || busy) return;
    if (!file.type.startsWith('image/')) {
      addToast({ type: 'error', title: 'Not an image', message: 'Please choose an image file', duration: 4000 });
      return;
    }
    if (file.size > RAW_IMAGE_LIMIT_BYTES) {
      addToast({ type: 'error', title: 'File too large', message: 'Photos must be under 15 MB — big camera photos are resized automatically', duration: 4000 });
      return;
    }
    setBusy(true);
    // uploadAvatar center-crops to a square 512px JPEG and rejects formats
    // the browser cannot decode, so the avatar always renders afterwards.
    const url = await authDb.uploadAvatar(user.id, file);
    if (url) {
      await applyAvatar(url);
      onClose();
    } else {
      addToast({ type: 'error', title: 'Upload failed', message: 'Could not read that photo — please try a JPG or PNG under 15 MB', duration: 5000 });
    }
    setBusy(false);
  };

  const renderSection = (title: string, presets: string[]) => (
    <div>
      <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
        {title}
      </h4>
      <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
        {presets.map((preset, i) => (
          <button
            key={i}
            type="button"
            disabled={busy}
            onClick={() => handlePreset(preset)}
            title="Use this avatar"
            aria-label={`Use ${title.toLowerCase()} preset ${i + 1}`}
            className={clsx(
              'relative aspect-square overflow-hidden rounded-full ring-2 transition-transform hover:scale-105',
              'focus:outline-none focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800',
              'disabled:opacity-60',
              user?.avatar === preset
                ? 'ring-purple-500'
                : 'ring-transparent hover:ring-purple-300 dark:hover:ring-purple-600',
            )}
          >
            <img src={preset} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Change profile picture"
    >
      <div className="fixed inset-0 bg-black/50" />
      <div
        onClick={(e) => e.stopPropagation()}
        className={clsx(
          'relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl shadow-2xl',
          'border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800',
        )}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 pb-3 pt-4 dark:border-slate-700/60">
          <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100">Change profile picture</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto px-5 py-4">
          {renderSection('Female avatars', FEMALE_AVATAR_PRESETS)}
          {renderSection('Male avatars', MALE_AVATAR_PRESETS)}
        </div>

        <div className="border-t border-gray-100 px-5 pb-4 pt-3 dark:border-slate-700/60">
          <button
            type="button"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
            className={clsx(
              'flex w-full items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-2.5',
              'text-sm font-medium transition-colors',
              'border-gray-300 text-gray-700 hover:border-purple-400 hover:bg-purple-50/50 hover:text-purple-600',
              'dark:border-slate-600 dark:text-slate-200 dark:hover:border-purple-500 dark:hover:bg-purple-900/10 dark:hover:text-purple-400',
              busy && 'pointer-events-none opacity-60',
            )}
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : <ImageIcon size={15} />}
            Choose image
          </button>
          <p className="mt-1.5 text-center text-[11px] text-gray-400 dark:text-slate-500">
            Upload your own photo — it's automatically cropped to a square
          </p>
          <input ref={fileInputRef} type="file" accept="image/*" className="sr-only" onChange={handleFile} />
        </div>
      </div>
    </div>
  );
};
