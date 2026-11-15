import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { BOTTOM_NAV_LABELS, isNavItemActive, type ResolvedNavItem } from './navigation';

interface MobileBottomNavProps {
  items: ResolvedNavItem[];
  /** Contadores por ruta (mensajes sin leer, pagos por validar) */
  badges: Record<string, number>;
  onOpenMenu: () => void;
}

/** Barra fija inferior del celular: los accesos de todos los días a un toque del pulgar. */
export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ items, badges, onOpenMenu }) => {
  const { pathname } = useLocation();

  const cell = 'flex min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-2 text-xs font-semibold';

  return (
    <nav
      aria-label="Accesos rápidos"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden print:hidden"
    >
      <div className="grid" style={{ gridTemplateColumns: `repeat(${items.length + 1}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const Icon = item.icon;
          const active = isNavItemActive(item, pathname);
          const badge = badges[item.path] ?? 0;
          return (
            <Link
              key={item.path}
              to={item.path}
              aria-current={active ? 'page' : undefined}
              className={`${cell} ${active ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <span className="relative">
                <Icon className="h-5 w-5" />
                {badge > 0 && (
                  <span className="absolute -right-2.5 -top-1.5 min-w-[1.1rem] rounded-full bg-destructive px-1 text-center text-[11px] font-bold leading-[1.1rem] text-destructive-foreground">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </span>
              <span className="max-w-full truncate">{BOTTOM_NAV_LABELS[item.path] ?? item.label}</span>
            </Link>
          );
        })}
        <button type="button" onClick={onOpenMenu} className={`${cell} text-muted-foreground`}>
          <Menu className="h-5 w-5" />
          <span>Más</span>
        </button>
      </div>
    </nav>
  );
};
