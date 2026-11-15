import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, CameraDevice } from 'html5-qrcode';
import { Camera, RefreshCw, VideoOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

function describeCameraError(err: unknown): string {
  const errString = String(
    (err as { name?: string; message?: string })?.message
      ? `${(err as { name?: string }).name ?? ''} ${(err as { message: string }).message}`
      : err ?? ''
  );

  if (/NotAllowedError|Permission|denied/i.test(errString)) {
    return 'Permiso denegado: El navegador bloqueó el acceso a la cámara. Haz clic en el ícono de candado o cámara en la barra de direcciones y activa "Permitir".';
  }
  if (/NotFoundError|DevicesNotFoundError|OverconstrainedError/i.test(errString)) {
    return 'No se encontró ninguna cámara disponible en este equipo.';
  }
  if (/NotReadableError|TrackStartError|AbortError|Timeout|concurrent|Could not start/i.test(errString)) {
    return 'La cámara está en uso por otra app o pestaña (Zoom, Meet, otra cámara abierta). Ciérrala y reintenta.';
  }
  // Mostrar el detalle técnico para poder diagnosticar casos raros
  const detail = errString.trim().slice(0, 160);
  return `Error al inicializar la cámara. Revisa la configuración de tu navegador.${detail ? ` (${detail})` : ''}`;
}

interface CameraQrScannerProps {
  onScan: (code: string) => void;
  isActive: boolean;
  isProcessing?: boolean;
}

export const CameraQrScanner: React.FC<CameraQrScannerProps> = ({
  onScan,
  isActive,
  isProcessing = false,
}) => {
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  // Cámara elegida a mano por el usuario. Vacío = dejar que el navegador elija la trasera.
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  // Cámara realmente en uso (solo para mostrar en el selector; no reinicia el escáner).
  const [activeCameraId, setActiveCameraId] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'requesting' | 'scanning' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanRef = useRef<{ code: string; timestamp: number } | null>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  // Cola de operaciones de cámara: en móviles la cámara es exclusiva, así que
  // nunca puede haber un start() en curso mientras otro intenta abrirla.
  const opQueueRef = useRef<Promise<void>>(Promise.resolve());

  const enqueue = useCallback((fn: () => Promise<void>) => {
    const next = opQueueRef.current.then(fn, fn);
    opQueueRef.current = next.catch(() => undefined);
    return next;
  }, []);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch {
        // Ignorar errores al detener si ya estaba cerrado
      } finally {
        scannerRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    if (!isActive) {
      enqueue(stopScanner);
      setStatus('idle');
      return;
    }

    let cancelled = false;
    setStatus('requesting');
    setErrorMessage(null);

    enqueue(async () => {
      if (cancelled) return;

      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setStatus('error');
        setErrorMessage('El navegador no permite usar la cámara en esta página (se requiere HTTPS).');
        return;
      }

      await stopScanner();
      if (cancelled) return;

      const scanner = new Html5Qrcode('qr-reader-viewport', { verbose: false });
      scannerRef.current = scanner;

      // Sin elección manual, pedir la cámara trasera por facingMode (ideal, no exacto):
      // el navegador elige el lente principal en móviles y cae a la webcam en PC.
      const source: string | MediaTrackConstraints = selectedCameraId
        ? selectedCameraId
        : { facingMode: 'environment' };

      try {
        await scanner.start(
          source,
          {
            fps: 12,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const minDimension = Math.min(viewfinderWidth, viewfinderHeight);
              const boxSize = Math.max(Math.floor(minDimension * 0.72), 200);
              return { width: boxSize, height: boxSize };
            },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            const now = Date.now();
            const last = lastScanRef.current;

            // Cooldown de 3.5 segundos para el mismo código escaneado
            if (last && last.code === decodedText && now - last.timestamp < 3500) {
              return;
            }

            // Cooldown mínimo de 1.2 segundos entre cualquier código consecutivo
            if (last && now - last.timestamp < 1200) {
              return;
            }

            lastScanRef.current = { code: decodedText, timestamp: now };
            onScanRef.current(decodedText);
          },
          () => {
            // Ignorar errores de escaneo cuadro por cuadro
          }
        );
      } catch (err: unknown) {
        await stopScanner();
        if (cancelled) return;
        setStatus('error');
        setErrorMessage(describeCameraError(err));
        return;
      }

      if (cancelled) {
        await stopScanner();
        return;
      }

      setStatus('scanning');

      try {
        setActiveCameraId(scanner.getRunningTrackSettings().deviceId ?? '');
      } catch {
        // Algunos navegadores no exponen la configuración del track
      }

      // Listar cámaras sin volver a abrir la cámara (el permiso ya está concedido).
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (cancelled) return;
        setCameras(
          devices
            .filter((d) => d.kind === 'videoinput' && d.deviceId)
            .map((d) => ({ id: d.deviceId, label: d.label }))
        );
      } catch {
        // Sin lista de cámaras: el selector simplemente no se muestra
      }
    });

    return () => {
      cancelled = true;
      enqueue(stopScanner);
    };
  }, [isActive, selectedCameraId, retryTrigger, stopScanner, enqueue]);

  return (
    <div className="flex flex-col items-center w-full space-y-3">
      {/* Contenedor del Visor con Overlay Futurista */}
      <div className="relative w-full max-w-[340px] sm:max-w-[360px] aspect-square rounded-2xl overflow-hidden border-2 border-primary/30 bg-black/95 shadow-lg flex items-center justify-center">
        {/* Viewport donde html5-qrcode renderiza el video */}
        <div id="qr-reader-viewport" className="w-full h-full object-cover" />

        {/* CSS para asegurar que el video llene el contenedor */}
        <style>{`
          #qr-reader-viewport {
            width: 100% !important;
            height: 100% !important;
            border: none !important;
          }
          #qr-reader-viewport video {
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
          }
          @keyframes laser-sweep {
            0% { top: 15%; opacity: 0.3; }
            50% { opacity: 1; }
            100% { top: 85%; opacity: 0.3; }
          }
          .animate-laser {
            animation: laser-sweep 2s ease-in-out infinite alternate;
          }
        `}</style>

        {/* Overlay cuando está escaneando */}
        {status === 'scanning' && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
            {/* Esquinas guía de enfoque */}
            <div className="relative w-48 h-48 sm:w-56 sm:h-56">
              {/* Esquina sup-izq */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
              {/* Esquina sup-der */}
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
              {/* Esquina inf-izq */}
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
              {/* Esquina inf-der */}
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />

              {/* Láser de escaneo animado */}
              <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_8px_hsl(var(--primary))] animate-laser" />
            </div>

            {/* Badge de estado en vivo */}
            <div className="absolute top-3 inset-x-0 flex justify-center">
              <Badge className="bg-background/80 backdrop-blur-md text-foreground border-border text-xs gap-1.5 font-bold shadow-md">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {isProcessing ? 'Verificando carnet...' : 'Cámara Activa - Apunta el QR'}
              </Badge>
            </div>
          </div>
        )}

        {/* Estado: Solicitando acceso / Conectando */}
        {status === 'requesting' && (
          <div className="absolute inset-0 bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-primary animate-spin" />
            <p className="text-xs font-semibold text-foreground">Iniciando sensor de cámara...</p>
            <p className="text-xs text-muted-foreground">Concediendo acceso al dispositivo de video</p>
          </div>
        )}

        {/* Estado: Error de cámara o permiso denegado */}
        {status === 'error' && (
          <div className="absolute inset-0 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center p-5 text-center space-y-3">
            <div className="p-3 rounded-full bg-destructive/10 text-destructive">
              <VideoOff className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-foreground">Acceso a Cámara no disponible</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {errorMessage || 'Ocurrió un error al intentar activar la cámara.'}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRetryTrigger((c) => c + 1)}
              className="h-8 text-xs gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reintentar Conexión
            </Button>
          </div>
        )}
      </div>

      {/* Controles de Dispositivo (Si hay múltiples cámaras) */}
      {cameras.length > 1 && status === 'scanning' && (
        <div className="flex items-center gap-2 text-xs">
          <Camera className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <select
            value={selectedCameraId || activeCameraId}
            onChange={(e) => setSelectedCameraId(e.target.value)}
            className="h-7 text-xs rounded-lg border border-border bg-background px-2 text-foreground font-medium focus:ring-1 focus:ring-primary outline-none"
          >
            {cameras.map((cam, idx) => (
              <option key={cam.id} value={cam.id}>
                {cam.label || `Cámara ${idx + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Consejo rápido */}
      <p className="text-xs text-muted-foreground text-center">
        Coloca el código QR del carnet escolar a unos 15 - 20 cm de distancia.
      </p>
    </div>
  );
};
