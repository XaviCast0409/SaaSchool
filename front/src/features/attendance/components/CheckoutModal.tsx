import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import {
  X,
  LogOut,
  Camera,
  Search,
  AlertCircle,
  User,
  ShieldCheck,
  Clock,
  Loader2,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CameraQrScanner } from './CameraQrScanner';
import { useCheckoutPreview, useCheckout } from '../api/useCheckout';
import { attendanceKeys } from '../api/keys';
import { useResolvedFileUrl } from '@/features/course-contents/api/useResolvedFileUrl';
import { formatPeruTime } from '@/lib/dateUtils';
import { relationshipLabel } from '@/features/users/family-relationships/relationshipLabels';
import { useAuthStore } from '@/store/useAuthStore';

interface RosterStudent {
  studentCode: string | null;
  documentId: string;
  fullName: string;
  classroom: string;
}

/** Sin tildes ni mayúsculas, para que «quispe» encuentre a «QUISPE HUAMÁN». */
const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

interface CheckoutModalProps {
  open: boolean;
  onClose: () => void;
}

const PickupPhotoAvatar: React.FC<{
  photoUrl?: string | null;
  name: string;
}> = ({ photoUrl, name }) => {
  const { data: resolvedUrl } = useResolvedFileUrl(photoUrl);

  if (resolvedUrl) {
    return (
      <img src={resolvedUrl} alt={name} className="w-10 h-10 rounded-full object-cover border border-border shrink-0" />
    );
  }

  const initial = name.charAt(0).toUpperCase();
  return (
    <div className="w-10 h-10 rounded-full bg-secondary text-secondary-foreground font-bold flex items-center justify-center shrink-0 border border-border">
      {initial}
    </div>
  );
};

/** Pitido corto de confirmación (sin archivos de audio). Si el navegador no lo permite, no pasa nada. */
const playConfirmBeep = () => {
  try {
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
    osc.onended = () => void ctx.close();
  } catch {
    /* sin sonido */
  }
};

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ open, onClose }) => {
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [useCamera, setUseCamera] = useState(false);

  // Selección de persona
  const [selectedPickupType, setSelectedPickupType] = useState<'GUARDIAN' | 'AUTHORIZED' | 'SELF' | 'OTHER' | null>(
    null,
  );
  // Persona eventual (con autorización escrita del apoderado): solo la oficina puede registrarla
  const [otherName, setOtherName] = useState('');
  const [otherDocument, setOtherDocument] = useState('');
  const role = useAuthStore((s) => s.user?.role);
  const canRegisterOther = role === 'SCHOOL_ADMIN' || role === 'ADMINISTRATIVE' || role === 'SUPER_ADMIN';
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [earlyLeaveReason, setEarlyLeaveReason] = useState('');
  // Confirmación grande tras registrar: el portero ve de un vistazo que quedó hecho
  const [lastCheckout, setLastCheckout] = useState<{ student: string; detail: string; familyNotified: boolean } | null>(
    null,
  );

  const { data: previewData, isLoading: isLoadingPreview, error: previewError } = useCheckoutPreview(scannedCode);

  // Padrón del colegio (el mismo del escáner QR) para buscar por nombre: el portero suele saber
  // cómo se llama el alumno, no su DNI.
  const { data: roster = [] } = useQuery({
    queryKey: attendanceKeys.scanRoster(),
    queryFn: async () => (await api.get<{ data: RosterStudent[] }>('/attendance/scan-roster')).data.data,
    enabled: open,
    staleTime: 5 * 60_000,
  });
  const nameQuery = manualCode.trim();
  const nameMatches = useMemo(() => {
    if (nameQuery.length < 3 || /^\d+$/.test(nameQuery)) return [];
    const words = fold(nameQuery).split(/\s+/).filter(Boolean);
    return roster.filter((r) => words.every((w) => fold(r.fullName).includes(w))).slice(0, 8);
  }, [roster, nameQuery]);
  const { mutateAsync: doCheckout, isPending: isCheckingOut } = useCheckout();

  if (!open) return null;

  const handleScanCode = (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setScannedCode(trimmed);
    setSelectedPickupType(null);
    setSelectedPersonId(null);
    setEarlyLeaveReason('');
    setUseCamera(false);
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    // Si escribió un nombre: con una sola coincidencia se abre directo; con varias, se elige de la lista.
    if (!/^\d+$/.test(nameQuery) && nameQuery.length >= 3) {
      if (nameMatches.length === 1) return handleScanCode(nameMatches[0].documentId);
      if (nameMatches.length > 1) return;
      // Sin coincidencias por nombre puede ser un documento con letras (CE, pasaporte): se busca como código.
    }
    handleScanCode(manualCode);
  };

  const handleResetSearch = () => {
    setScannedCode(null);
    setManualCode('');
    setOtherName('');
    setOtherDocument('');
    setSelectedPickupType(null);
    setSelectedPersonId(null);
    setEarlyLeaveReason('');
  };

  const handleSubmitCheckout = async () => {
    if (!scannedCode || !selectedPickupType) return;
    if (selectedPickupType === 'OTHER') {
      if (otherName.trim().length < 5 || otherDocument.trim().length < 6 || earlyLeaveReason.trim().length < 5) return;
    } else if (selectedPickupType !== 'SELF' && !selectedPersonId) return;

    await doCheckout({
      code: scannedCode,
      pickupType: selectedPickupType,
      pickupPersonId: selectedPickupType === 'OTHER' ? undefined : selectedPersonId || undefined,
      earlyLeaveReason: earlyLeaveReason.trim() || undefined,
      ...(selectedPickupType === 'OTHER'
        ? { otherPickupName: otherName.trim(), otherPickupDocument: otherDocument.trim() }
        : {}),
    });

    const pickerName =
      selectedPickupType === 'GUARDIAN'
        ? guardians.find((g) => g.id === selectedPersonId)?.fullName
        : selectedPickupType === 'AUTHORIZED'
          ? authorizedPickups.find((p) => p.id === selectedPersonId)?.fullName
          : null;
    setLastCheckout({
      student: student?.fullName ?? 'Estudiante',
      detail: pickerName ? `Recogido(a) por ${pickerName}` : 'Salió por su cuenta',
      // El backend avisa a los apoderados vinculados; sin apoderados no hay a quién avisar
      familyNotified: guardians.length > 0,
    });
    playConfirmBeep();
    handleResetSearch();
  };

  /** Deja el modal listo para el siguiente alumno */
  const handleNextCheckout = () => {
    setLastCheckout(null);
    handleResetSearch();
  };

  const student = previewData?.student;
  const attendance = previewData?.todayAttendance;
  const guardians = previewData?.guardians || [];
  const authorizedPickups = previewData?.authorizedPickups || [];
  const isSecondary = student?.educationLevel === 'SECONDARY';

  const alreadyCheckedOut = Boolean(attendance?.checkOutTime);
  const hasNoEntry = !attendance || !['PRESENT', 'LATE_JUSTIFIED', 'LATE_UNJUSTIFIED'].includes(attendance.status);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in"
    >
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4 bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-lg text-foreground leading-none">Registro de Salida</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Control de retiro escolar y verificación de personas autorizadas.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {lastCheckout ? (
            <div
              role="status"
              aria-live="polite"
              className="flex flex-col items-center gap-3 py-8 text-center animate-in zoom-in-95"
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg">
                <CheckCircle2 className="h-12 w-12" aria-hidden />
              </div>
              <p className="text-2xl font-black text-foreground">Salida registrada</p>
              <p className="text-lg font-semibold text-foreground">{lastCheckout.student}</p>
              <p className="text-sm text-muted-foreground">
                {lastCheckout.detail}
                {lastCheckout.familyNotified ? ' · se avisó a la familia' : ''}
              </p>
              <div className="mt-2 flex gap-2">
                <Button onClick={handleNextCheckout} autoFocus className="h-11 px-6 text-base font-bold rounded-xl">
                  Registrar otra salida
                </Button>
                <Button variant="outline" onClick={onClose} className="h-11 px-6 rounded-xl">
                  Cerrar
                </Button>
              </div>
            </div>
          ) : /* PASO 1: Búsqueda o escaneo si no hay código */
          !scannedCode ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">Identifica al estudiante por carnet QR o DNI</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUseCamera((v) => !v)}
                  className="h-8 text-xs font-bold gap-1.5 rounded-xl"
                >
                  <Camera className="w-3.5 h-3.5 text-primary" />
                  <span>{useCamera ? 'Ocultar cámara' : 'Escanear con cámara'}</span>
                </Button>
              </div>

              {useCamera && (
                <div className="rounded-2xl overflow-hidden border border-border p-3 bg-muted/20">
                  <CameraQrScanner isActive={true} onScan={handleScanCode} isProcessing={false} />
                </div>
              )}

              <form onSubmit={handleManualSearch} className="flex gap-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Nombre, apellido, DNI o código del estudiante..."
                  aria-label="Nombre, DNI o código del estudiante"
                  // Listo para escribir o escanear (lector USB) sin tocar la pantalla
                  autoFocus
                  className="flex-1 rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Button type="submit" size="sm" className="rounded-xl text-xs font-bold gap-1 px-4">
                  <Search className="w-3.5 h-3.5" />
                  <span>Buscar</span>
                </Button>
              </form>
              {nameMatches.length > 0 && (
                <ul
                  className="divide-y divide-border rounded-xl border border-border"
                  aria-label="Coincidencias por nombre"
                >
                  {nameMatches.map((r) => (
                    <li key={r.documentId}>
                      <button
                        type="button"
                        onClick={() => handleScanCode(r.documentId)}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs hover:bg-muted"
                      >
                        <span className="font-semibold text-foreground">{r.fullName}</span>
                        <span className="text-muted-foreground">{r.classroom}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {nameQuery.length >= 3 && !/^\d+$/.test(nameQuery) && nameMatches.length === 0 && roster.length > 0 && (
                <p className="text-xs text-muted-foreground">Ningún alumno matriculado coincide con «{nameQuery}».</p>
              )}
            </div>
          ) : isLoadingPreview ? (
            <div className="p-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span>Cargando datos del estudiante y personas autorizadas...</span>
            </div>
          ) : previewError ? (
            <div className="p-6 rounded-2xl border border-destructive/30 bg-destructive/10 text-destructive text-center space-y-3">
              <AlertCircle className="w-8 h-8 mx-auto" />
              <p className="text-sm font-bold">
                {(previewError as any)?.response?.data?.message || 'No se encontró estudiante con el código ingresado.'}
              </p>
              <Button size="sm" variant="outline" onClick={handleResetSearch} className="rounded-xl text-xs font-bold">
                Intentar con otro código
              </Button>
            </div>
          ) : student ? (
            /* PASO 2: Ficha del alumno y selector de quién recoge */
            <div className="space-y-5">
              {/* Resumen del Alumno */}
              <div className="p-4 rounded-2xl border border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-foreground">{student.fullName}</span>
                    <Badge variant="outline" className="text-xs font-bold">
                      {student.classroom}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>DNI: {student.documentId}</span>
                    {attendance?.checkInTime && (
                      <span className="flex items-center gap-1 font-semibold text-foreground">
                        <Clock className="w-3 h-3 text-primary" />
                        Ingreso: {formatPeruTime(attendance.checkInTime)}
                      </span>
                    )}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetSearch}
                  className="h-8 text-xs font-bold text-muted-foreground hover:text-foreground gap-1 self-start sm:self-center"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Cambiar</span>
                </Button>
              </div>

              {/* Advertencias si no puede registrar salida */}
              {alreadyCheckedOut ? (
                <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center gap-3 text-xs font-semibold">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <div>
                    <span className="font-bold block text-sm">Salida ya registrada</span>
                    <span>
                      Este estudiante ya registró su salida a las {formatPeruTime(attendance?.checkOutTime)}
                      {attendance?.pickedUpByName ? ` (retirado por ${attendance.pickedUpByName})` : ''}.
                    </span>
                  </div>
                </div>
              ) : hasNoEntry ? (
                <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-3 text-xs font-semibold">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <div>
                    <span className="font-bold block text-sm">Sin ingreso registrado hoy</span>
                    <span>El estudiante no cuenta con marca de asistencia válida para la fecha.</span>
                  </div>
                </div>
              ) : (
                /* Selección de quién recoge */
                <div className="space-y-4">
                  <label className="text-xs font-bold text-foreground block">
                    ¿Quién recoge al estudiante? <span className="text-destructive">*</span>
                  </label>

                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {/* Apoderados Registrados */}
                    {guardians.map((g) => {
                      const isSelected = selectedPickupType === 'GUARDIAN' && selectedPersonId === g.id;
                      return (
                        <div
                          key={g.id}
                          onClick={() => {
                            setSelectedPickupType('GUARDIAN');
                            setSelectedPersonId(g.id);
                          }}
                          className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between gap-3 transition-all ${
                            isSelected
                              ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                              : 'border-border bg-card hover:border-primary/40'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              <User className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-foreground truncate">{g.fullName}</span>
                                <Badge className="text-xs bg-secondary text-secondary-foreground">
                                  {relationshipLabel(g.relationshipType)}
                                </Badge>
                              </div>
                              <span className="text-xs text-muted-foreground block">Doc: {g.documentId || '—'}</span>
                            </div>
                          </div>
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected ? 'border-primary bg-primary text-white' : 'border-muted-foreground/40'
                            }`}
                          >
                            {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                        </div>
                      );
                    })}

                    {/* Personas Autorizadas Adicionales */}
                    {authorizedPickups.map((p) => {
                      const isSelected = selectedPickupType === 'AUTHORIZED' && selectedPersonId === p.id;
                      return (
                        <div
                          key={p.id}
                          onClick={() => {
                            setSelectedPickupType('AUTHORIZED');
                            setSelectedPersonId(p.id);
                          }}
                          className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between gap-3 transition-all ${
                            isSelected
                              ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                              : 'border-border bg-card hover:border-primary/40'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <PickupPhotoAvatar photoUrl={p.photoFileUrl} name={p.fullName} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-foreground truncate">{p.fullName}</span>
                                <Badge
                                  variant="outline"
                                  className="text-xs border-emerald-500/30 text-emerald-600 bg-emerald-500/10"
                                >
                                  Autorizado ({p.relationship})
                                </Badge>
                              </div>
                              <span className="text-xs text-muted-foreground block">
                                {p.documentType}: {p.documentId}
                              </span>
                            </div>
                          </div>
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected ? 'border-primary bg-primary text-white' : 'border-muted-foreground/40'
                            }`}
                          >
                            {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                        </div>
                      );
                    })}

                    {/* Persona eventual: alguien no registrado que trae autorización escrita del apoderado */}
                    {canRegisterOther && (
                      <div
                        onClick={() => {
                          setSelectedPickupType('OTHER');
                          setSelectedPersonId(null);
                        }}
                        className={`p-3 rounded-xl border cursor-pointer space-y-2 transition-all ${
                          selectedPickupType === 'OTHER'
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                            : 'border-dashed border-border bg-card hover:border-primary/40'
                        }`}
                      >
                        <span className="text-xs font-bold text-foreground block">
                          Otra persona con autorización escrita
                        </span>
                        <span className="text-xs text-muted-foreground block">
                          Solo hoy. Queda registrada y se avisa a la familia.
                        </span>
                        {selectedPickupType === 'OTHER' && (
                          <div className="grid gap-2 sm:grid-cols-2" onClick={(e) => e.stopPropagation()}>
                            <input
                              value={otherName}
                              onChange={(e) => setOtherName(e.target.value)}
                              placeholder="Nombres y apellidos"
                              aria-label="Nombres y apellidos de quien recoge"
                              className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs"
                            />
                            <input
                              value={otherDocument}
                              onChange={(e) => setOtherDocument(e.target.value)}
                              placeholder="DNI o documento"
                              aria-label="Documento de quien recoge"
                              className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Opción Salida por su cuenta (Solo Secundaria) */}
                    {isSecondary && (
                      <div
                        onClick={() => {
                          setSelectedPickupType('SELF');
                          setSelectedPersonId(null);
                        }}
                        className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between gap-3 transition-all ${
                          selectedPickupType === 'SELF'
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                            : 'border-border bg-card hover:border-primary/40'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                            <ShieldCheck className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-foreground block">Sale por su cuenta</span>
                            <span className="text-xs text-muted-foreground">Habilitado para nivel Secundaria</span>
                          </div>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            selectedPickupType === 'SELF'
                              ? 'border-primary bg-primary text-white'
                              : 'border-muted-foreground/40'
                          }`}
                        >
                          {selectedPickupType === 'SELF' && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Motivo de salida anticipada */}
                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">
                      {selectedPickupType === 'OTHER'
                        ? 'Autorización del apoderado (obligatorio)'
                        : 'Motivo de salida anticipada (opcional)'}
                    </label>
                    <input
                      type="text"
                      value={earlyLeaveReason}
                      onChange={(e) => setEarlyLeaveReason(e.target.value)}
                      placeholder={
                        selectedPickupType === 'OTHER'
                          ? 'Ej. Carta firmada por la madre; se confirmó por llamada a las 12:10'
                          : 'Ej. Cita odontológica, retiro con autorización escrita...'
                      }
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer (la confirmación trae sus propios botones) */}
        {!lastCheckout && (
          <div className="p-4 border-t border-border flex items-center justify-end gap-2 bg-muted/20">
            <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl text-xs font-bold">
              Cancelar
            </Button>

            {scannedCode && !alreadyCheckedOut && !hasNoEntry && (
              <Button
                size="sm"
                disabled={
                  isCheckingOut ||
                  !selectedPickupType ||
                  (selectedPickupType === 'OTHER'
                    ? otherName.trim().length < 5 ||
                      otherDocument.trim().length < 6 ||
                      earlyLeaveReason.trim().length < 5
                    : selectedPickupType !== 'SELF' && !selectedPersonId)
                }
                onClick={handleSubmitCheckout}
                className="rounded-xl text-xs font-bold gap-1.5"
              >
                {isCheckingOut && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Registrar salida</span>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
