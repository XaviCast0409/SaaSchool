import { useEffect, useRef, useState } from 'react';

/** Número comercial de KIPUX (sin el 51). */
export const SALES_WHATSAPP = '949771996';

export const whatsappUrl = (text: string): string =>
  `https://wa.me/51${SALES_WHATSAPP}?text=${encodeURIComponent(text)}`;

export const DEFAULT_WHATSAPP_TEXT = 'Hola, quiero conocer KIPUX para mi colegio. ¿Me pueden mostrar una demostración?';

/** Agrega la clase `is-visible` a los elementos `.kx-reveal` de la página cuando entran en pantalla. */
export function useRevealOnScroll(): void {
  useEffect(() => {
    const all = Array.from(document.querySelectorAll<HTMLElement>('.kx-reveal'));
    if (!('IntersectionObserver' in window)) {
      all.forEach((element) => element.classList.add('is-visible'));
      return;
    }
    // Lo que ya está en pantalla al cargar se muestra de inmediato; el resto, al llegar con el scroll.
    const elements = all.filter((element) => {
      const rect = element.getBoundingClientRect();
      const inView = rect.top < window.innerHeight && rect.bottom > 0;
      if (inView) element.classList.add('is-visible');
      return !inView;
    });
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);
}

/** Cuenta animada desde 0 hasta `target` cuando el elemento aparece en pantalla. */
export function useCountUp(target: number, durationMs = 1400) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [value, setValue] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let frame = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min((now - start) / durationMs, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setValue(Math.round(target * eased));
          if (progress < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [target, durationMs]);

  return { ref, value };
}

export const formatSoles = (amount: number): string =>
  `S/ ${amount.toLocaleString('es-PE', { maximumFractionDigits: 0 })}`;
