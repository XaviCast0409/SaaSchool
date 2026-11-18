import * as React from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { cn } from '@/lib/utils';

/** Menú de acciones (p. ej. "Más acciones" o el "⋯" de una fila). Accesible con teclado. */
export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

export const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 6, align = 'end', ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      align={align}
      collisionPadding={12}
      className={cn(
        'z-50 min-w-[14rem] max-h-[var(--radix-dropdown-menu-content-available-height)] overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg',
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        className,
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = 'DropdownMenuContent';

interface ItemProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> {
  icon?: React.ElementType;
  /** Texto de ayuda bajo la etiqueta */
  hint?: string;
  destructive?: boolean;
}

export const DropdownMenuItem = React.forwardRef<React.ElementRef<typeof DropdownMenuPrimitive.Item>, ItemProps>(
  ({ className, icon: Icon, hint, destructive, children, ...props }, ref) => (
    <DropdownMenuPrimitive.Item
      ref={ref}
      className={cn(
        'flex cursor-pointer select-none items-start gap-2.5 rounded-md px-2.5 py-2 text-sm outline-none transition-colors',
        'focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        destructive && 'text-destructive focus:bg-destructive/10 focus:text-destructive',
        className,
      )}
      {...props}
    >
      {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0 opacity-80" />}
      <span className="min-w-0">
        <span className="block font-medium leading-tight">{children}</span>
        {hint && <span className="mt-0.5 block text-xs text-muted-foreground leading-snug">{hint}</span>}
      </span>
    </DropdownMenuPrimitive.Item>
  ),
);
DropdownMenuItem.displayName = 'DropdownMenuItem';

export const DropdownMenuLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <DropdownMenuPrimitive.Label className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
    {children}
  </DropdownMenuPrimitive.Label>
);

export const DropdownMenuSeparator: React.FC = () => (
  <DropdownMenuPrimitive.Separator className="-mx-1 my-1 h-px bg-border" />
);
