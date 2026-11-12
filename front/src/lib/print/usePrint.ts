import { useCallback, useEffect, useRef, useState } from 'react';

interface PrintOptions {
  /** Ej.: 'A4 portrait', 'A4 landscape', '80mm 200mm' */
  pageSize?: string;
  margin?: string;
  /** Nombre sugerido del PDF (Chrome usa document.title) */
  title?: string;
}

export function usePrint({ pageSize = 'A4 portrait', margin = '10mm', title }: PrintOptions = {}) {
  const [isPrinting, setIsPrinting] = useState(false);
  const busy = useRef(false);

  const print = useCallback(() => {
    if (busy.current) return; // evita doble clic
    busy.current = true;
    setIsPrinting(true);
  }, []);

  useEffect(() => {
    if (!isPrinting) return;
    let cancelled = false;
    const style = document.createElement('style');
    style.id = 'print-page-style';
    style.textContent = `@page { size: ${pageSize}; margin: ${margin}; }`;
    document.head.appendChild(style);
    const prevTitle = document.title;
    if (title) document.title = title;

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      style.remove();
      document.title = prevTitle;
      busy.current = false;
      setIsPrinting(false);
    };

    (async () => {
      // esperar a que el portal pinte, a que carguen las imágenes (QR, logos) y las fuentes
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const imgs = Array.from(document.querySelectorAll<HTMLImageElement>('#print-root img'));
      await Promise.all(imgs.map((img) => (img.complete ? null : img.decode().catch(() => null))));
      await (document as Document & { fonts?: FontFaceSet }).fonts?.ready;
      if (cancelled) return;
      window.addEventListener('afterprint', finish, { once: true });
      window.print();
    })();

    return () => {
      cancelled = true;
      window.removeEventListener('afterprint', finish);
      style.remove();
      document.title = prevTitle;
    };
  }, [isPrinting, pageSize, margin, title]);

  return { print, isPrinting };
}

