import React, { useEffect, useRef } from 'react';

/**
 * Cloudflare Turnstile (CAPTCHA gratuito y sin rompecabezas en la mayoría de casos).
 * Solo se activa si existe VITE_TURNSTILE_SITE_KEY; el servidor lo exige si tiene TURNSTILE_SECRET_KEY.
 */
export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

interface TurnstileApi {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id: string) => void;
}
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let scriptPromise: Promise<void> | null = null;
const loadScript = (): Promise<void> => {
  if (window.turnstile) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SCRIPT_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error('No se pudo cargar la verificación anti-spam.'));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
};

interface Props {
  onToken: (token: string | null) => void;
  /** Cambia este valor para pedir un token nuevo (los tokens son de un solo uso). */
  resetKey?: number;
}

export const TurnstileWidget: React.FC<Props> = ({ onToken, resetKey = 0 }) => {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !ref.current) return;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !ref.current || !window.turnstile) return;
        widgetId.current = window.turnstile.render(ref.current, {
          sitekey: TURNSTILE_SITE_KEY,
          language: 'es',
          callback: (token: string) => onTokenRef.current(token),
          'expired-callback': () => onTokenRef.current(null),
          'error-callback': () => onTokenRef.current(null),
        });
      })
      .catch(() => onTokenRef.current(null));
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, []);

  useEffect(() => {
    if (resetKey && widgetId.current && window.turnstile) {
      onTokenRef.current(null);
      window.turnstile.reset(widgetId.current);
    }
  }, [resetKey]);

  if (!TURNSTILE_SITE_KEY) return null;
  return <div ref={ref} className="min-h-[65px]" />;
};
