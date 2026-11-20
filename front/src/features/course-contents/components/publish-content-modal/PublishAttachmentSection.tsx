import React from 'react';
import { Upload, FileText, Cloud, HardDrive, CheckCircle2, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isGoogleDriveUrl } from '../../utils/fileUrls';

interface PublishAttachmentSectionProps {
  attachmentMode: 'FILE' | 'DRIVE';
  selectedFile: File | null;
  driveUrl: string;
  driveFileName: string;
  onSetAttachmentMode: (mode: 'FILE' | 'DRIVE') => void;
  onSelectFile: (file: File | null) => void;
  onDriveUrlChange: (url: string) => void;
  onDriveFileNameChange: (name: string) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const PublishAttachmentSection: React.FC<PublishAttachmentSectionProps> = ({
  attachmentMode,
  selectedFile,
  driveUrl,
  driveFileName,
  onSetAttachmentMode,
  onSelectFile,
  onDriveUrlChange,
  onDriveFileNameChange,
  onFileChange,
}) => {
  return (
    <div className="space-y-2 pt-1 border-t border-border/50">
      <div className="flex items-center justify-between">
        <label className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
          <Paperclip className="w-3.5 h-3.5 text-primary" />
          <span>Material / Documento Adjunto:</span>
        </label>

        {/* Selector de modo: subir archivo o pegar un enlace de Google Drive */}
        <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border">
          <button
            type="button"
            onClick={() => onSetAttachmentMode('FILE')}
            className={`px-2 py-0.5 rounded-md text-xs font-bold flex items-center gap-1 transition-all ${
              attachmentMode === 'FILE'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <HardDrive className="w-3 h-3" />
            <span>Subir de PC</span>
          </button>
          <button
            type="button"
            onClick={() => onSetAttachmentMode('DRIVE')}
            className={`px-2 py-0.5 rounded-md text-xs font-bold flex items-center gap-1 transition-all ${
              attachmentMode === 'DRIVE'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Cloud className="w-3 h-3" />
            <span>Enlace Cloud</span>
          </button>
        </div>
      </div>

      {/* Modo 1: Subir Archivo desde PC */}
      {attachmentMode === 'FILE' && (
        <div>
          {selectedFile ? (
            <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/30">
              <div className="flex items-center gap-2 overflow-hidden">
                <FileText className="w-5 h-5 text-primary shrink-0" />
                <div className="truncate">
                  <p className="font-medium text-foreground truncate">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onSelectFile(null)}
                className="text-destructive hover:bg-destructive/10"
              >
                Quitar
              </Button>
            </div>
          ) : (
            <label className="border-2 border-dashed border-border hover:border-primary/50 bg-background hover:bg-muted/30 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all">
              <Upload className="w-6 h-6 text-muted-foreground mb-1" />
              <span className="font-semibold text-foreground text-xs">Haz clic para subir un archivo</span>
              <span className="text-xs text-muted-foreground text-center">
                PowerPoint (.pptx), Word (.docx), PDF, Excel o Imágenes (máx. 25 MB)
              </span>
              <input
                type="file"
                onChange={onFileChange}
                className="hidden"
                accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
              />
            </label>
          )}
        </div>
      )}

      {/* Modo 2: Enlace Cloud */}
      {attachmentMode === 'DRIVE' && (
        <div className="space-y-2 p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
            <Cloud className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Enlace compartido en la nube</span>
          </div>
          <Input
            type="url"
            value={driveUrl}
            onChange={(e) => onDriveUrlChange(e.target.value)}
            placeholder="Pega el enlace compartido del archivo (ej: https://...)"
            className="text-xs bg-background"
          />

          {isGoogleDriveUrl(driveUrl) ? (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
              <span>
                ¡Enlace en la nube reconocido! Se activará la descarga directa en 1 clic para los alumnos.
              </span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground leading-relaxed">
              💡 <strong>Tip:</strong> Asegúrate de que el archivo tenga permisos de lectura para que cualquier
              persona con el enlace pueda abrirlo o descargarlo sin restricciones.
            </p>
          )}

          <Input
            type="text"
            value={driveFileName}
            onChange={(e) => onDriveFileNameChange(e.target.value)}
            placeholder="Nombre que verá el alumno (ej. Diapositivas_Sesion_1.pptx)"
            className="text-xs bg-background"
          />
        </div>
      )}
    </div>
  );
};
