import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, School as SchoolIcon, Save, Loader2, Lock, ShieldAlert, Palette, RotateCcw, CalendarCheck, MessagesSquare } from 'lucide-react';
import { useGetActiveSchool, useUpdateSchool } from '../api/useSchool';
import { toast } from 'sonner';

interface SchoolSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SchoolFormValues {
  name: string;
  logoUrl: string;
  phone: string;
  email: string;
  address: string;
  department: string;
  province: string;
  district: string;
  blockCertificatesOnOverdue: boolean;
  brandColor?: string | null;
  notifyAbsencesToFamilies: boolean;
  absenceAlertConsecutive: number;
  absenceAlertMonthlyPercent: number;
  lateAlertMonthlyCount: number;
  messagingEnabled: boolean;
  messagingStartTime: string;
  messagingEndTime: string;
  whatsappCountryCode: string;
}

export const SchoolSettingsModal: React.FC<SchoolSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { data: school, isLoading } = useGetActiveSchool();
  const { mutateAsync: updateSchool, isPending } = useUpdateSchool();

  const { register, handleSubmit, reset, watch, setValue } = useForm<SchoolFormValues>();
  const logoUrlValue = watch('logoUrl');
  const brandColorValue = watch('brandColor');

  useEffect(() => {
    if (school) {
      reset({
        name: school.name || '',
        logoUrl: school.logoUrl || '',
        phone: school.phone || '',
        email: school.email || '',
        address: school.address || '',
        department: school.department || '',
        province: school.province || '',
        district: school.district || '',
        blockCertificatesOnOverdue: school.blockCertificatesOnOverdue ?? false,
        brandColor: school.brandColor || null,
        notifyAbsencesToFamilies: school.notifyAbsencesToFamilies ?? true,
        absenceAlertConsecutive: school.absenceAlertConsecutive ?? 3,
        absenceAlertMonthlyPercent: school.absenceAlertMonthlyPercent ?? 15,
        lateAlertMonthlyCount: school.lateAlertMonthlyCount ?? 5,
        messagingEnabled: school.messagingEnabled ?? true,
        messagingStartTime: school.messagingStartTime ?? '07:00',
        messagingEndTime: school.messagingEndTime ?? '18:00',
        whatsappCountryCode: school.whatsappCountryCode ?? '51',
      });
    }
  }, [school, reset]);

  if (!isOpen) return null;

  const onSubmit = async (values: SchoolFormValues) => {
    try {
      const sanitizedPayload = Object.fromEntries(
        Object.entries(values).map(([key, val]) => [
          key,
          typeof val === 'string'
            ? val.trim() === ''
              ? key === 'brandColor'
                ? null
                : undefined
              : val
            : val,
        ]),
      );
      if (values.brandColor === null) {
        sanitizedPayload.brandColor = null;
      }
      if (values.absenceAlertConsecutive !== undefined) {
        sanitizedPayload.absenceAlertConsecutive = Number(values.absenceAlertConsecutive);
      }
      if (values.absenceAlertMonthlyPercent !== undefined) {
        sanitizedPayload.absenceAlertMonthlyPercent = Number(values.absenceAlertMonthlyPercent);
      }
      if (values.lateAlertMonthlyCount !== undefined) {
        sanitizedPayload.lateAlertMonthlyCount = Number(values.lateAlertMonthlyCount);
      }
      if (values.notifyAbsencesToFamilies !== undefined) {
        sanitizedPayload.notifyAbsencesToFamilies = Boolean(values.notifyAbsencesToFamilies);
      }
      sanitizedPayload.messagingEnabled = Boolean(values.messagingEnabled);
      await updateSchool(sanitizedPayload);
      toast.success('🏫 Datos y configuración de la institución guardados correctamente.');
      onClose();
    } catch (error: any) {
      console.error('Error actualizando datos del colegio:', error);
      toast.error(error?.response?.data?.message || 'Error al guardar los datos del colegio.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="school-settings-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <h2 id="school-settings-title" className="text-xl font-bold text-foreground flex items-center gap-2">
            <SchoolIcon className="w-5 h-5 text-primary" />
            Ajustes de la Institución Educativa
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar ajustes de la institución"
            className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
            Cargando configuración...
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
            {/* Previsualización del Logo */}
            <div className="p-4 rounded-xl bg-secondary/30 border border-border flex flex-col items-center gap-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase">
                Logo Institucional (Previsualización)
              </span>
              <div className="w-20 h-20 rounded-2xl bg-card border border-border flex items-center justify-center overflow-hidden shadow-sm">
                {logoUrlValue ? (
                  <img
                    src={logoUrlValue}
                    alt="Logo institucional del colegio"
                    className="w-full h-full object-contain p-1"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <SchoolIcon className="w-10 h-10 text-muted-foreground/40" />
                )}
              </div>

              <div className="w-full">
                <label htmlFor="school-logo-url" className="block text-xs font-medium text-muted-foreground mb-1">
                  URL del Logo (Cloudinary / HTTPS)
                </label>
                <div className="flex gap-2">
                  <input
                    id="school-logo-url"
                    type="url"
                    placeholder="https://res.cloudinary.com/..."
                    {...register('logoUrl')}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Sube el logo desde tu frontend a Cloudinary y pega aquí la URL generada.
                </p>
              </div>
            </div>

            {/* Color Institucional */}
            <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-3">
              <div className="flex items-center justify-between">
                <label htmlFor="school-brand-color" className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-primary" />
                  Color institucional
                </label>
                {brandColorValue && (
                  <button
                    type="button"
                    onClick={() => setValue('brandColor', null, { shouldDirty: true })}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Restablecer
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <input
                  id="school-brand-color"
                  type="color"
                  aria-label="Selector de color institucional"
                  value={brandColorValue || '#5046e5'}
                  onChange={(e) => setValue('brandColor', e.target.value, { shouldDirty: true })}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-border bg-transparent p-0.5"
                />
                <input
                  type="text"
                  placeholder="#5046e5 (por defecto)"
                  aria-label="Código hexadecimal del color institucional"
                  value={brandColorValue || ''}
                  onChange={(e) => setValue('brandColor', e.target.value || null, { shouldDirty: true })}
                  className="w-36 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="flex-1 flex justify-end">
                  <button
                    type="button"
                    tabIndex={-1}
                    style={{
                      backgroundColor: brandColorValue || '#5046e5',
                      color: '#ffffff',
                    }}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold shadow-sm pointer-events-none transition-colors"
                  >
                    Vista previa
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Personaliza el color primario de los botones, bordes y acentos visuales de la plataforma para tu colegio.
              </p>
            </div>

            <div>
              <label htmlFor="school-name-input" className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                Nombre de la Institución Educativa *
              </label>
              <input
                id="school-name-input"
                type="text"
                {...register('name', { required: true })}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="school-phone-input" className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                  Teléfono / Celular de Contacto
                </label>
                <input
                  id="school-phone-input"
                  type="text"
                  placeholder="912345678"
                  {...register('phone')}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label htmlFor="school-email-input" className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                  Email Institucional
                </label>
                <input
                  id="school-email-input"
                  type="email"
                  placeholder="contacto@colegio.edu.pe"
                  {...register('email')}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label htmlFor="school-address-input" className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                Dirección del Colegio
              </label>
              <input
                id="school-address-input"
                type="text"
                placeholder="Av. Los Educadores 123"
                {...register('address')}
                className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label htmlFor="school-dep-input" className="block text-[11px] font-semibold text-muted-foreground uppercase mb-1">
                  Departamento
                </label>
                <input
                  id="school-dep-input"
                  type="text"
                  placeholder="LIMA"
                  {...register('department')}
                  className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="school-prov-input" className="block text-[11px] font-semibold text-muted-foreground uppercase mb-1">
                  Provincia
                </label>
                <input
                  id="school-prov-input"
                  type="text"
                  placeholder="LIMA"
                  {...register('province')}
                  className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="school-dist-input" className="block text-[11px] font-semibold text-muted-foreground uppercase mb-1">
                  Distrito
                </label>
                <input
                  id="school-dist-input"
                  type="text"
                  placeholder="MIRAFLORES"
                  {...register('district')}
                  className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Retener constancias oficiales por deuda vencida (Ley 27665) */}
            <div className="p-4 rounded-xl bg-card border border-border space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <label htmlFor="school-block-cert" className="text-xs font-bold text-foreground flex items-center gap-1.5 cursor-pointer">
                    <ShieldAlert className="w-4 h-4 text-amber-500" />
                    <span>Retener constancias oficiales por deuda vencida</span>
                  </label>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Conforme a la Ley 27665, solo se pueden retener constancias y certificados de periodos no pagados. Las notas, la libreta y la asistencia SIEMPRE permanecen visibles para las familias.
                  </p>
                </div>
                <input
                  id="school-block-cert"
                  type="checkbox"
                  {...register('blockCertificatesOnOverdue')}
                  className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary cursor-pointer mt-0.5"
                />
              </div>
            </div>

            {/* Asistencia */}
            <div className="p-4 rounded-xl bg-card border border-border space-y-3">
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <CalendarCheck className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Asistencia
                </h3>
              </div>

              {/* Toggle avisar a familias */}
              <div className="flex items-start justify-between gap-3 pt-1">
                <div className="space-y-0.5">
                  <label
                    htmlFor="notify-absences-families"
                    className="text-xs font-semibold text-foreground cursor-pointer"
                  >
                    Avisar a las familias cuando el estudiante no registra ingreso
                  </label>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Envía una notificación a los apoderados al cerrarse la asistencia si el alumno no ingresó.
                  </p>
                </div>
                <input
                  id="notify-absences-families"
                  type="checkbox"
                  {...register('notifyAbsencesToFamilies')}
                  className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary cursor-pointer mt-0.5"
                />
              </div>

              {/* Parámetros de alerta */}
              <div className="pt-2 border-t border-border/60 space-y-2.5">
                <p className="text-[11px] text-muted-foreground">
                  Las alertas se calculan cada día lectivo después del cierre automático y se envían al tutor del aula.
                </p>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  <div>
                    <label
                      htmlFor="alert-consecutive"
                      className="block text-[11px] font-medium text-foreground mb-1"
                    >
                      Alerta por faltas injustificadas seguidas
                    </label>
                    <input
                      id="alert-consecutive"
                      type="number"
                      min={2}
                      max={10}
                      {...register('absenceAlertConsecutive', { valueAsNumber: true })}
                      className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="alert-percent"
                      className="block text-[11px] font-medium text-foreground mb-1"
                    >
                      Alerta por % de faltas injustificadas en 30 días
                    </label>
                    <div className="relative">
                      <input
                        id="alert-percent"
                        type="number"
                        min={5}
                        max={50}
                        {...register('absenceAlertMonthlyPercent', { valueAsNumber: true })}
                        className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 pr-6 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <span className="absolute right-2.5 top-1.5 text-xs text-muted-foreground pointer-events-none">
                        %
                      </span>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="alert-lates"
                      className="block text-[11px] font-medium text-foreground mb-1"
                    >
                      Alerta por tardanzas injustificadas en 30 días
                    </label>
                    <input
                      id="alert-lates"
                      type="number"
                      min={2}
                      max={20}
                      {...register('lateAlertMonthlyCount', { valueAsNumber: true })}
                      className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Comunicación con familias */}
            <div className="p-4 rounded-xl bg-card border border-border space-y-3">
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <MessagesSquare className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Comunicación con familias</h3>
              </div>
              <div className="flex items-start justify-between gap-3 pt-1">
                <div className="space-y-0.5">
                  <label htmlFor="messaging-enabled" className="text-xs font-semibold text-foreground cursor-pointer">
                    Mensajería entre familias y docentes
                  </label>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Chat privado dentro de la app: los docentes no necesitan dar su número personal.
                  </p>
                </div>
                <input
                  id="messaging-enabled"
                  type="checkbox"
                  {...register('messagingEnabled')}
                  className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary cursor-pointer mt-0.5"
                />
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <div>
                  <label htmlFor="messaging-start" className="block text-[11px] font-medium text-foreground mb-1">
                    Atención desde
                  </label>
                  <input id="messaging-start" type="time" {...register('messagingStartTime')} className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label htmlFor="messaging-end" className="block text-[11px] font-medium text-foreground mb-1">
                    Atención hasta
                  </label>
                  <input id="messaging-end" type="time" {...register('messagingEndTime')} className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label htmlFor="wa-prefix" className="block text-[11px] font-medium text-foreground mb-1">
                    Prefijo de WhatsApp
                  </label>
                  <input id="wa-prefix" inputMode="numeric" maxLength={4} {...register('whatsappCountryCode')} className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Fuera del horario de atención (y fines de semana) los mensajes de las familias se guardan, pero no suenan en el celular del docente.
              </p>
            </div>

            {/* Plan de Suscripción Contratado (Solo Lectura) */}
            <div className="p-4 rounded-xl bg-secondary/40 border border-border space-y-1.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground uppercase flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-500" />
                  Plan de Suscripción Contratado
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-primary/10 text-primary border border-primary/20">
                  PLAN {school?.plan || 'BASIC'}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground pt-1">
                🔒 El plan de suscripción solo puede ser gestionado por el Administrador General SaaS (SuperAdmin). Para cambiar tu plan, solicita un Upgrade a Soporte.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 disabled:opacity-50 transition-all"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Guardar Cambios
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
