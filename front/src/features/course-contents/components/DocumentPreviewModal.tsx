import React, { useEffect, useState } from 'react';
import { X, Download, ExternalLink, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getPreviewUrl, isImageUrl, isInternalFileUrl, openFile } from '../utils/fileUrls';
import { useResolvedFileUrl } from '../api/useResolvedFileUrl';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl?: string | null;
  fileName?: string | null;
  title?: string;
}

const PREVIEWABLE_EXTS = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];
const isPreviewableInternal = (name?: string | null): boolean => {
  if (!name) return false;
  const lower = name.toLowerCase();
  return PREVIEWABLE_EXTS.some((ext) => lower.endsWith(ext));
};

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  fileUrl,
  fileName,
  title,
}) => {
  const [isLoading, setIsLoading] = useState(true);

  const internal = isInternalFileUrl(fileUrl);
  const { data: signedPreviewUrl, isLoading: isResolving } = useResolvedFileUrl(
    isOpen && internal ? fileUrl : null,
  );

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !fileUrl) return null;

  const previewUrl = internal ? signedPreviewUrl ?? '' : getPreviewUrl(fileUrl);
  const isImage = isImageUrl(fileUrl, fileName);
  const canPreview = !internal || isPreviewableInternal(fileName);

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[90vh] max-h-[90vh]">
        {/* Header del Visor */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-border flex items-center justify-between bg-muted/30 shrink-0 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-foreground truncate">
                {title || fileName || 'Documento'}
              </h3>
              {fileName && (
                <p className="text-[11px] text-muted-foreground truncate">
                  {fileName}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Botón de Descarga Opcional */}
            <Button
              type="button"
              size="sm"
              onClick={() => void openFile(fileUrl, { download: true })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-xs"
              title="Descargar archivo a tu dispositivo"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Descargar</span>
            </Button>

            {/* Abrir en pestaña nueva */}
            <button
              type="button"
              onClick={() => void openFile(fileUrl)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Abrir en pestaña nueva"
            >
              <ExternalLink className="w-4 h-4" />
            </button>

            {/* Cerrar modal */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-lg"
              title="Cerrar visor"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Cuerpo del Visor */}
        <div className="flex-1 bg-muted/10 relative overflow-hidden flex items-center justify-center">
          {isResolving ? (
            <div className="w-full h-full p-4 flex flex-col gap-3">
              <Skeleton className="w-full h-full rounded-xl" />
            </div>
          ) : !canPreview ? (
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                <FileText className="w-6 h-6" />
              </div>
              <p className="text-xs text-muted-foreground max-w-sm">
                La vista previa no está disponible para este tipo de archivo. Descárgalo para abrirlo.
              </p>
              <Button
                type="button"
                size="sm"
                onClick={() => void openFile(fileUrl, { download: true })}
                className="gap-2 font-bold text-xs"
              >
                <Download className="w-4 h-4" />
                <span>Descargar</span>
              </Button>
            </div>
          ) : (
            <>
              {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/60 backdrop-blur-xs z-10 gap-2">
                  <Loader2 className="w-7 h-7 text-primary animate-spin" />
                  <span className="text-xs font-semibold text-muted-foreground">
                    Cargando vista previa interactiva...
                  </span>
                </div>
              )}

              {isImage ? (
                <div className="w-full h-full p-4 flex items-center justify-center overflow-auto">
                  <img
                    src={previewUrl || fileUrl}
                    alt={fileName || 'Vista previa'}
                    onLoad={() => setIsLoading(false)}
                    className="max-h-full max-w-full object-contain rounded-lg shadow-sm"
                  />
                </div>
              ) : (
                <iframe
                  src={previewUrl}
                  onLoad={() => setIsLoading(false)}
                  className="w-full h-full border-0"
                  title={fileName || 'Visor de documento'}
                  allow="autoplay"
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
