import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App';
import { queryClient } from './lib/queryClient';
import { listenForPushUpdates } from './lib/pushUpdates';
import './index.css';

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0,
    sendDefaultPii: false,
  } as Sentry.BrowserOptions & { sendDefaultPii?: boolean });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Al llegar una notificación push, actualizar lo que está en pantalla sin refrescar la página
listenForPushUpdates(queryClient);

// Registrar el service worker desde el inicio (solo en producción) para que la app abra sin señal.
// En desarrollo no se registra para no interferir con la recarga en caliente de Vite.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined);
  });
}
