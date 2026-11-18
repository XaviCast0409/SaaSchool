export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1048576) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export type FileKind = 'pdf' | 'image' | 'doc' | 'sheet' | 'other';

const EXT_TO_KIND: Record<string, FileKind> = {
  pdf: 'pdf',
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  webp: 'image',
  svg: 'image',
  doc: 'doc',
  docx: 'doc',
  odt: 'doc',
  txt: 'doc',
  rtf: 'doc',
  xls: 'sheet',
  xlsx: 'sheet',
  csv: 'sheet',
  ods: 'sheet',
};

export function fileKind(name: string): FileKind {
  const dotIndex = name.lastIndexOf('.');
  if (dotIndex === -1) return 'other';
  const ext = name.slice(dotIndex + 1).toLowerCase();
  return EXT_TO_KIND[ext] || 'other';
}
