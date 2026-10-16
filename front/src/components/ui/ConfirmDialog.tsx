import React, { useEffect } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Info,
  X,
} from 'lucide-react';
import { Button } from './button';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  icon?: React.ReactNode;
  isLoading?: boolean;
  details?: React.ReactNode;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'warning',
  icon,
  isLoading = false,
  details,
}) => {
  // Manejo de tecla Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconBg: 'bg-destructive/10 text-destructive',
          defaultIcon: <AlertCircle className="w-6 h-6" />,
          confirmVariant: 'destructive' as const,
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
          defaultIcon: <AlertTriangle className="w-6 h-6" />,
          confirmVariant: 'default' as const,
        };
      case 'success':
        return {
          iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
          defaultIcon: <CheckCircle2 className="w-6 h-6" />,
          confirmVariant: 'default' as const,
        };
      case 'info':
      default:
        return {
          iconBg: 'bg-primary/10 text-primary border border-primary/20',
          defaultIcon: <Info className="w-6 h-6" />,
          confirmVariant: 'default' as const,
        };
    }
  };

  const { iconBg, defaultIcon, confirmVariant } = getVariantStyles();

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
        {/* Botón Cerrar (X) */}
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-50"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Encabezado con Icono */}
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${iconBg}`}
          >
            {icon || defaultIcon}
          </div>
          <div className="space-y-1 pr-4">
            <h3 className="text-base font-bold text-foreground leading-tight">
              {title}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {/* Contenido / Detalles Adicionales opcionales */}
        {details && (
          <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            {details}
          </div>
        )}

        {/* Botones de Acción */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
            className="h-8 text-xs font-semibold"
          >
            {cancelText}
          </Button>

          <Button
            type="button"
            variant={confirmVariant}
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
            className="h-8 text-xs font-bold shadow-sm"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};
