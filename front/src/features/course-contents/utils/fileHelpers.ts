import React from 'react';
import {
  FileText,
  FileSpreadsheet,
  Presentation,
  FileCode,
  FileArchive,
  Image as ImageIcon,
  Video,
  FileCheck,
} from 'lucide-react';

export interface FileMetadata {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badgeStyle: string;
}

export const getFileMetadata = (fileName?: string | null, fileType?: string | null): FileMetadata => {
  const name = (fileName || '').toLowerCase();
  const type = (fileType || '').toLowerCase();

  // Presentaciones (PowerPoint)
  if (name.endsWith('.pptx') || name.endsWith('.ppt') || type.includes('presentation') || type.includes('powerpoint')) {
    return {
      icon: Presentation,
      label: 'Diapositivas PPT',
      badgeStyle: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20',
    };
  }

  // Documentos de Texto (Word)
  if (name.endsWith('.docx') || name.endsWith('.doc') || type.includes('word') || type.includes('document')) {
    return {
      icon: FileText,
      label: 'Documento Word',
      badgeStyle: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
    };
  }

  // Hojas de Cálculo (Excel)
  if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv') || type.includes('sheet') || type.includes('excel')) {
    return {
      icon: FileSpreadsheet,
      label: 'Planilla Excel',
      badgeStyle: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
    };
  }

  // PDF
  if (name.endsWith('.pdf') || type.includes('pdf')) {
    return {
      icon: FileCheck,
      label: 'Documento PDF',
      badgeStyle: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
    };
  }

  // Imágenes
  if (type.startsWith('image/') || name.match(/\.(jpg|jpeg|png|webp|gif|svg)$/)) {
    return {
      icon: ImageIcon,
      label: 'Imagen',
      badgeStyle: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
    };
  }

  // Videos
  if (type.startsWith('video/') || name.match(/\.(mp4|webm|mkv|mov)$/)) {
    return {
      icon: Video,
      label: 'Video',
      badgeStyle: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20',
    };
  }

  // Archivos comprimidos
  if (name.match(/\.(zip|rar|7z|tar|gz)$/)) {
    return {
      icon: FileArchive,
      label: 'Archivo Comprimido',
      badgeStyle: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
    };
  }

  return {
    icon: FileCode,
    label: 'Recurso Digital',
    badgeStyle: 'bg-secondary text-secondary-foreground border-border',
  };
};

export interface DueDateStatus {
  formattedDate: string;
  urgencyLabel: string;
  urgencyBadge: string;
  isOverdue: boolean;
}

export const getDueDateStatus = (dueDateString?: string | null): DueDateStatus | null => {
  if (!dueDateString) return null;

  const due = new Date(dueDateString);
  const now = new Date();
  const diffTime = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const formattedDate = due.toLocaleDateString('es-PE', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  if (diffDays < 0) {
    return {
      formattedDate,
      urgencyLabel: 'Plazo culminado',
      urgencyBadge: 'bg-destructive/10 text-destructive border-destructive/20',
      isOverdue: true,
    };
  }

  if (diffDays === 0) {
    return {
      formattedDate,
      urgencyLabel: '¡Vence hoy!',
      urgencyBadge: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20 animate-pulse',
      isOverdue: false,
    };
  }

  if (diffDays === 1) {
    return {
      formattedDate,
      urgencyLabel: 'Vence mañana',
      urgencyBadge: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
      isOverdue: false,
    };
  }

  if (diffDays <= 3) {
    return {
      formattedDate,
      urgencyLabel: `Quedan ${diffDays} días`,
      urgencyBadge: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
      isOverdue: false,
    };
  }

  return {
    formattedDate,
    urgencyLabel: `${diffDays} días restantes`,
    urgencyBadge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
    isOverdue: false,
  };
};

export const formatFileSize = (bytes?: number | null): string => {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};
