import React from 'react';
import { FileText, Image as ImageIcon, FileSpreadsheet, File as FileIcon, X } from 'lucide-react';
import { fileKind, formatFileSize } from '@/lib/fileMeta';
import { cn } from '@/lib/utils';

export type AttachmentItem = File | { name: string; size?: number; url?: string };

export interface AttachmentListProps {
  items: AttachmentItem[];
  onRemove?: (index: number) => void;
  className?: string;
}

function getItemKind(item: AttachmentItem) {
  return fileKind(item.name);
}

function renderKindIcon(kind: ReturnType<typeof fileKind>) {
  switch (kind) {
    case 'pdf':
    case 'doc':
      return <FileText className="w-4 h-4 text-primary shrink-0" />;
    case 'image':
      return <ImageIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />;
    case 'sheet':
      return <FileSpreadsheet className="w-4 h-4 text-emerald-700 dark:text-emerald-500 shrink-0" />;
    default:
      return <FileIcon className="w-4 h-4 text-muted-foreground shrink-0" />;
  }
}

export const AttachmentList: React.FC<AttachmentListProps> = ({ items, onRemove, className }) => {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <ul className={cn('space-y-1.5', className)}>
      {items.map((item, index) => {
        const kind = getItemKind(item);
        const url = 'url' in item ? item.url : undefined;
        const size = item.size;

        return (
          <li
            key={`${item.name}-${index}`}
            className="flex items-center justify-between gap-3 p-2 rounded-lg border border-border bg-card text-xs text-foreground"
          >
            <div className="flex items-center gap-2 min-w-0">
              {renderKindIcon(kind)}
              {url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium hover:underline truncate text-primary"
                >
                  {item.name}
                </a>
              ) : (
                <span className="font-medium truncate">{item.name}</span>
              )}
              {typeof size === 'number' && (
                <span className="text-muted-foreground shrink-0">({formatFileSize(size)})</span>
              )}
            </div>

            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(index)}
                aria-label={`Quitar ${item.name}`}
                className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
};
