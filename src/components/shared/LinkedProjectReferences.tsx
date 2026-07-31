import React, { useState } from 'react';
import { FolderKanban, ChevronDown, ChevronUp, ExternalLink, Download } from 'lucide-react';
import { useProjectStore } from '@stores/projectStore';
import { linkTypeEmoji, formatFileSize } from '@/lib/references';
import type { TaskLink } from '@/types/index';

/**
 * Read-only "Intelligent Project Context" block — shown inside Create/Edit
 * Task surfaces when a project is selected. Surfaces the parent project's
 * References without ever copying files into the task, so Project
 * References and Task References stay structurally distinct.
 */
export const LinkedProjectReferences: React.FC<{ projectId?: string }> = ({ projectId }) => {
  const [expanded, setExpanded] = useState(false);
  const project = useProjectStore((s) => (projectId ? s.getProjectById(projectId) : undefined));

  if (!project) return null;
  const attachments = project.attachments || [];
  const links = project.links || [];
  if (attachments.length === 0 && links.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-800/20 p-3">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between group"
      >
        <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 flex items-center gap-1.5">
          <FolderKanban size={12} />
          From project: {project.name} ({attachments.length + links.length})
        </span>
        {expanded ? (
          <ChevronUp size={14} className="text-gray-400 dark:text-slate-500 group-hover:text-purple-500 transition-colors" />
        ) : (
          <ChevronDown size={14} className="text-gray-400 dark:text-slate-500 group-hover:text-purple-500 transition-colors" />
        )}
      </button>

      {expanded && (
        <div className="mt-2 space-y-1.5">
          {links.map((link: TaskLink) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/60 dark:bg-slate-800/30 hover:bg-white dark:hover:bg-slate-800/50 transition-colors"
            >
              <span className="text-sm flex-shrink-0">{linkTypeEmoji(link.type) || '🔗'}</span>
              <span className="flex-1 text-xs text-blue-600 dark:text-blue-400 truncate font-medium">{link.title}</span>
              <ExternalLink size={11} className="text-gray-400 dark:text-slate-500 flex-shrink-0" />
            </a>
          ))}
          {attachments.map((attachment) => (
            <a
              key={attachment.id}
              href={attachment.url}
              download={attachment.name}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/60 dark:bg-slate-800/30 hover:bg-white dark:hover:bg-slate-800/50 transition-colors"
            >
              <span className="flex-1 text-xs text-gray-600 dark:text-slate-300 truncate">{attachment.name}</span>
              <span className="text-[10px] text-gray-400 dark:text-slate-500 flex-shrink-0">{formatFileSize(attachment.size)}</span>
              <Download size={11} className="text-gray-400 dark:text-slate-500 flex-shrink-0" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
};
