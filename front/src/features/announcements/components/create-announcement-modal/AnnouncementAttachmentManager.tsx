import React from 'react';
import { Paperclip, Loader2, X as XIcon } from 'lucide-react';
import type { AnnouncementAttachment } from '../../types';

interface AnnouncementAttachmentManagerProps {
  attachments: AnnouncementAttachment[];
  isPending: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onAddFiles: (files: FileList | null) => void;
  onRemoveAttachment: (fileId: string) => void;
}

export const AnnouncementAttachmentManager: React.FC<AnnouncementAttachmentManagerProps> = ({
  attachments,
  isPending,
  fileInputRef,
  onAddFiles,
  onRemoveAttachment,
}) => {
  return (
    <div>
      <span className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
        Archivos adjuntos (opcional)
      </span>
      {attachments.length > 0 && (
        <ul className="mb-2 space-y-1">
          {attachments.map((a) => (
            <li
              key={a.fileId}
              className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-1.5 text-xs"
            >
              <span className="truncate">
                {a.name} <span className="text-muted-foreground">· {(a.size / 1024 / 1024).toFixed(1)} MB</span>
              </span>
              <button
                type="button"
                aria-label={`Quitar ${a.name}`}
                onClick={() => onRemoveAttachment(a.fileId)}
              >
                <XIcon className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp"
        onChange={(e) => void onAddFiles(e.target.files)}
      />
      <button
        type="button"
        disabled={isPending || attachments.length >= 3}
        onClick={() => fileInputRef.current?.click()}
        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary disabled:opacity-50"
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Paperclip className="h-3.5 w-3.5" />
        )}
        {isPending ? 'Subiendo…' : 'Adjuntar archivo (PDF, Word, imagen…)'}
      </button>
      <p className="mt-1 text-[10px] text-muted-foreground">
        Hasta 3 archivos de 25 MB. Las familias los abren desde el comunicado.
      </p>
    </div>
  );
};
