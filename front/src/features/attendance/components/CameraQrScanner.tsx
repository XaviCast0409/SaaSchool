import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, CameraDevice } from 'html5-qrcode';
import { Camera, RefreshCw, VideoOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'requesting' | 'scanning' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const runningCameraIdRef = useRef<string | null>(null);
  const lastScanRef = useRef<{ code: string; timestamp: number } | null>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const stopScanner = useCallback(async () => {
    runningCameraIdRef.current = null;
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
      stopScanner();
      setStatus('idle');
      return;
    }

    let isMounted = true;

    async function initCamera() {
      setStatus('requesting');
      setErrorMessage(null);

      try {
        const devices = await Html5Qrcode.getCameras();
        if (!isMounted) return;

        if (!devices || devices.length === 0) {
          setStatus('error');
          setErrorMessage('No se detectó ninguna cámara web o sensor óptico en este dispositivo.');
          return;
        }

        setCameras(devices);

        // Si no hay seleccionada o la actual no existe en la lista, elegir cámara preferente
        let targetCameraId = selectedCameraId;
        const exists = devices.some((d) => d.id === targetCameraId);
        if (!targetCameraId || !exists) {
          // Preferir cámara trasera en móviles o primera cámara web
          const rearCam = devices.find((d) => /back|rear|environment|trasera/i.test(d.label));
          targetCameraId = (rearCam || devices[0]).id;
          setSelectedCameraId(targetCameraId);
        }

        // Si ya está corriendo con esta cámara, no volver a iniciar
        if (runningCameraIdRef.current === targetCameraId && scannerRef.current?.isScanning) {
          setStatus('scanning');
          return;
        }

        // Detener cámara anterior antes de iniciar nueva
        await stopScanner();
        if (!isMounted) return;

        const scanner = new Html5Qrcode('qr-reader-viewport');
        scannerRef.current = scanner;

        await scanner.start(
          targetCameraId,
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

        if (isMounted) {
          runningCameraIdRef.current = targetCameraId;
          setStatus('scanning');
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        setStatus('error');

        const errString = String((err as { message?: string })?.message || err || '');
        if (/NotAllowedError|Permission|denied/i.test(errString)) {
          setErrorMessage(
            'Permiso denegado: El navegador bloqueó el acceso a la cámara. Haz clic en el ícono de candado o cámara en la barra de direcciones y activa "Permitir".'
          );
        } else if (/NotFoundError|DevicesNotFoundError/i.test(errString)) {
          setErrorMessage('No se encontró ninguna cámara conectada a este equipo.');
        } else if (/NotReadableError|TrackStartError|concurrent/i.test(errString)) {
          setErrorMessage(
            'La cámara está en uso por otra ventana o aplicación (Zoom, Meet, etc.). Ciérrala y reintenta.'
          );
        } else {
          setErrorMessage('Error al inicializar la cámara. Revisa la configuración de tu navegador.');
        }
      }
    }

    initCamera();

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [isActive, selectedCameraId, retryTrigger, stopScanner]);

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
              <Badge className="bg-background/80 backdrop-blur-md text-foreground border-border text-[11px] gap-1.5 font-bold shadow-md">
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
            <p className="text-[11px] text-muted-foreground">Concediendo acceso al dispositivo de video</p>
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
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {errorMessage || 'Ocurrió un error al intentar activar la cámara.'}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                runningCameraIdRef.current = null;
                setRetryTrigger((c) => c + 1);
              }}
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
            value={selectedCameraId}
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
      <p className="text-[11px] text-muted-foreground text-center">
        Coloca el código QR del carnet escolar a unos 15 - 20 cm de distancia.
      </p>
    </div>
  );
};
