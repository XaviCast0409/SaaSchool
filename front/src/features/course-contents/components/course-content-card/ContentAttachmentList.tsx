import React from 'react';
import { Eye, Download, Cloud } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { openFile, isGoogleDriveUrl } from '../../utils/fileUrls';
import { getFileMetadata, formatFileSize } from '../../utils/fileHelpers';

interface ContentAttachmentListProps {
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  onPreview: () => void;
}

export const ContentAttachmentList: React.FC<ContentAttachmentListProps> = ({
  fileUrl,
  fileName,
  fileType,
  fileSize,
  onPreview,
}) => {
  if (!fileUrl) return null;

  const isDrive = isGoogleDriveUrl(fileUrl);
  const fileMeta = getFileMetadata(fileName, fileType);
  const FileIcon = fileMeta.icon;

  return (
    <div className="p-3 rounded-xl border border-border bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="w-9 h-9 rounded-lg bg-card border border-border flex items-center justify-center shrink-0 shadow-sm text-primary">
          <FileIcon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-foreground truncate text-xs">
            {fileName || 'Archivo adjunto de clase'}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap mt-0.5">
            <Badge variant="outline" className={`py-0 h-4 text-xs font-bold ${fileMeta.badgeStyle}`}>
              {fileMeta.label}
            </Badge>
            {isDrive && (
              <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                <Cloud className="w-3 h-3" />
                <span>Enlace Cloud</span>
              </span>
            )}
            {fileSize && <span>• {formatFileSize(fileSize)}</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
        <Button
          type="button"
          size="sm"
          onClick={onPreview}
          className="flex-1 sm:flex-none gap-1.5 h-9 px-3.5 text-xs font-bold rounded-xl shadow-xs"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Ver Archivo</span>
        </Button>

        <button
          type="button"
          onClick={() => void openFile(fileUrl, { download: true })}
          className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl border border-input bg-card hover:bg-muted text-foreground font-bold transition-all text-xs shrink-0"
          title="Descargar archivo a tu dispositivo"
        >
          <Download className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="hidden sm:inline">Descargar</span>
        </button>
      </div>
    </div>
  );
};
