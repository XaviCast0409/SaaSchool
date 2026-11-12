import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const ROOT_ID = 'print-root';

function getPrintRoot(): HTMLElement {
  let el = document.getElementById(ROOT_ID);
  if (!el) {
    el = document.createElement('div');
    el.id = ROOT_ID;
    document.body.appendChild(el);
  }
  return el;
}

/** Renderiza el documento imprimible fuera de #root. Móntalo SOLO mientras isPrinting sea true. */
export function PrintPortal({ children }: { children: ReactNode }) {
  const [root, setRoot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const el = getPrintRoot();
    document.body.classList.add('has-print-portal');
    setRoot(el);
    return () => document.body.classList.remove('has-print-portal');
  }, []);
  return root ? createPortal(<div className="print-document">{children}</div>, root) : null;
}

