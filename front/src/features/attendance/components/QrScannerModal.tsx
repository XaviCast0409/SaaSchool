import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Clock,
  Volume2,
  VolumeX,
  Keyboard,
  Camera,
  School,
  Sparkles,
} from 'lucide-react';
import { useScanAttendance } from '../api/useAttendance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScanAttendanceResult } from '../types';

interface QrScannerModalProps {
  onClose: () => void;
}

// Generador de audio de confirmación vía Web Audio API (Cero dependencias)
function playBeep(type: 'success' | 'warning' | 'error') {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === 'warning') {
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else {
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch {
    // Si el navegador bloquea audio, continuar silenciosamente
  }
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({ onClose }) => {
  const [scanCode, setScanCode] = useState('');
  const [toleranceTime, setToleranceTime] = useState('07:45');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [inputMode, setInputMode] = useState<'USB_BARCODE' | 'CAMERA'>('USB_BARCODE');
  const [recentScans, setRecentScans] = useState<ScanAttendanceResult[]>([]);
  const [lastResult, setLastResult] = useState<ScanAttendanceResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const { mutate: scanAttendance, isPending } = useScanAttendance();

  // Auto-focus permanente en el input para que las pistolas lectoras USB escaneen sin hacer clic
  useEffect(() => {
    if (inputMode === 'USB_BARCODE') {
      inputRef.current?.focus();
    }
  }, [inputMode, lastResult, errorMessage]);

  const handleProcessScan = (codeToProcess: string) => {
    const trimmed = codeToProcess.trim();
    if (!trimmed || isPending) return;

    setErrorMessage(null);

    scanAttendance(
      {
        code: trimmed,
        toleranceTime,
      },
      {
        onSuccess: (data) => {
          setLastResult(data);
          setRecentScans((prev) => [data, ...prev.slice(0, 19)]);
          setScanCode('');

          if (soundEnabled) {
            if (data.alreadyRegistered) {
              playBeep('warning');
            } else if (data.status === 'LATE_UNJUSTIFIED') {
              playBeep('warning');
            } else {
              playBeep('success');
            }
          }
        },
        onError: (err: any) => {
          const msg = err.response?.data?.message || err.message || 'Código no reconocido';
          setErrorMessage(msg);
          if (soundEnabled) playBeep('error');
          setScanCode('');
        },
      }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleProcessScan(scanCode);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-4xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4 bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-lg text-foreground">
                  Kiosco de Asistencia Escolar (Lector QR / Código)
                </h2>
                <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                  En Vivo
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Compatible con pistolas lectoras USB, fotochecks impresos y códigos DNI/SIAGIE.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSoundEnabled((v) => !v)}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              title={soundEnabled ? 'Silenciar bip de escaneo' : 'Activar bip de escaneo'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
            </Button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de Ajustes Rápidos */}
        <div className="p-3.5 bg-muted/20 border-b border-border flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span className="font-semibold text-foreground">Tolerancia Máxima:</span>
              <Input
                type="time"
                value={toleranceTime}
                onChange={(e) => setToleranceTime(e.target.value)}
                className="h-7 w-24 text-xs font-bold border-border bg-background p-1"
              />
              <span className="text-[11px] text-muted-foreground hidden sm:inline">
                (A partir de las {toleranceTime} se marca Tardanza)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant={inputMode === 'USB_BARCODE' ? 'default' : 'outline'}
              className="h-7 text-xs gap-1.5"
              onClick={() => setInputMode('USB_BARCODE')}
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>Pistola USB / DNI</span>
            </Button>
            <Button
              size="sm"
              variant={inputMode === 'CAMERA' ? 'default' : 'outline'}
              className="h-7 text-xs gap-1.5"
              onClick={() => setInputMode('CAMERA')}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Cámara Web</span>
            </Button>
          </div>
        </div>

        {/* Cuerpo Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-y-auto flex-1">
          {/* Zona de Escaneo Activa (7 cols) */}
          <div className="lg:col-span-7 p-6 border-b lg:border-b-0 lg:border-r border-border flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <form onSubmit={handleSubmit} className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Escaneo Activo (Apunta el carnet o escribe el DNI)
                </label>
                <div className="relative">
                  <Input
                    ref={inputRef}
                    value={scanCode}
                    onChange={(e) => setScanCode(e.target.value)}
                    placeholder="Esperando lectura de carnet escolar o DNI..."
                    className="h-14 text-base font-bold pl-4 pr-24 rounded-xl border-2 border-primary/40 focus:border-primary shadow-sm bg-background"
                    autoFocus
                    disabled={isPending}
                  />
                  <Button
                    type="submit"
                    disabled={!scanCode.trim() || isPending}
                    className="absolute right-2 top-2 h-10 px-4 font-bold text-xs rounded-lg"
                  >
                    {isPending ? 'Verificando...' : 'Marcar'}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Presiona Enter o dispara la pistola lectora. El registro es automático y atómico.
                </p>
              </form>

              {/* Mensaje de Error */}
              {errorMessage && (
                <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-3 animate-in fade-in">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <div>
                    <h4 className="font-bold text-sm leading-none">No se pudo registrar</h4>
                    <p className="text-xs mt-0.5">{errorMessage}</p>
                  </div>
                </div>
              )}

              {/* Tarjeta de Feedback Gigante del Último Escaneado */}
              {lastResult && (
                <div
                  className={`p-5 rounded-2xl border transition-all animate-in zoom-in-95 duration-200 ${
                    lastResult.alreadyRegistered
                      ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                      : lastResult.status === 'LATE_UNJUSTIFIED'
                      ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                      : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center font-extrabold text-xl ${
                          lastResult.status === 'PRESENT'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-amber-600 text-white'
                        }`}
                      >
                        {lastResult.student.fullName.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-lg font-extrabold text-foreground leading-tight">
                          {lastResult.student.fullName}
                        </h3>
                        <div className="flex items-center gap-2 text-xs font-semibold mt-0.5 text-muted-foreground">
                          <School className="w-3.5 h-3.5" />
                          <span>{lastResult.student.classroom}</span>
                          <span>•</span>
                          <span>DNI: {lastResult.student.documentId}</span>
                        </div>
                      </div>
                    </div>

                    <Badge
                      className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 ${
                        lastResult.status === 'PRESENT'
                          ? 'bg-emerald-600 text-white hover:bg-emerald-600'
                          : 'bg-amber-600 text-white hover:bg-amber-600'
                      }`}
                    >
                      {lastResult.status === 'PRESENT' ? 'Puntual' : 'Tardanza'}
                    </Badge>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      {lastResult.message}
                    </span>
                    <span className="text-muted-foreground">
                      Hora: {new Date(lastResult.checkInTime).toLocaleTimeString('es-PE')}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground space-y-1">
              <span className="font-bold text-foreground block">💡 Consejos de Uso en Puerta:</span>
              <p>• Mantén esta ventana abierta en la PC de recepción o portería.</p>
              <p>• Los lectores láser USB envían un salto de línea (Enter) automáticamente al leer el carnet.</p>
            </div>
          </div>

          {/* Historial en Vivo de la Sesión (5 cols) */}
          <div className="lg:col-span-5 p-5 bg-muted/10 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm text-foreground">
                  Marcaciones Recientes ({recentScans.length})
                </h3>
                {recentScans.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] text-muted-foreground hover:text-foreground"
                    onClick={() => setRecentScans([])}
                  >
                    Limpiar lista
                  </Button>
                )}
              </div>

              {recentScans.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground border border-dashed border-border rounded-xl space-y-2 p-4">
                  <Clock className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                  <p className="text-xs font-medium">Aún no se han registrado ingresos en esta sesión.</p>
                  <p className="text-[11px] text-muted-foreground/70">
                    Apunta con el escáner al carnet de un alumno para comenzar.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {recentScans.map((scan, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl border border-border bg-card flex items-center justify-between text-xs shadow-sm hover:border-primary/40 transition-colors"
                    >
                      <div className="space-y-0.5 truncate pr-2">
                        <span className="font-bold text-foreground block truncate">
                          {scan.student.fullName}
                        </span>
                        <span className="text-[11px] text-muted-foreground block truncate">
                          {scan.student.classroom}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold ${
                            scan.status === 'PRESENT'
                              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600'
                              : 'border-amber-500/40 bg-amber-500/10 text-amber-600'
                          }`}
                        >
                          {scan.status === 'PRESENT' ? 'Puntual' : 'Tardanza'}
                        </Badge>
                        <span className="block text-[10px] text-muted-foreground mt-0.5 font-medium">
                          {new Date(scan.checkInTime).toLocaleTimeString('es-PE', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button variant="outline" size="sm" onClick={onClose} className="w-full text-xs">
              Cerrar Kiosco
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
