import React, { useRef } from 'react';
import { UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FileDropzoneProps {
  files: File[];
  onChange: (files: File[]) => void;
  accept?: string;
  maxSizeMb?: number;
  maxFiles?: number;
  multiple?: boolean;
  disabled?: boolean;
  onReject?: (reasons: string[]) => void;
  label?: string;
  className?: string;
}

function matchesAccept(file: File, acceptStr: string): boolean {
  const rules = acceptStr
    .split(',')
    .map((r) => r.trim().toLowerCase())
    .filter(Boolean);

  if (rules.length === 0) return true;

  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();

  return rules.some((rule) => {
    if (rule.startsWith('.')) {
      return fileName.endsWith(rule);
    }
    if (rule.endsWith('/*')) {
      const prefix = rule.slice(0, -1);
      return fileType.startsWith(prefix);
    }
    return fileType === rule;
  });
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  files,
  onChange,
  accept,
  maxSizeMb = 10,
  maxFiles = 5,
  multiple = true,
  disabled = false,
  onReject,
  label = 'Arrastra archivos aquí o haz clic para seleccionar',
  className,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = (fileList: FileList | File[]) => {
    if (disabled) return;
    const incoming = Array.from(fileList);
    if (incoming.length === 0) return;

    const reasons: string[] = [];
    const validIncoming: File[] = [];

    const maxSizeBytes = maxSizeMb * 1024 * 1024;

    for (const file of incoming) {
      if (accept && !matchesAccept(file, accept)) {
        reasons.push(`"${file.name}" no es un tipo de archivo permitido`);
        continue;
      }
      if (file.size > maxSizeBytes) {
        reasons.push(`"${file.name}" supera ${maxSizeMb} MB`);
        continue;
      }
      validIncoming.push(file);
    }

    if (files.length + validIncoming.length > maxFiles) {
      reasons.push(`Máximo ${maxFiles} archivos`);
      if (reasons.length > 0) {
        onReject?.(reasons);
      }
      return;
    }

    if (reasons.length > 0) {
      onReject?.(reasons);
    }

    if (validIncoming.length > 0) {
      onChange([...files, ...validIncoming]);
    }
  };

  const handleClick = () => {
    if (disabled) return;
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.click();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    if (e.dataTransfer?.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={cn(
        'border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring border-border bg-card hover:bg-muted/50',
        disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
        className,
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={handleInputChange}
        className="hidden"
      />
      <UploadCloud className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Máximo {maxSizeMb} MB por archivo · Hasta {maxFiles} archivos
      </p>
    </div>
  );
};
