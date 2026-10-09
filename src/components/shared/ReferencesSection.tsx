import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { v4 as uuidv4 } from 'uuid';
import { formatDistanceToNow } from 'date-fns';
import {
  Paperclip, Upload, Link2, ExternalLink, Download, Trash2, X,
  File, FileImage, FileVideo,
} from 'lucide-react';
import type { Attachment, TaskLink } from '@/types/index';
import { detectLinkType, linkCategoryOptions, linkTypeEmoji, formatFileSize, fileToDataUrl, MAX_ATTACHMENT_BYTES } from '@/lib/references';

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return <FileImage size={18} className="text-purple-500" />;
  if (type.startsWith('video/')) return <FileVideo size={18} className="text-blue-500" />;
  return <File size={18} className="text-gray-500 dark:text-slate-400" />;
};

const getLinkIcon = (type: TaskLink['type']) => {
  const emoji = linkTypeEmoji(type);
  if (emoji) return <span className="text-sm">{emoji}</span>;
  return <Link2 size={14} className="text-blue-500" />;
};

interface ReferencesSectionProps {
  attachments: Attachment[];
  onAttachmentsChange: (next: Attachment[]) => void;
  links: TaskLink[];
  onLinksChange: (next: TaskLink[]) => void;
  /** Section label — default matches the existing Task Attachments & Links wording. */
  title?: string;
  emptyHint?: string;
  /** Enable clipboard-image paste while this component is mounted. Off by default for buffered (not-yet-saved) forms so a stray paste elsewhere on the page doesn't silently attach a file. */
  enablePaste?: boolean;
  currentUserId?: string;
  currentUserName?: string;
  className?: string;
}

/**
 * Controlled Attachments & Links manager — the single implementation shared
 * across Create/Edit Project, Project Detail, Create Task, and Task Detail.
 * Stores files as data: URLs (not blob: URLs) so they survive a Postgres
 * JSONB round-trip and reload, mirroring the Company Logo upload's existing
 * FileReader.readAsDataURL + size-cap pattern.
 */
export const ReferencesSection: React.FC<ReferencesSectionProps> = ({
  attachments,
  onAttachmentsChange,
  links,
  onLinksChange,
  title = 'Attachments & Links',
  emptyHint = 'Attach docs, images/screenshots, or reference links (discovery meetings, requirements, wireframes, Figma, GitHub, Drive, and more)',
  enablePaste = true,
  currentUserId,
  currentUserName,
  className,
}) => {
  const [showAddLink, setShowAddLink] = useState(false);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkCategory, setLinkCategory] = useState<'auto' | TaskLink['type']>('auto');
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [lightboxAttachment, setLightboxAttachment] = useState<Attachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesAdded = async (files: File[] | FileList) => {
    const fileArray = Array.from(files);
    const oversized = fileArray.filter((f) => f.size > MAX_ATTACHMENT_BYTES);
    const accepted = fileArray.filter((f) => f.size <= MAX_ATTACHMENT_BYTES);
    setUploadError(oversized.length > 0 ? `${oversized.map((f) => f.name).join(', ')} exceed${oversized.length === 1 ? 's' : ''} the 5MB limit and ${oversized.length === 1 ? 'was' : 'were'} skipped.` : null);
    if (accepted.length === 0) return;

    const newAttachments: Attachment[] = await Promise.all(
      accepted.map(async (file) => {
        const dataUrl = await fileToDataUrl(file);
        return {
          id: uuidv4(),
          name: file.name,
          url: dataUrl,
          type: file.type,
          size: file.size,
          previewUrl: file.type.startsWith('image/') ? dataUrl : undefined,
          uploadedAt: new Date(),
          uploadedBy: currentUserId,
          uploadedByName: currentUserName,
        };
      })
    );
    onAttachmentsChange([...attachments, ...newAttachments]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    handleFilesAdded(files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    onAttachmentsChange(attachments.filter((a) => a.id !== attachmentId));
  };

  const handleAddLink = () => {
    if (!linkUrl.trim()) return;
    const newLink: TaskLink = {
      id: uuidv4(),
      title: linkTitle.trim() || linkUrl.trim(),
      url: linkUrl.trim().startsWith('http') ? linkUrl.trim() : `https://${linkUrl.trim()}`,
      type: linkCategory === 'auto' ? detectLinkType(linkUrl.trim()) : linkCategory,
      addedAt: new Date(),
    };
    onLinksChange([...links, newLink]);
    setLinkTitle('');
    setLinkUrl('');
    setLinkCategory('auto');
    setShowAddLink(false);
  };

  const handleRemoveLink = (linkId: string) => {
    onLinksChange(links.filter((l) => l.id !== linkId));
  };

  // Clipboard-paste upload — active only while this component is mounted
  useEffect(() => {
    if (!enablePaste) return;
    const handlePaste = (e: ClipboardEvent) => {
      const files = e.clipboardData?.files;
      if (files && files.length > 0) {
        const images = Array.from(files).filter((f) => f.type.startsWith('image/'));
        if (images.length > 0) handleFilesAdded(images);
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enablePaste, attachments]);

  const imageAttachments = attachments.filter((a) => a.type.startsWith('image/'));
  const fileAttachments = attachments.filter((a) => !a.type.startsWith('image/'));

  return (
    <div
      className={clsx(
        'rounded-b-xl transition-colors',
        isDragOver && 'ring-2 ring-purple-300 dark:ring-purple-700/50 bg-purple-50/40 dark:bg-purple-900/10',
        className
      )}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Paperclip size={12} />
          {title}
        </h4>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAddLink(!showAddLink)}
            className={clsx(
              'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
              showAddLink
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700/50 dark:text-slate-300 dark:hover:bg-slate-700'
            )}
          >
            <Link2 size={12} />
            Add Link
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50 transition-colors"
          >
            <Upload size={12} />
            Upload
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.csv,.json,.md"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      {uploadError && (
        <p className="mb-2 text-[11px] text-red-500 dark:text-red-400">{uploadError}</p>
      )}

      {/* Add Link form */}
      {showAddLink && (
        <div className="mb-3 p-3 bg-white dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-slate-700/50">
          <div className="space-y-2">
            <input
              type="text"
              value={linkTitle}
              onChange={(e) => setLinkTitle(e.target.value)}
              placeholder="Link title (optional)"
              className={clsx(
                'w-full rounded-lg px-3 py-2 text-sm',
                'bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400',
                'dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500',
                'focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
              )}
            />
            <div className="flex gap-2">
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.repeat) { e.preventDefault(); handleAddLink(); } }}
                placeholder="https://..."
                className={clsx(
                  'flex-1 rounded-lg px-3 py-2 text-sm',
                  'bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400',
                  'dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500',
                  'focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                )}
                autoFocus
              />
              <button
                type="button"
                onClick={handleAddLink}
                disabled={!linkUrl.trim()}
                className={clsx(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  linkUrl.trim()
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-300 dark:bg-slate-700/30 dark:text-slate-600 cursor-not-allowed'
                )}
              >
                Add
              </button>
            </div>
            <select
              value={linkCategory}
              onChange={(e) => setLinkCategory(e.target.value as typeof linkCategory)}
              title="Reference category — auto-detected from the URL by default"
              className={clsx(
                'w-full rounded-lg px-3 py-1.5 text-xs',
                'bg-gray-50 border border-gray-200 text-gray-600',
                'dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-300',
                'focus:outline-none focus:border-purple-500 cursor-pointer'
              )}
            >
              <option value="auto">Category: Auto-detect from URL</option>
              {linkCategoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>Category: {opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Links list */}
      {links.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {links.map((link) => (
            <div
              key={link.id}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/60 hover:bg-white dark:bg-slate-800/30 dark:hover:bg-slate-800/50 group transition-colors"
            >
              <span className="flex-shrink-0">{getLinkIcon(link.type)}</span>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex-1 text-sm text-blue-600 dark:text-blue-400 hover:underline truncate font-medium"
              >
                {link.title}
              </a>
              <ExternalLink size={12} className="text-gray-400 dark:text-slate-500 flex-shrink-0" />
              <button
                type="button"
                onClick={() => handleRemoveLink(link.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 transition-all flex-shrink-0"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Uploaded files */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          {imageAttachments.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
              {imageAttachments.map((attachment) => (
                <div
                  key={attachment.id}
                  onClick={() => setLightboxAttachment(attachment)}
                  className="relative group rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700/50 aspect-square cursor-pointer"
                >
                  <img
                    src={attachment.previewUrl || attachment.url}
                    alt={attachment.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 bg-white/90 rounded-lg text-gray-700 hover:bg-white transition-colors"
                    >
                      <ExternalLink size={14} />
                    </a>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleRemoveAttachment(attachment.id); }}
                      className="p-1.5 bg-white/90 rounded-lg text-red-500 hover:bg-white transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1">
                    <p className="text-[10px] text-white truncate">{attachment.name}</p>
                    {attachment.uploadedByName && (
                      <p className="text-[9px] text-white/70 truncate">
                        {attachment.uploadedByName} · {formatDistanceToNow(new Date(attachment.uploadedAt), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {fileAttachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-white/60 hover:bg-white dark:bg-slate-800/30 dark:hover:bg-slate-800/50 group transition-colors"
            >
              {getFileIcon(attachment.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 dark:text-slate-300 truncate">
                  {attachment.name}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-slate-500">
                  {formatFileSize(attachment.size)}
                  {attachment.uploadedByName && (
                    <> · {attachment.uploadedByName} · {formatDistanceToNow(new Date(attachment.uploadedAt), { addSuffix: true })}</>
                  )}
                </p>
              </div>
              <a
                href={attachment.url}
                download={attachment.name}
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 text-gray-400 hover:text-blue-500 dark:text-slate-500 dark:hover:text-blue-400 transition-colors"
              >
                <Download size={14} />
              </a>
              <button
                type="button"
                onClick={() => handleRemoveAttachment(attachment.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 transition-all"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {attachments.length === 0 && links.length === 0 && !showAddLink && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className={clsx(
            'border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors',
            'border-gray-200 hover:border-purple-300 hover:bg-purple-50/30',
            'dark:border-slate-700 dark:hover:border-purple-700/50 dark:hover:bg-purple-900/10'
          )}
        >
          <Upload size={20} className="mx-auto mb-1.5 text-gray-300 dark:text-slate-600" />
          <p className="text-xs text-gray-400 dark:text-slate-500">
            Drop files here{enablePaste ? ', paste, or ' : ' or '}<span className="text-purple-600 dark:text-purple-400 font-medium">browse</span>
          </p>
          <p className="text-[10px] text-gray-300 dark:text-slate-600 mt-0.5">{emptyHint}</p>
        </div>
      )}

      {lightboxAttachment && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-6"
          onClick={() => setLightboxAttachment(null)}
        >
          <button
            onClick={() => setLightboxAttachment(null)}
            className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <X size={20} />
          </button>
          <img
            src={lightboxAttachment.previewUrl || lightboxAttachment.url}
            alt={lightboxAttachment.name}
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-full object-contain rounded-lg"
          />
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/70">{lightboxAttachment.name}</p>
        </div>
      )}
    </div>
  );
};
