import React from 'react';

export const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-baseline justify-between gap-3">
    <span className="text-xs text-muted-foreground shrink-0">{label}</span>
    <span className="text-right text-foreground min-w-0 break-words">{children}</span>
  </div>
);

export const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block space-y-1.5">
    <span className="text-xs font-bold uppercase tracking-wide text-foreground">{label}</span>
    {children}
  </label>
);

export const IconButton: React.FC<{
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}> = ({ label, onClick, danger, children }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    onClick={onClick}
    className={`rounded-md p-1.5 text-muted-foreground transition-colors ${
      danger ? 'hover:bg-destructive/10 hover:text-destructive' : 'hover:bg-muted hover:text-foreground'
    }`}
  >
    {children}
  </button>
);
