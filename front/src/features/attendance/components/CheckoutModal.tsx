import React, { useState } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CameraQrScanner } from './CameraQrScanner';
import { useCheckoutPreview, useCheckout } from '../api/useCheckout';
import { useResolvedFileUrl } from '@/features/course-contents/api/useResolvedFileUrl';
import { formatPeruTime } from '@/lib/dateUtils';

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
      <img
        src={resolvedUrl}
        alt={name}
        className="w-10 h-10 rounded-full object-cover border border-border shrink-0"
      />
    );
  }

  const initial = name.charAt(0).toUpperCase();
  return (
    <div className="w-10 h-10 rounded-full bg-secondary text-secondary-foreground font-bold flex items-center justify-center shrink-0 border border-border">
      {initial}
    </div>
  );
};

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ open, onClose }) => {
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [useCamera, setUseCamera] = useState(false);

  // Selección de persona
  const [selectedPickupType, setSelectedPickupType] = useState<'GUARDIAN' | 'AUTHORIZED' | 'SELF' | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [earlyLeaveReason, setEarlyLeaveReason] = useState('');

  const { data: previewData, isLoading: isLoadingPreview, error: previewError } = useCheckoutPreview(scannedCode);
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
    handleScanCode(manualCode);
  };

  const handleResetSearch = () => {
    setScannedCode(null);
    setManualCode('');
    setSelectedPickupType(null);
    setSelectedPersonId(null);
    setEarlyLeaveReason('');
  };

  const handleSubmitCheckout = async () => {
    if (!scannedCode || !selectedPickupType) return;
    if (selectedPickupType !== 'SELF' && !selectedPersonId) return;

    await doCheckout({
      code: scannedCode,
      pickupType: selectedPickupType,
      pickupPersonId: selectedPersonId || undefined,
      earlyLeaveReason: earlyLeaveReason.trim() || undefined,
    });

    onClose();
  };

  const student = previewData?.student;
  const attendance = previewData?.todayAttendance;
  const guardians = previewData?.guardians || [];
  const authorizedPickups = previewData?.authorizedPickups || [];
  const isSecondary = student?.educationLevel === 'SECONDARY';

  const alreadyCheckedOut = Boolean(attendance?.checkOutTime);
  const hasNoEntry = !attendance || !['PRESENT', 'LATE_JUSTIFIED', 'LATE_UNJUSTIFIED'].includes(attendance.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4 bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-lg text-foreground leading-none">
                Registro de Salida
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Control de retiro escolar y verificación de personas autorizadas.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* PASO 1: Búsqueda o escaneo si no hay código */}
          {!scannedCode ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">
                  Identifica al estudiante por carnet QR o DNI
                </span>
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
                  <CameraQrScanner
                    isActive={true}
                    onScan={handleScanCode}
                    isProcessing={false}
                  />
                </div>
              )}

              <form onSubmit={handleManualSearch} className="flex gap-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Ingresa DNI o código del estudiante..."
                  className="flex-1 rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Button type="submit" size="sm" className="rounded-xl text-xs font-bold gap-1 px-4">
                  <Search className="w-3.5 h-3.5" />
                  <span>Buscar</span>
                </Button>
              </form>
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
                    <span className="text-base font-black text-foreground">
                      {student.fullName}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-bold">
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
                      Este estudiante ya registró su salida a las{' '}
                      {formatPeruTime(attendance?.checkOutTime)}
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
                                <span className="text-xs font-bold text-foreground truncate">
                                  {g.fullName}
                                </span>
                                <Badge className="text-[10px] bg-secondary text-secondary-foreground">
                                  Apoderado ({g.relationshipType})
                                </Badge>
                              </div>
                              <span className="text-[11px] text-muted-foreground block">
                                Doc: {g.documentId || '—'}
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
                                <span className="text-xs font-bold text-foreground truncate">
                                  {p.fullName}
                                </span>
                                <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600 bg-emerald-500/10">
                                  Autorizado ({p.relationship})
                                </Badge>
                              </div>
                              <span className="text-[11px] text-muted-foreground block">
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
                            <span className="text-xs font-bold text-foreground block">
                              Sale por su cuenta
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              Habilitado para nivel Secundaria
                            </span>
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
                      Motivo de salida anticipada (opcional)
                    </label>
                    <input
                      type="text"
                      value={earlyLeaveReason}
                      onChange={(e) => setEarlyLeaveReason(e.target.value)}
                      placeholder="Ej. Cita odontológica, retiro con autorización escrita..."
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
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
                (selectedPickupType !== 'SELF' && !selectedPersonId)
              }
              onClick={handleSubmitCheckout}
              className="rounded-xl text-xs font-bold gap-1.5"
            >
              {isCheckingOut && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Registrar salida</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
