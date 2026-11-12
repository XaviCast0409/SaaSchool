import React, { useEffect, useState } from 'react';
import { Download, MoreVertical, PlusSquare, Share, Smartphone, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type Platform = 'IOS' | 'ANDROID' | 'DESKTOP';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function detectPlatform(): Platform {
  const ua = navigator.userAgent || '';
  const isIpadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  if (/iPhone|iPad|iPod/i.test(ua) || isIpadOs) return 'IOS';
  if (/Android/i.test(ua)) return 'ANDROID';
  return 'DESKTOP';
}

export function isInstalled(): boolean {
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches;
  return Boolean(standalone || (navigator as Navigator & { standalone?: boolean }).standalone);
}

// El navegador emite este evento una sola vez; se guarda para poder mostrar el botón "Instalar"
let deferredPrompt: BeforeInstallPromptEvent | null = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
  });
}

const SNOOZE_KEY = 'saaschool.install-banner-snooze';

const Steps: React.FC<{ platform: Platform }> = ({ platform }) => {
  if (platform === 'IOS') {
    return (
      <ol className="space-y-2 text-sm text-foreground">
        <li className="flex items-start gap-2">
          <span className="font-bold text-primary">1.</span> Abre esta página en <strong>Safari</strong> (en otros navegadores del iPhone no se puede instalar).
        </li>
        <li className="flex items-start gap-2">
          <span className="font-bold text-primary">2.</span>
          <span>
            Toca el botón <Share className="inline h-4 w-4 align-text-bottom" aria-label="Compartir" /> <strong>Compartir</strong> (abajo, al centro).
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="font-bold text-primary">3.</span>
          <span>
            Elige <PlusSquare className="inline h-4 w-4 align-text-bottom" aria-hidden /> <strong>Agregar a inicio</strong> y luego <strong>Agregar</strong>.
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="font-bold text-primary">4.</span> Abre la app desde el ícono nuevo y activa las notificaciones en <strong>Mis notificaciones</strong>.
        </li>
      </ol>
    );
  }
  if (platform === 'ANDROID') {
    return (
      <ol className="space-y-2 text-sm text-foreground">
        <li className="flex items-start gap-2">
          <span className="font-bold text-primary">1.</span>
          <span>
            En Chrome, toca el menú <MoreVertical className="inline h-4 w-4 align-text-bottom" aria-label="Menú" /> (arriba a la derecha).
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="font-bold text-primary">2.</span> Elige <strong>Instalar aplicación</strong> o <strong>Agregar a la pantalla principal</strong>.
        </li>
        <li className="flex items-start gap-2">
          <span className="font-bold text-primary">3.</span> Abre la app desde el ícono y acepta las notificaciones.
        </li>
      </ol>
    );
  }
  return (
    <ol className="space-y-2 text-sm text-foreground">
      <li className="flex items-start gap-2">
        <span className="font-bold text-primary">1.</span> En Chrome o Edge, busca el ícono <Download className="inline h-4 w-4 align-text-bottom" aria-hidden /> <strong>Instalar</strong> en la barra de direcciones.
      </li>
      <li className="flex items-start gap-2">
        <span className="font-bold text-primary">2.</span> Para tenerla en el celular, abre esta misma dirección desde el teléfono y sigue los pasos que aparecen ahí.
      </li>
    </ol>
  );
};

/** Guía completa (para la página "Mis notificaciones"). */
export const InstallAppGuide: React.FC = () => {
  const [platform, setPlatform] = useState<Platform>('DESKTOP');
  const [installed, setInstalled] = useState(false);
  const [canPrompt, setCanPrompt] = useState(false);
  useEffect(() => {
    setPlatform(detectPlatform());
    setInstalled(isInstalled());
    setCanPrompt(Boolean(deferredPrompt));
  }, []);

  if (installed) {
    return (
      <Card className="mb-4 flex items-center gap-3 p-4 text-sm text-foreground">
        <Smartphone className="h-5 w-5 text-emerald-600" aria-hidden /> La app ya está instalada en este dispositivo.
      </Card>
    );
  }
  return (
    <Card className="mb-4 p-4">
      <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Smartphone className="h-5 w-5 text-primary" aria-hidden /> Instala la app en tu celular
      </p>
      <p className="mb-3 text-xs text-muted-foreground">
        Así se abre con un toque y recibes los avisos aunque no la tengas abierta.{platform === 'IOS' ? ' En iPhone, las notificaciones solo funcionan con la app instalada.' : ''}
      </p>
      {canPrompt ? (
        <Button
          className="gap-2"
          onClick={async () => {
            await deferredPrompt?.prompt();
            const choice = await deferredPrompt?.userChoice;
            if (choice?.outcome === 'accepted') setInstalled(true);
            deferredPrompt = null;
            setCanPrompt(false);
          }}
        >
          <Download className="h-4 w-4" aria-hidden /> Instalar ahora
        </Button>
      ) : (
        <Steps platform={platform} />
      )}
    </Card>
  );
};

/** Aviso corto en el inicio de la familia, que se puede posponer 14 días. */
export const InstallAppBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<Platform>('DESKTOP');
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    const p = detectPlatform();
    setPlatform(p);
    let snoozed = false;
    try {
      snoozed = Number(localStorage.getItem(SNOOZE_KEY) ?? 0) > Date.now();
    } catch {
      snoozed = false;
    }
    // Solo en celulares y si aún no está instalada
    setVisible(p !== 'DESKTOP' && !isInstalled() && !snoozed);
  }, []);
  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now() + 14 * 86_400_000));
    } catch {
      /* sin almacenamiento */
    }
    setVisible(false);
  };

  return (
    <Card className="border-primary/30 bg-primary/5 p-4">
      <div className="flex items-start gap-3">
        <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Instala la app para recibir los avisos del colegio</p>
          <p className="text-xs text-muted-foreground">Toma 10 segundos y no ocupa espacio.</p>
          {expanded ? (
            <div className="mt-3">
              <Steps platform={platform} />
            </div>
          ) : (
            <Button size="sm" className="mt-2 h-8" onClick={() => (deferredPrompt ? deferredPrompt.prompt().then(() => setVisible(false)) : setExpanded(true))}>
              Ver cómo
            </Button>
          )}
        </div>
        <button type="button" onClick={dismiss} className="rounded p-1 text-muted-foreground hover:bg-muted" aria-label="Recordármelo más tarde">
          <X className="h-4 w-4" />
        </button>
      </div>
    </Card>
  );
};
