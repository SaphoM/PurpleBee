/**
 * references.ts — shared helpers for Attachments & Links, used by every
 * surface that manages Project References or Task References (Create/Edit
 * Project, Project Detail, Create Task, Task Detail). Single source of
 * truth for link-type detection/icons so the categories can't drift apart
 * between surfaces again.
 */
import type { TaskLink } from '@/types/index';

export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5MB per file

/** Reads a File as a data: URL so it survives a Postgres JSONB round-trip
 *  (unlike URL.createObjectURL, which only resolves within the tab that
 *  created it). Mirrors the existing Company Logo upload pattern. */
export const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const detectLinkType = (url: string): TaskLink['type'] => {
  if (url.includes('figma.com')) return 'figma';
  if (url.includes('github.com')) return 'github';
  if (url.includes('notion.so') || url.includes('notion.site')) return 'notion';
  if (url.includes('docs.google.com')) return 'google-doc';
  if (url.includes('drive.google.com')) return 'google-drive';
  if (url.includes('sharepoint.com')) return 'sharepoint';
  if (url.includes('onedrive.live.com') || url.includes('1drv.ms')) return 'onedrive';
  if (url.includes('loom.com')) return 'loom';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('vimeo.com')) return 'vimeo';
  return 'link';
};

// Categories a user can pick explicitly (Add Link form) — includes ones
// that can't be auto-detected from a URL alone (e.g. a Google Doc used as
// a requirements doc vs. a scope doc look identical to detectLinkType).
export const linkCategoryOptions: { value: TaskLink['type']; label: string }[] = [
  { value: 'discovery-meeting', label: 'Discovery Meeting' },
  { value: 'requirements', label: 'Requirements' },
  { value: 'scope-doc', label: 'Scope Document' },
  { value: 'wireframe', label: 'Wireframe' },
  { value: 'figma', label: 'Figma' },
  { value: 'github', label: 'GitHub' },
  { value: 'notion', label: 'Notion' },
  { value: 'google-doc', label: 'Google Doc' },
  { value: 'google-drive', label: 'Google Drive' },
  { value: 'sharepoint', label: 'SharePoint' },
  { value: 'onedrive', label: 'OneDrive' },
  { value: 'loom', label: 'Loom' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'vimeo', label: 'Vimeo' },
  { value: 'other', label: 'Other' },
];

export const linkTypeEmoji = (type: TaskLink['type']): string => {
  switch (type) {
    case 'figma': return '🎨';
    case 'github': return '🐙';
    case 'notion': return '📝';
    case 'google-doc': return '📄';
    case 'google-drive': return '🗂️';
    case 'sharepoint': return '📁';
    case 'onedrive': return '☁️';
    case 'loom': return '🎥';
    case 'youtube': return '▶️';
    case 'vimeo': return '🎬';
    case 'discovery-meeting': return '🗓️';
    case 'wireframe': return '📐';
    case 'requirements': return '📋';
    case 'scope-doc': return '📜';
    default: return '';
  }
};

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
