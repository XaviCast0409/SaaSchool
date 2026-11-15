import React, { useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Agrupa los avisos que van sobre el contenido (plan, plataforma, año lectivo, notificaciones)
 * para que no se apilen: siempre se ven los urgentes (`data-priority="high"`) y, si no hay
 * ninguno, solo el primero. El resto queda detrás de "Ver N avisos más".
 *
 * Cada aviso decide por su cuenta si se muestra, así que se cuentan los hijos reales del DOM.
 */
export const BannerStack: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [extra, setExtra] = useState(0);

  useLayoutEffect(() => {
    const container = ref.current;
    if (!container) return;

    const apply = () => {
      const items = Array.from(container.children) as HTMLElement[];
      const hasUrgent = items.some((item) => item.dataset.priority === 'high');
      let collapsible = 0;
      items.forEach((item, index) => {
        const alwaysVisible = item.dataset.priority === 'high' || (!hasUrgent && index === 0);
        if (!alwaysVisible) collapsible += 1;
        item.style.display = alwaysVisible || expanded ? '' : 'none';
      });
      setExtra(collapsible);
    };

    apply();
    const observer = new MutationObserver(apply);
    observer.observe(container, { childList: true });
    return () => observer.disconnect();
  }, [expanded]);

  return (
    <div className="print:hidden">
      <div ref={ref}>{children}</div>
      {extra > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="flex w-full items-center justify-center gap-1.5 border-b border-border bg-muted/40 px-4 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {expanded ? 'Mostrar menos avisos' : `Ver ${extra} aviso${extra === 1 ? '' : 's'} más`}
        </button>
      )}
    </div>
  );
};
